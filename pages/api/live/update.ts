import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { supabaseAdmin } from '../../../lib/supabase';

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

    const { streamId, action } = req.body;

    if (!streamId || !action) {
      return res.status(400).json({ error: 'Stream ID and action are required' });
    }

    // Verify ownership
    const { data: stream, error: streamError } = await (supabaseAdmin as any)
      .from('live_streams')
      .select('*')
      .eq('id', streamId)
      .eq('user_id', user.id)
      .single();

    if (streamError || !stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    let updateData: any = { updated_at: new Date().toISOString() };

    if (action === 'start') {
      updateData.status = 'active';
      updateData.started_at = new Date().toISOString();
    } else if (action === 'end') {
      updateData.status = 'ended';
      updateData.ended_at = new Date().toISOString();
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Update stream status
    const { data: updatedStream, error: updateError } = await (supabaseAdmin as any)
      .from('live_streams')
      .update(updateData)
      .eq('id', streamId)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json(updatedStream);
  } catch (error: any) {
    console.error('Error updating live stream:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to update live stream' 
    });
  }
}

