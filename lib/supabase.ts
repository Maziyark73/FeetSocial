import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Debug logging (remove after testing)
if (typeof window !== 'undefined') {
  console.log('🔍 Supabase URL:', supabaseUrl ? 'Set ✅' : 'Missing ❌');
  console.log('🔍 Supabase Anon Key:', supabaseAnonKey ? 'Set ✅' : 'Missing ❌');
}

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

// Client for browser/client-side operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
// Only create this on the server side
export const supabaseAdmin = typeof window === 'undefined' 
  ? createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  : supabase; // Use regular client in browser (will never be called from browser anyway)

// Auth helpers
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// User operations
export const getUserProfile = async (userId: string) => {
  const { data, error } = await (supabase as any)
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

export const createUserProfile = async (userData: {
  id: string;
  email: string;
  username: string;
  display_name: string;
  is_creator?: boolean;
}) => {
  const { data, error } = await (supabase as any)
    .from('users')
    .insert(userData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateUserProfile = async (userId: string, updates: Partial<{
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  is_creator: boolean;
  stripe_account_id: string;
}>) => {
  const { data, error } = await (supabase as any)
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  // Upload to Supabase Storage
  const { data, error: uploadError } = await (supabase as any).storage
    .from('media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = (supabase as any).storage
    .from('media')
    .getPublicUrl(filePath);

  return publicUrl;
};

// Post operations
export const createPost = async (postData: {
  user_id: string;
  title: string;
  description?: string;
  tags?: string[];
  is_vault?: boolean;
  vault_price?: number;
  media_type: 'image' | 'video';
  mux_asset_id?: string;
  playback_url?: string;
  image_url?: string;
}) => {
  const { data, error } = await (supabase as any)
    .from('posts')
    .insert(postData)
    .select()
    .single();
  
  if (error) throw error;
  if (!data) throw new Error('Failed to create post - no data returned');
  return data;
};

export const getFeedPosts = async (userId?: string, limit = 20, offset = 0) => {
  const { data, error } = await (supabase as any).rpc('get_feed_posts', {
    user_uuid: userId || null,
    limit_count: limit,
    offset_count: offset
  });
  
  if (error) throw error;
  return data;
};

export const getUserPosts = async (userId: string, limit = 20, offset = 0) => {
  const { data, error } = await (supabase as any)
    .from('posts')
    .select(`
      *,
      user:users(username, display_name, avatar_url),
      likes_count:likes(count),
      comments_count:comments(count)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  return data;
};

export const getPost = async (postId: string) => {
  const { data, error } = await (supabase as any)
    .from('posts')
    .select(`
      *,
      user:users(*),
      likes_count:likes(count),
      comments_count:comments(count)
    `)
    .eq('id', postId)
    .single();
  
  if (error) throw error;
  return data;
};

// Like operations
export const likePost = async (postId: string, userId: string) => {
  const { data, error } = await (supabase as any)
    .from('likes')
    .insert({ post_id: postId, user_id: userId })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const unlikePost = async (postId: string, userId: string) => {
  const { error } = await (supabase as any)
    .from('likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  
  if (error) throw error;
};

export const isPostLiked = async (postId: string, userId: string) => {
  const { data, error } = await (supabase as any)
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();
  
  return !error && data;
};

// Follow operations
export const followUser = async (followingId: string, followerId: string) => {
  const { data, error } = await (supabase as any)
    .from('follows')
    .insert({ following_id: followingId, follower_id: followerId })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const unfollowUser = async (followingId: string, followerId: string) => {
  const { error } = await (supabase as any)
    .from('follows')
    .delete()
    .eq('following_id', followingId)
    .eq('follower_id', followerId);
  
  if (error) throw error;
};

export const isFollowing = async (followingId: string, followerId: string) => {
  const { data, error } = await (supabase as any)
    .from('follows')
    .select('id')
    .eq('following_id', followingId)
    .eq('follower_id', followerId)
    .single();
  
  return !error && data;
};

// Payment operations
export const createPayment = async (paymentData: {
  from_user_id: string;
  to_user_id: string;
  post_id?: string;
  amount: number;
  type: 'tip' | 'vault_unlock';
  stripe_payment_intent_id: string;
  status?: 'pending' | 'completed' | 'failed';
}) => {
  const { data, error } = await (supabase as any)
    .from('payments')
    .insert(paymentData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updatePaymentStatus = async (paymentIntentId: string, status: 'completed' | 'failed') => {
  const { data, error } = await (supabase as any)
    .from('payments')
    .update({ status })
    .eq('stripe_payment_intent_id', paymentIntentId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Vault access operations
export const grantVaultAccess = async (userId: string, postId: string, paymentId: string) => {
  const { data, error } = await (supabase as any)
    .from('vault_access')
    .insert({ user_id: userId, post_id: postId, payment_id: paymentId })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const hasVaultAccess = async (userId: string, postId: string) => {
  const { data, error } = await (supabase as any).rpc('has_vault_access', {
    user_uuid: userId,
    post_uuid: postId
  });
  
  if (error) throw error;
  return data;
};

// Comment operations
export const createComment = async (commentData: {
  user_id: string;
  post_id: string;
  content: string;
  parent_id?: string | null;
}) => {
  const { data, error } = await (supabase as any)
    .from('comments')
    .insert(commentData)
    .select(`
      *,
      user:users(username, display_name, avatar_url)
    `)
    .single();
  
  if (error) throw error;
  return data;
};

export const getPostComments = async (postId: string, limit = 50) => {
  const { data, error } = await (supabase as any)
    .from('comments')
    .select(`
      *,
      user:users(username, display_name, avatar_url)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
};

// Search operations
export const searchUsers = async (query: string, limit = 10) => {
  const { data, error } = await (supabase as any)
    .from('users')
    .select('id, username, display_name, avatar_url, is_creator')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(limit);
  
  if (error) throw error;
  return data;
};

export const searchPosts = async (query: string, limit = 20) => {
  const { data, error } = await (supabase as any)
    .from('posts')
    .select(`
      *,
      user:users(username, display_name, avatar_url)
    `)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
};

