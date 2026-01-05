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
        <Text style={styles.status}>
          {isSharing ? 'Sharing location...' : 'Location sharing paused'}
        </Text>
        <View style={styles.buttonRow}>
          {isSharing ? (
            <TouchableOpacity style={styles.button} onPress={stopLocationTracking}>
              <Text style={styles.buttonText}>Stop Sharing</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={startLocationTracking}>
              <Text style={styles.buttonText}>Start Sharing</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={handleConfirmHandoff}
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
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  status: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LocationShareScreen;
