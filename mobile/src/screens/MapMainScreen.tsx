import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { requestLocationPermission, getCurrentLocation } from '../services/location.service';
import { colors, typography, spacing } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DroppedPin {
  latitude: number;
  longitude: number;
}

const MapMainScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [selectedPin, setSelectedPin] = useState<DroppedPin | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    // Request permission and center on user's location
    requestLocationPermission().then((granted) => {
      if (granted) {
        getCurrentLocation()
          .then((location) => {
            const newRegion: Region = {
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            };
            setRegion(newRegion);
            if (mapRef.current) {
              mapRef.current.animateToRegion(newRegion, 1000);
            }
          })
          .catch((error) => {
            console.error('Error getting location:', error);
          });
      }
    });
  }, []);

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedPin({ latitude, longitude });
    setShowProductForm(true);
  };

  const handleCreateListing = async () => {
    if (!productName.trim() || !price.trim()) {
      Alert.alert('Error', 'Please enter product name and price');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      // TODO: Create transaction/listing via API
      // For now, just show share link modal
      const shareLink = `https://drop-rpxl.onrender.com/join/${Date.now()}`;
      
      Alert.alert(
        'Listing Created!',
        'Your listing has been created. Share the link to invite buyers.',
        [
          {
            text: 'Share Link',
            onPress: async () => {
              try {
                await Share.share({
                  message: `Check out this product: ${productName} - $${price}\n${shareLink}`,
                  title: productName,
                });
              } catch (error) {
                console.error('Error sharing:', error);
              }
            },
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );

      // Reset form
      setProductName('');
      setPrice('');
      setSelectedPin(null);
      setShowProductForm(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedPin(null);
    setShowProductForm(false);
    setProductName('');
    setPrice('');
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {selectedPin && (
          <Marker
            coordinate={{
              latitude: selectedPin.latitude,
              longitude: selectedPin.longitude,
            }}
            title="Drop Location"
            pinColor={colors.primary.main}
          />
        )}
      </MapView>

      {/* Instructions Overlay */}
      {!selectedPin && (
        <View style={styles.instructionsOverlay}>
          <Text style={styles.instructionsText}>Tap anywhere on the map to drop a pin</Text>
        </View>
      )}

      {/* Product Form Modal */}
      <Modal
        visible={showProductForm}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancel}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Listing</Text>
              <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Product Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter product name"
                  placeholderTextColor={colors.text.light}
                  value={productName}
                  onChangeText={setProductName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.light}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.createButton, loading && styles.buttonDisabled]}
                onPress={handleCreateListing}
                disabled={loading || !productName.trim() || !price.trim()}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text.white} />
                ) : (
                  <Text style={styles.createButtonText}>Create Listing</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  instructionsOverlay: {
    position: 'absolute',
    top: spacing['2xl'],
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.background.primary,
    padding: spacing.base,
    borderRadius: 8,
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  instructionsText: {
    ...typography.styles.bodySmall,
    color: colors.text.primary,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
    paddingHorizontal: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.styles.h2,
    color: colors.text.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontSize: 20,
  },
  form: {
    gap: spacing.xl,
  },
  inputGroup: {
    gap: spacing.md,
  },
  label: {
    ...typography.styles.label,
    color: colors.text.primary,
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
  priceContainer: {
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
  priceInput: {
    ...typography.styles.body,
    flex: 1,
    padding: spacing.base,
    color: colors.text.primary,
    minHeight: 48,
  },
  createButton: {
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
  createButtonText: {
    ...typography.styles.button,
    color: colors.text.white,
  },
});

export default MapMainScreen;

