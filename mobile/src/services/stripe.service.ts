import { initStripe, useStripe } from '@stripe/stripe-react-native';
import { config } from '../config/env';

export const initializeStripe = () => {
  if (config.STRIPE_PUBLISHABLE_KEY) {
    initStripe({
      publishableKey: config.STRIPE_PUBLISHABLE_KEY,
      merchantIdentifier: 'merchant.com.drop.app', // Update with your merchant ID
    });
  }
};

export { useStripe };
