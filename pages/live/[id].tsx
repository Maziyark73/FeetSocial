import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';
import LivePlayer from '../../components/LivePlayer';

export default function LiveStream() {
  const router = useRouter();
  const { id } = router.query;
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await (supabase as any).auth.getUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!id) return;

    const loadStream = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('live_streams')
          .select(`
            *,
            user:users(id, username, display_name, avatar_url, is_creator)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setStream(data);

        // Join as viewer if logged in
        if (currentUser && currentUser.id !== data.user_id) {
          await (supabase as any)
            .from('live_stream_viewers')
            .upsert({
              stream_id: id,
              user_id: currentUser.id,
            });

          // Increment viewer count
          await (supabase as any)
            .from('live_streams')
            .update({ viewer_count: (data.viewer_count || 0) + 1 })
            .eq('id', id);
        }
      } catch (error: any) {
        console.error('Error loading stream:', error);
        setError(error.message || 'Failed to load stream');
      } finally {
        setLoading(false);
      }
    };

    loadStream();

    // Poll for updates every 10 seconds
    const interval = setInterval(loadStream, 10000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      if (currentUser && stream && currentUser.id !== stream.user_id) {
        // Leave stream
        (supabase as any)
          .from('live_stream_viewers')
          .delete()
          .eq('stream_id', id)
          .eq('user_id', currentUser.id)
          .then(() => {
            // Decrement viewer count
            return (supabase as any)
              .from('live_streams')
              .update({ viewer_count: Math.max((stream.viewer_count || 1) - 1, 0) })
              .eq('id', id);
          });
      }
    };
  }, [id, currentUser]);

  const handleEndStream = async () => {
    if (!stream || currentUser?.id !== stream.user_id) return;

    if (!confirm('Are you sure you want to end this stream?')) return;

    try {
      await fetch('/api/live/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId: stream.id,
          action: 'end',
        }),
      });

      router.push('/');
    } catch (error) {
      console.error('Error ending stream:', error);
      setError('Failed to end stream');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">{error || 'Stream not found'}</p>
          <Link href="/" className="text-purple-400 hover:text-purple-300">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{stream.title} - Live Stream - FeetSocial</title>
      </Head>
      
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center text-gray-300 hover:text-white mb-6 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Feed
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-2">
              <LivePlayer
                playbackUrl={stream.playback_url}
                title={stream.title}
                isLive={stream.status === 'active'}
                viewerCount={stream.viewer_count || 0}
              />

              {/* Stream Info */}
              <div className="mt-6 space-y-4">
                <h1 className="text-2xl font-bold text-white">{stream.title}</h1>
                {stream.description && (
                  <p className="text-gray-300">{stream.description}</p>
                )}

                {/* Creator Info */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <Link href={`/profile/${stream.user.id}`}>
                    <div className="flex items-center space-x-3">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-700">
                        {stream.user.avatar_url ? (
                          <Image
                            src={stream.user.avatar_url}
                            alt={stream.user.display_name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white">
                            {stream.user.display_name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-medium hover:text-purple-300 transition-colors">
                          {stream.user.display_name}
                        </h3>
                        <p className="text-gray-400 text-sm">@{stream.user.username}</p>
                      </div>
                    </div>
                  </Link>

                  {currentUser?.id === stream.user_id && stream.status === 'active' && (
                    <button
                      onClick={handleEndStream}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      End Stream
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Chat / Info Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-lg p-4 h-[600px] flex flex-col">
                <h3 className="text-white font-bold mb-4">Live Chat</h3>
                <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                  <p className="text-gray-400 text-sm text-center py-8">
                    Chat feature coming soon!
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Send a message..."
                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    disabled
                  />
                  <button
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors opacity-50 cursor-not-allowed"
                    disabled
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

