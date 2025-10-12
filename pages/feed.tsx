import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase, getCurrentUser } from '../lib/supabase';
import TikTokFeedItem from '../components/TikTokFeedItem';
import type { FeedItem as FeedItemType, User } from '../types';

export default function TikTokFeed() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<FeedItemType[]>([]);
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
  }, []);

  // Load posts after user is loaded
  useEffect(() => {
    loadPosts();
    loadLiveStreams();
  }, [user]);

  // Poll for live streams
  useEffect(() => {
    const interval = setInterval(loadLiveStreams, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser as User | null);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadPosts = async () => {
    try {
      const { data, error } = await (supabase as any).rpc('get_feed_posts', {
        user_uuid: user?.id || null,
        limit_count: 50,
        offset_count: 0,
      });

      if (error) throw error;

      // Transform flat SQL result into nested FeedItem structure
      const transformed: FeedItemType[] = (data || []).map((row: any) => ({
        id: row.post_id,
        user_id: row.user_id,
        title: row.title,
        description: row.description,
        media_type: row.media_type,
        image_url: row.image_url,
        playback_url: row.playback_url,
        mux_asset_id: row.mux_asset_id,
        is_vault: row.is_vault,
        vault_price: row.vault_price,
        created_at: row.created_at,
        likes_count: row.likes_count,
        comments_count: row.comments_count,
        is_liked: row.is_liked,
        tags: row.tags,
        user: {
          id: row.user_id,
          username: row.username,
          display_name: row.display_name,
          avatar_url: row.avatar_url,
          is_creator: row.is_creator,
        },
      }));

      setPosts(transformed);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLiveStreams = async () => {
    try {
      console.log('📡 [Mobile Feed] Loading live streams...');
      const { data: streams, error } = await (supabase as any)
        .from('live_streams')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`📡 [Mobile Feed] Found ${streams?.length || 0} active streams:`, streams);

      // Manually fetch user data for each stream
      const streamsWithUsers = await Promise.all(
        (streams || []).map(async (stream: any) => {
          const { data: userData } = await (supabase as any)
            .from('users')
            .select('id, username, display_name, avatar_url')
            .eq('id', stream.user_id)
            .single();

          return {
            ...stream,
            user: userData,
          };
        })
      );

      console.log('📡 [Mobile Feed] Streams with users:', streamsWithUsers);
      setLiveStreams(streamsWithUsers);
    } catch (error) {
      console.error('❌ [Mobile Feed] Error loading live streams:', error);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

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
      } else {
        // Like
        await (supabase as any)
          .from('likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });
      }

      // Update local state
      setPosts(posts.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              is_liked: !p.is_liked, 
              likes_count: p.is_liked ? (p.likes_count || 1) - 1 : (p.likes_count || 0) + 1 
            } 
          : p
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Detect which video is in view
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setCurrentIndex(index);
          }
        });
      },
      { threshold: 0.75 }
    );

    const videos = containerRef.current.querySelectorAll('[data-index]');
    videos.forEach((video) => observer.observe(video));

    return () => observer.disconnect();
  }, [posts]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <>
      <Head>
        <title>FeetSocial</title>
        <meta name="theme-color" content="#000000" />
      </Head>

      <div 
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black"
      >
        {/* Debug: Show stream count */}
        {liveStreams.length > 0 && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-xs z-50">
            {liveStreams.length} stream(s) loaded
          </div>
        )}

        {/* Live Streams First */}
        {liveStreams.map((stream) => (
          <div key={`stream-${stream.id}`} className="w-full h-screen snap-start bg-black">
            {user?.id === stream.user_id ? (
              /* Your own stream */
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white p-8">
                  <p className="text-2xl font-bold mb-4">You're Live! 🎥</p>
                  <Link
                    href="/go-live"
                    className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Manage Stream
                  </Link>
                </div>
              </div>
            ) : stream.playback_url ? (
              /* Watch the stream - show video player regardless of status */
              <div className="w-full h-full relative">
                {/* Debug info */}
                <div className="absolute top-16 left-4 bg-yellow-600 text-black px-2 py-1 rounded text-xs z-50 font-mono">
                  Status: {stream.status} | Type: {stream.stream_type}
                </div>
                
                {/* Simple video element - works on desktop, should work here too */}
                <video
                  key={stream.playback_url}
                  src={stream.playback_url}
                  className="w-full h-full object-cover bg-black"
                  autoPlay
                  loop={false}
                  muted
                  playsInline
                  controls
                  webkit-playsinline="true"
                  x5-playsinline="true"
                  onLoadStart={() => console.log('📺 Video load started:', stream.playback_url)}
                  onLoadedData={() => console.log('📺 Video loaded successfully!')}
                  onError={(e: any) => console.error('❌ Video error:', e.target.error)}
                  onCanPlay={() => console.log('📺 Video can play!')}
                />
                {/* Stream info overlay */}
                <div className="absolute bottom-20 left-4 right-4 text-white z-10 bg-gradient-to-t from-black/90 to-transparent pt-8 pb-4 px-4 pointer-events-none">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-red-600 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      LIVE
                    </div>
                    <span className="text-sm">👁️ {stream.viewer_count || 0}</span>
                  </div>
                  <Link href={`/profile/${stream.user_id}`} className="font-bold text-lg block pointer-events-auto">
                    @{stream.user?.username}
                  </Link>
                  <p className="text-sm text-gray-300">{stream.title}</p>
                </div>
              </div>
            ) : (
              /* No playback URL yet */
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-xl font-bold mb-2">Stream Starting...</p>
                  <p className="text-sm text-gray-400">@{stream.user?.username}</p>
                  <p className="text-xs text-gray-500 mt-2">Connecting to Mux...</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Then regular posts */}
        {posts.map((post, index) => (
          <div key={post.id} data-index={index}>
            <TikTokFeedItem
              post={post}
              currentUserId={user.id}
              onLike={handleLike}
              isActive={index === currentIndex}
            />
          </div>
        ))}

        {posts.length === 0 && liveStreams.length === 0 && (
          <div className="h-screen flex items-center justify-center">
            <div className="text-center text-white">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <p className="text-gray-400">No posts yet</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

