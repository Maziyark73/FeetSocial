import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase, getCurrentUser } from '../lib/supabase';
import { createTipCheckoutSession, createVaultUnlockSession } from '../lib/stripe';
import { DEMO_MODE, demoFunctions } from '../lib/demo';
import FeedItem from '../components/FeedItem';
import type { FeedItem as FeedItemType, User } from '../types';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<FeedItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // Load initial data
  useEffect(() => {
    loadUser();
    loadPosts();
  }, []);

  const loadUser = async () => {
    try {
      if (DEMO_MODE) {
        const demoUser = await demoFunctions.getCurrentUser();
        setUser(demoUser);
        return;
      }

      const currentUser = await getCurrentUser();
      if (currentUser) {
        const { data: profile } = await (supabase as any)
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        if (profile) {
          setUser(profile);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadPosts = async (offset = 0) => {
    try {
      if (DEMO_MODE) {
        const demoPosts = await demoFunctions.getFeedPosts(user?.id, 20, offset);
        if (offset === 0) {
          setPosts(demoPosts);
        } else {
          setPosts(prev => [...prev, ...demoPosts]);
        }
        setHasMore(demoPosts.length === 20);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const { data, error } = await (supabase as any).rpc('get_feed_posts', {
        user_uuid: user?.id || null,
        limit_count: 20,
        offset_count: offset,
      });

      if (error) throw error;

      // Transform flat SQL result into nested structure
      const transformedPosts = (data || []).map((row: any) => ({
        id: row.post_id,
        user_id: row.user_id,
        title: row.title,
        description: row.description,
        tags: row.tags,
        is_vault: row.is_vault,
        vault_price: row.vault_price,
        media_type: row.media_type,
        playback_url: row.playback_url,
        image_url: row.image_url,
        created_at: row.created_at,
        likes_count: row.likes_count,
        comments_count: row.comments_count,
        is_liked: row.is_liked,
        user: {
          id: row.user_id,
          username: row.username,
          display_name: row.display_name,
          avatar_url: row.avatar_url,
        }
      }));

      if (offset === 0) {
        setPosts(transformedPosts);
      } else {
        setPosts(prev => [...prev, ...transformedPosts]);
      }

      setHasMore(transformedPosts.length === 20);
    } catch (error) {
      console.error('Error loading posts:', error);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadPosts(posts.length);
    }
  }, [loadingMore, hasMore, posts.length]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const handleLike = async (postId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      if (DEMO_MODE) {
        await demoFunctions.toggleLike(postId, user.id);
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                is_liked: !post.is_liked, 
                likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1
              }
            : post
        ));
        return;
      }

      // Check if already liked
      const { data: existingLike } = await (supabase as any)
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        // Unlike
        await (supabase as any)
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

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
        // Like
        await (supabase as any)
          .from('likes')
          .insert({ post_id: postId, user_id: user.id });

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

  const handleUnlock = async (postId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      // Get post details
      const post = posts.find(p => p.id === postId);
      if (!post || !post.vault_price) return;

      if (DEMO_MODE) {
        await demoFunctions.unlockVault(postId, user.id, post.vault_price);
        return;
      }

      // Create checkout session
      const session = await createVaultUnlockSession({
        fromUserId: user.id,
        postId: postId,
        postPrice: post.vault_price,
      });

      // Redirect to Stripe checkout
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

  const handleComment = async (postId: string, text: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      if (DEMO_MODE) {
        await demoFunctions.addComment(postId, user.id, text);
        // Update local state
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, comments_count: (post.comments_count || 0) + 1 }
            : post
        ));
        return;
      }

      // Create comment
      const { error } = await (supabase as any)
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
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
      setError('Failed to post comment');
    }
  };

  const handleDelete = async (postId: string) => {
    if (!user) return;

    try {
      if (DEMO_MODE) {
        await demoFunctions.deletePost(postId);
        setPosts(prev => prev.filter(post => post.id !== postId));
        return;
      }

      // Delete from database
      const { error } = await (supabase as any)
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id); // Extra safety check

      if (error) throw error;

      // Remove from local state
      setPosts(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post');
    }
  };

  const handleTip = async (userId: string, amount: number) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      if (DEMO_MODE) {
        await demoFunctions.sendTip(user.id, userId, amount);
        return;
      }

      // Create tip checkout session
      const session = await createTipCheckoutSession({
        fromUserId: user.id,
        toUserId: userId,
        amount: amount,
      });

      // Redirect to Stripe checkout
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

  const handleFollow = async (userId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      await (supabase as any)
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId });
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!user) return;

    try {
      await (supabase as any)
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white">Loading feed...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>FeetSocial - Creator Platform</title>
        <meta name="description" content="Connect with creators and discover amazing content" />
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
                {user ? (
                  <>
                    <Link
                      href="/upload"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Create Post
                    </Link>
                    <Link href={`/profile/${user.id}`}>
                      <div className="w-8 h-8 bg-gray-700 rounded-full overflow-hidden">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-sm font-medium">
                            {user.display_name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </Link>
                  </>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Link
                      href="/login"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-200">{error}</p>
              <button
                onClick={() => setError('')}
                className="mt-2 text-red-300 hover:text-red-200 text-sm"
              >
                Dismiss
              </button>
            </div>
          )}

        {/* Demo Mode Banner */}
        {DEMO_MODE && (
          <div className="mb-8 bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border border-yellow-500/30 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <h1 className="text-2xl font-bold text-white">
                Demo Mode Active
              </h1>
            </div>
            <p className="text-gray-300 mb-4">
              You're viewing FeetSocial in demo mode. All features are functional with mock data!
            </p>
            <div className="text-sm text-gray-400 space-y-1">
              <p>✅ Try liking posts, tipping creators, and unlocking vault content</p>
              <p>📝 See test-env-setup.md to configure real services</p>
            </div>
          </div>
        )}

        {/* Welcome Message */}
        {!user && !DEMO_MODE && (
          <div className="mb-8 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome to FeetSocial
            </h1>
            <p className="text-gray-300 mb-4">
              Connect with creators, discover amazing content, and support your favorites
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/register"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="px-6 py-2 border border-purple-500 text-purple-300 rounded-lg hover:bg-purple-500/10 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}

          {/* Posts Feed */}
          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-white text-lg font-medium mb-2">No posts yet</h3>
                <p className="text-gray-400 mb-4">
                  Be the first to share some amazing content!
                </p>
                {user && (
                  <Link
                    href="/upload"
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Post
                  </Link>
                )}
              </div>
            ) : (
              posts.map((post) => (
                <FeedItem
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  onLike={handleLike}
                  onComment={handleComment}
                  onUnlock={handleUnlock}
                  onTip={handleTip}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>

          {/* Loading More */}
          {loadingMore && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading more posts...</p>
            </div>
          )}

          {/* End of Feed */}
          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">You've reached the end of the feed</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
