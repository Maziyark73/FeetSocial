import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface HLSViewerProps {
  playbackUrl: string; // Mux HLS URL
  autoplay?: boolean;
  muted?: boolean;
  className?: string;
}

export default function HLSViewer({ 
  playbackUrl, 
  autoplay = true, 
  muted = true,
  className = '' 
}: HLSViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log('🎬 Initializing HLS player for:', playbackUrl);

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hls.loadSource(playbackUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS manifest parsed');
        setLoading(false);
        
        if (autoplay) {
          video.play()
            .then(() => {
              console.log('✅ Video playing');
              setIsPlaying(true);
            })
            .catch((err) => {
              console.warn('⚠️ Autoplay prevented:', err);
              setIsPlaying(false);
            });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS error:', data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('🔄 Network error, attempting to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('🔄 Media error, attempting to recover...');
              hls.recoverMediaError();
              break;
            default:
              setError('Unable to load video stream');
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      console.log('✅ Using native HLS support');
      video.src = playbackUrl;
      
      video.addEventListener('loadedmetadata', () => {
        console.log('✅ Video metadata loaded');
        setLoading(false);
        
        if (autoplay) {
          video.play()
            .then(() => {
              console.log('✅ Video playing');
              setIsPlaying(true);
            })
            .catch((err) => {
              console.warn('⚠️ Autoplay prevented:', err);
              setIsPlaying(false);
            });
        }
      });

      video.addEventListener('error', () => {
        console.error('❌ Video error');
        setError('Unable to load video stream');
      });
    } else {
      setError('HLS is not supported in this browser');
    }

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [playbackUrl, autoplay]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('Error playing video:', err));
    }
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  if (error) {
    return (
      <div className={`relative bg-gray-900 flex items-center justify-center ${className}`}>
        <div className="text-center text-white p-4">
          <svg className="w-12 h-12 mx-auto mb-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        muted={isMuted}
        controls={false}
      />

      {/* Loading Spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Play/Pause Overlay (when not playing) */}
      {!isPlaying && !loading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer"
          onClick={handlePlayPause}
        >
          <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors">
            <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      {isPlaying && (
        <div className="absolute bottom-4 right-4 flex gap-2">
          {/* Mute/Unmute Button */}
          <button
            onClick={handleMuteToggle}
            className="bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-all"
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
        </div>
      )}

      {/* Live Badge */}
      <div className="absolute top-4 left-4">
        <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          LIVE
        </div>
      </div>
    </div>
  );
}

