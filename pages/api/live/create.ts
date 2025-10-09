import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
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
    // Verify authentication
    const supabase = createServerSupabaseClient({ req, res });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, description, isVault, vaultPrice } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Create Mux live stream
    const muxStream = await createLiveStream({
      title,
      description,
    });

    const playbackId = muxStream.playbackIds?.[0]?.id;
    const playbackUrl = playbackId ? getLiveStreamPlaybackUrl(playbackId) : null;

    // Create live stream record in database
    const { data: stream, error: dbError } = await (supabaseAdmin as any)
      .from('live_streams')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        mux_stream_id: muxStream.id,
        mux_stream_key: muxStream.streamKey,
        mux_playback_id: playbackId,
        playback_url: playbackUrl,
        status: 'idle',
        is_vault: isVault || false,
        vault_price: isVault ? Math.round(parseFloat(vaultPrice) * 100) : null,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Return stream details (don't expose stream key to client)
    return res.status(200).json({
      id: stream.id,
      title: stream.title,
      description: stream.description,
      playbackUrl: stream.playback_url,
      status: stream.status,
      // Stream credentials for OBS/streaming software
      streamCredentials: {
        serverUrl: 'rtmps://global-live.mux.com:443/app',
        streamKey: muxStream.streamKey,
      },
    });
  } catch (error: any) {
    console.error('Error creating live stream:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to create live stream' 
    });
  }
}

