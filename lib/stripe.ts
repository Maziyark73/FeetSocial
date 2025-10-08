import Stripe from 'stripe';
import { supabaseAdmin } from './supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Stripe Connect operations
export const createStripeConnectAccount = async (userId: string, email: string) => {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // You might want to make this configurable
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Update user with Stripe account ID
    await (supabaseAdmin as any)
      .from('users')
      .update({ stripe_account_id: account.id })
      .eq('id', userId);

    return account;
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    throw error;
  }
};

export const getStripeConnectAccountLink = async (accountId: string) => {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/profile?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/profile?success=true`,
      type: 'account_onboarding',
    });

    return accountLink;
  } catch (error) {
    console.error('Error creating account link:', error);
    throw error;
  }
};

export const getStripeConnectAccount = async (accountId: string) => {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch (error) {
    console.error('Error retrieving Stripe account:', error);
    throw error;
  }
};

// Payment operations
export const createTipCheckoutSession = async ({
  fromUserId,
  toUserId,
  amount,
  message,
}: {
  fromUserId: string;
  toUserId: string;
  amount: number; // in cents
  message?: string;
}) => {
  try {
    // Get creator's Stripe account
    const { data: creator, error: creatorError } = await (supabaseAdmin as any)
      .from('users')
      .select('stripe_account_id, display_name')
      .eq('id', toUserId)
      .single();

    if (creatorError || !creator?.stripe_account_id) {
      throw new Error('Creator not found or not set up for payments');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Tip to ${creator.display_name}`,
              description: message || 'Thank you for your content!',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/profile/${toUserId}?tip_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/profile/${toUserId}?tip_cancelled=true`,
      metadata: {
        type: 'tip',
        from_user_id: fromUserId,
        to_user_id: toUserId,
        message: message || '',
      },
      payment_intent_data: {
        application_fee_amount: Math.round(amount * 0.1), // 10% platform fee
        transfer_data: {
          destination: creator.stripe_account_id,
        },
      },
    });

    // Create payment record
    await (supabaseAdmin as any).from('payments').insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      amount,
      type: 'tip',
      stripe_payment_intent_id: session.payment_intent as string,
      status: 'pending',
    });

    return session;
  } catch (error) {
    console.error('Error creating tip checkout session:', error);
    throw error;
  }
};

export const createVaultUnlockSession = async ({
  fromUserId,
  postId,
  postPrice,
}: {
  fromUserId: string;
  postId: string;
  postPrice: number; // in cents
}) => {
  try {
    // Get post and creator info
    const { data: post, error: postError } = await (supabaseAdmin as any)
      .from('posts')
      .select(`
        *,
        user:users(stripe_account_id, display_name)
      `)
      .eq('id', postId)
      .single();

    if (postError || !post?.user?.stripe_account_id) {
      throw new Error('Post or creator not found');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Unlock: ${post.title}`,
              description: post.description || 'Premium content',
            },
            unit_amount: postPrice,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/post/${postId}?unlock_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/post/${postId}?unlock_cancelled=true`,
      metadata: {
        type: 'vault_unlock',
        from_user_id: fromUserId,
        to_user_id: post.user_id,
        post_id: postId,
      },
      payment_intent_data: {
        application_fee_amount: Math.round(postPrice * 0.1), // 10% platform fee
        transfer_data: {
          destination: post.user.stripe_account_id,
        },
      },
    });

    // Create payment record
    await (supabaseAdmin as any).from('payments').insert({
      from_user_id: fromUserId,
      to_user_id: post.user_id,
      post_id: postId,
      amount: postPrice,
      type: 'vault_unlock',
      stripe_payment_intent_id: session.payment_intent as string,
      status: 'pending',
    });

    return session;
  } catch (error) {
    console.error('Error creating vault unlock session:', error);
    throw error;
  }
};

// Webhook handlers
export const handleStripeWebhook = async (body: string, signature: string) => {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  } catch (error) {
    console.error('Webhook error:', error);
    throw error;
  }
};

const handleCheckoutSessionCompleted = async (session: Stripe.Checkout.Session) => {
  const { metadata } = session;
  
  if (metadata?.type === 'tip') {
    // Update payment status
    await (supabaseAdmin as any)
      .from('payments')
      .update({ status: 'completed' })
      .eq('stripe_payment_intent_id', session.payment_intent);
  } else if (metadata?.type === 'vault_unlock') {
    // Update payment status and grant vault access
    const { data: payment } = await (supabaseAdmin as any)
      .from('payments')
      .update({ status: 'completed' })
      .eq('stripe_payment_intent_id', session.payment_intent)
      .select()
      .single();

    if (payment && metadata.post_id) {
      await (supabaseAdmin as any).from('vault_access').insert({
        user_id: metadata.from_user_id,
        post_id: metadata.post_id,
        payment_id: payment.id,
      });
    }
  }
};

const handlePaymentIntentSucceeded = async (paymentIntent: Stripe.PaymentIntent) => {
  // Update payment status
  await (supabaseAdmin as any)
    .from('payments')
    .update({ status: 'completed' })
    .eq('stripe_payment_intent_id', paymentIntent.id);
};

const handlePaymentIntentFailed = async (paymentIntent: Stripe.PaymentIntent) => {
  // Update payment status
  await (supabaseAdmin as any)
    .from('payments')
    .update({ status: 'failed' })
    .eq('stripe_payment_intent_id', paymentIntent.id);
};

// Utility functions
export const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100);
};

export const parseAmount = (amount: string) => {
  return Math.round(parseFloat(amount) * 100);
};

// Get user's payment history
export const getUserPayments = async (userId: string, limit = 20) => {
  const { data, error } = await (supabaseAdmin as any)
    .from('payments')
    .select(`
      *,
      from_user:users!payments_from_user_id_fkey(username, display_name, avatar_url),
      to_user:users!payments_to_user_id_fkey(username, display_name, avatar_url),
      post:posts(title, image_url)
    `)
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

// Get user's earnings
export const getUserEarnings = async (userId: string) => {
  const { data, error } = await (supabaseAdmin as any)
    .from('payments')
    .select('amount, status')
    .eq('to_user_id', userId)
    .eq('status', 'completed');

  if (error) throw error;

  const totalEarnings = data.reduce((sum: number, payment: any) => sum + payment.amount, 0);
  return {
    totalEarnings,
    payments: data,
  };
};

