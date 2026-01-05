# Deployment Checklist

## ✅ What's Been Set Up

- ✅ Backend code structure
- ✅ Mobile Expo app structure
- ✅ Database schema (Prisma)
- ✅ Render configuration files
- ✅ Environment variable templates
- ✅ Migration scripts
- ✅ .gitignore configured

## 📋 What You Need to Do

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
# Create repo on GitHub
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### 2. Create Render Account
- Go to [render.com](https://render.com)
- Sign up (free tier works)

### 3. Deploy Database
1. Render Dashboard → "New +" → "PostgreSQL"
2. Name: `drop-database`
3. Click "Create Database"
4. Wait ~2 minutes
5. Copy **Internal Database URL**

### 4. Deploy Backend
1. Render Dashboard → "New +" → "Web Service"
2. Connect GitHub repo
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run prisma:migrate:deploy && npm start`
4. Add environment variables (see below)
5. Click "Create Web Service"

### 5. Environment Variables (Add in Render)

**Required:**
```
NODE_ENV=production
DATABASE_URL=<paste Internal Database URL from step 3>
JWT_SECRET=<generate: openssl rand -base64 32>
STRIPE_SECRET_KEY=<your sk_test_... key>
STRIPE_PUBLISHABLE_KEY=<your pk_test_... key>
APP_URL=<will be https://your-service.onrender.com>
CORS_ORIGIN=*
```

**After deployment, update APP_URL:**
1. Copy your service URL from Render dashboard
2. Update APP_URL environment variable
3. Redeploy if needed

### 6. Update Mobile Config

After backend is deployed:

1. Copy your backend URL (e.g., `https://drop-backend-xxxx.onrender.com`)
2. Edit `mobile/app.config.js`:
   ```javascript
   extra: {
     apiBaseUrl: 'https://your-service-url.onrender.com/api',
     socketUrl: 'https://your-service-url.onrender.com',
     stripePublishableKey: 'pk_test_your_key_here',
   },
   ```

### 7. Test Deployment

1. Visit: `https://your-service-url.onrender.com/health`
2. Should see: `{"status":"ok","timestamp":"..."}`
3. Test mobile app with Expo Go

## 🎉 Done!

Your app is now live. See `RENDER_DEPLOYMENT.md` for troubleshooting.
