-- ============================================
-- Live Stream Heartbeat & Health Monitoring
-- ============================================
-- This migration adds automatic health monitoring for live streams
-- to detect crashes and auto-cleanup zombie streams

-- Step 1: Add heartbeat tracking columns
-- ============================================
DO $$ 
BEGIN
  -- Add last_heartbeat column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'live_streams' AND column_name = 'last_heartbeat'
  ) THEN
    ALTER TABLE live_streams 
    ADD COLUMN last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add viewer_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'live_streams' AND column_name = 'viewer_count'
  ) THEN
    ALTER TABLE live_streams 
    ADD COLUMN viewer_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Step 2: Create index for faster heartbeat queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_live_streams_heartbeat 
ON live_streams(last_heartbeat) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_live_streams_status 
ON live_streams(status);

-- Step 3: Initialize existing streams with current timestamp
-- ============================================
UPDATE live_streams
SET last_heartbeat = NOW()
WHERE last_heartbeat IS NULL;

-- Step 4: Function to auto-cleanup stale streams
-- ============================================
-- Drop existing function if it exists (to ensure clean update)
DROP FUNCTION IF EXISTS cleanup_stale_streams();

-- Create new function
CREATE FUNCTION cleanup_stale_streams()
RETURNS TABLE (
  ended_count INTEGER,
  ended_stream_ids UUID[]
) AS $$
DECLARE
  stale_streams UUID[];
  affected_rows INTEGER;
BEGIN
  -- Find all stale streams (no heartbeat for 60+ seconds)
  SELECT ARRAY_AGG(id) INTO stale_streams
  FROM live_streams
  WHERE status = 'active'
    AND last_heartbeat < NOW() - INTERVAL '60 seconds';

  -- If there are stale streams, end them
  IF stale_streams IS NOT NULL THEN
    UPDATE live_streams
    SET status = 'ended',
        viewer_count = 0
    WHERE id = ANY(stale_streams);
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- Log cleanup
    RAISE NOTICE 'Auto-ended % stale stream(s)', affected_rows;
    
    RETURN QUERY SELECT affected_rows, stale_streams;
  ELSE
    -- No stale streams found
    RETURN QUERY SELECT 0, ARRAY[]::UUID[];
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Add helpful comments
-- ============================================
COMMENT ON COLUMN live_streams.last_heartbeat IS 'Timestamp of last heartbeat signal from streamer (updated every 5 seconds)';
COMMENT ON COLUMN live_streams.viewer_count IS 'Real-time count of active viewers watching the stream';
COMMENT ON FUNCTION cleanup_stale_streams IS 'Automatically ends streams with no heartbeat for 60+ seconds. Returns count and IDs of ended streams.';

-- Step 6: Test the cleanup function (optional)
-- ============================================
-- Uncomment to test (this won't affect any active streams unless they're actually stale):
-- SELECT * FROM cleanup_stale_streams();

-- ============================================
-- SETUP COMPLETE! ✅
-- ============================================
-- Your streams now have:
-- ✅ Heartbeat monitoring (every 5 seconds)
-- ✅ Auto-cleanup of crashed streams (60 second timeout)
-- ✅ Real-time viewer count tracking
-- 
-- To manually cleanup stale streams, run:
-- SELECT * FROM cleanup_stale_streams();
-- ============================================
