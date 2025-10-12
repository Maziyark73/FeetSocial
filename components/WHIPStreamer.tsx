import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface WHIPStreamerProps {
  whipEndpoint: string; // Mux WHIP endpoint
  streamId: string;
  onStreamReady?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: string) => void;
}

export default function WHIPStreamer({ 
  whipEndpoint, 
  streamId,
  onStreamReady,
  onStreamEnd,
  onError 
}: WHIPStreamerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('new');
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    // Start heartbeat monitoring (updates every 5 seconds)
    const startHeartbeat = () => {
      console.log('❤️ Starting heartbeat monitoring...');
      
      // Send initial heartbeat
      sendHeartbeat();
      
      // Send heartbeat every 5 seconds
      heartbeatIntervalRef.current = setInterval(() => {
        sendHeartbeat();
      }, 5000);
    };

    // Send heartbeat to update last_heartbeat timestamp
    const sendHeartbeat = async () => {
      try {
        // Count active viewers
        const { count } = await (supabase as any)
          .from('stream_viewers')
          .select('*', { count: 'exact', head: true })
          .eq('stream_id', streamId)
          .gte('last_seen', new Date(Date.now() - 10000).toISOString()); // Active in last 10 seconds

        const viewerCount = count || 0;
        setViewerCount(viewerCount);

        // Update stream with heartbeat and viewer count
        await (supabase as any)
          .from('live_streams')
          .update({
            last_heartbeat: new Date().toISOString(),
            viewer_count: viewerCount,
          })
          .eq('id', streamId);

        console.log('💓 Heartbeat sent, viewers:', viewerCount);
      } catch (error) {
        console.error('Error sending heartbeat:', error);
      }
    };

    const startStreaming = async () => {
      try {
        console.log('🎥 Starting WHIP stream to Mux...');
        console.log('📡 WHIP endpoint:', whipEndpoint);

        // Get user media
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const constraints = {
          video: {
            width: isMobile ? { ideal: 1280 } : { ideal: 1920 },
            height: isMobile ? { ideal: 720 } : { ideal: 1080 },
            frameRate: isMobile ? { ideal: 24 } : { ideal: 30 },
            facingMode: isMobile ? 'user' : undefined,
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        };

        console.log('🎥 Requesting camera and microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        console.log('✅ Camera access granted');

        // Set up video preview
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          console.log('✅ Camera preview playing');
        }

        // Create peer connection for WHIP
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });

        peerConnectionRef.current = pc;

        // Add tracks to peer connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
          console.log(`✅ Added ${track.kind} track to peer connection`);
        });

        // Monitor connection state
        pc.onconnectionstatechange = () => {
          console.log('🔌 Connection state:', pc.connectionState);
          setConnectionState(pc.connectionState);

          if (pc.connectionState === 'connected') {
            setStreaming(true);
            onStreamReady?.();
            startHeartbeat(); // Start sending heartbeats to keep stream alive
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            handleError('Connection to Mux failed');
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log('🧊 ICE connection state:', pc.iceConnectionState);
        };

        // Create offer
        console.log('📝 Creating offer...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for ICE gathering to complete
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
          } else {
            const checkState = () => {
              if (pc.iceGatheringState === 'complete') {
                pc.removeEventListener('icegatheringstatechange', checkState);
                resolve();
              }
            };
            pc.addEventListener('icegatheringstatechange', checkState);
          }
        });

        console.log('📤 Sending offer to Mux via WHIP...');

        // Send offer to Mux WHIP endpoint
        const response = await fetch(whipEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sdp',
          },
          body: pc.localDescription!.sdp,
        });

        if (!response.ok) {
          throw new Error(`WHIP request failed: ${response.status} ${response.statusText}`);
        }

        // Get answer from Mux
        const answerSDP = await response.text();
        console.log('✅ Received answer from Mux');

        const answer: RTCSessionDescriptionInit = {
          type: 'answer',
          sdp: answerSDP,
        };

        await pc.setRemoteDescription(answer);
        console.log('✅ Set remote description');

        console.log('🎉 WHIP connection established!');
        setStreaming(true);
        setConnectionState('connected');
        
        // Notify parent that stream is ready
        onStreamReady?.();

      } catch (err: any) {
        console.error('❌ Error starting WHIP stream:', err);
        handleError(err.message || 'Failed to start stream');
      }
    };

    const handleError = (errorMessage: string) => {
      setError(errorMessage);
      onError?.(errorMessage);
      cleanup();
    };

    const cleanup = () => {
      // Stop heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      setStreaming(false);
    };

    startStreaming();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [whipEndpoint, streamId]);

  const handleEndStream = () => {
    console.log('🛑 Ending stream...');
    
    // Stop heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setStreaming(false);
    onStreamEnd?.();
  };

  if (error) {
    return (
      <div className="relative bg-gray-900 rounded-lg p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Stream Error</h3>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      {/* Video Preview - Full size, aspect ratio preserved */}
      <video
        ref={videoRef}
        className="w-full aspect-video object-contain bg-black"
        muted
        playsInline
      />

      {/* Status Badges */}
      <div className="absolute top-4 left-4 flex gap-2">
        {streaming ? (
          <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            LIVE
          </div>
        ) : (
          <div className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            Connecting...
          </div>
        )}
        
        <div className="bg-black/60 text-white px-3 py-1 rounded-full text-sm">
          {connectionState}
        </div>
        
        {/* Viewer Count */}
        {streaming && (
          <div className="bg-black/60 text-white px-3 py-1 rounded-full text-sm">
            👁️ {viewerCount}
          </div>
        )}
      </div>

      {/* End Stream Button - Smaller on mobile */}
      {streaming && (
        <div className="absolute bottom-4 right-4">
          <button
            onClick={handleEndStream}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 md:px-6 md:py-3 rounded-lg font-bold transition-colors flex items-center gap-2 text-sm md:text-base"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">End Stream</span>
            <span className="sm:hidden">End</span>
          </button>
        </div>
      )}

      {/* Info - Hidden on mobile for more space */}
      <div className="hidden md:block absolute bottom-4 left-4 bg-black/60 text-white px-4 py-2 rounded-lg text-sm">
        <p className="font-bold">Streaming to Mux</p>
        <p className="text-xs text-gray-300">Viewers can watch via HLS</p>
      </div>
    </div>
  );
}

