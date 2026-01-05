# Quick Start - Render Deployment

## Prerequisites
- GitHub account
- Render account (free tier works)
- Stripe account with API keys

## Deployment Steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
# Create repo on GitHub, then:
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### 2. Create Database on Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. "New +" → "PostgreSQL"
3. Name: `drop-database`
4. Click "Create Database"
5. Copy the **Internal Database URL**

### 3. Create Web Service on Render
1. "New +" → "Web Service"
2. Connect GitHub repo
3. Select repository
4. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run prisma:migrate:deploy && npm start`
   
### 4. Add Environment Variables
Add these in Render dashboard:

```
NODE_ENV=production
DATABASE_URL=<from PostgreSQL service>
JWT_SECRET=<run: openssl rand -base64 32>
STRIPE_SECRET_KEY=<your sk_test_...>
STRIPE_PUBLISHABLE_KEY=<your pk_test_...>
APP_URL=https://your-service.onrender.com
CORS_ORIGIN=*
```

### 5. Deploy & Update Mobile Config
After deployment:
1. Copy your service URL (e.g., `https://drop-backend-xxxx.onrender.com`)
2. Update `mobile/app.config.js`:
   ```javascript
   extra: {
     apiBaseUrl: 'https://your-service-url.onrender.com/api',
     socketUrl: 'https://your-service-url.onrender.com',
     stripePublishableKey: 'pk_test_your_key',
   },
   ```

## Done! 🎉

Your backend is now live. See `RENDER_DEPLOYMENT.md` for detailed instructions.
