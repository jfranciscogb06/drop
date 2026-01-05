import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeSocketHandlers } from './socket/handlers';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Socket.io handlers
initializeSocketHandlers(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import routes
import transactionsRoutes from './routes/transactions';
import locationsRoutes from './routes/locations';
import handoffsRoutes from './routes/handoffs';
import stripeRoutes from './routes/stripe';

// Use routes
app.use('/api/transactions', transactionsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/handoffs', handoffsRoutes);
app.use('/api/stripe', stripeRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
