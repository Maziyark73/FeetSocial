-- FeetSocial Database Schema
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    stripe_account_id TEXT,
    is_creator BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    is_vault BOOLEAN DEFAULT FALSE,
    vault_price INTEGER, -- in cents
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    mux_asset_id TEXT,
    playback_url TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL, -- in cents
    type TEXT NOT NULL CHECK (type IN ('tip', 'vault_unlock')),
    stripe_payment_intent_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follows table
CREATE TABLE follows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Likes table
CREATE TABLE likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Comments table
CREATE TABLE comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vault access table (tracks who has paid for vault content)
CREATE TABLE vault_access (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Indexes for better performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_is_vault ON posts(is_vault);
CREATE INDEX idx_payments_from_user ON payments(from_user_id);
CREATE INDEX idx_payments_to_user ON payments(to_user_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_post_parent ON comments(post_id, parent_id);
CREATE INDEX idx_vault_access_user ON vault_access(user_id);
CREATE INDEX idx_vault_access_post ON vault_access(post_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_access ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Posts policies
CREATE POLICY "Users can view all posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can insert own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
);
CREATE POLICY "Users can insert payments" ON payments FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Follows policies
CREATE POLICY "Users can view all follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can manage own follows" ON follows FOR ALL USING (auth.uid() = follower_id);

-- Likes policies
CREATE POLICY "Users can view all likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON likes FOR ALL USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Users can view all comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Vault access policies
CREATE POLICY "Users can view own vault access" ON vault_access FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert vault access" ON vault_access FOR INSERT WITH CHECK (true);

-- Functions for common operations

-- Function to get user profile with stats
CREATE OR REPLACE FUNCTION get_user_profile(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    is_creator BOOLEAN,
    posts_count BIGINT,
    followers_count BIGINT,
    following_count BIGINT,
    total_earnings BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.bio,
        u.is_creator,
        COALESCE(posts_stats.count, 0) as posts_count,
        COALESCE(followers.count, 0) as followers_count,
        COALESCE(following.count, 0) as following_count,
        COALESCE(earnings.total, 0) as total_earnings,
        u.created_at
    FROM users u
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count
        FROM posts
        GROUP BY user_id
    ) posts_stats ON u.id = posts_stats.user_id
    LEFT JOIN (
        SELECT following_id, COUNT(*) as count
        FROM follows
        GROUP BY following_id
    ) followers ON u.id = followers.following_id
    LEFT JOIN (
        SELECT follower_id, COUNT(*) as count
        FROM follows
        GROUP BY follower_id
    ) following ON u.id = following.follower_id
    LEFT JOIN (
        SELECT to_user_id, SUM(amount) as total
        FROM payments
        WHERE status = 'completed'
        GROUP BY to_user_id
    ) earnings ON u.id = earnings.to_user_id
    WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has vault access
CREATE OR REPLACE FUNCTION has_vault_access(user_uuid UUID, post_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM vault_access 
        WHERE user_id = user_uuid AND post_id = post_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get feed posts with user data and stats
CREATE OR REPLACE FUNCTION get_feed_posts(
    user_uuid UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    post_id UUID,
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    title TEXT,
    description TEXT,
    tags TEXT[],
    is_vault BOOLEAN,
    vault_price INTEGER,
    media_type TEXT,
    playback_url TEXT,
    image_url TEXT,
    likes_count BIGINT,
    comments_count BIGINT,
    is_liked BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as post_id,
        p.user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        p.title,
        p.description,
        p.tags,
        p.is_vault,
        p.vault_price,
        p.media_type,
        p.playback_url,
        p.image_url,
        COALESCE(likes_count.count, 0) as likes_count,
        COALESCE(comments_count.count, 0) as comments_count,
        CASE WHEN user_likes.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_liked,
        p.created_at
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN (
        SELECT l.post_id, COUNT(*) as count
        FROM likes l
        GROUP BY l.post_id
    ) likes_count ON p.id = likes_count.post_id
    LEFT JOIN (
        SELECT c.post_id, COUNT(*) as count
        FROM comments c
        GROUP BY c.post_id
    ) comments_count ON p.id = comments_count.post_id
    LEFT JOIN (
        SELECT l2.post_id, l2.user_id
        FROM likes l2
        WHERE l2.user_id = user_uuid
    ) user_likes ON p.id = user_likes.post_id
    ORDER BY p.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

