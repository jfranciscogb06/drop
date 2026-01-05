import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export interface CreatePaymentIntentParams {
  amount: number; // in cents
  currency: string;
  buyerId: string;
  sellerStripeAccountId: string;
  metadata?: Record<string, string>;
}

export interface CreateConnectAccountParams {
  email: string;
  userId: string;
}

/**
 * Create a Stripe Connect account for a seller
 */
export async function createConnectAccount(params: CreateConnectAccountParams) {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US', // Default, can be made configurable
    email: params.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      userId: params.userId,
    },
  });

  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.APP_URL || 'http://localhost:3000'}/stripe/reauth`,
    return_url: `${process.env.APP_URL || 'http://localhost:3000'}/stripe/return`,
    type: 'account_onboarding',
  });

  return {
    accountId: account.id,
    accountLink: accountLink.url,
  };
}

/**
 * Create a Payment Intent with manual capture (escrow)
 * Note: For Connect, we create on platform account and transfer after capture
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: params.currency,
    capture_method: 'manual', // Hold funds in escrow
    payment_method_types: ['card'],
    metadata: {
      buyerId: params.buyerId,
      sellerStripeAccountId: params.sellerStripeAccountId,
      ...params.metadata,
    },
    // Store destination for later transfer after capture
    // We'll transfer to connected account after capture
  });

  return paymentIntent;
}

/**
 * Capture a payment (release from escrow) and transfer to connected account
 */
export async function capturePayment(paymentIntentId: string, sellerStripeAccountId: string) {
  // First, capture the payment on the platform account
  const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

  // Then transfer the full amount to the connected account
  await stripe.transfers.create({
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    destination: sellerStripeAccountId,
    metadata: {
      payment_intent_id: paymentIntentId,
    },
  });

  return paymentIntent;
}

/**
 * Cancel a payment intent (release authorization)
 */
export async function cancelPaymentIntent(paymentIntentId: string, sellerStripeAccountId: string) {
  const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
  return paymentIntent;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export { stripe };