import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface WebRTCViewerProps {
  streamId: string;
  streamerId: string;
}

// Global map to track initialized viewers (prevents duplicate initialization)
const initializedViewers = new Map<string, boolean>();

export default function WebRTCViewer({ streamId, streamerId }: WebRTCViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [connectionState, setConnectionState] = useState<string>('connecting');
  const [isMuted, setIsMuted] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const viewerIdRef = useRef<string | null>(null);
  const initializedRef = useRef<boolean>(false);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Prevent duplicate initialization
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    initializeViewer();

    return () => {
      cleanup();
      initializedRef.current = false;
    };
  }, [streamId, streamerId]);

  const initializeViewer = async () => {
    try {
      // Create a unique key for this viewer instance
      const instanceKey = `${streamId}-${streamerId}`;
      
      console.log('🔍 Checking initialization for:', instanceKey, 'Already init?', initializedViewers.has(instanceKey));
      
      // Skip if already initialized
      if (initializedViewers.has(instanceKey)) {
        console.log('⚠️ Already initialized, skipping...');
        return;
      }
      
      // Mark as initialized immediately to prevent race conditions
      initializedViewers.set(instanceKey, true);
      console.log('✅ Marked as initialized:', instanceKey);

      const { data: { user } } = await (supabase as any).auth.getUser();
      if (!user) {
        setConnectionState('error');
        initializedViewers.delete(instanceKey);
        return;
      }

      viewerIdRef.current = user.id;
      console.log('👁️ Initializing viewer:', user.id);

      // Clean up any stale records for this viewer on this stream (from previous sessions)
      await (supabase as any)
        .from('stream_viewers')
        .delete()
        .eq('stream_id', streamId)
        .eq('viewer_id', user.id);
      
      console.log('🧹 Cleaned up old viewer records');

      // Register as a viewer in the database (fresh insert)
      const { error: insertError } = await (supabase as any)
        .from('stream_viewers')
        .insert({
          stream_id: streamId,
          viewer_id: user.id,
          last_seen: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error registering viewer:', insertError);
      }

      console.log('✅ Registered as viewer');

      // Clean up any old signals for this viewer (from previous sessions)
      await (supabase as any)
        .from('webrtc_signals')
        .delete()
        .eq('stream_id', streamId)
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);
      
      console.log('🧹 Cleaned up old signals');

      // Send a signal to the streamer that we joined
      await sendSignal(streamerId, 'viewer-join', {});

      // Start polling for signals from the streamer
      startPollingForSignals();
    } catch (error) {
      console.error('Error initializing viewer:', error);
      setConnectionState('error');
    }
  };

  const startPollingForSignals = () => {
    const poll = async () => {
      try {
        if (!viewerIdRef.current) return;

        // Check for pending signals (offers, ICE candidates)
        const { data: signals, error } = await (supabase as any)
          .from('webrtc_signals')
          .select('*')
          .eq('stream_id', streamId)
          .eq('to_user_id', viewerIdRef.current)
          .eq('consumed', false)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching signals:', error);
          return;
        }

        if (signals && signals.length > 0) {
          console.log(`📨 Processing ${signals.length} signals...`);
          for (const signal of signals) {
            await handleSignal(signal);
            
            // Mark as consumed
            await (supabase as any)
              .from('webrtc_signals')
              .update({ consumed: true })
              .eq('id', signal.id);
          }
        }

        // Update last_seen
        await (supabase as any)
          .from('stream_viewers')
          .update({ last_seen: new Date().toISOString() })
          .eq('stream_id', streamId)
          .eq('viewer_id', viewerIdRef.current);
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Poll every 1 second
    poll(); // Initial poll
    pollingIntervalRef.current = setInterval(poll, 1000);
  };

  const handleSignal = async (signal: any) => {
    console.log(`📥 Received ${signal.signal_type} from streamer`);

    if (signal.signal_type === 'offer') {
      // Streamer sent us an offer - create peer connection and send answer
      await handleOffer(signal.signal_data.offer);
    } else if (signal.signal_type === 'ice-candidate') {
      // Streamer sent an ICE candidate
      if (peerConnectionRef.current && signal.signal_data.candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.signal_data.candidate));
        console.log('🧊 Added ICE candidate from streamer');
      }
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    try {
      console.log('📥 Handling offer from streamer');
      
      // Create peer connection if it doesn't exist
      if (!peerConnectionRef.current) {
        peerConnectionRef.current = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            // Free TURN server (fallback for strict NATs/firewalls)
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject',
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject',
              credential: 'openrelayproject',
            },
            {
              urls: 'turn:openrelay.metered.ca:443?transport=tcp',
              username: 'openrelayproject',
              credential: 'openrelayproject',
            },
          ],
        });

        // Handle incoming media stream
        peerConnectionRef.current.ontrack = async (event) => {
          console.log('📺 Received media track:', event.track.kind);
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
            
            // Explicitly play the video
            try {
              await videoRef.current.play();
              console.log('✅ Video playing');
              setNeedsUserInteraction(false);
            } catch (playError) {
              console.warn('⚠️ Autoplay prevented, user interaction may be required:', playError);
              setNeedsUserInteraction(true);
            }
            
            setConnectionState('connected');
          }
        };

        // Handle ICE candidates
        peerConnectionRef.current.onicecandidate = async (event) => {
          if (event.candidate) {
            console.log('🧊 Sending ICE candidate to streamer');
            await sendSignal(streamerId, 'ice-candidate', { candidate: event.candidate });
          }
        };

        // Handle connection state changes
        peerConnectionRef.current.onconnectionstatechange = () => {
          const state = peerConnectionRef.current?.connectionState;
          console.log('🔌 Connection state:', state);
          setConnectionState(state || 'unknown');
          
          // Start monitoring connection quality once connected
          if (state === 'connected') {
            startConnectionMonitoring();
          }
        };
      }

      // Set remote description (offer)
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('✅ Set remote description (offer)');

      // Create and send answer
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      console.log('📨 Sending answer to streamer');
      await sendSignal(streamerId, 'answer', { answer });
    } catch (error) {
      console.error('Error handling offer:', error);
      setConnectionState('failed');
    }
  };

  const sendSignal = async (toUserId: string, signalType: string, signalData: any) => {
    try {
      if (!viewerIdRef.current) return;

      const { data, error } = await (supabase as any)
        .from('webrtc_signals')
        .insert({
          stream_id: streamId,
          from_user_id: viewerIdRef.current,
          to_user_id: toUserId,
          signal_type: signalType,
          signal_data: signalData,
        });

      if (error) {
        console.error('❌ Error sending signal:', error);
        console.error('Signal details:', { streamId, from_user_id: viewerIdRef.current, to_user_id: toUserId, signal_type: signalType });
      } else {
        console.log(`✅ Signal sent: ${signalType}`);
      }
    } catch (error) {
      console.error('Error sending signal (catch):', error);
    }
  };

  // Monitor connection quality
  const startConnectionMonitoring = () => {
    const checkStats = async () => {
      if (!peerConnectionRef.current) return;

      try {
        const stats = await peerConnectionRef.current.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetsLost = report.packetsLost || 0;
            packetsReceived = report.packetsReceived || 0;
          }
        });

        // Calculate packet loss percentage
        const totalPackets = packetsLost + packetsReceived;
        const lossPercentage = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

        // Update connection quality
        if (lossPercentage < 2) {
          setConnectionQuality('good');
        } else if (lossPercentage < 10) {
          setConnectionQuality('poor');
          console.warn('⚠️ Poor connection quality, packet loss:', lossPercentage.toFixed(2) + '%');
        } else {
          setConnectionQuality('poor');
          console.error('❌ Very poor connection, packet loss:', lossPercentage.toFixed(2) + '%');
        }
      } catch (err) {
        console.error('Error checking connection stats:', err);
      }
    };

    // Check stats every 3 seconds
    statsIntervalRef.current = setInterval(checkStats, 3000);
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up viewer...');
    
    // Remove from initialized map
    const instanceKey = `${streamId}-${streamerId}`;
    initializedViewers.delete(instanceKey);
    
    // Stop polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Stop stats monitoring
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Remove viewer record from database
    if (viewerIdRef.current) {
      (supabase as any)
        .from('stream_viewers')
        .delete()
        .eq('stream_id', streamId)
        .eq('viewer_id', viewerIdRef.current)
        .then(() => console.log('✅ Removed viewer record'));
    }
  };

  return (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
      <video
        ref={videoRef}
        autoPlay
        muted={isMuted}
        playsInline
        className="w-full h-full object-contain"
      />
      
      {/* Connection Quality Indicator */}
      {connectionState === 'connected' && connectionQuality !== 'unknown' && (
        <div className="absolute top-4 left-4 z-10">
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
            connectionQuality === 'good' 
              ? 'bg-green-500/80 text-white' 
              : 'bg-yellow-500/80 text-white'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionQuality === 'good' ? 'bg-white' : 'bg-white animate-pulse'
            }`}></div>
            {connectionQuality === 'good' ? 'HD' : 'Low Quality'}
          </div>
        </div>
      )}
      
      {/* Click to Play Overlay */}
      {needsUserInteraction && connectionState === 'connected' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20 cursor-pointer"
          onClick={() => {
            console.log('🖱️ Play button clicked!');
            console.log('📹 Video element:', videoRef.current);
            console.log('📺 Video srcObject:', videoRef.current?.srcObject);
            if (videoRef.current) {
              const video = videoRef.current;
              // Force muted to true to allow autoplay
              video.muted = true;
              console.log('🔇 Forcing muted = true');
              
              const playPromise = video.play();
              console.log('▶️ Play promise created:', playPromise);
              
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    console.log('✅ Video playing after user interaction');
                    setNeedsUserInteraction(false);
                  })
                  .catch((err) => {
                    console.error('❌ Error playing video:', err);
                  });
              }
            } else {
              console.error('❌ Video ref is null!');
            }
          }}
        >
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mb-4 mx-auto hover:bg-purple-600 transition-all">
              <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <p className="text-white text-lg font-semibold">Click to Play</p>
            <p className="text-gray-300 text-sm mt-1">Browser requires user interaction</p>
          </div>
        </div>
      )}
      
      {/* Unmute Button */}
      {connectionState === 'connected' && !needsUserInteraction && (
        <button
          onClick={() => {
            setIsMuted(!isMuted);
            if (videoRef.current) {
              videoRef.current.muted = !isMuted;
            }
          }}
          className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-all z-10"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          )}
        </button>
      )}
      
      {connectionState !== 'connected' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
          <div className="text-center">
            {connectionState === 'connecting' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-white">Connecting to stream...</p>
              </>
            )}
            {connectionState === 'failed' && (
              <>
                <p className="text-red-500 mb-2">❌ Connection failed</p>
                <button
                  onClick={() => {
                    cleanup();
                    initializeViewer();
                  }}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  Retry
                </button>
              </>
            )}
            {connectionState === 'error' && (
              <p className="text-red-500">❌ Unable to connect. Please refresh and try again.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
