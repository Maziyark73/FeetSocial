import { useState } from 'react';
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
  onUnlock: (postId: string) => void;
  onTip: (userId: string, amount: number) => void;
}

export default function FeedItem({
  post,
  currentUserId,
  onLike,
  onUnlock,
  onTip,
}: FeedItemProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isLiking, setIsLiking] = useState(false);

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

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUserId) return;
    
    // TODO: Implement comment submission
    console.log('Comment:', commentText);
    setCommentText('');
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

    if (post.media_type === 'video' && post.playback_url) {
      return (
        <div className="relative aspect-video w-full bg-gray-900 rounded-lg overflow-hidden">
          {post.is_vault && !(post as any).has_access ? (
            <div className="w-full h-full bg-black flex items-center justify-center">
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
          ) : (
            <video
              controls
              className="w-full h-full object-cover"
              poster={post.image_url}
            >
              <source src={post.playback_url} type="application/x-mpegURL" />
              Your browser does not support the video tag.
            </video>
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
            {/* TODO: Implement comments list */}
            <p className="text-gray-500 text-sm text-center py-4">
              Comments feature coming soon
            </p>
          </div>
        </div>
      )}
    </article>
  );
}
