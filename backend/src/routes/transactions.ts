import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import prisma from '../db/client';
import { createPaymentIntent } from '../services/stripe.service';
import { TransactionStatus } from '@prisma/client';
import { validateAmount, validateCurrency } from '../middleware/validator';
import { validateCoordinates } from '../services/location.service';

const router = Router();

/**
 * POST /api/transactions
 * Create a new transaction with payment intent
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sellerId, amount, currency = 'usd', dropPinLat, dropPinLng } = req.body;
    const buyerId = req.userId!;

    // Validation
    if (!sellerId || amount === undefined || dropPinLat === undefined || dropPinLng === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: sellerId, amount, dropPinLat, dropPinLng',
      });
    }

    if (sellerId === buyerId) {
      return res.status(400).json({ error: 'Cannot create transaction with yourself' });
    }

    const amountNum = parseFloat(amount);
    if (!validateAmount(amountNum)) {
      return res.status(400).json({ error: 'Invalid amount. Must be between $0.01 and $10,000' });
    }

    if (!validateCurrency(currency)) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    // Get seller's Stripe Connect account
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    if (!seller.stripeConnectAccountId) {
      return res.status(400).json({
        error: 'Seller has not set up payment account. Please complete Stripe Connect onboarding.',
      });
    }

    // Validate coordinates
    if (!validateCoordinates(dropPinLat, dropPinLng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Create payment intent
    let paymentIntent;
    try {
      paymentIntent = await createPaymentIntent({
        amount: Math.round(amountNum * 100), // Convert to cents
        currency,
        buyerId,
        sellerStripeAccountId: seller.stripeConnectAccountId,
      });
    } catch (error: any) {
      console.error('Stripe error:', error);
      return res.status(500).json({
        error: 'Failed to create payment. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }

    // Generate confirmation code and QR data
    const confirmationCode = generateConfirmationCode();
    const qrCodeData = JSON.stringify({
      transactionId: null, // Will be set after transaction creation
      confirmationCode,
    });

    // Create transaction and handoff in a database transaction
    let transaction;
    try {
      transaction = await prisma.$transaction(async (tx) => {
        const newTransaction = await tx.transaction.create({
          data: {
            buyerId,
            sellerId,
            amount: Math.round(amountNum * 100),
            currency,
            stripePaymentIntentId: paymentIntent.id,
            stripeConnectAccountId: seller.stripeConnectAccountId,
            status: TransactionStatus.PENDING,
          },
        });

        // Update QR code data with transaction ID
        const updatedQrCodeData = JSON.stringify({
          transactionId: newTransaction.id,
          confirmationCode,
        });

        const handoff = await tx.handoff.create({
          data: {
            transactionId: newTransaction.id,
            dropPinLat,
            dropPinLng,
            confirmationCode,
            qrCodeData: updatedQrCodeData,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        });

        return { transaction: newTransaction, handoff };
      });
    } catch (dbError: any) {
      // If database transaction fails, try to cancel payment intent
      try {
        const { cancelPaymentIntent } = await import('../services/stripe.service');
        await cancelPaymentIntent(paymentIntent.id, seller.stripeConnectAccountId);
      } catch (cancelError) {
        console.error('Error cancelling payment intent after DB failure:', cancelError);
      }
      throw dbError;
    }

    res.status(201).json({
      transaction: transaction.transaction,
      handoff: transaction.handoff,
      paymentIntent: {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
      },
    });
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: error.message || 'Failed to create transaction' });
  }
});

/**
 * GET /api/transactions/:id
 * Get transaction details
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        buyer: {
          select: { id: true, email: true, name: true },
        },
        seller: {
          select: { id: true, email: true, name: true },
        },
        handoff: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Verify user is part of transaction
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this transaction' });
    }

    res.json(transaction);
  } catch (error: any) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch transaction' });
  }
});

/**
 * GET /api/transactions
 * Get user's transactions
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        buyer: {
          select: { id: true, email: true, name: true },
        },
        seller: {
          select: { id: true, email: true, name: true },
        },
        handoff: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(transactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

/**
 * POST /api/transactions/:id/cancel
 * Cancel a transaction
 */
router.post('/:id/cancel', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to cancel this transaction' });
    }

    if (transaction.status === TransactionStatus.COMPLETED) {
      return res.status(400).json({ error: 'Cannot cancel completed transaction' });
    }

    if (transaction.status === TransactionStatus.CANCELLED) {
      return res.status(400).json({ error: 'Transaction already cancelled' });
    }

    // Cancel payment intent if exists
    if (transaction.stripePaymentIntentId && transaction.stripeConnectAccountId) {
      const { cancelPaymentIntent } = await import('../services/stripe.service');
      try {
        await cancelPaymentIntent(transaction.stripePaymentIntentId, transaction.stripeConnectAccountId);
      } catch (error: any) {
        console.error('Error cancelling payment intent:', error);
        // Continue with cancellation even if Stripe fails
      }
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: { status: TransactionStatus.CANCELLED },
    });

    res.json(updatedTransaction);
  } catch (error: any) {
    console.error('Error cancelling transaction:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel transaction' });
  }
});

// Helper functions
function generateConfirmationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

export default router;
