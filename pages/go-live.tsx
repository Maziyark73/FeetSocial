import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

export default function GoLive() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [streamData, setStreamData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isVault: false,
    vaultPrice: '',
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
      const response = await fetch('/api/live/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          isVault: formData.isVault,
          vaultPrice: formData.vaultPrice,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create stream');
      }

      const data = await response.json();
      setStreamData(data);
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
      const response = await fetch('/api/live/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId: streamData.id,
          action: 'start',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start stream');
      }

      // Redirect to live stream page
      router.push(`/live/${streamData.id}`);
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
          ) : (
            /* Stream Credentials */
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Stream Created! 🎥</h2>
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

