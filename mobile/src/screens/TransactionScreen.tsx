import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import api from '../services/api.service';
import { colors, typography, spacing, spacingPatterns } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TransactionScreen: React.FC = () => {
  const [sellerId, setSellerId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const navigation = useNavigation<NavigationProp>();

  const handleCreateTransaction = async () => {
    if (!sellerId || !amount) {
      Alert.alert('Error', 'Please enter seller ID and amount');
      return;
    }

    setLoading(true);
    try {
      // First, navigate to map to select location
      navigation.navigate('MapScreen', {
        onLocationSelected: async (lat: number, lng: number) => {
          try {
            // Create transaction
            const response = await api.post('/transactions', {
              sellerId,
              amount: parseFloat(amount),
              dropPinLat: lat,
              dropPinLng: lng,
            });

            const { transaction, handoff, paymentIntent } = response.data;

            // Initialize payment sheet
            const { error: initError } = await initPaymentSheet({
              merchantDisplayName: 'Drop',
              paymentIntentClientSecret: paymentIntent.clientSecret,
            });

            if (initError) {
              Alert.alert('Error', initError.message);
              setLoading(false);
              return;
            }

            // Present payment sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
              Alert.alert('Error', presentError.message);
              setLoading(false);
              return;
            }

            // Payment successful, navigate to location share screen
            navigation.navigate('LocationShareScreen', {
              transactionId: transaction.id,
              handoffId: handoff.id,
            });
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || error.message);
          } finally {
            setLoading(false);
          }
        },
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.description}>
          Enter the seller ID and amount to start a new transaction
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Seller ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter seller ID"
            placeholderTextColor={colors.text.light}
            value={sellerId}
            onChangeText={setSellerId}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={colors.text.light}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateTransaction}
          disabled={loading || !sellerId || !amount}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.white} />
          ) : (
            <Text style={styles.buttonText}>Select Location & Pay</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  contentContainer: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: spacing.xl,
    shadowColor: colors.shadow.default,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  description: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  input: {
    ...typography.styles.body,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: spacing.base,
    backgroundColor: colors.background.primary,
    color: colors.text.primary,
    minHeight: 48,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    backgroundColor: colors.background.primary,
    paddingLeft: spacing.base,
  },
  currencySymbol: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginRight: spacing.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  amountInput: {
    ...typography.styles.body,
    flex: 1,
    padding: spacing.base,
    color: colors.text.primary,
    minHeight: 48,
  },
  button: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: spacing.md,
    shadowColor: colors.primary.main,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    ...typography.styles.button,
    color: colors.text.white,
  },
});

export default TransactionScreen;
