-- Create table for WebRTC signaling via database
-- This is more reliable than Supabase Realtime broadcast/presence

-- Ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table to track active viewers on a stream
CREATE TABLE IF NOT EXISTS stream_viewers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stream_id, viewer_id)
);

-- Table for WebRTC signaling messages (offers, answers, ICE candidates)
CREATE TABLE IF NOT EXISTS webrtc_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'viewer-join')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  consumed BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stream_viewers_stream ON stream_viewers(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_viewers_viewer ON stream_viewers(viewer_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_stream ON webrtc_signals(stream_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_to_user ON webrtc_signals(to_user_id, consumed);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_created ON webrtc_signals(created_at);

-- RLS policies for stream_viewers
ALTER TABLE stream_viewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own viewer record"
  ON stream_viewers FOR INSERT
  WITH CHECK (viewer_id = auth.uid());

CREATE POLICY "Users can update their own viewer record"
  ON stream_viewers FOR UPDATE
  USING (viewer_id = auth.uid());

CREATE POLICY "Users can view viewers on any stream"
  ON stream_viewers FOR SELECT
  USING (true);

CREATE POLICY "Users can delete their own viewer record"
  ON stream_viewers FOR DELETE
  USING (viewer_id = auth.uid());

-- RLS policies for webrtc_signals
ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert signals they send"
  ON webrtc_signals FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Users can view signals sent to them"
  ON webrtc_signals FOR SELECT
  USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

CREATE POLICY "Users can update signals sent to them"
  ON webrtc_signals FOR UPDATE
  USING (to_user_id = auth.uid());

CREATE POLICY "Users can delete their own signals"
  ON webrtc_signals FOR DELETE
  USING (from_user_id = auth.uid());

-- Cleanup old signals (older than 1 hour)
-- Run this periodically via a cron job or manually
-- DELETE FROM webrtc_signals WHERE created_at < NOW() - INTERVAL '1 hour';

-- Cleanup stale viewers (not seen in last 30 seconds)
-- DELETE FROM stream_viewers WHERE last_seen < NOW() - INTERVAL '30 seconds';

