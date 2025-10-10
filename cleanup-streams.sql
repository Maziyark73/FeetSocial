-- Clean up all active streams (set them to ended)
UPDATE live_streams 
SET status = 'ended', 
    ended_at = NOW() 
WHERE status = 'active';

-- Verify the cleanup
SELECT id, title, status, created_at, ended_at FROM live_streams ORDER BY created_at DESC LIMIT 20;

