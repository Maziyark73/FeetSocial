-- Fix RLS policies for stream_viewers to allow streamers to see their viewers
-- This allows the WebRTC streamer to detect when viewers join

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view viewers on any stream" ON stream_viewers;

-- Create new policy that allows:
-- 1. Anyone to view viewers (needed for streamer to see who's watching)
-- 2. Users to manage their own viewer records
CREATE POLICY "Anyone can view stream viewers"
  ON stream_viewers FOR SELECT
  USING (true);

-- Keep existing policies for INSERT, UPDATE, DELETE (they're correct)
-- Users can only insert/update/delete their own viewer records

-- Verify the policy is working
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'stream_viewers';

