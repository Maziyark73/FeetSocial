import { useRef, useEffect, useState } from 'react';

interface LivePlayerProps {
  playbackUrl: string;
  title: string;
  isLive: boolean;
  viewerCount?: number;
}

export default function LivePlayer({ 
  playbackUrl, 
  title, 
  isLive,
  viewerCount = 0 
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    // Auto-play when component mounts
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.log('Autoplay prevented:', err);
      });
    }
  }, [playbackUrl]);

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden">
      {/* Live Indicator */}
      {isLive && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-white font-bold text-sm">LIVE</span>
          </div>
          <div className="bg-black/60 px-3 py-1 rounded-full">
            <span className="text-white text-sm">👁️ {viewerCount.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Video Player */}
      <video
        ref={videoRef}
        className="w-full max-h-[600px] bg-black"
        controls
        muted={isMuted}
        playsInline
        autoPlay
        style={{ display: 'block' }}
      >
        <source src={playbackUrl} type="application/x-mpegURL" />
        Your browser does not support HLS video playback.
      </video>

      {/* Mute/Unmute Button */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute bottom-20 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
      >
        {isMuted ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        )}
      </button>

      {/* Stream Ended Overlay */}
      {!isLive && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <p className="text-white text-xl font-bold mb-2">Stream Ended</p>
            <p className="text-gray-400">Thanks for watching!</p>
          </div>
        </div>
      )}
    </div>
  );
}

