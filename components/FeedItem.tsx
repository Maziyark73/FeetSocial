import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate, formatCurrency, generateAvatarPlaceholder } from '../utils/helpers';
import type { FeedItem as FeedItemType } from '../types';
import VaultUnlock from './VaultUnlock';
import TipButton from './TipButton';

interface FeedItemProps {
  post: FeedItemType;
  currentUserId?: string;
  onLike: (postId: string) => void;
  onComment: (postId: string, text: string, parentId?: string | null) => void;
  onUnlock: (postId: string) => void;
  onTip: (userId: string, amount: number) => void;
  onDelete?: (postId: string) => void;
}

export default function FeedItem({
  post,
  currentUserId,
  onLike,
  onComment,
  onUnlock,
  onTip,
  onDelete,
}: FeedItemProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Load comments when expanded
  useEffect(() => {
    if (showComments && comments.length === 0) {
      loadComments();
    }
  }, [showComments]);

  // Autoplay video when in viewport (TikTok style)
  useEffect(() => {
    if (!videoRef.current || post.media_type !== 'video') return;

    const video = videoRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Video is in viewport - play
            video.play().catch((err) => {
              console.log('Autoplay prevented:', err);
            });
          } else {
            // Video is out of viewport - pause
            video.pause();
          }
        });
      },
      { threshold: 0.5 } // Play when 50% visible
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [post.media_type]);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await onLike(post.id);
    } finally {
      setIsLiking(false);
    }
  };

  const handleUnlock = async () => {
    await onUnlock(post.id);
  };

  const handleTip = async (amount: number) => {
    await onTip(post.user.id, amount);
  };

  const loadComments = async () => {
    console.log('Loading comments for post:', post.id);
    setLoadingComments(true);
    try {
      // Import the existing supabase client
      const { supabase } = await import('../lib/supabase');

      const { data, error } = await (supabase as any)
        .from('comments')
        .select(`
          *,
          user:users(id, username, display_name, avatar_url)
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading comments:', error);
        throw error;
      }
      
      console.log('Comments loaded:', data);
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleComment = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    const text = parentId ? replyText : commentText;
    if (!text.trim() || !currentUserId) return;
    
    try {
      await onComment(post.id, text.trim(), parentId);
      if (parentId) {
        setReplyText('');
        setReplyingTo(null);
      } else {
        setCommentText('');
      }
      // Reload comments to show the new one
      await loadComments();
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const renderMedia = () => {
    if (post.media_type === 'image' && post.image_url) {
      return (
        <div className="relative aspect-video w-full bg-gray-900 rounded-lg overflow-hidden">
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {post.is_vault && !(post as any).has_access && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <p className="text-white font-medium">Premium Content</p>
                <p className="text-gray-300 text-sm">
                  {formatCurrency(post.vault_price || 0)} to unlock
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (post.media_type === 'video') {
      // Use playback_url (Mux HLS) if available, otherwise fall back to raw video URL
      const videoUrl = post.playback_url || (post as any).video_url || post.image_url;
      const isMuxVideo = post.playback_url && post.playback_url.includes('mux.com');
      
      console.log('Video post:', {
        media_type: post.media_type,
        videoUrl,
        playback_url: post.playback_url,
        image_url: post.image_url,
        isMuxVideo
      });
      
      return (
        <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden">
          {post.is_vault && !(post as any).has_access ? (
            <div className="aspect-video w-full bg-black flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <p className="text-white font-medium">Premium Video</p>
                <p className="text-gray-300 text-sm">
                  {formatCurrency(post.vault_price || 0)} to unlock
                </p>
              </div>
            </div>
          ) : videoUrl ? (
            <div className="relative">
              <video
                ref={videoRef}
                controls
                controlsList="nodownload"
                className="w-full max-h-[600px] bg-black cursor-pointer"
                preload="metadata"
                style={{ display: 'block' }}
                loop
                muted={isMuted}
                playsInline
                onClick={(e) => {
                  const video = e.currentTarget;
                  if (video.paused) {
                    video.play();
                  } else {
                    video.pause();
                  }
                }}
              >
                {isMuxVideo ? (
                  <source src={videoUrl} type="application/x-mpegURL" />
                ) : (
                  <source src={videoUrl} type="video/mp4" />
                )}
                Your browser does not support the video tag.
              </video>
              
              {/* Mute/Unmute Button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute bottom-20 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
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
            </div>
          ) : (
            <div className="aspect-video w-full bg-gray-800 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <p className="text-sm">Video processing...</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="aspect-video w-full bg-gray-900 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No media available</p>
      </div>
    );
  };

  // Safety check - if post data is malformed, don't render
  if (!post || !post.user || !post.user.id) {
    console.error('Malformed post data:', post);
    return null;
  }

  return (
    <article className="bg-gray-800 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link href={`/profile/${post.user.id}`}>
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-700">
            {post.user.avatar_url ? (
              <Image
                src={post.user.avatar_url}
                alt={post.user.display_name}
                fill
                className="object-cover"
              />
            ) : (
              <img
                src={generateAvatarPlaceholder(post.user.display_name)}
                alt={post.user.display_name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </Link>
        
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${post.user.id}`}>
            <h3 className="text-white font-medium hover:text-purple-300 transition-colors">
              {post.user.display_name}
            </h3>
          </Link>
          <p className="text-gray-400 text-sm">@{post.user.username}</p>
        </div>

        {/* Delete button for own posts */}
        {currentUserId === post.user_id && onDelete && (
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this post?')) {
                onDelete(post.id);
              }
            }}
            className="text-gray-400 hover:text-red-500 transition-colors p-2"
            title="Delete post"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
        
        <div className="text-gray-400 text-sm">
          {formatDate(post.created_at)}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        <h2 className="text-white font-semibold text-lg">{post.title}</h2>
        
        {post.description && (
          <p className="text-gray-300 whitespace-pre-wrap">{post.description}</p>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded-full text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Media */}
        {renderMedia()}

        {/* Vault Unlock */}
        {post.is_vault && !(post as any).has_access && currentUserId !== post.user.id && (
          <VaultUnlock
            price={post.vault_price || 0}
            onUnlock={handleUnlock}
            creatorName={post.user.display_name}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <div className="flex items-center space-x-6">
          {/* Like */}
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center space-x-2 transition-colors ${
              post.is_liked
                ? 'text-red-400 hover:text-red-300'
                : 'text-gray-400 hover:text-red-400'
            }`}
          >
            <svg className="w-5 h-5" fill={post.is_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-sm">{post.likes_count}</span>
          </button>

          {/* Comment */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 text-gray-400 hover:text-blue-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm">{post.comments_count}</span>
          </button>

          {/* Tip */}
          {currentUserId && currentUserId !== post.user.id && (
            <TipButton
              onTip={handleTip}
              creatorName={post.user.display_name}
              disabled={!post.user.is_creator}
            />
          )}
        </div>

        {/* Share */}
        <button className="text-gray-400 hover:text-green-400 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="pt-4 border-t border-gray-700 space-y-4">
          {/* Comment Form */}
          {currentUserId && (
            <form onSubmit={handleComment} className="flex space-x-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Post
              </button>
            </form>
          )}

          {/* Comments List */}
          <div className="space-y-3">
            {loadingComments ? (
              <p className="text-gray-500 text-sm text-center py-4">Loading comments...</p>
            ) : comments.length > 0 ? (
              comments
                .filter((c: any) => !c.parent_id) // Only show top-level comments
                .map((comment: any) => {
                  const replies = comments.filter((c: any) => c.parent_id === comment.id);
                  return (
                    <div key={comment.id} className="space-y-2">
                      {/* Main Comment */}
                      <div className="flex space-x-3">
                        <Link href={`/profile/${comment.user?.id}`}>
                          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                            {comment.user?.avatar_url ? (
                              <Image
                                src={comment.user.avatar_url}
                                alt={comment.user.display_name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white text-xs">
                                {comment.user?.display_name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-700 rounded-lg px-3 py-2">
                            <Link href={`/profile/${comment.user?.id}`}>
                              <p className="text-sm font-medium text-white hover:text-purple-300 transition-colors">
                                {comment.user?.display_name}
                              </p>
                            </Link>
                            <p className="text-sm text-gray-300 mt-1">{comment.content}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 ml-3">
                            <p className="text-xs text-gray-500">
                              {formatDate(comment.created_at)}
                            </p>
                            {currentUserId && (
                              <button
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                Reply
                              </button>
                            )}
                          </div>

                          {/* Reply Form */}
                          {replyingTo === comment.id && (
                            <form onSubmit={(e) => handleComment(e, comment.id)} className="mt-2 ml-3">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Write a reply..."
                                  className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <button
                                  type="submit"
                                  className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                  Reply
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Nested Replies */}
                          {replies.length > 0 && (
                            <div className="mt-2 ml-6 space-y-2 border-l-2 border-gray-700 pl-3">
                              {replies.map((reply: any) => (
                                <div key={reply.id} className="flex space-x-2">
                                  <Link href={`/profile/${reply.user?.id}`}>
                                    <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                      {reply.user?.avatar_url ? (
                                        <Image
                                          src={reply.user.avatar_url}
                                          alt={reply.user.display_name}
                                          fill
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white text-xs">
                                          {reply.user?.display_name?.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                  </Link>
                                  <div className="flex-1 min-w-0">
                                    <div className="bg-gray-700/50 rounded-lg px-3 py-2">
                                      <Link href={`/profile/${reply.user?.id}`}>
                                        <p className="text-xs font-medium text-white hover:text-purple-300 transition-colors">
                                          {reply.user?.display_name}
                                        </p>
                                      </Link>
                                      <p className="text-xs text-gray-300 mt-1">{reply.content}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 ml-2">
                                      {formatDate(reply.created_at)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
