# Render Deployment Guide

This guide walks you through deploying the Drop backend to Render.

## Step 1: Push to GitHub

1. Initialize git (if not already done):
```bash
cd /Users/franciscogriffies-benito/drop/drop
git init
git add .
git commit -m "Initial commit"
```

2. Create a new repository on GitHub
3. Push your code:
```bash
git remote add origin YOUR_GITHUB_REPO_URL
git branch -M main
git push -u origin main
```

## Step 2: Create Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `drop-database`
   - **Database**: `drop_db`
   - **User**: `drop_user`
   - **Region**: Choose closest to you
   - **PostgreSQL Version**: Latest
   - **Plan**: Free (or paid if you need)
4. Click "Create Database"
5. Wait for it to provision (takes ~2 minutes)
6. Copy the **Internal Database URL** - you'll need this

## Step 3: Create Web Service on Render

1. In Render Dashboard, click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select the `drop/drop` repository
4. Configure:
   - **Name**: `drop-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build && npm run prisma:generate`
   - **Start Command**: `npm run prisma:migrate:deploy && npm start`

### Environment Variables

Add these in the Render dashboard under "Environment":

**Required:**
```
NODE_ENV=production
PORT=10000
DATABASE_URL=<Copy from your PostgreSQL service - Internal Database URL>
JWT_SECRET=<Generate a random string: openssl rand -base64 32>
STRIPE_SECRET_KEY=<Your Stripe secret key>
STRIPE_PUBLISHABLE_KEY=<Your Stripe publishable key>
APP_URL=https://drop-backend.onrender.com
CORS_ORIGIN=*
```

**For Webhooks (set up later):**
```
STRIPE_WEBHOOK_SECRET=<Will get this after setting up webhook>
```

### Steps:
1. Click "Advanced" → "Add Environment Variable"
2. Add each variable one by one
3. For `DATABASE_URL`: Click the database service, copy "Internal Database URL"
4. For `JWT_SECRET`: Generate with `openssl rand -base64 32`
5. For `APP_URL`: Use your service URL (e.g., `https://drop-backend.onrender.com`)

## Step 4: Deploy

1. Click "Create Web Service"
2. Render will:
   - Clone your repo
   - Install dependencies
   - Build the app
   - Run migrations
   - Start the server

3. Wait for deployment (first time takes ~5-10 minutes)

## Step 5: Verify Deployment

1. Check the logs in Render dashboard
2. Visit: `https://your-service-url.onrender.com/health`
3. Should see: `{"status":"ok","timestamp":"..."}`

## Step 6: Update Mobile App Config

Update `mobile/app.config.js`:

```javascript
extra: {
  apiBaseUrl: 'https://your-service-url.onrender.com/api',
  socketUrl: 'https://your-service-url.onrender.com',
  stripePublishableKey: 'pk_test_your_key_here',
},
```

**Note**: Render free tier services spin down after 15 minutes of inactivity. The first request after spin-down takes ~30 seconds. Consider upgrading for production.

## Step 7: Set Up Stripe Webhook (Optional but Recommended)

1. In Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://your-service-url.onrender.com/api/stripe/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Add to Render environment variables: `STRIPE_WEBHOOK_SECRET`

## Troubleshooting

**Database connection errors:**
- Make sure you're using the **Internal Database URL** (not External)
- Check that the database service is running
- Verify `DATABASE_URL` is set correctly

**Build failures:**
- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compilation succeeds locally

**Migration errors:**
- Run `npm run prisma:migrate:deploy` manually in Render shell if needed
- Check database connection string format

**Service won't start:**
- Check logs in Render dashboard
- Verify `PORT` is set to `10000` (Render default) or use `process.env.PORT`
- Ensure `DATABASE_URL` is correct

## Quick Commands

**Generate JWT Secret:**
```bash
openssl rand -base64 32
```

**Check service URL:**
- Go to Render dashboard → Your service → Settings
- Copy the URL (e.g., `https://drop-backend-xxxx.onrender.com`)

## Next Steps

1. ✅ Database created
2. ✅ Web service deployed
3. ✅ Environment variables set
4. ✅ Mobile app config updated
5. ⏳ Test the API endpoints
6. ⏳ Set up Stripe webhook
7. ⏳ Test full flow end-to-end
