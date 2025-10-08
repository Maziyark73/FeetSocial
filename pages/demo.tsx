import { useState } from 'react';
import Head from 'next/head';
import { DEMO_USER, DEMO_POSTS } from '../lib/demo';
import FeedItem from '../components/FeedItem';
import ProfileCard from '../components/ProfileCard';

export default function Demo() {
  const [posts, setPosts] = useState(DEMO_POSTS);
  const [user] = useState(DEMO_USER);

  const handleLike = async (postId: string) => {
    console.log('Demo: Liking post', postId);
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            is_liked: !post.is_liked, 
            likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1
          }
        : post
    ));
  };

  const handleUnlock = async (postId: string) => {
    console.log('Demo: Unlocking vault content', postId);
    alert('Demo: Vault content unlocked! (In real app, this would process payment)');
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, has_access: true }
        : post
    ));
  };

  const handleTip = async (userId: string, amount: number) => {
    console.log('Demo: Sending tip', { userId, amount });
    alert(`Demo: Sent $${(amount / 100).toFixed(2)} tip! (In real app, this would process payment)`);
  };

  const handleFollow = async (userId: string) => {
    console.log('Demo: Following user', userId);
  };

  const handleUnfollow = async (userId: string) => {
    console.log('Demo: Unfollowing user', userId);
  };

  return (
    <>
      <Head>
        <title>FeetSocial Demo - Try All Features</title>
        <meta name="description" content="Interactive demo of FeetSocial platform features" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">FS</span>
                </div>
                <span className="text-white font-bold text-xl">FeetSocial Demo</span>
              </div>
              <div className="text-sm text-gray-400">
                Interactive Demo Mode
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Demo Banner */}
          <div className="mb-8 bg-gradient-to-r from-green-900/50 to-blue-900/50 border border-green-500/30 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-green-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <h1 className="text-2xl font-bold text-white">
                Interactive Demo
              </h1>
            </div>
            <p className="text-gray-300 mb-4">
              Try all FeetSocial features with mock data. Click buttons, like posts, tip creators, and unlock vault content!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="font-medium text-white mb-1">💝 Social Features</div>
                <div className="text-gray-300">Like posts, follow users, view profiles</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="font-medium text-white mb-1">💰 Monetization</div>
                <div className="text-gray-300">Send tips, unlock premium content</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="font-medium text-white mb-1">📱 Media</div>
                <div className="text-gray-300">Images, videos, vault content</div>
              </div>
            </div>
          </div>

          {/* Profile Card Demo */}
          <div className="mb-8">
            <ProfileCard
              user={user}
              currentUserId={user.id}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              onTip={handleTip}
            />
          </div>

          {/* Feed Demo */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Demo Feed</h2>
            {posts.map((post) => (
              <FeedItem
                key={post.id}
                post={post as any}
                currentUserId={user.id}
                onLike={handleLike}
                onUnlock={handleUnlock}
                onTip={handleTip}
              />
            ))}
          </div>

          {/* Instructions */}
          <div className="mt-12 bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Try These Features:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-purple-400 mb-2">Social Interactions</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>• Click the ❤️ button to like posts</li>
                  <li>• View creator profiles and stats</li>
                  <li>• Try the follow button</li>
                  <li>• Check out the infinite scroll</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-purple-400 mb-2">Monetization</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>• Click "Tip" to send money to creators</li>
                  <li>• Try unlocking the premium vault content</li>
                  <li>• See how payment flows work</li>
                  <li>• View creator earnings</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="mt-8 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Ready to Go Live?</h3>
            <p className="text-gray-300 mb-4">
              This demo shows all the features working with mock data. To deploy with real functionality:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-300 mb-4">
              <li>Set up Supabase for database and authentication</li>
              <li>Configure Stripe for payments and creator payouts</li>
              <li>Add UploadThing for file uploads</li>
              <li>Set up Mux for video processing</li>
              <li>Deploy to Vercel, Netlify, or your preferred platform</li>
            </ol>
            <div className="flex space-x-4">
              <a
                href="/"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Back to Main App
              </a>
              <a
                href="/TESTING.md"
                className="px-4 py-2 border border-purple-500 text-purple-300 rounded-lg hover:bg-purple-500/10 transition-colors"
              >
                View Testing Guide
              </a>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

