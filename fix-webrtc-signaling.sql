-- Fix WebRTC signaling tables (idempotent version)
-- This version can be run multiple times safely

-- Ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own viewer record" ON stream_viewers;
DROP POLICY IF EXISTS "Users can update their own viewer record" ON stream_viewers;
DROP POLICY IF EXISTS "Users can view viewers on any stream" ON stream_viewers;
DROP POLICY IF EXISTS "Users can delete their own viewer record" ON stream_viewers;
DROP POLICY IF EXISTS "Users can insert signals they send" ON webrtc_signals;
DROP POLICY IF EXISTS "Users can view signals sent to them" ON webrtc_signals;
DROP POLICY IF EXISTS "Users can update signals sent to them" ON webrtc_signals;
DROP POLICY IF EXISTS "Users can delete their own signals" ON webrtc_signals;

-- Recreate RLS policies for stream_viewers
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

-- Recreate RLS policies for webrtc_signals
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

