import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import type { FeedItem as FeedItemType } from '../types';

interface TikTokFeedItemProps {
  post: FeedItemType;
  currentUserId?: string;
  onLike: (postId: string) => void;
  isActive: boolean; // Is this video currently in view?
}

export default function TikTokFeedItem({ post, currentUserId, onLike, isActive }: TikTokFeedItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastTapRef = useRef<number>(0);
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);

  // Auto-play when active
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.log('Autoplay prevented:', err);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  // Double-tap to like
  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    
    if (now - lastTapRef.current < 300) {
      // Double tap!
      if (!post.is_liked && currentUserId) {
        onLike(post.id);
        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 1000);
      }
    }
    
    lastTapRef.current = now;
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUserId) return;

    try {
      await (supabase as any)
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          text: commentText.trim(),
        });
      
      setCommentText('');
      setShowCommentInput(false);
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const videoUrl = post.playback_url || (post as any).video_url || post.image_url;

  return (
    <div className="relative w-full h-screen bg-black snap-start snap-always">
      {/* Video */}
      {post.media_type === 'video' && videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-contain"
          loop
          muted={isMuted}
          playsInline
          onClick={handleDoubleTap}
        />
      ) : post.media_type === 'image' && post.image_url ? (
        <img
          src={post.image_url}
          alt={post.title}
          className="absolute inset-0 w-full h-full object-contain"
          onClick={handleDoubleTap}
        />
      ) : null}

      {/* Double-Tap Heart Animation */}
      {showLikeAnimation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <svg className="w-32 h-32 text-white animate-ping-once" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {/* Right Side Action Buttons (TikTok Style) */}
      <div className="absolute right-2 bottom-24 flex flex-col items-center gap-6 z-30">
        {/* Creator Avatar */}
        <Link href={`/profile/${post.user.id}`} className="relative">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
            {post.user.avatar_url ? (
              <img src={post.user.avatar_url} alt={post.user.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold">
                {post.user.display_name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        {/* Like Button */}
        <button
          onClick={() => currentUserId && onLike(post.id)}
          className="flex flex-col items-center"
        >
          <svg 
            className={`w-8 h-8 ${post.is_liked ? 'text-red-500' : 'text-white'} drop-shadow-lg`} 
            fill={post.is_liked ? 'currentColor' : 'none'}
            stroke="currentColor" 
            strokeWidth={post.is_liked ? 0 : 2}
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          <span className="text-white text-xs mt-1 font-semibold drop-shadow-lg">
            {post.likes_count || 0}
          </span>
        </button>

        {/* Comment Button */}
        <button
          onClick={() => setShowCommentInput(!showCommentInput)}
          className="flex flex-col items-center"
        >
          <svg className="w-8 h-8 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-white text-xs mt-1 font-semibold drop-shadow-lg">
            {post.comments_count || 0}
          </span>
        </button>

        {/* Share Button */}
        <button className="flex flex-col items-center">
          <svg className="w-8 h-8 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span className="text-white text-xs mt-1 font-semibold drop-shadow-lg">Share</span>
        </button>

        {/* Mute/Unmute Button */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="w-8 h-8 flex items-center justify-center"
        >
          {isMuted ? (
            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Bottom Info (TikTok Style) */}
      <div className="absolute left-0 right-0 bottom-20 p-4 z-20 bg-gradient-to-t from-black/60 to-transparent">
        <Link href={`/profile/${post.user.id}`}>
          <p className="text-white font-semibold text-sm drop-shadow-lg mb-1">
            @{post.user.username}
          </p>
        </Link>
        <p className="text-white text-sm drop-shadow-lg line-clamp-2">
          {post.title}
        </p>
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {post.tags.map((tag: string) => (
              <span key={tag} className="text-white text-xs drop-shadow-lg">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Comment Input (slides up from bottom) */}
      {showCommentInput && currentUserId && (
        <div className="absolute bottom-16 left-0 right-0 p-4 bg-black/80 backdrop-blur-md z-40">
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-full focus:outline-none focus:ring-2 focus:ring-white/40 text-sm"
              autoFocus
            />
            <button
              type="submit"
              className="px-6 py-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

