import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { getErrorMessage } from '../utils/helpers';

export default function CompleteProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const createProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          router.push('/login');
          return;
        }

        // Check if profile already exists
        const { data: existingProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (existingProfile) {
          // Profile exists, redirect to home
          router.push('/');
          return;
        }

        // Auto-generate username and display name from email
        const email = user.email || 'user';
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 20);
        const displayName = email.split('@')[0];

        // Create profile via API route
        const profileResponse = await fetch('/api/auth/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: email,
            username: username,
            displayName: displayName,
            isCreator: false,
          }),
        });

        if (!profileResponse.ok) {
          const { error: profileError } = await profileResponse.json();
          setError(`Failed to create profile: ${profileError}`);
          setLoading(false);
          return;
        }

        // Success! Redirect to home
        router.push('/');
      } catch (err) {
        setError(getErrorMessage(err));
        setLoading(false);
      }
    };

    createProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-white/10 mb-4">
            <span className="text-2xl font-bold text-white">FS</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 text-center p-8">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-500/20 mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Profile setup failed</h2>
          <p className="text-gray-300">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Back to login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-white bg-transparent hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

