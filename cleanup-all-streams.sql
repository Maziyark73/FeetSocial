-- End ALL active streams (for testing cleanup)
UPDATE live_streams 
SET status = 'ended', 
    ended_at = NOW()
WHERE status IN ('active', 'idle');

-- Show what was updated
SELECT id, title, status, stream_type, mux_stream_id, playback_url 
FROM live_streams 
ORDER BY created_at DESC 
LIMIT 5;
