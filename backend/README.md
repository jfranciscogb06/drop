# Drop Backend

Backend server for GPS pin sharing and Stripe escrow payments.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (copy `.env.example` to `.env` and fill in values):
```bash
cp .env.example .env
```

3. Set up database:
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

4. Start development server:
```bash
npm run dev
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `APP_URL` - Base URL of your application (for Stripe redirects)
- `NODE_ENV` - Environment (development/production)

## API Endpoints

### Transactions
- `POST /api/transactions` - Create a new transaction
- `GET /api/transactions` - Get user's transactions
- `GET /api/transactions/:id` - Get transaction details
- `POST /api/transactions/:id/cancel` - Cancel a transaction

### Handoffs
- `GET /api/handoffs/:id` - Get handoff details
- `POST /api/handoffs/:id/confirm` - Confirm handoff with code
- `POST /api/handoffs/:id/confirm-qr` - Confirm handoff with QR code

### Locations
- `POST /api/locations` - Store location update (REST fallback)

### Stripe
- `POST /api/stripe/create-account` - Create Stripe Connect account
- `POST /api/stripe/webhook` - Stripe webhook endpoint

## Stripe Webhook Setup

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
3. Copy the webhook signing secret to your `.env` file as `STRIPE_WEBHOOK_SECRET`

## Notes

- Payment intents use manual capture to hold funds in escrow
- Handoffs expire after 24 hours
- Expired handoffs are automatically processed (run expiration check periodically)
