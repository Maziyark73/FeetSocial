import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase, getCurrentUser } from '../lib/supabase';
import { createTipCheckoutSession, createVaultUnlockSession } from '../lib/stripe';
import FeedItem from '../components/FeedItem';
import WebRTCViewer from '../components/WebRTCViewer';
import type { FeedItem as FeedItemType, User } from '../types';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<FeedItemType[]>([]);
  const [allPosts, setAllPosts] = useState<FeedItemType[]>([]); // Store all posts for filtering
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const router = useRouter();

  // Load initial data
  useEffect(() => {
    loadUser();
    loadPosts();
    loadLiveStreams();
  }, []);

  // Poll for live stream updates and subscribe to real-time changes
  useEffect(() => {
    const interval = setInterval(loadLiveStreams, 15000); // Refresh every 15 seconds
    
    // Subscribe to live stream changes
    const subscription = (supabase as any)
      .channel('live-streams-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'live_streams' },
        (payload: any) => {
          console.log('Live stream change detected:', payload);
          loadLiveStreams(); // Reload streams on any change
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(subscription);
    };
  }, []);

  // Filter posts by tag
  useEffect(() => {
    if (selectedTag) {
      setPosts(allPosts.filter(post => post.tags && post.tags.includes(selectedTag)));
    } else {
      setPosts(allPosts);
    }
  }, [selectedTag, allPosts]);

  const loadUser = async () => {
    try {
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

  const loadLiveStreams = async () => {
    try {
      // Query live streams and manually join with users
      const { data: streams, error: streamsError } = await (supabase as any)
        .from('live_streams')
        .select('*')
        .eq('status', 'active')
        .order('started_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (streamsError) throw streamsError;
      
      if (!streams || streams.length === 0) {
        setLiveStreams([]);
        return;
      }

      // Fetch user data for each stream
      const userIds = streams.map((s: any) => s.user_id);
      const { data: users, error: usersError } = await (supabase as any)
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Merge streams with their user data
      const transformed = streams.map((stream: any) => ({
        ...stream,
        user: users?.find((u: any) => u.id === stream.user_id) || null,
      }));
      
      setLiveStreams(transformed);
    } catch (error) {
      console.error('Error loading live streams:', error);
      setLiveStreams([]); // Clear on error
    }
  };

  const loadPosts = async (offset = 0) => {
    try {
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
        setAllPosts(transformedPosts);
      } else {
        setPosts(prev => [...prev, ...transformedPosts]);
        setAllPosts(prev => [...prev, ...transformedPosts]);
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
      // Check if already liked
      const { data: existingLike } = await (supabase as any)
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

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

  const handleComment = async (postId: string, text: string, parentId?: string | null) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      // Create comment
      const { data, error } = await (supabase as any)
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: text,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Comment insert error:', error);
        throw error;
      }

      console.log('Comment created successfully:', data);

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

  const handleLogout = async () => {
    try {
      await (supabase as any).auth.signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
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
                      href="/go-live"
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      Go Live
                    </Link>
                    <Link
                      href="/upload"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Create Post
                    </Link>
                    <Link
                      href="/settings"
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Settings"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
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
                    <button
                      onClick={handleLogout}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Logout"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
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


        {/* Live Streams Section */}
        {liveStreams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
              Live Now
            </h2>
            <div className="space-y-6">
              {liveStreams.map((stream: any) => (
                <div
                  key={stream.id}
                  className="bg-gray-800 rounded-lg overflow-hidden"
                >
                  {/* Stream Video - Embedded inline like TikTok/Instagram */}
                  <div className="relative aspect-video bg-gray-900">
                    {stream.stream_type === 'webrtc' ? (
                      // Only show viewer if this is NOT the streamer's own stream
                      user?.id !== stream.user_id ? (
                        <WebRTCViewer
                          streamId={stream.id}
                          streamerId={stream.user_id}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-white font-bold text-lg mb-2">You're Live! 🎥</p>
                            <p className="text-gray-400 text-sm">This is your own stream</p>
                            <Link
                              href="/go-live"
                              className="mt-4 inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                            >
                              Manage Stream
                            </Link>
                          </div>
                        </div>
                      )
                    ) : stream.playback_url ? (
                      <video
                        src={stream.playback_url}
                        className="w-full h-full object-cover"
                        controls
                        autoPlay
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <svg className="w-16 h-16 text-gray-600 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                          <p className="text-gray-400">Stream starting...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Live Badge */}
                    <div className="absolute top-3 left-3 bg-red-600 px-3 py-1.5 rounded-full flex items-center gap-2 z-10 shadow-lg">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-white font-bold text-sm">LIVE</span>
                    </div>

                    {/* Viewer Count */}
                    <div className="absolute top-3 right-3 bg-black/70 px-3 py-1.5 rounded-full z-10 backdrop-blur-sm">
                      <span className="text-white text-sm font-medium">👁️ {stream.viewer_count || 0}</span>
                    </div>
                  </div>

                  {/* Stream Info */}
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <Link
                        href={`/profile/${stream.user_id}`}
                        className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                      >
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                          {stream.avatar_url ? (
                            <img
                              src={stream.avatar_url}
                              alt={stream.display_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold">
                              {stream.display_name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{stream.display_name}</p>
                          <p className="text-xs text-gray-400">@{stream.username}</p>
                        </div>
                      </Link>
                      
                      <Link
                        href={`/live/${stream.id}`}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                        </svg>
                        Chat
                      </Link>
                    </div>
                    
                    <h3 className="text-white font-bold text-lg mb-1">
                      {stream.title}
                    </h3>
                    {stream.description && (
                      <p className="text-gray-400 text-sm">{stream.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tag Filter */}
        {allPosts.length > 0 && (() => {
          const allTags = Array.from(new Set(allPosts.flatMap(post => post.tags || [])));
          if (allTags.length > 0) {
            return (
              <div className="mb-6 flex items-center space-x-2 overflow-x-auto pb-2">
                <span className="text-gray-400 text-sm whitespace-nowrap">Filter:</span>
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                    !selectedTag 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                      selectedTag === tag 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            );
          }
          return null;
        })()}

        {/* Welcome Message */}
        {!user && (
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
