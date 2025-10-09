-- Live streams table
CREATE TABLE live_streams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    mux_stream_id TEXT UNIQUE,
    mux_stream_key TEXT, -- RTMP stream key (private)
    mux_playback_id TEXT, -- HLS playback ID
    playback_url TEXT,
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'ended')),
    viewer_count INTEGER DEFAULT 0,
    is_vault BOOLEAN DEFAULT FALSE,
    vault_price INTEGER, -- in cents
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Live stream viewers (for tracking who's watching)
CREATE TABLE live_stream_viewers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    stream_id UUID REFERENCES live_streams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stream_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_live_streams_user_id ON live_streams(user_id);
CREATE INDEX idx_live_streams_status ON live_streams(status);
CREATE INDEX idx_live_stream_viewers_stream_id ON live_stream_viewers(stream_id);

-- RLS Policies for live_streams
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live streams"
ON live_streams
FOR SELECT
USING (true);

CREATE POLICY "Users can create own live streams"
ON live_streams
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own live streams"
ON live_streams
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own live streams"
ON live_streams
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for live_stream_viewers
ALTER TABLE live_stream_viewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live stream viewers"
ON live_stream_viewers
FOR SELECT
USING (true);

CREATE POLICY "Users can join live streams"
ON live_stream_viewers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave live streams"
ON live_stream_viewers
FOR DELETE
USING (auth.uid() = user_id);

-- Function to get active live streams
CREATE OR REPLACE FUNCTION get_active_live_streams()
RETURNS TABLE (
    stream_id UUID,
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    title TEXT,
    description TEXT,
    playback_url TEXT,
    viewer_count INTEGER,
    is_vault BOOLEAN,
    vault_price INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ls.id as stream_id,
        ls.user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        ls.title,
        ls.description,
        ls.playback_url,
        ls.viewer_count,
        ls.is_vault,
        ls.vault_price,
        ls.started_at,
        ls.created_at
    FROM live_streams ls
    JOIN users u ON ls.user_id = u.id
    WHERE ls.status = 'active'
    ORDER BY ls.started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

