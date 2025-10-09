import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { supabase, getCurrentUser, getUserProfile, getUserPosts, followUser, unfollowUser } from '../../lib/supabase';
import { createTipCheckoutSession, createVaultUnlockSession } from '../../lib/stripe';
import ProfileCard from '../../components/ProfileCard';
import FeedItem from '../../components/FeedItem';
import type { User, Post, FeedItem as FeedItemType, ProfileData } from '../../types';
import { formatDate, generateAvatarPlaceholder } from '../../utils/helpers';

export default function Profile() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<ProfileData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<FeedItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');

  useEffect(() => {
    if (id) {
      loadProfile();
    }
  }, [id]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const authUser = await getCurrentUser();
      if (authUser) {
        const { data: profile } = await (supabase as any)
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (profile) {
          setCurrentUser(profile);
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadProfile = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Load user profile with stats
      const { data: profile, error: profileError } = await (supabase as any)
        .rpc('get_user_profile', { user_uuid: id as string });
      
      if (profileError) throw profileError;
      
      if (profile && profile.length > 0) {
        setUser(profile[0]);
        
        // Check if current user is following this user
        if (currentUser && currentUser.id !== id) {
          const { data: follow } = await (supabase as any)
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', id)
            .single();
          
          setUser(prev => prev ? { ...prev, is_following: !!follow } : null);
        }
      } else {
        setError('User not found');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (offset = 0) => {
    if (!id) return;

    try {
      const { data, error } = await (supabase as any)
        .from('posts')
        .select(`
          *,
          user:users(*),
          likes_count:likes(count),
          comments_count:comments(count)
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .range(offset, offset + 19);

      if (error) throw error;

      // Check if current user has liked each post
      const postsWithLikes = await Promise.all(
        (data || []).map(async (post: any) => {
          let isLiked = false;
          if (currentUser) {
            const { data: like } = await (supabase as any)
              .from('likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', currentUser.id)
              .maybeSingle();
            isLiked = !!like;
          }

          // Check vault access
          let hasAccess = !post.is_vault;
          if (post.is_vault && currentUser && currentUser.id !== id) {
            const { data: access } = await (supabase as any)
              .from('vault_access')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', currentUser.id)
              .maybeSingle();
            hasAccess = !!access;
          }

          return {
            ...post,
            is_liked: isLiked,
            has_access: hasAccess,
          };
        })
      );

      if (offset === 0) {
        setPosts(postsWithLikes);
      } else {
        setPosts(prev => [...prev, ...postsWithLikes]);
      }

      setHasMore((data || []).length === 20);
    } catch (error) {
      console.error('Error loading posts:', error);
      setError('Failed to load posts');
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadPosts(posts.length);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      await followUser(userId, currentUser.id);
      setUser(prev => prev ? { 
        ...prev, 
        is_following: true,
        followers_count: (prev.followers_count || 0) + 1
      } : null);
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!currentUser) return;

    try {
      await unfollowUser(userId, currentUser.id);
      setUser(prev => prev ? { 
        ...prev, 
        is_following: false,
        followers_count: Math.max(0, (prev.followers_count || 0) - 1)
      } : null);
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const handleComment = async (postId: string, text: string) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      // Create comment
      const { error } = await (supabase as any)
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: text,
        });

      if (error) throw error;

      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, comments_count: (post.comments_count || 0) + 1 }
          : post
      ));
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!currentUser) return;

    try {
      // Delete from database
      const { error } = await (supabase as any)
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', currentUser.id); // Extra safety check

      if (error) throw error;

      // Remove from local state
      setPosts(prev => prev.filter(post => post.id !== postId));
      
      // Update user's post count
      if (user) {
        setUser(prev => prev ? { 
          ...prev, 
          posts_count: Math.max(0, (prev.posts_count || 0) - 1)
        } : null);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleTip = async (userId: string, amount: number) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      const session = await createTipCheckoutSession({
        fromUserId: currentUser.id,
        toUserId: userId,
        amount: amount,
      });

      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating tip session:', error);
      setError('Failed to send tip. Please try again.');
    }
  };

  const handleUnlock = async (postId: string) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      const post = posts.find(p => p.id === postId);
      if (!post || !post.vault_price) return;

      const session = await createVaultUnlockSession({
        fromUserId: currentUser.id,
        postId: postId,
        postPrice: post.vault_price,
      });

      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating unlock session:', error);
      setError('Failed to unlock content. Please try again.');
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      const { data: existingLike } = await (supabase as any)
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (existingLike) {
        await (supabase as any)
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);

        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                is_liked: false, 
                likes_count: Math.max(0, post.likes_count - 1) 
              }
            : post
        ));
      } else {
        await (supabase as any)
          .from('likes')
          .insert({ post_id: postId, user_id: currentUser.id });

        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                is_liked: true, 
                likes_count: post.likes_count + 1 
              }
            : post
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Profile not found</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{user.display_name} (@{user.username}) - FeetSocial</title>
        <meta name="description" content={`View ${user.display_name}'s profile on FeetSocial`} />
      </Head>

      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">FS</span>
                </div>
                <span className="text-white font-bold text-xl">FeetSocial</span>
              </Link>

              <div className="flex items-center space-x-4">
                {currentUser && (
                  <>
                    <Link
                      href="/upload"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Create Post
                    </Link>
                    <Link href={`/profile/${currentUser.id}`}>
                      <div className="w-8 h-8 bg-gray-700 rounded-full overflow-hidden">
                        {currentUser.avatar_url ? (
                          <img
                            src={currentUser.avatar_url}
                            alt={currentUser.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-sm font-medium">
                            {currentUser.display_name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Profile Card */}
          <div className="mb-8">
            <ProfileCard
              user={user}
              currentUserId={currentUser?.id}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              onTip={handleTip}
            />
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-700 mb-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'posts'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Posts ({user.posts_count || 0})
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'about'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                About
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'posts' && (
            <div className="space-y-6">
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-white text-lg font-medium mb-2">No posts yet</h3>
                  <p className="text-gray-400">
                    {currentUser?.id === user.id 
                      ? "You haven't shared any content yet."
                      : `${user.display_name} hasn't shared any content yet.`
                    }
                  </p>
                  {currentUser?.id === user.id && (
                    <Link
                      href="/upload"
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mt-4"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Create Your First Post
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {posts.map((post) => (
                    <FeedItem
                      key={post.id}
                      post={post}
                      currentUserId={currentUser?.id}
                      onLike={handleLike}
                      onComment={handleComment}
                      onUnlock={handleUnlock}
                      onTip={handleTip}
                      onDelete={handleDelete}
                    />
                  ))}

                  {/* Load More */}
                  {hasMore && (
                    <div className="text-center">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loadingMore ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Loading...</span>
                          </div>
                        ) : (
                          'Load More Posts'
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="bg-gray-800 rounded-lg p-6 space-y-6">
              <h2 className="text-white text-xl font-semibold">About {user.display_name}</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-gray-300 font-medium mb-2">Bio</h3>
                  <p className="text-gray-400">
                    {user.bio || 'No bio available'}
                  </p>
                </div>

                <div>
                  <h3 className="text-gray-300 font-medium mb-2">Joined</h3>
                  <p className="text-gray-400">{formatDate(user.created_at)}</p>
                </div>

                {user.is_creator && (
                  <div>
                    <h3 className="text-gray-300 font-medium mb-2">Creator Status</h3>
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span className="text-purple-400">Verified Creator</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      This creator accepts tips and offers premium content
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

