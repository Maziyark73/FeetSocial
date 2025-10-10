-- ============================================
-- ADD WEBRTC STREAMING SUPPORT
-- Run this in Supabase SQL Editor
-- ============================================

-- Add stream_type column to live_streams table
ALTER TABLE live_streams 
ADD COLUMN IF NOT EXISTS stream_type TEXT DEFAULT 'rtmp' CHECK (stream_type IN ('rtmp', 'webrtc'));

-- Create index for stream type queries
CREATE INDEX IF NOT EXISTS idx_live_streams_type ON live_streams(stream_type);

-- Create storage bucket for live stream chunks (if using chunk-based approach)
-- This is optional and only needed if you want to store WebRTC chunks
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('live-chunks', 'live-chunks', false)
-- ON CONFLICT (id) DO NOTHING;

-- Add comment for documentation
COMMENT ON COLUMN live_streams.stream_type IS 'Type of stream: rtmp (OBS/external software) or webrtc (browser-based)';

