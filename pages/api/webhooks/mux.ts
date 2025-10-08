import { NextApiRequest, NextApiResponse } from 'next';
import { handleMuxWebhook } from '../../../lib/mux';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = JSON.stringify(req.body);
    const signature = req.headers['mux-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing Mux signature' });
    }

    const result = await handleMuxWebhook(body, signature);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Mux webhook error:', error);
    return res.status(400).json({ 
      error: 'Webhook handling failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

