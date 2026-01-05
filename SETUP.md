# Setup Checklist

## What I've Done
- ✅ Created backend `.env` file with placeholders
- ✅ Set up mobile app configuration structure

## What You Need to Do

### 1. Backend (.env file)
Edit `backend/.env` and fill in:

**Required:**
- `DATABASE_URL` - Your PostgreSQL connection string
  - Example: `postgresql://postgres:password@localhost:5432/drop_db?schema=public`
  - Create the database: `createdb drop_db` (or use your preferred method)

- `STRIPE_SECRET_KEY` - Your Stripe Secret key (starts with `sk_test_`)
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe Publishable key (starts with `pk_test_`)

**Optional for now (needed for webhooks):**
- `STRIPE_WEBHOOK_SECRET` - Get this after setting up webhook endpoint
  - Run: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
  - Copy the webhook signing secret from the output

### 2. Mobile App (app.config.js)
Edit `mobile/app.config.js` and update the `extra` section:

```javascript
extra: {
  apiBaseUrl: 'http://YOUR_LOCAL_IP:3000/api',  // Use your computer's IP, not localhost
  socketUrl: 'http://YOUR_LOCAL_IP:3000',        // Use your computer's IP
  stripePublishableKey: 'pk_test_your_key_here', // Your Stripe publishable key
},
```

**Important:** For mobile devices, use your computer's local IP address instead of `localhost`:
- Find your IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
- Look for something like `192.168.1.100` or `10.0.0.5`
- Example: `http://192.168.1.100:3000/api`

### 3. Database Setup
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
```

### 4. Install Dependencies
```bash
# Backend
cd backend
npm install

# Mobile
cd mobile
npm install
```

### 5. Start Development
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Mobile (in a new terminal)
cd mobile
npm start
```

Then scan QR code with Expo Go app on your phone!

## Summary of What's Needed

1. ✅ Backend `.env` - Fill in DATABASE_URL and Stripe keys
2. ✅ Mobile `app.config.js` - Fill in API URLs and Stripe publishable key
3. ✅ PostgreSQL database - Create the database
4. ✅ Run migrations - `npm run prisma:migrate` in backend
5. ✅ Install dependencies - `npm install` in both directories

Everything else is set up and ready to go!
