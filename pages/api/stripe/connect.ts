import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/supabase';
import { createStripeConnectAccount, getStripeConnectAccountLink } from '../../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action } = req.body;

    if (action === 'create_account') {
      // Create new Stripe Connect account
      const account = await createStripeConnectAccount(user.id, user.email);
      return res.status(200).json({ 
        success: true, 
        accountId: account.id,
        message: 'Stripe Connect account created successfully'
      });
    }

    if (action === 'create_link') {
      const { accountId } = req.body;
      if (!accountId) {
        return res.status(400).json({ error: 'Account ID is required' });
      }

      // Create account link for onboarding
      const accountLink = await getStripeConnectAccountLink(accountId);
      return res.status(200).json({ 
        success: true, 
        url: accountLink.url,
        message: 'Account link created successfully'
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

