import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatCurrency, formatDate, generateAvatarPlaceholder } from '../utils/helpers';
import type { User } from '../types';
import TipButton from './TipButton';

interface ProfileCardProps {
  user: User & {
    posts_count?: number;
    followers_count?: number;
    following_count?: number;
    total_earnings?: number;
    is_following?: boolean;
  };
  currentUserId?: string;
  onFollow: (userId: string) => void;
  onUnfollow: (userId: string) => void;
  onTip: (userId: string, amount: number) => void;
}

export default function ProfileCard({
  user,
  currentUserId,
  onFollow,
  onUnfollow,
  onTip,
}: ProfileCardProps) {
  const [isFollowing, setIsFollowing] = useState(user.is_following || false);
  const [followLoading, setFollowLoading] = useState(false);

  const handleFollowToggle = async () => {
    if (followLoading || !currentUserId || currentUserId === user.id) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await onUnfollow(user.id);
        setIsFollowing(false);
      } else {
        await onFollow(user.id);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleTip = async (amount: number) => {
    await onTip(user.id, amount);
  };

  const isOwnProfile = currentUserId === user.id;

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
        {/* Avatar */}
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.display_name}
              fill
              className="object-cover"
            />
          ) : (
            <img
              src={generateAvatarPlaceholder(user.display_name, 96)}
              alt={user.display_name}
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Creator Badge */}
          {user.is_creator && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div>
            <h1 className="text-2xl font-bold text-white">{user.display_name}</h1>
            <p className="text-gray-400">@{user.username}</p>
          </div>
          
          {user.bio && (
            <p className="text-gray-300">{user.bio}</p>
          )}
          
          <div className="text-sm text-gray-400">
            Joined {formatDate(user.created_at)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          {!isOwnProfile && (
            <>
              {/* Follow Button */}
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isFollowing
                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {followLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Loading...</span>
                  </div>
                ) : isFollowing ? (
                  'Following'
                ) : (
                  'Follow'
                )}
              </button>

              {/* Tip Button */}
              {user.is_creator && (
                <TipButton
                  onTip={handleTip}
                  creatorName={user.display_name}
                />
              )}
            </>
          )}

          {isOwnProfile && (
            <Link
              href="/settings"
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-center"
            >
              Edit Profile
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {user.posts_count || 0}
          </div>
          <div className="text-sm text-gray-400">Posts</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {user.followers_count || 0}
          </div>
          <div className="text-sm text-gray-400">Followers</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {user.following_count || 0}
          </div>
          <div className="text-sm text-gray-400">Following</div>
        </div>
        
        {user.is_creator && (
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(user.total_earnings || 0)}
            </div>
            <div className="text-sm text-gray-400">Earnings</div>
          </div>
        )}
      </div>

      {/* Creator Status */}
      {user.is_creator && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-purple-300 font-medium">Verified Creator</span>
          </div>
          <p className="text-purple-200 text-sm">
            This creator accepts tips and offers premium content. 
            {isOwnProfile && (
              <span> You can manage your creator settings in your profile.</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

