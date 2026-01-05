import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { StatusBar } from 'expo-status-bar';
import { initializeStripe } from './src/services/stripe.service';
import { config } from './src/config/env';
import TransactionScreen from './src/screens/TransactionScreen';
import MapScreen from './src/screens/MapScreen';
import LocationShareScreen from './src/screens/LocationShareScreen';
import HandoffConfirmScreen from './src/screens/HandoffConfirmScreen';
import { RootStackParamList } from './src/types/navigation';

export type { RootStackParamList };

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    initializeStripe();
  }, []);

  return (
    <StripeProvider publishableKey={config.STRIPE_PUBLISHABLE_KEY}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="TransactionScreen"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#007AFF',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
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
}
