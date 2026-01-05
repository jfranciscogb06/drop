import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { initializeStripe } from './src/services/stripe.service';
import { config } from './src/config/env';
import MapMainScreen from './src/screens/MapMainScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import MapScreen from './src/screens/MapScreen';
import LocationShareScreen from './src/screens/LocationShareScreen';
import HandoffConfirmScreen from './src/screens/HandoffConfirmScreen';
import { RootStackParamList } from './src/types/navigation';
import { colors, typography } from './src/theme';

export type { RootStackParamList };

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  useEffect(() => {
    initializeStripe();
  }, []);

  return (
    <StripeProvider publishableKey={config.STRIPE_PUBLISHABLE_KEY}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="MapMainScreen"
            screenOptions={{
              headerStyle: {
                backgroundColor: colors.primary.main,
              },
              headerTintColor: colors.text.white,
              headerTitleStyle: {
                ...typography.styles.h4,
                color: colors.text.white,
              },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen
              name="MapMainScreen"
              component={MapMainScreen}
              options={{ 
                title: 'Drop',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="TransactionScreen"
              component={TransactionScreen}
              options={{ title: 'Create Transaction' }}
            />
            <Stack.Screen
              name="MapScreen"
              component={MapScreen}
              options={{ title: 'Select Location' }}
            />
            <Stack.Screen
              name="LocationShareScreen"
              component={LocationShareScreen}
              options={{ title: 'Location Sharing' }}
            />
            <Stack.Screen
              name="HandoffConfirmScreen"
              component={HandoffConfirmScreen}
              options={{ title: 'Confirm Handoff' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </StripeProvider>
  );
};

export default App;