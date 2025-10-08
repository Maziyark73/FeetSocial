import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email, username, displayName, isCreator } = req.body;

    if (!userId || !email || !username || !displayName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use admin client to bypass RLS
    const { data, error } = await (supabaseAdmin as any)
      .from('users')
      .insert({
        id: userId,
        email: email,
        username: username,
        display_name: displayName,
        is_creator: isCreator || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Profile creation error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

