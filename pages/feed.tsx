import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase, getCurrentUser } from '../lib/supabase';
import TikTokFeedItem from '../components/TikTokFeedItem';
import type { FeedItem as FeedItemType, User } from '../types';

export default function TikTokFeed() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<FeedItemType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
  }, []);

  // Load posts after user is loaded
  useEffect(() => {
    loadPosts();
  }, [user]);

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
        title: row.post_title,
        description: row.post_description,
        media_type: row.post_media_type,
        image_url: row.post_image_url,
        playback_url: row.post_playback_url,
        mux_asset_id: row.post_mux_asset_id,
        is_vault: row.post_is_vault,
        vault_price: row.post_vault_price,
        created_at: row.post_created_at,
        likes_count: row.post_likes_count,
        comments_count: row.post_comments_count,
        is_liked: row.is_liked,
        tags: row.post_tags,
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

        {posts.length === 0 && (
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

