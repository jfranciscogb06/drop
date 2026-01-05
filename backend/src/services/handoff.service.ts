import prisma from '../db/client';
import { TransactionStatus } from '@prisma/client';

/**
 * Check and expire old handoffs
 */
export async function expireOldHandoffs() {
  const expiredHandoffs = await prisma.handoff.findMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
      confirmedAt: null,
    },
    include: {
      transaction: true,
    },
  });

  for (const handoff of expiredHandoffs) {
    // Only expire if transaction is still pending/authorized
    if (
      handoff.transaction.status === TransactionStatus.PENDING ||
      handoff.transaction.status === TransactionStatus.AUTHORIZED
    ) {
      await prisma.transaction.update({
        where: { id: handoff.transaction.id },
        data: { status: TransactionStatus.EXPIRED },
      });

      // Cancel payment intent if exists
      if (
        handoff.transaction.stripePaymentIntentId &&
        handoff.transaction.stripeConnectAccountId
      ) {
        try {
          const { cancelPaymentIntent } = await import('./stripe.service');
          await cancelPaymentIntent(
            handoff.transaction.stripePaymentIntentId,
            handoff.transaction.stripeConnectAccountId
          );
        } catch (error) {
          console.error('Error cancelling expired payment intent:', error);
        }
      }
    }
  }

  return expiredHandoffs.length;
}
