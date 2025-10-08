import { NextApiRequest, NextApiResponse } from 'next';
import { handleStripeWebhook } from '../../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = JSON.stringify(req.body);
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe signature' });
    }

    const result = await handleStripeWebhook(body, signature);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({ 
      error: 'Webhook handling failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

