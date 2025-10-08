/**
 * Demo mode for testing FeetSocial without external services
 * This provides mock data and functionality for development
 */

export const DEMO_MODE = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SUPABASE_URL;

// Mock user data
export const DEMO_USER = {
  id: 'demo-user-1',
  email: 'demo@feetsocial.com',
  username: 'democreator',
  display_name: 'Demo Creator',
  avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  bio: 'This is a demo creator account for testing FeetSocial features.',
  is_creator: true,
  created_at: new Date().toISOString(),
  posts_count: 5,
  followers_count: 42,
  following_count: 12,
  total_earnings: 12500, // $125.00 in cents
};

// Mock posts data
export const DEMO_POSTS = [
  {
    id: 'demo-post-1',
    user_id: DEMO_USER.id,
    user: DEMO_USER,
    username: DEMO_USER.username,
    display_name: DEMO_USER.display_name,
    avatar_url: DEMO_USER.avatar_url,
    title: 'Welcome to FeetSocial! 🚀',
    description: 'This is a demo post to show you how the platform works. Try uploading your own content!',
    tags: ['welcome', 'demo', 'getting-started'],
    is_vault: false,
    vault_price: null,
    media_type: 'image' as const,
    image_url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop',
    playback_url: null,
    likes_count: 24,
    comments_count: 8,
    is_liked: false,
    has_access: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'demo-post-2',
    user_id: DEMO_USER.id,
    user: DEMO_USER,
    username: DEMO_USER.username,
    display_name: DEMO_USER.display_name,
    avatar_url: DEMO_USER.avatar_url,
    title: 'Premium Content Example 💎',
    description: 'This is an example of premium vault content. Users need to pay to unlock this post.',
    tags: ['premium', 'vault', 'example'],
    is_vault: true,
    vault_price: 500, // $5.00
    media_type: 'image' as const,
    image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    playback_url: null,
    likes_count: 156,
    comments_count: 23,
    is_liked: true,
    has_access: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: 'demo-post-3',
    user_id: DEMO_USER.id,
    user: DEMO_USER,
    username: DEMO_USER.username,
    display_name: DEMO_USER.display_name,
    avatar_url: DEMO_USER.avatar_url,
    title: 'Video Content Demo 🎥',
    description: 'Here\'s how video content looks on the platform. Videos are automatically processed for optimal streaming.',
    tags: ['video', 'demo', 'streaming'],
    is_vault: false,
    vault_price: null,
    media_type: 'video' as const,
    image_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&h=600&fit=crop',
    playback_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    likes_count: 89,
    comments_count: 15,
    is_liked: false,
    has_access: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
  },
];

// Demo functions
export const demoFunctions = {
  // Mock authentication
  async getCurrentUser() {
    if (!DEMO_MODE) return null;
    return DEMO_USER;
  },

  // Mock user registration
  async signUp(email: string, password: string, userData: any) {
    if (!DEMO_MODE) throw new Error('Demo mode only');
    console.log('Demo signup:', { email, userData });
    return { user: DEMO_USER, session: { user: DEMO_USER } };
  },

  // Mock user login
  async signIn(email: string, password: string) {
    if (!DEMO_MODE) throw new Error('Demo mode only');
    console.log('Demo signin:', { email });
    return { user: DEMO_USER, session: { user: DEMO_USER } };
  },

  // Mock feed posts
  async getFeedPosts(userId?: string, limit = 20, offset = 0) {
    if (!DEMO_MODE) return [];
    return DEMO_POSTS.slice(offset, offset + limit);
  },

  // Mock like toggle
  async toggleLike(postId: string, userId: string) {
    if (!DEMO_MODE) return;
    console.log('Demo like toggle:', { postId, userId });
    // In real implementation, this would update the database
  },

  // Mock follow toggle
  async toggleFollow(followingId: string, followerId: string) {
    if (!DEMO_MODE) return;
    console.log('Demo follow toggle:', { followingId, followerId });
  },

  // Mock tip
  async sendTip(fromUserId: string, toUserId: string, amount: number) {
    if (!DEMO_MODE) return;
    console.log('Demo tip:', { fromUserId, toUserId, amount });
    alert(`Demo: Sent $${(amount / 100).toFixed(2)} tip! (In real app, this would process payment)`);
  },

  // Mock vault unlock
  async unlockVault(postId: string, userId: string, amount: number) {
    if (!DEMO_MODE) return;
    console.log('Demo vault unlock:', { postId, userId, amount });
    alert(`Demo: Unlocked content for $${(amount / 100).toFixed(2)}! (In real app, this would process payment)`);
  },

  // Mock file upload
  async uploadFile(file: File) {
    if (!DEMO_MODE) return null;
    console.log('Demo file upload:', file.name);
    
    // Return a mock upload response
    return {
      url: URL.createObjectURL(file),
      key: `demo-${Date.now()}`,
      size: file.size,
      type: file.type,
      name: file.name,
    };
  },
};

export default demoFunctions;
