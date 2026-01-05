import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import prisma from '../db/client';
import { createConnectAccount, verifyWebhookSignature } from '../services/stripe.service';
import { TransactionStatus } from '@prisma/client';

const router = Router();

/**
 * POST /api/stripe/create-account
 * Create Stripe Connect account for seller
 */
router.post('/create-account', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.stripeConnectAccountId) {
      return res.status(400).json({
        error: 'Stripe Connect account already exists',
        accountId: user.stripeConnectAccountId,
      });
    }

    const { accountId, accountLink } = await createConnectAccount({
      email: user.email,
      userId: user.id,
    });

    // Store account ID
    await prisma.user.update({
      where: { id: userId },
      data: { stripeConnectAccountId: accountId },
    });

    res.json({
      accountId,
      accountLink,
      message: 'Complete onboarding to activate your account',
    });
  } catch (error: any) {
    console.error('Error creating Stripe Connect account:', error);
    res.status(500).json({ error: error.message || 'Failed to create Stripe Connect account' });
  }
});

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhooks
 * Note: This route should use express.raw() middleware (configured in server.ts)
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  try {
    // req.body is already a Buffer from express.raw() middleware
    const event = verifyWebhookSignature(req.body as Buffer, sig);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        // Payment was successfully authorized
        const paymentIntent = event.data.object as any;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        // Payment authorization failed
        const failedIntent = event.data.object as any;
        await handlePaymentIntentFailed(failedIntent);
        break;

      case 'account.updated':
        // Stripe Connect account was updated
        const account = event.data.object as any;
        await handleAccountUpdated(account);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Webhook handlers
async function handlePaymentIntentSucceeded(paymentIntent: any) {
  try {
    // Find transaction by payment intent ID
    const transaction = await prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (transaction && transaction.status === TransactionStatus.PENDING) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.AUTHORIZED },
      });
    }
  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (transaction) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.CANCELLED },
      });
    }
  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error);
  }
}

async function handleAccountUpdated(account: any) {
  try {
    // Update user's Stripe Connect account status if needed
    // This can be used to track account verification status
    const user = await prisma.user.findFirst({
      where: { stripeConnectAccountId: account.id },
    });

    if (user) {
      // Account is updated, you might want to store additional info
      console.log(`Stripe Connect account updated for user ${user.id}`);
    }
  } catch (error) {
    console.error('Error handling account.updated:', error);
  }
}

export default router;
