import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import api from '../services/api.service';
import { colors, typography, spacing } from '../theme';

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
        <View style={styles.scannerPermissionContainer}>
          <Text style={styles.scannerPermissionText}>We need your permission to use the camera</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.permissionButton, styles.permissionButtonSecondary]}
            onPress={() => setShowScanner(false)}
            activeOpacity={0.8}
          >
            <Text style={[styles.permissionButtonText, styles.permissionButtonTextSecondary]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerContent}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerText}>Position QR code within the frame</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowScanner(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Confirm Handoff</Text>

      {/* QR Code Display */}
      {qrCodeData && (
        <View style={styles.qrSection}>
          <Text style={styles.sectionTitle}>Your QR Code</Text>
          <View style={styles.qrContainer}>
            <QRCode 
              value={qrCodeData} 
              size={220}
              backgroundColor={colors.background.primary}
              color={colors.text.primary}
            />
          </View>
        </View>
      )}

      {/* Scanner Button */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => setShowScanner(true)}
        activeOpacity={0.8}
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
          placeholderTextColor={colors.text.light}
          value={confirmationCode}
          onChangeText={setConfirmationCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleCodeSubmit}
          disabled={loading || !confirmationCode}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.white} />
          ) : (
            <Text style={styles.submitButtonText}>Confirm</Text>
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
    padding: spacing.xl,
  },
  title: {
    ...typography.styles.h2,
    color: colors.text.primary,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  qrContainer: {
    padding: spacing.lg,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    shadowColor: colors.shadow.default,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scanButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    minHeight: 52,
    shadowColor: colors.primary.main,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scanButtonText: {
    ...typography.styles.button,
    color: colors.text.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    ...typography.styles.bodySmall,
    marginHorizontal: spacing.base,
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.medium,
  },
  codeSection: {
    marginTop: spacing.md,
  },
  codeInput: {
    ...typography.styles.h3,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: spacing.base,
    textAlign: 'center',
    letterSpacing: 12,
    marginBottom: spacing.lg,
    backgroundColor: colors.background.primary,
    color: colors.text.primary,
    minHeight: 56,
    fontWeight: typography.fontWeight.semibold,
  },
  submitButton: {
    backgroundColor: colors.success.main,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: colors.success.main,
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
  submitButtonText: {
    ...typography.styles.button,
    color: colors.text.white,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scannerPermissionContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  scannerPermissionText: {
    ...typography.styles.body,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  permissionButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    minHeight: 52,
    marginBottom: spacing.base,
  },
  permissionButtonSecondary: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  permissionButtonText: {
    ...typography.styles.button,
    color: colors.text.white,
  },
  permissionButtonTextSecondary: {
    color: colors.text.primary,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContent: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.xl,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.primary.main,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  scannerText: {
    ...typography.styles.body,
    color: colors.text.white,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
    minHeight: 52,
  },
  closeButtonText: {
    ...typography.styles.button,
    color: colors.text.white,
  },
});

export default HandoffConfirmScreen;
