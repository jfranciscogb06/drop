import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { connectSocket, getSocket } from '../socket/locationSocket';
import { watchPosition, clearWatch, requestLocationPermission } from '../services/location.service';
import api from '../services/api.service';
import { colors, typography, spacing } from '../theme';

type LocationShareScreenRouteProp = RouteProp<RootStackParamList, 'LocationShareScreen'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Location {
  latitude: number;
  longitude: number;
  role?: 'buyer' | 'seller';
}

const LocationShareScreen: React.FC = () => {
  const route = useRoute<LocationShareScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { transactionId, handoffId } = route.params;
  const [myLocation, setMyLocation] = useState<Location | null>(null);
  const [otherLocation, setOtherLocation] = useState<Location | null>(null);
  const [dropPin, setDropPin] = useState<Location | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const watchSubscriptionRef = useRef<any>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    initializeLocationSharing();

    return () => {
      // Cleanup
      if (watchSubscriptionRef.current) {
        clearWatch(watchSubscriptionRef.current);
      }
      if (socketRef.current) {
        socketRef.current.emit('leave-handoff', { handoffId });
      }
    };
  }, [handoffId]);

  const initializeLocationSharing = async () => {
    try {
      // Request permissions
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Location permission is required for this feature');
        return;
      }

      // Connect socket
      const socket = await connectSocket();
      socketRef.current = socket;

      // Join handoff room
      socket.emit('join-handoff', { handoffId });

      // Listen for other user's location updates
      socket.on('location-update', (data: Location) => {
        setOtherLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          role: data.role,
        });
      });

      // Fetch handoff details to get drop pin
      const response = await api.get(`/handoffs/${handoffId}`);
      const handoff = response.data;
      setDropPin({
        latitude: handoff.dropPinLat,
        longitude: handoff.dropPinLng,
      });

      // Start location tracking
      startLocationTracking();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to initialize location sharing');
    }
  };

  const startLocationTracking = async () => {
    setIsSharing(true);
    const subscription = await watchPosition((location) => {
      setMyLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      // Send location update via socket
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('location-update', {
          handoffId,
          latitude: location.latitude,
          longitude: location.longitude,
        });
      }
    });

    watchSubscriptionRef.current = subscription;
  };

  const stopLocationTracking = () => {
    if (watchSubscriptionRef.current) {
      clearWatch(watchSubscriptionRef.current);
      watchSubscriptionRef.current = null;
    }
    setIsSharing(false);
  };

  const handleConfirmHandoff = () => {
    navigation.navigate('HandoffConfirmScreen', {
      handoffId,
      transactionId,
    });
  };

  const calculateRegion = (): Region => {
    const locations = [myLocation, otherLocation, dropPin].filter(Boolean) as Location[];
    if (locations.length === 0) {
      return {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }

    const lats = locations.map((loc) => loc.latitude);
    const lngs = locations.map((loc) => loc.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDelta = (maxLat - minLat) * 1.5 || 0.01;
    const lngDelta = (maxLng - minLng) * 1.5 || 0.01;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, 0.01),
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={calculateRegion()}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {dropPin && (
          <Marker
            coordinate={{
              latitude: dropPin.latitude,
              longitude: dropPin.longitude,
            }}
            title="Meeting Point"
            pinColor="red"
          />
        )}
        {myLocation && (
          <Marker
            coordinate={{
              latitude: myLocation.latitude,
              longitude: myLocation.longitude,
            }}
            title="You"
            pinColor="blue"
          />
        )}
        {otherLocation && (
          <Marker
            coordinate={{
              latitude: otherLocation.latitude,
              longitude: otherLocation.longitude,
            }}
            title={otherLocation.role === 'buyer' ? 'Buyer' : 'Seller'}
            pinColor="green"
          />
        )}
      </MapView>
      <View style={styles.controls}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, isSharing && styles.statusIndicatorActive]} />
          <Text style={styles.status}>
            {isSharing ? 'Sharing location...' : 'Location sharing paused'}
          </Text>
        </View>
        <View style={styles.buttonRow}>
          {isSharing ? (
            <TouchableOpacity 
              style={[styles.button, styles.buttonSecondary]} 
              onPress={stopLocationTracking}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Stop Sharing</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.buttonSecondary]} 
              onPress={startLocationTracking}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Start Sharing</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={handleConfirmHandoff}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Confirm Handoff</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.primary,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl + 8,
    paddingHorizontal: spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.default,
    marginRight: spacing.md,
  },
  statusIndicatorActive: {
    backgroundColor: colors.success.main,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  status: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonSecondary: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  confirmButton: {
    backgroundColor: colors.success.main,
    shadowColor: colors.success.main,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    ...typography.styles.button,
    color: colors.text.white,
  },
  buttonTextSecondary: {
    color: colors.text.primary,
  },
});

export default LocationShareScreen;
