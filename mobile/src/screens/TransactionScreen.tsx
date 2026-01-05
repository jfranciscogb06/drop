import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import api from '../services/api.service';

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
    <View style={styles.container}>
      <Text style={styles.title}>Create Transaction</Text>
      <TextInput
        style={styles.input}
        placeholder="Seller ID"
        value={sellerId}
        onChangeText={setSellerId}
      />
      <TextInput
        style={styles.input}
        placeholder="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreateTransaction}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Select Location & Pay</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TransactionScreen;
