import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import prisma from '../db/client';
import { capturePayment } from '../services/stripe.service';
import { TransactionStatus } from '@prisma/client';

const router = Router();

/**
 * GET /api/handoffs/:id
 * Get handoff details
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const handoff = await prisma.handoff.findUnique({
      where: { id },
      include: {
        transaction: {
          include: {
            buyer: {
              select: { id: true, email: true, name: true },
            },
            seller: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    });

    if (!handoff) {
      return res.status(404).json({ error: 'Handoff not found' });
    }

    // Verify user is part of transaction
    if (
      handoff.transaction.buyerId !== userId &&
      handoff.transaction.sellerId !== userId
    ) {
      return res.status(403).json({ error: 'Unauthorized to view this handoff' });
    }

    res.json(handoff);
  } catch (error: any) {
    console.error('Error fetching handoff:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch handoff' });
  }
});

/**
 * POST /api/handoffs/:id/confirm
 * Confirm handoff (scan QR code or enter code)
 */
router.post('/:id/confirm', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { confirmationCode } = req.body;
    const userId = req.userId!;

    if (!confirmationCode) {
      return res.status(400).json({ error: 'Confirmation code required' });
    }

    const handoff = await prisma.handoff.findUnique({
      where: { id },
      include: {
        transaction: true,
      },
    });

    if (!handoff) {
      return res.status(404).json({ error: 'Handoff not found' });
    }

    // Verify user is part of transaction
    const isBuyer = handoff.transaction.buyerId === userId;
    const isSeller = handoff.transaction.sellerId === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: 'Unauthorized to confirm this handoff' });
    }

    // Verify confirmation code
    if (handoff.confirmationCode !== confirmationCode) {
      return res.status(400).json({ error: 'Invalid confirmation code' });
    }

    // Check if handoff has expired
    if (new Date() > handoff.expiresAt) {
      // Auto-expire the handoff
      await prisma.transaction.update({
        where: { id: handoff.transaction.id },
        data: { status: TransactionStatus.EXPIRED },
      });
      return res.status(400).json({ error: 'Handoff session has expired' });
    }

    // Check if transaction is still valid
    if (
      handoff.transaction.status !== TransactionStatus.AUTHORIZED &&
      handoff.transaction.status !== TransactionStatus.PENDING
    ) {
      return res
        .status(400)
        .json({ error: 'Transaction is not in a valid state for confirmation' });
    }

    // Check if already confirmed by this user
    if ((isBuyer && handoff.buyerConfirmed) || (isSeller && handoff.sellerConfirmed)) {
      return res.status(400).json({ error: 'You have already confirmed this handoff' });
    }

    // Update confirmation status
    const updateData: any = {};
    if (isBuyer) {
      updateData.buyerConfirmed = true;
    } else {
      updateData.sellerConfirmed = true;
    }

    const updatedHandoff = await prisma.handoff.update({
      where: { id },
      data: updateData,
      include: {
        transaction: true,
      },
    });

    // Check if both parties have confirmed
    const bothConfirmed = updatedHandoff.buyerConfirmed && updatedHandoff.sellerConfirmed;

    if (bothConfirmed) {
      // Release payment from escrow
      if (
        updatedHandoff.transaction.stripePaymentIntentId &&
        updatedHandoff.transaction.stripeConnectAccountId
      ) {
        try {
          await capturePayment(
            updatedHandoff.transaction.stripePaymentIntentId,
            updatedHandoff.transaction.stripeConnectAccountId
          );

          // Update transaction status
          await prisma.transaction.update({
            where: { id: updatedHandoff.transaction.id },
            data: {
              status: TransactionStatus.COMPLETED,
            },
          });

          // Update handoff confirmedAt
          await prisma.handoff.update({
            where: { id },
            data: { confirmedAt: new Date() },
          });
        } catch (error: any) {
          console.error('Error capturing payment:', error);
          return res.status(500).json({
            error: 'Failed to release payment: ' + error.message,
          });
        }
      }

      // Fetch updated handoff
      const finalHandoff = await prisma.handoff.findUnique({
        where: { id },
        include: {
          transaction: true,
        },
      });

      return res.json({
        handoff: finalHandoff,
        paymentReleased: true,
        message: 'Payment has been released from escrow',
      });
    }

    res.json({
      handoff: updatedHandoff,
      paymentReleased: false,
      message: isBuyer
        ? 'Buyer confirmed. Waiting for seller confirmation.'
        : 'Seller confirmed. Waiting for buyer confirmation.',
    });
  } catch (error: any) {
    console.error('Error confirming handoff:', error);
    res.status(500).json({ error: error.message || 'Failed to confirm handoff' });
  }
});

