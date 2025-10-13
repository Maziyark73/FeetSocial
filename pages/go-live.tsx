import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import WebRTCStreamer from '../components/WebRTCStreamer';
import WHIPStreamer from '../components/WHIPStreamer';
import LiveStreamChat from '../components/LiveStreamChat';
import type { User } from '../types';

export default function GoLive() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [streamData, setStreamData] = useState<any>(null);
  const [streamMode, setStreamMode] = useState<'quick' | 'pro' | null>(null); // New: stream mode selector
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isVault: false,
    vaultPrice: '',
    streamType: 'webrtc' as 'whip' | 'webrtc' | 'rtmp', // Default to WebRTC (peer-to-peer)
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: currentUser } } = await (supabase as any).auth.getUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }

        // Get full user profile
        const { data: userData, error: userError } = await (supabase as any)
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (userError) throw userError;
        setUser(userData);
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (formData.isVault && (!formData.vaultPrice || parseFloat(formData.vaultPrice) <= 0)) {
      setError('Please enter a valid vault price');
      return;
    }

    setCreating(true);
    setError('');

    try {
      // Get the current session token
      const { data: { session } } = await (supabase as any).auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('You must be logged in to create a stream');
      }

      const response = await fetch('/api/live/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          isVault: formData.isVault,
          vaultPrice: formData.vaultPrice,
          streamType: formData.streamType, // Pass stream type
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create stream');
      }

      const data = await response.json();
      setStreamData(data);
      // Automatically set the stream mode based on the stream type
      // whip = quick (browser streaming via Mux WHIP)
      // webrtc = quick (legacy peer-to-peer)
      // rtmp = pro (OBS streaming)
      setStreamMode(data.streamType === 'rtmp' ? 'pro' : 'quick');
    } catch (error: any) {
      console.error('Error creating stream:', error);
      setError(error.message || 'Failed to create stream');
    } finally {
      setCreating(false);
    }
  };

  const handleStartStream = async () => {
    if (!streamData) return;

    try {
      // Get the current session token
      const { data: { session } } = await (supabase as any).auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('You must be logged in');
      }

      const response = await fetch('/api/live/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          streamId: streamData.id,
          action: 'start',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start stream');
      }

      // Don't redirect! Streamer should stay on this page to manage their stream
      // Viewers will see the stream on the home page or /live/[id] page
      console.log('✅ Stream marked as active in database');
    } catch (error: any) {
      console.error('Error starting stream:', error);
      setError(error.message || 'Failed to start stream');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Go Live - FeetSocial</title>
      </Head>
      
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Go Live</h1>
            <Link
              href="/"
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </Link>
          </div>

          {error && (
            <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {!streamData ? (
            /* Stream Setup Form */
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">Set Up Your Live Stream</h2>
              
              <form onSubmit={handleCreateStream} className="space-y-6">
                {/* Stream Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Streaming Method *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, streamType: 'webrtc' })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.streamType === 'webrtc'
                          ? 'border-purple-500 bg-purple-600/20'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-bold text-white mb-1">📱 Quick Stream</div>
                        <div className="text-xs text-gray-400">Browser/Phone (Direct P2P)</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, streamType: 'rtmp' })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.streamType === 'rtmp'
                          ? 'border-purple-500 bg-purple-600/20'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-bold text-white mb-1">🎬 Pro Stream</div>
                        <div className="text-xs text-gray-400">OBS Studio (Desktop)</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Stream Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="What are you streaming?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                    placeholder="Tell viewers what to expect..."
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isVault"
                    checked={formData.isVault}
                    onChange={(e) => setFormData({ ...formData, isVault: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="isVault" className="text-sm text-gray-300">
                    Make this a paid (vault) stream
                  </label>
                </div>

                {formData.isVault && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Price (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.vaultPrice}
                      onChange={(e) => setFormData({ ...formData, vaultPrice: e.target.value })}
                      className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="5.00"
                      required={formData.isVault}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating Stream...' : 'Create Stream'}
                </button>
              </form>
            </div>
          ) : streamMode === 'quick' ? (
            /* Quick Stream (WHIP or WebRTC) */
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold text-white mb-4">
                  📱 Quick Stream - Browser Camera
                  {streamData.streamType === 'whip' && (
                    <span className="ml-2 text-xs md:text-sm text-green-400">(HLS - Unlimited Viewers)</span>
                  )}
                </h2>
                
                {/* Streamer Video with Comment Overlay - Full height container */}
                <div className="relative w-full">
                  {streamData.streamType === 'whip' && streamData.streamCredentials.whipEndpoint ? (
                    /* New WHIP Streamer (Browser → Mux → HLS) */
                    <WHIPStreamer
                      whipEndpoint={streamData.streamCredentials.whipEndpoint}
                      streamId={streamData.id}
                      onStreamReady={handleStartStream}
                      onStreamEnd={() => router.push('/')}
                      onError={(err) => setError(err)}
                    />
                  ) : (
                    /* Legacy WebRTC Streamer (peer-to-peer) */
                    <WebRTCStreamer
                      streamId={streamData.id}
                      streamKey={streamData.streamCredentials.streamKey}
                      onStreamStart={handleStartStream}
                      onStreamEnd={() => router.push('/')}
                      onError={(err) => setError(err)}
                    />
                  )}
                  
                  {/* TikTok-Style Comments Overlay (for streamer to see viewer comments) */}
                  <div className="absolute inset-0 z-50 pointer-events-none">
                    <LiveStreamChat 
                      streamId={streamData.id}
                      currentUserId={user?.id || null}
                      isStreamer={true}
                      compact={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Pro Stream (OBS) */
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">🎬 Pro Stream with OBS Studio</h2>
                
                <p className="text-gray-300 mb-6">
                  Use these credentials in your streaming software (OBS, Streamlabs, etc.)
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Server URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={streamData.streamCredentials.serverUrl}
                        readOnly
                        className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg font-mono text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(streamData.streamCredentials.serverUrl)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Stream Key (Keep Secret!)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={streamData.streamCredentials.streamKey}
                        readOnly
                        className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg font-mono text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(streamData.streamCredentials.streamKey)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-yellow-500 mt-1">
                      ⚠️ Don't share your stream key publicly!
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-3">How to Stream with OBS:</h3>
                <ol className="text-gray-300 space-y-2 text-sm">
                  <li>1. Open OBS Studio (download from obsproject.com)</li>
                  <li>2. Go to Settings → Stream</li>
                  <li>3. Select "Custom" as Service</li>
                  <li>4. Paste the Server URL above</li>
                  <li>5. Paste the Stream Key above</li>
                  <li>6. Click "Start Streaming" in OBS</li>
                  <li>7. Then click "Go Live" button below</li>
                </ol>
              </div>

              <button
                onClick={handleStartStream}
                className="w-full px-6 py-4 bg-red-600 text-white font-bold text-lg rounded-lg hover:bg-red-700 transition-colors"
              >
                🔴 Go Live Now
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

