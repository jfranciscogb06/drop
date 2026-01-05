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
import { colors, typography, spacing } from '../theme';

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
        <View style={styles.instructionContainer}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconDot, selectedLocation && styles.iconDotActive]} />
          </View>
          <Text style={styles.instruction}>
            {selectedLocation
              ? 'Location selected. Tap confirm to proceed.'
              : 'Tap on the map to drop a pin for the meeting point'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.button, !selectedLocation && styles.buttonDisabled]}
          onPress={handleConfirmLocation}
          disabled={!selectedLocation}
          activeOpacity={0.8}
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
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  iconContainer: {
    marginRight: spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
  iconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border.default,
  },
  iconDotActive: {
    backgroundColor: colors.primary.main,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  instruction: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  buttonDisabled: {
    backgroundColor: colors.border.light,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    ...typography.styles.button,
    color: colors.text.white,
  },
});

export default MapScreen;
