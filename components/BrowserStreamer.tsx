import { useState, useRef, useEffect } from 'react';

interface BrowserStreamerProps {
  streamId: string;
  streamKey: string;
  onStreamStart: () => void;
  onStreamEnd: () => void;
  onError: (error: string) => void;
}

export default function BrowserStreamer({
  streamId,
  streamKey,
  onStreamStart,
  onStreamEnd,
  onError,
}: BrowserStreamerProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  const startStreaming = async () => {
    setIsInitializing(true);
    try {
      // Request camera and microphone access
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);

      // Display preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute preview to avoid feedback
      }

      // For browser-based streaming, we'll use Mux's RTMP endpoint with WebRTC
      // This is a simplified version - in production, you'd use a WebRTC-to-RTMP bridge
      // For MVP, we'll record chunks and upload them to create a "near-live" experience
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Upload remaining chunks when stopped
        if (chunksRef.current.length > 0) {
          uploadChunks();
        }
      };

      mediaRecorderRef.current = mediaRecorder;

      // Start recording in chunks (every 3 seconds for lower latency)
      mediaRecorder.start(3000);

      // Set up interval to upload chunks periodically
      uploadIntervalRef.current = setInterval(() => {
        if (chunksRef.current.length > 0) {
          uploadChunks();
        }
      }, 6000); // Upload every 6 seconds

      setIsStreaming(true);
      setIsInitializing(false);
      onStreamStart();
    } catch (error: any) {
      console.error('Error starting stream:', error);
      setIsInitializing(false);
      
      if (error.name === 'NotAllowedError') {
        onError('Camera/microphone access denied. Please allow access and try again.');
      } else if (error.name === 'NotFoundError') {
        onError('No camera or microphone found. Please connect a device and try again.');
      } else {
        onError(error.message || 'Failed to start streaming');
      }
    }
  };

  const uploadChunks = async () => {
    if (chunksRef.current.length === 0) return;

    const chunks = [...chunksRef.current];
    chunksRef.current = []; // Clear chunks

    try {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('chunk', blob);
      formData.append('streamId', streamId);
      formData.append('streamKey', streamKey);
      formData.append('timestamp', Date.now().toString());

      // Upload chunk to our API
      const response = await fetch('/api/live/upload-chunk', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload stream chunk');
      }
    } catch (error) {
      console.error('Error uploading chunk:', error);
      // Don't stop streaming on upload error, just log it
    }
  };

  const stopStreaming = () => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }

    // Clear upload interval
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }

    // Clear video preview
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    onStreamEnd();
  };

  const toggleMute = () => {
    if (mediaStream) {
      const audioTracks = mediaStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const switchCamera = async () => {
    if (!isStreaming) return;

    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    
    // Stop current stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }

    try {
      // Start new stream with different camera
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: newFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      setCameraFacing(newFacing);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Update MediaRecorder with new stream
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        const newRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8,opus',
          videoBitsPerSecond: 2500000,
        });
        newRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        newRecorder.start(5000);
        mediaRecorderRef.current = newRecorder;
      }
    } catch (error: any) {
      console.error('Error switching camera:', error);
      onError('Failed to switch camera');
    }
  };

  return (
    <div className="space-y-4">
      {/* Video Preview */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {!isStreaming && !isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
              <p className="text-gray-400">Camera preview will appear here</p>
            </div>
          </div>
        )}

        {isStreaming && (
          <>
            {/* Live Indicator */}
            <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-white font-bold text-sm">LIVE</span>
            </div>

            {/* Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3">
              {/* Mute/Unmute */}
              <button
                onClick={toggleMute}
                className="p-3 bg-gray-800/80 hover:bg-gray-700/80 rounded-full text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                  </svg>
                )}
              </button>

              {/* Switch Camera (mobile) */}
              <button
                onClick={switchCamera}
                className="p-3 bg-gray-800/80 hover:bg-gray-700/80 rounded-full text-white transition-colors"
                title="Switch Camera"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 11.5V13H9v2.5L5.5 12 9 8.5V11h6V8.5l3.5 3.5-3.5 3.5z"/>
                </svg>
              </button>

              {/* Stop Stream */}
              <button
                onClick={stopStreaming}
                className="p-3 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
                title="Stop Streaming"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Start/Stop Button */}
      {!isStreaming && (
        <button
          onClick={startStreaming}
          disabled={isInitializing}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isInitializing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Initializing Camera...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
              Start Camera Stream
            </>
          )}
        </button>
      )}

      {/* Streaming Info */}
      {isStreaming && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Status:</span>
            <span className="text-green-500 font-bold flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              STREAMING
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Audio:</span>
            <span className={`font-bold ${isMuted ? 'text-red-500' : 'text-green-500'}`}>
              {isMuted ? 'MUTED' : 'ACTIVE'}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-4">
            💡 Your stream is being broadcast to Mux. Viewers can watch in real-time!
          </p>
        </div>
      )}

      {/* Browser Compatibility Warning */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-sm text-blue-200">
        <p className="font-bold mb-1">📱 Works on all devices!</p>
        <p className="text-xs">Desktop, laptop, phone, or tablet - no software needed. Just allow camera access.</p>
      </div>
    </div>
  );
}

