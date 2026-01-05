# Drop Mobile App (Expo)

React Native mobile application built with Expo for GPS pin sharing and Stripe escrow payments.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Expo CLI globally (if not already installed):
```bash
npm install -g expo-cli
```

3. Set up environment variables:
   - Create a `.env` file or use `app.config.js` extra config
   - Update `app.config.js` with your configuration:
     - `apiBaseUrl` - Backend API URL
     - `socketUrl` - Socket.io server URL  
     - `stripePublishableKey` - Stripe publishable key

4. Start the development server:
```bash
npm start
```

5. Open in Expo Go:
   - Install Expo Go app on your iOS/Android device
   - Scan the QR code from the terminal
   - Or press `i` for iOS simulator / `a` for Android emulator

## Environment Configuration

Update `app.config.js` extra section with your values:

```javascript
extra: {
  apiBaseUrl: 'http://your-api-url:3000/api',
  socketUrl: 'http://your-api-url:3000',
  stripePublishableKey: 'pk_test_your_key_here',
},
```

**Note**: For local development, use your computer's local IP address instead of `localhost`:
- Find your IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
- Example: `http://192.168.1.100:3000/api`

## Features

- GPS pin dropping for meeting points
- Real-time location sharing via Socket.io
- QR code scanning for handoff confirmation
- Manual code entry as alternative
- Stripe payment integration with escrow

## Permissions

The app requests the following permissions:
- **Location**: For real-time location tracking
- **Camera**: For QR code scanning

These are configured in `app.json` and will be requested when needed.

## Development

- `npm start` - Start Expo dev server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run on web (limited functionality)

## Notes

- Requires Expo Go app for testing on physical devices
- For production builds, you'll need to create a standalone build with `expo build`
- Make sure your backend is running and accessible from your device