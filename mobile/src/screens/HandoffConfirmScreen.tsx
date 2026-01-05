import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-generator';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import api from '../services/api.service';

type HandoffConfirmScreenRouteProp = RouteProp<RootStackParamList, 'HandoffConfirmScreen'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HandoffConfirmScreen: React.FC = () => {
  const route = useRoute<HandoffConfirmScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { handoffId, transactionId } = route.params;
  const [confirmationCode, setConfirmationCode] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    // Fetch handoff details to get QR code data
    fetchHandoffDetails();
  }, []);

  const fetchHandoffDetails = async () => {
    try {
      const response = await api.get(`/handoffs/${handoffId}`);
      setQrCodeData(response.data.qrCodeData);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to load handoff details');
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    handleQRCodeScanned(data);
    setShowScanner(false);
  };

  const handleQRCodeScanned = async (scannedData: string) => {
    setLoading(true);
    try {
      const response = await api.post(`/handoffs/${handoffId}/confirm-qr`, {
        qrCodeData: scannedData,
      });

      if (response.data.paymentReleased) {
        Alert.alert('Success', 'Handoff confirmed! Payment has been released.', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('TransactionScreen'),
          },
        ]);
      } else {
        Alert.alert('Confirmed', response.data.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to confirm handoff');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async () => {
    if (!confirmationCode) {
      Alert.alert('Error', 'Please enter confirmation code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/handoffs/${handoffId}/confirm`, {
        confirmationCode,
      });

      if (response.data.paymentReleased) {
        Alert.alert('Success', 'Handoff confirmed! Payment has been released.', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('TransactionScreen'),
          },
        ]);
      } else {
        Alert.alert('Confirmed', response.data.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to confirm handoff');
    } finally {
      setLoading(false);
    }
  };

  if (showScanner) {
    if (!permission) {
      // Camera permissions are still loading
      return (
        <View style={styles.container}>
          <ActivityIndicator size="large" />
        </View>
      );
    }

    if (!permission.granted) {
      // Camera permissions are not granted yet
      return (
        <View style={styles.container}>
          <Text style={styles.scannerText}>We need your permission to use the camera</Text>
          <TouchableOpacity style={styles.closeButton} onPress={requestPermission}>
            <Text style={styles.closeButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowScanner(false)}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        <View style={styles.scannerOverlay}>
          <Text style={styles.scannerText}>Scan QR Code</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowScanner(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm Handoff</Text>

      {/* QR Code Display */}
      {qrCodeData && (
        <View style={styles.qrSection}>
          <Text style={styles.sectionTitle}>Your QR Code</Text>
          <View style={styles.qrContainer}>
            <QRCode value={qrCodeData} size={200} />
          </View>
        </View>
      )}

      {/* Scanner Button */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => setShowScanner(true)}
      >
        <Text style={styles.scanButtonText}>Scan QR Code</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Manual Code Entry */}
      <View style={styles.codeSection}>
        <Text style={styles.sectionTitle}>Enter Confirmation Code</Text>
        <TextInput
          style={styles.codeInput}
          placeholder="Enter 6-digit code"
          value={confirmationCode}
          onChangeText={setConfirmationCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleCodeSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Confirm</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
  },
  codeSection: {
    marginTop: 20,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HandoffConfirmScreen;
