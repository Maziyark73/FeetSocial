-- Immediately clean up all stale/old streams from the feed
-- Run this in Supabase SQL Editor to clear out old streams

-- End all streams that have been active for more than 5 minutes without a heartbeat
UPDATE live_streams
SET status = 'ended'
WHERE status = 'active'
  AND (
    last_heartbeat IS NULL 
    OR last_heartbeat < NOW() - INTERVAL '5 minutes'
  );

-- Show how many streams were ended
SELECT 
  COUNT(*) as streams_ended,
  NOW() as cleaned_at
FROM live_streams
WHERE status = 'ended'
  AND updated_at > NOW() - INTERVAL '1 minute';

-- Show remaining active streams
SELECT 
  id,
  title,
  status,
  last_heartbeat,
  created_at
FROM live_streams
WHERE status = 'active'
ORDER BY last_heartbeat DESC NULLS LAST;

