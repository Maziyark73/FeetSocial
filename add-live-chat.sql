-- Live Stream Chat Feature
-- Real-time chat messages during live streams

-- Create stream_messages table
CREATE TABLE IF NOT EXISTS stream_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT message_length CHECK (char_length(message) > 0 AND char_length(message) <= 500)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_stream_messages_stream_id ON stream_messages(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_messages_created_at ON stream_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE stream_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stream_messages
-- Anyone can read messages for any stream
CREATE POLICY "Anyone can read stream messages"
  ON stream_messages
  FOR SELECT
  USING (true);

-- Only authenticated users can insert messages
CREATE POLICY "Authenticated users can send messages"
  ON stream_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON stream_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Streamer can delete any message in their stream
CREATE POLICY "Streamers can delete messages in their streams"
  ON stream_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM live_streams
      WHERE live_streams.id = stream_messages.stream_id
      AND live_streams.user_id = auth.uid()
    )
  );

-- Function to get recent chat messages for a stream
CREATE OR REPLACE FUNCTION get_stream_messages(stream_uuid UUID, message_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  stream_id UUID,
  user_id UUID,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_creator BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id,
    sm.stream_id,
    sm.user_id,
    sm.message,
    sm.created_at,
    u.username,
    u.display_name,
    u.avatar_url,
    u.is_creator
  FROM stream_messages sm
  JOIN users u ON u.id = sm.user_id
  WHERE sm.stream_id = stream_uuid
  ORDER BY sm.created_at DESC
  LIMIT message_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE stream_messages IS 'Real-time chat messages during live streams';
COMMENT ON COLUMN stream_messages.message IS 'Chat message text (max 500 characters)';
COMMENT ON FUNCTION get_stream_messages IS 'Get recent chat messages for a stream with user details';

