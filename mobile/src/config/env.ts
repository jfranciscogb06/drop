import Constants from 'expo-constants';

// Environment configuration
export const config = {
  API_BASE_URL: Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000/api',
  SOCKET_URL: Constants.expoConfig?.extra?.socketUrl || 'http://localhost:3000',
  STRIPE_PUBLISHABLE_KEY: Constants.expoConfig?.extra?.stripePublishableKey || '',
};
