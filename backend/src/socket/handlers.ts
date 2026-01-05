import { Server, Socket } from 'socket.io';
import prisma from '../db/client';
import { validateCoordinates, storeLocationUpdate } from '../services/location.service';

interface LocationData {
  handoffId: string;
  latitude: number;
  longitude: number;
}

interface SocketData {
  userId?: string;
  handoffId?: string;
}

export function initializeSocketHandlers(io: Server) {
  io.use(async (socket: Socket & { data: SocketData }, next) => {
    // In a real app, you'd verify JWT token here
    // For now, we'll extract userId from handshake auth
    const token = socket.handshake.auth.token;
    if (token) {
      // Simple token verification - in production use proper JWT verification
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as { userId: string };
        socket.data.userId = decoded.userId;
      } catch (error) {
        // Token verification failed, but we'll allow connection
        // In production, you might want to reject here
        console.warn('Socket auth token verification failed');
      }
    }
    next();
  });

  io.on('connection', (socket: Socket & { data: SocketData }) => {
    console.log(`Socket connected: ${socket.id}`);

    /**
     * Join a handoff room for location sharing
     */
    socket.on('join-handoff', async (data: { handoffId: string }) => {
      try {
        const { handoffId } = data;
        const userId = socket.data.userId;

        if (!handoffId) {
          socket.emit('error', { message: 'handoffId is required' });
          return;
        }

        if (!userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        // Verify user has access to this handoff
        const handoff = await prisma.handoff.findUnique({
          where: { id: handoffId },
          include: { transaction: true },
        });

        if (!handoff) {
          socket.emit('error', { message: 'Handoff not found' });
          return;
        }

        const isBuyer = handoff.transaction.buyerId === userId;
        const isSeller = handoff.transaction.sellerId === userId;

        if (!isBuyer && !isSeller) {
          socket.emit('error', { message: 'Unauthorized to join this handoff' });
          return;
        }

        // Join the handoff room
        socket.join(`handoff:${handoffId}`);
        socket.data.handoffId = handoffId;

        // Notify other party
        socket.to(`handoff:${handoffId}`).emit('user-joined', {
          userId,
          role: isBuyer ? 'buyer' : 'seller',
        });

        socket.emit('joined-handoff', { handoffId });
      } catch (error: any) {
        console.error('Error joining handoff:', error);
        socket.emit('error', { message: error.message || 'Failed to join handoff' });
      }
    });

    /**
     * Leave a handoff room
     */
    socket.on('leave-handoff', (data: { handoffId: string }) => {
      const { handoffId } = data;
      socket.leave(`handoff:${handoffId}`);
      socket.emit('left-handoff', { handoffId });
    });

    /**
     * Broadcast location update
     */
    socket.on('location-update', async (data: LocationData) => {
      try {
        const { handoffId, latitude, longitude } = data;
        const userId = socket.data.userId;

        if (!handoffId || latitude === undefined || longitude === undefined) {
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }

        if (!userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        if (!validateCoordinates(latitude, longitude)) {
          socket.emit('error', { message: 'Invalid coordinates' });
          return;
        }

        // Verify user has access to this handoff
        const handoff = await prisma.handoff.findUnique({
          where: { id: handoffId },
          include: { transaction: true },
        });

        if (!handoff) {
          socket.emit('error', { message: 'Handoff not found' });
          return;
        }

        const isBuyer = handoff.transaction.buyerId === userId;
        const isSeller = handoff.transaction.sellerId === userId;

        if (!isBuyer && !isSeller) {
          socket.emit('error', { message: 'Unauthorized to update location for this handoff' });
          return;
        }

        // Store location update (optional, for history)
        try {
          await storeLocationUpdate(handoffId, userId, latitude, longitude);
        } catch (error) {
          // Log but don't fail - location storage is optional
          console.warn('Failed to store location update:', error);
        }

        // Broadcast to other party in the handoff room
        socket.to(`handoff:${handoffId}`).emit('location-update', {
          userId,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
          role: isBuyer ? 'buyer' : 'seller',
        });

        // Also emit back to sender for confirmation
        socket.emit('location-update-sent', {
          handoffId,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error('Error handling location update:', error);
        socket.emit('error', { message: error.message || 'Failed to process location update' });
      }
    });

    /**
     * Handle handoff confirmation events
     */
    socket.on('handoff-confirmed', async (data: { handoffId: string; userId: string }) => {
      try {
        const { handoffId } = data;
        socket.to(`handoff:${handoffId}`).emit('handoff-confirmed', data);
      } catch (error: any) {
        console.error('Error handling handoff confirmation:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
