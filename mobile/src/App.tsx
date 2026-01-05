import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { initializeStripe } from './services/stripe.service';
import { config } from './config/env';
import TransactionScreen from './screens/TransactionScreen';
import MapScreen from './screens/MapScreen';
import LocationShareScreen from './screens/LocationShareScreen';
import HandoffConfirmScreen from './screens/HandoffConfirmScreen';
import { RootStackParamList } from './types/navigation';
import { colors, typography } from './theme';

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
            initialRouteName="TransactionScreen"
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