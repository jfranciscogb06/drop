# Environment Variable Setup for Render

## Quick Fix for Database Error

The deployment is failing because `DATABASE_URL` is not set. Follow these steps:

### Step 1: Get Your Database URL from Render

1. Go to your Render Dashboard: https://dashboard.render.com/
2. Click on your **database service** (should be named `drop-database`)
3. Find the **"Internal Database URL"** section
4. **Copy the Internal Database URL** (it should look like: `postgresql://drop_user:password@dpg-xxxxx-a/drop_db`)

### Step 2: Add Environment Variables to Your Web Service

1. Go to your **web service** (should be named `drop-backend`)
2. Click on **"Environment"** in the left sidebar
3. Add these environment variables one by one:

**Required Variables:**

1. **DATABASE_URL**
   - Key: `DATABASE_URL`
   - Value: Paste the **Internal Database URL** you copied from step 1
   - Click "Save Changes"

2. **STRIPE_SECRET_KEY**
   - Key: `STRIPE_SECRET_KEY`
   - Value: Your Stripe secret key (starts with `sk_test_...`)

3. **STRIPE_PUBLISHABLE_KEY**
   - Key: `STRIPE_PUBLISHABLE_KEY`
   - Value: `pk_test_51SlzeZRkQgt0Hb9BYA0EpcS1gYqjygM2cUOAfcEIvGRqe2Cawgdxh1fMvVWVrUn4hZV5AwVYFqqnGO6GwEKhIA8E00kj0wPLap`

4. **JWT_SECRET**
   - Key: `JWT_SECRET`
   - Value: Generate a random string (run: `openssl rand -base64 32` locally, or use any random string)

5. **APP_URL**
   - Key: `APP_URL`
   - Value: `https://drop-rpxl.onrender.com`

6. **NODE_ENV**
   - Key: `NODE_ENV`
   - Value: `production`

7. **PORT**
   - Key: `PORT`
   - Value: `10000`

8. **CORS_ORIGIN**
   - Key: `CORS_ORIGIN`
   - Value: `*`

### Step 3: Redeploy

After adding all environment variables:
1. Click "Save Changes" 
2. Render should automatically redeploy
3. Or click "Manual Deploy" → "Deploy latest commit"

### Step 4: Verify

Once deployed, check:
- Visit: `https://drop-rpxl.onrender.com/health`
- Should return: `{"status":"ok","timestamp":"..."}`

## Important Notes

- Use the **Internal Database URL**, not the External one
- The Internal Database URL starts with `postgresql://` or `postgres://`
- Make sure there are no extra spaces or quotes in the values
- All environment variables are case-sensitive

## Need Help?

If you see any errors:
1. Check the Render logs for specific error messages
2. Verify all environment variables are set correctly
3. Make sure the database service is running
4. Check that the Internal Database URL is correct
