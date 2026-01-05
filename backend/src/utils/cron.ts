import { expireOldHandoffs } from '../services/handoff.service';

/**
 * Run expiration check for old handoffs
 * Call this periodically (e.g., every hour) via a cron job or scheduler
 */
export async function runExpirationCheck() {
  try {
    const expiredCount = await expireOldHandoffs();
    if (expiredCount > 0) {
      console.log(`Expired ${expiredCount} handoff(s)`);
    }
  } catch (error) {
    console.error('Error running expiration check:', error);
  }
}

// For development/testing: run every 5 minutes
if (process.env.NODE_ENV === 'development') {
  setInterval(runExpirationCheck, 5 * 60 * 1000);
}
