import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateCoordinates, storeLocationUpdate } from '../services/location.service';

const router = Router();

/**
 * POST /api/locations
 * Store a location update (also handled via Socket.io, but this is a REST fallback)
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { handoffId, latitude, longitude } = req.body;
    const userId = req.userId!;

    if (!handoffId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: handoffId, latitude, longitude',
      });
    }

    if (!validateCoordinates(latitude, longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Verify user has access to this handoff
    const { default: prisma } = await import('../db/client');
    const handoff = await prisma.handoff.findUnique({
      where: { id: handoffId },
      include: { transaction: true },
    });

    if (!handoff) {
      return res.status(404).json({ error: 'Handoff not found' });
    }

    const isBuyer = handoff.transaction.buyerId === userId;
    const isSeller = handoff.transaction.sellerId === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: 'Unauthorized to update location for this handoff' });
    }

    const locationUpdate = await storeLocationUpdate(handoffId, userId, latitude, longitude);

    res.json(locationUpdate);
  } catch (error: any) {
    console.error('Error storing location update:', error);
    res.status(500).json({ error: error.message || 'Failed to store location update' });
  }
});

export default router;
