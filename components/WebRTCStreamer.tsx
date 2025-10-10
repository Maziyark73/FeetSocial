import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface WebRTCStreamerProps {
  streamId: string;
  streamKey: string;
  onStreamStart: () => void;
  onStreamEnd: () => void;
  onError: (error: string) => void;
}

export default function WebRTCStreamer({
  streamId,
  streamKey,
  onStreamStart,
  onStreamEnd,
  onError,
}: WebRTCStreamerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start camera and begin streaming
  const startStreaming = async () => {
    try {
      console.log('🎥 Requesting camera and microphone access...');
      
      // Detect mobile devices
      const isMobile = /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);
      console.log('📱 Device type:', isMobile ? 'Mobile' : 'Desktop');
      
      // Adaptive quality settings based on device
      const constraints = {
        video: {
          width: { ideal: isMobile ? 640 : 1280, max: isMobile ? 1280 : 1920 },
          height: { ideal: isMobile ? 480 : 720, max: isMobile ? 720 : 1080 },
          frameRate: { ideal: isMobile ? 24 : 30, max: 30 },
          facingMode: isMobile ? 'user' : undefined, // Front camera on mobile
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };
      
      console.log('📊 Quality settings:', constraints.video);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      console.log('✅ Camera access granted');

      // Display preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute preview to avoid feedback
        
        // Explicitly play the video
        try {
          await videoRef.current.play();
          console.log('✅ Camera preview playing');
        } catch (playError) {
          console.warn('⚠️ Autoplay prevented, user interaction may be required:', playError);
        }
      }

      setIsStreaming(true);
      onStreamStart();
      
      console.log('📡 Starting to poll for viewers...');
      startPollingForViewers(stream);
      
      console.log('❤️ Starting heartbeat monitoring...');
      startHeartbeat();
    } catch (err: any) {
      console.error('❌ Error accessing camera:', err);
      onError(err.message || 'Failed to access camera');
    }
  };

  // Poll database for new viewers and signals
  const startPollingForViewers = (stream: MediaStream) => {
    const poll = async () => {
      try {
        const { data: { user } } = await (supabase as any).auth.getUser();
        if (!user) return;

        // Check for new viewers who joined
        const { data: viewers, error: viewersError } = await (supabase as any)
          .from('stream_viewers')
          .select('viewer_id')
          .eq('stream_id', streamId);

        if (viewersError) {
          console.error('Error fetching viewers:', viewersError);
          return;
        }

        console.log(`👥 Active viewers: ${viewers?.length || 0}`);

        // Check for pending signals (answers, ICE candidates)
        const { data: signals, error: signalsError } = await (supabase as any)
          .from('webrtc_signals')
          .select('*')
          .eq('stream_id', streamId)
          .eq('to_user_id', user.id)
          .eq('consumed', false)
          .order('created_at', { ascending: true });

        if (signalsError) {
          console.error('Error fetching signals:', signalsError);
          return;
        }

        if (signals && signals.length > 0) {
          console.log(`📨 Processing ${signals.length} signals...`);
          for (const signal of signals) {
            await handleSignal(signal, stream);
            
            // Mark as consumed
            await (supabase as any)
              .from('webrtc_signals')
              .update({ consumed: true })
              .eq('id', signal.id);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Poll every 1 second
    poll(); // Initial poll
    pollingIntervalRef.current = setInterval(poll, 1000);
  };

  // Handle incoming signals (answers, ICE candidates)
  const handleSignal = async (signal: any, stream: MediaStream) => {
    const viewerId = signal.from_user_id;
    console.log(`📥 Received ${signal.signal_type} from viewer ${viewerId}`);

    if (signal.signal_type === 'answer') {
      // Viewer sent an answer to our offer
      const pc = peerConnectionsRef.current.get(viewerId);
      if (pc && signal.signal_data.answer) {
        // Only set remote description if we're in the right state
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data.answer));
          console.log('✅ Set remote description (answer) for viewer:', viewerId);
        } else {
          console.log(`⚠️ Ignoring answer - peer connection in wrong state: ${pc.signalingState}`);
        }
      }
    } else if (signal.signal_type === 'ice-candidate') {
      // Viewer sent an ICE candidate
      const pc = peerConnectionsRef.current.get(viewerId);
      if (pc && signal.signal_data.candidate) {
        // Only add ICE candidate if remote description is set
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data.candidate));
          console.log('🧊 Added ICE candidate for viewer:', viewerId);
        } else {
          console.log('⚠️ Ignoring ICE candidate - remote description not set yet');
        }
      }
    } else if (signal.signal_type === 'viewer-join') {
      // New viewer joined - create peer connection and send offer
      console.log('🎯 New viewer joined:', viewerId);
      await createPeerConnection(viewerId, stream);
    }
  };

  // Create peer connection for a viewer
  const createPeerConnection = async (viewerId: string, stream: MediaStream) => {
    // Don't create duplicate connections
    if (peerConnectionsRef.current.has(viewerId)) {
      console.log('⚠️ Peer connection already exists for viewer:', viewerId);
      return;
    }

    try {
      console.log('🔗 Creating peer connection for viewer:', viewerId);
      
      const peerConnection = new RTCPeerConnection({
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

      // Add stream tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
        console.log(`➕ Added track: ${track.kind}`);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate to viewer:', viewerId);
          await sendSignal(viewerId, 'ice-candidate', { candidate: event.candidate });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`🔌 Connection state for ${viewerId}:`, peerConnection.connectionState);
        if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
          peerConnectionsRef.current.delete(viewerId);
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log('📨 Sending offer to viewer:', viewerId);
      await sendSignal(viewerId, 'offer', { offer });

      peerConnectionsRef.current.set(viewerId, peerConnection);
    } catch (error) {
      console.error('Error creating peer connection:', error);
      onError('Failed to create peer connection');
    }
  };

  // Send signal via database
  const sendSignal = async (toUserId: string, signalType: string, signalData: any) => {
    try {
      const { data: { user } } = await (supabase as any).auth.getUser();
      if (!user) return;

      await (supabase as any)
        .from('webrtc_signals')
        .insert({
          stream_id: streamId,
          from_user_id: user.id,
          to_user_id: toUserId,
          signal_type: signalType,
          signal_data: signalData,
        });
    } catch (error) {
      console.error('Error sending signal:', error);
    }
  };

  // Send heartbeat to database every 5 seconds
  const startHeartbeat = () => {
    const sendHeartbeat = async () => {
      try {
        // Update heartbeat timestamp and viewer count
        const currentViewerCount = peerConnectionsRef.current.size;
        
        const { error } = await (supabase as any)
          .from('live_streams')
          .update({
            last_heartbeat: new Date().toISOString(),
            viewer_count: currentViewerCount,
          })
          .eq('id', streamId);

        if (error) {
          console.error('❌ Heartbeat error:', error);
        } else {
          console.log('💓 Heartbeat sent, viewers:', currentViewerCount);
          setViewerCount(currentViewerCount);
        }
      } catch (err) {
        console.error('❌ Heartbeat failed:', err);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 5 seconds
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 5000);
  };

  // Stop streaming
  const stopStreaming = () => {
    console.log('⏹️ Stopping stream...');
    
    // Stop polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Stop heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Stop media stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }

    setMediaStream(null);
    setIsStreaming(false);
    setViewerCount(0);
    onStreamEnd();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Live indicator & viewer count */}
        {isStreaming && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="bg-red-600 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <span className="text-white font-bold text-sm">LIVE</span>
            </div>
            
            <div className="bg-black/70 px-4 py-2 rounded-full backdrop-blur-sm">
              <span className="text-white font-medium text-sm">
                👁️ {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}
              </span>
            </div>
          </div>
        )}
      </div>

      {!isStreaming ? (
        <button
          onClick={startStreaming}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 rounded-lg hover:opacity-90 transition-opacity"
        >
          📱 Start Quick Stream
        </button>
      ) : (
        <button
          onClick={stopStreaming}
          className="w-full bg-red-500 text-white font-semibold py-4 rounded-lg hover:bg-red-600 transition-colors"
        >
          ⏹️ Stop Streaming
        </button>
      )}

      <p className="text-sm text-gray-400 text-center">
        {isStreaming ? 'You are live! Viewers can now connect.' : 'Camera preview will appear here once you start streaming.'}
      </p>
    </div>
  );
}
