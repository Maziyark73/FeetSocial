-- Add 'whip' to the allowed stream_type values
ALTER TABLE live_streams 
DROP CONSTRAINT IF EXISTS live_streams_stream_type_check;

ALTER TABLE live_streams 
ADD CONSTRAINT live_streams_stream_type_check 
CHECK (stream_type IN ('webrtc', 'rtmp', 'whip'));
