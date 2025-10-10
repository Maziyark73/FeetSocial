-- Create function to get active live streams for the feed
CREATE OR REPLACE FUNCTION get_active_live_streams()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  stream_type TEXT,
  playback_url TEXT,
  created_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id,
    ls.user_id,
    ls.title,
    ls.description,
    ls.status,
    ls.stream_type,
    ls.playback_url,
    ls.created_at,
    ls.started_at,
    p.username,
    p.display_name,
    p.avatar_url
  FROM live_streams ls
  JOIN profiles p ON p.id = ls.user_id
  WHERE ls.status = 'active'
  ORDER BY ls.started_at DESC NULLS LAST, ls.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

