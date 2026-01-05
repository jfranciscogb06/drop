export default {
  expo: {
    name: 'Drop',
    slug: 'drop',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.drop.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Drop needs your location to share real-time location during handoffs',
        NSCameraUsageDescription:
          'Drop needs camera access to scan QR codes for handoff confirmation',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.drop.app',
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'CAMERA'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow Drop to use your location for real-time handoff tracking.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'Allow Drop to access your camera to scan QR codes for handoff confirmation.',
        },
      ],
    ],
    extra: {
      apiBaseUrl: process.env.API_BASE_URL || 'https://drop-rpxl.onrender.com/api',
      socketUrl: process.env.SOCKET_URL || 'https://drop-rpxl.onrender.com',
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51SlzeZRkQgt0Hb9BYA0EpcS1gYqjygM2cUOAfcEIvGRqe2Cawgdxh1fMvVWVrUn4hZV5AwVYFqqnGO6GwEKhIA8E00kj0wPLap',
    },
  },
};
