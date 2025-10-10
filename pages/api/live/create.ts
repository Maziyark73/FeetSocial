import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { createLiveStream, getLiveStreamPlaybackUrl } from '../../../lib/mux';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the auth token from the request headers
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No auth token provided');
      return res.status(401).json({ error: 'Unauthorized - Please log in' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the token with Supabase
    const { data: { user }, error: authError } = await (supabaseAdmin as any).auth.getUser(token);

    console.log('🔐 Auth check:', { 
      hasUser: !!user, 
      userId: user?.id,
      authError: authError?.message 
    });

    if (authError || !user) {
      console.error('❌ Auth failed:', authError);
      return res.status(401).json({ error: 'Unauthorized - Please log in' });
    }

    const { title, description, isVault, vaultPrice, streamType } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const type = streamType || 'rtmp'; // Default to RTMP for backwards compatibility

    let muxStream: any = null;
    let playbackId: string | null = null;
    let playbackUrl: string | null = null;
    let streamKey: string | null = null;

    // Only create Mux stream for RTMP (Pro Stream)
    if (type === 'rtmp') {
      // Create Mux live stream
      muxStream = await createLiveStream({
        title,
        description,
      });

      playbackId = muxStream.playbackIds?.[0]?.id || null;
      playbackUrl = playbackId ? getLiveStreamPlaybackUrl(playbackId) : null;
      streamKey = muxStream.streamKey;
    } else {
      // For WebRTC (Quick Stream), generate a unique stream key
      streamKey = `webrtc-${user.id}-${Date.now()}`;
    }

    // Create live stream record in database
    const { data: stream, error: dbError } = await (supabaseAdmin as any)
      .from('live_streams')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        mux_stream_id: muxStream?.id || null,
        mux_stream_key: streamKey,
        mux_playback_id: playbackId,
        playback_url: playbackUrl,
        status: 'idle',
        stream_type: type,
        is_vault: isVault || false,
        vault_price: isVault ? Math.round(parseFloat(vaultPrice) * 100) : null,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Return stream details
    return res.status(200).json({
      id: stream.id,
      title: stream.title,
      description: stream.description,
      playbackUrl: stream.playback_url,
      status: stream.status,
      streamType: type,
      // Stream credentials (for OBS if RTMP, for WebRTC signaling if webrtc)
      streamCredentials: {
        serverUrl: type === 'rtmp' ? 'rtmps://global-live.mux.com:443/app' : null,
        streamKey: streamKey,
      },
    });
  } catch (error: any) {
    console.error('Error creating live stream:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to create live stream' 
    });
  }
}

