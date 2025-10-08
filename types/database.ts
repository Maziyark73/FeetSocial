export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          stripe_account_id: string | null;
          is_creator: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          stripe_account_id?: string | null;
          is_creator?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          stripe_account_id?: string | null;
          is_creator?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          tags: string[];
          is_vault: boolean;
          vault_price: number | null;
          media_type: 'image' | 'video';
          mux_asset_id: string | null;
          playback_url: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          tags?: string[];
          is_vault?: boolean;
          vault_price?: number | null;
          media_type: 'image' | 'video';
          mux_asset_id?: string | null;
          playback_url?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          tags?: string[];
          is_vault?: boolean;
          vault_price?: number | null;
          media_type?: 'image' | 'video';
          mux_asset_id?: string | null;
          playback_url?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          post_id: string | null;
          amount: number;
          type: 'tip' | 'vault_unlock';
          stripe_payment_intent_id: string;
          status: 'pending' | 'completed' | 'failed';
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_user_id: string;
          post_id?: string | null;
          amount: number;
          type: 'tip' | 'vault_unlock';
          stripe_payment_intent_id: string;
          status?: 'pending' | 'completed' | 'failed';
          created_at?: string;
        };
        Update: {
          id?: string;
          from_user_id?: string;
          to_user_id?: string;
          post_id?: string | null;
          amount?: number;
          type?: 'tip' | 'vault_unlock';
          stripe_payment_intent_id?: string;
          status?: 'pending' | 'completed' | 'failed';
          created_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      vault_access: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          payment_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          payment_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          payment_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_profile: {
        Args: {
          user_uuid: string;
        };
        Returns: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          is_creator: boolean;
          posts_count: number;
          followers_count: number;
          following_count: number;
          total_earnings: number;
          created_at: string;
        };
      };
      has_vault_access: {
        Args: {
          user_uuid: string;
          post_uuid: string;
        };
        Returns: boolean;
      };
      get_feed_posts: {
        Args: {
          user_uuid?: string | null;
          limit_count?: number;
          offset_count?: number;
        };
        Returns: {
          post_id: string;
          user_id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          title: string;
          description: string | null;
          tags: string[];
          is_vault: boolean;
          vault_price: number | null;
          media_type: string;
          playback_url: string | null;
          image_url: string | null;
          likes_count: number;
          comments_count: number;
          is_liked: boolean;
          created_at: string;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

