# Drop - GPS Pin Sharing & Stripe Escrow

A mobile application for secure handoffs with GPS location tracking and escrow payments.

## Features

- **GPS Pin Sharing**: Drop a pin for the exact meeting point
- **Real-time Location Sharing**: View both parties' locations as they approach
- **Handoff Confirmation**: Confirm handoff via QR code scanning or short code entry
- **Stripe Escrow**: Payments held in escrow until both parties confirm completion

## Architecture

- **Backend**: Node.js/Express with TypeScript, PostgreSQL, Prisma ORM
- **Mobile**: React Native with Expo
- **Real-time**: Socket.io for location updates
- **Payments**: Stripe Connect with manual capture (escrow)
- **Hosting**: Render (backend) + Expo Go (mobile)

## Quick Deployment

**For Render deployment, see [`QUICK_START.md`](QUICK_START.md) or [`RENDER_DEPLOYMENT.md`](RENDER_DEPLOYMENT.md)**

## Project Structure

```
drop/
├── backend/          # Express backend server
│   ├── src/
│   │   ├── routes/   # API routes
│   │   ├── services/ # Business logic
│   │   ├── socket/   # Socket.io handlers
│   │   └── middleware/
│   └── prisma/       # Database schema
├── mobile/           # React Native Expo app
│   └── src/
│       ├── screens/  # App screens
│       ├── services/ # API and services
│       └── socket/   # Socket.io client
└── render.yaml       # Render deployment config
```

## Local Development

### Backend

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables (copy `.env.example` to `.env` and fill in values)

3. Set up database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start server:
```bash
npm run dev
```

### Mobile

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Update `app.config.js` with your backend URL (use local IP for physical devices)

3. Start Expo:
```bash
npm start
```

4. Scan QR code with Expo Go app

## Documentation

- [`QUICK_START.md`](QUICK_START.md) - Quick Render deployment guide
- [`RENDER_DEPLOYMENT.md`](RENDER_DEPLOYMENT.md) - Detailed Render deployment
- [`SETUP.md`](SETUP.md) - Local setup checklist
- [`backend/README.md`](backend/README.md) - Backend API documentation
- [`mobile/README.md`](mobile/README.md) - Mobile app documentation
