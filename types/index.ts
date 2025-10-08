export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  stripe_account_id?: string;
  is_creator: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Post {
  id: string;
  user_id: string;
  title: string;
  description: string;
  tags: string[];
  is_vault: boolean;
  vault_price?: number; // in cents
  media_type: 'image' | 'video';
  mux_asset_id?: string;
  playback_url?: string;
  image_url?: string;
  created_at: string;
  updated_at?: string;
  // Joined data
  user?: User;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

export interface Payment {
  id: string;
  from_user_id: string;
  to_user_id: string;
  post_id?: string;
  amount: number; // in cents
  type: 'tip' | 'vault_unlock';
  stripe_payment_intent_id: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  // Joined data
  from_user?: User;
  to_user?: User;
  post?: Post;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  // Joined data
  user?: User;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  has_more: boolean;
  next_cursor?: string;
}

// Stripe types
export interface StripeAccount {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
}

export interface CheckoutSession {
  id: string;
  url: string;
  amount_total: number;
  metadata: {
    type: 'tip' | 'vault_unlock';
    from_user_id: string;
    to_user_id: string;
    post_id?: string;
  };
}

// Mux types
export interface MuxAsset {
  id: string;
  status: 'waiting' | 'preparing' | 'ready' | 'errored';
  playback_ids: Array<{
    id: string;
    policy: 'public' | 'signed';
  }>;
  duration?: number;
  aspect_ratio?: string;
}

// Upload types
export interface UploadResponse {
  url: string;
  key: string;
  size: number;
  type: string;
}

// Feed types
export interface FeedItem extends Post {
  user: User;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_following?: boolean;
}

// Profile types
export interface ProfileData extends User {
  posts_count: number;
  followers_count: number;
  following_count: number;
  total_earnings: number; // in cents
  is_following?: boolean;
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  username: string;
  display_name: string;
  is_creator: boolean;
}

export interface UploadForm {
  title: string;
  description: string;
  tags: string[];
  is_vault: boolean;
  vault_price?: number;
  media_type: 'image' | 'video';
  file: File;
}

export interface TipForm {
  amount: number; // in cents
  message?: string;
}