/**
 * POST /api/handoffs/:id/confirm-qr
 * Confirm handoff using QR code data
 */
router.post('/:id/confirm-qr', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { qrCodeData } = req.body;
    const userId = req.userId!;

    if (!qrCodeData) {
      return res.status(400).json({ error: 'QR code data required' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrCodeData);
    } catch {
      return res.status(400).json({ error: 'Invalid QR code data format' });
    }

    // Verify the QR code matches this handoff
    const handoff = await prisma.handoff.findUnique({
      where: { id },
      include: {
        transaction: true,
      },
    });

    if (!handoff) {
      return res.status(404).json({ error: 'Handoff not found' });
    }

    if (
      parsedData.transactionId !== handoff.transactionId ||
      parsedData.confirmationCode !== handoff.confirmationCode
    ) {
      return res.status(400).json({ error: 'QR code does not match this handoff' });
    }

    // Reuse confirmation logic by calling the confirm endpoint handler
    // Set confirmationCode in body and call the confirm handler
    req.body.confirmationCode = parsedData.confirmationCode;
    
    // Re-validate and process confirmation
    const isBuyer = handoff.transaction.buyerId === userId;
    const isSeller = handoff.transaction.sellerId === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: 'Unauthorized to confirm this handoff' });
    }

    // Check if handoff has expired
    if (new Date() > handoff.expiresAt) {
      return res.status(400).json({ error: 'Handoff session has expired' });
    }

    // Update confirmation status
    const updateData: any = {};
    if (isBuyer) {
      updateData.buyerConfirmed = true;
    } else {
      updateData.sellerConfirmed = true;
    }

    const updatedHandoff = await prisma.handoff.update({
      where: { id },
      data: updateData,
      include: {
        transaction: true,
      },
    });

    // Check if both parties have confirmed
    const bothConfirmed = updatedHandoff.buyerConfirmed && updatedHandoff.sellerConfirmed;

    if (bothConfirmed) {
      // Release payment from escrow
      if (
        updatedHandoff.transaction.stripePaymentIntentId &&
        updatedHandoff.transaction.stripeConnectAccountId
      ) {
        try {
          await capturePayment(
            updatedHandoff.transaction.stripePaymentIntentId,
            updatedHandoff.transaction.stripeConnectAccountId
          );

          // Update transaction status
          await prisma.transaction.update({
            where: { id: updatedHandoff.transaction.id },
            data: {
              status: TransactionStatus.COMPLETED,
            },
          });

          // Update handoff confirmedAt
          await prisma.handoff.update({
            where: { id },
            data: { confirmedAt: new Date() },
          });
        } catch (error: any) {
          console.error('Error capturing payment:', error);
          return res.status(500).json({
            error: 'Failed to release payment: ' + error.message,
          });
        }
      }

      // Fetch updated handoff
      const finalHandoff = await prisma.handoff.findUnique({
        where: { id },
        include: {
          transaction: true,
        },
      });

      return res.json({
        handoff: finalHandoff,
        paymentReleased: true,
        message: 'Payment has been released from escrow',
      });
    }

    res.json({
      handoff: updatedHandoff,
      paymentReleased: false,
      message: isBuyer
        ? 'Buyer confirmed. Waiting for seller confirmation.'
        : 'Seller confirmed. Waiting for buyer confirmation.',
    });
  } catch (error: any) {
    console.error('Error confirming handoff via QR:', error);
    res.status(500).json({ error: error.message || 'Failed to confirm handoff' });
  }
});

export default router;
