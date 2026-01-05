import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { requestLocationPermission, getCurrentLocation } from '../services/location.service';

type MapScreenRouteProp = RouteProp<RootStackParamList, 'MapScreen'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MapScreen: React.FC = () => {
  const route = useRoute<MapScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const mapRef = useRef<MapView>(null);

  React.useEffect(() => {
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
    setSelectedLocation({ lat: latitude, lng: longitude });
  };

  const handleConfirmLocation = () => {
    if (selectedLocation) {
      route.params?.onLocationSelected(selectedLocation.lat, selectedLocation.lng);
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Please select a location on the map');
    }
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
      >
        {selectedLocation && (
          <Marker
            coordinate={{
              latitude: selectedLocation.lat,
              longitude: selectedLocation.lng,
            }}
            title="Meeting Point"
            description="Tap and hold to move"
          />
        )}
      </MapView>
      <View style={styles.controls}>
        <Text style={styles.instruction}>
          {selectedLocation
            ? 'Location selected. Tap confirm to proceed.'
            : 'Tap on the map to drop a pin for the meeting point'}
        </Text>
        <TouchableOpacity
          style={[styles.button, !selectedLocation && styles.buttonDisabled]}
          onPress={handleConfirmLocation}
          disabled={!selectedLocation}
        >
          <Text style={styles.buttonText}>Confirm Location</Text>
        </TouchableOpacity>
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
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MapScreen;
