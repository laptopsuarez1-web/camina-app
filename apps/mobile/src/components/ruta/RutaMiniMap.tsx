import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { DARK_MAP_STYLE } from '@/constants/map-style';
import { RutaPin } from './RutaPin';

type Place = { name: string; logo_url: string | null; lat: number | null; lng: number | null };

// Lugares de respaldo para la vista previa web (ahí no hay mapa).
const SPOTS = [[0.18, 0.12], [0.6, 0.08], [0.4, 0.3], [0.76, 0.36], [0.12, 0.44], [0.55, 0.52], [0.3, 0.04], [0.84, 0.1]];

// Mapa quieto de fondo con los locales que participan (pines blancos, como en Canjes). No dice cuáles te tocaron.
// `padBottom` deja libre la parte de abajo, donde va el texto de la tarjeta.
export function RutaMiniMap({ places, padBottom = 0, pinSize = 34 }: { places: Place[]; padBottom?: number; pinSize?: number }) {
  const ref = useRef<MapView>(null);
  const [tracks, setTracks] = useState(true);
  const pts = places.filter((p) => p.lat != null && p.lng != null);
  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 2500);
    return () => clearTimeout(t);
  }, []);

  if (Platform.OS === 'web' || pts.length === 0) {
    return (
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: '#17112a' }}>
        {places.slice(0, SPOTS.length).map((l, i) => (
          <View key={i} style={{ position: 'absolute', left: `${SPOTS[i][0] * 100}%`, top: `${SPOTS[i][1] * 100}%` }}>
            <RutaPin name={l.name} logoUrl={l.logo_url} size={pinSize} route={false} />
          </View>
        ))}
      </View>
    );
  }

  const lat = pts.reduce((a, p) => a + p.lat!, 0) / pts.length;
  const lng = pts.reduce((a, p) => a + p.lng!, 0) / pts.length;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      <MapView
        ref={ref}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        onMapReady={() =>
          ref.current?.fitToCoordinates(pts.map((p) => ({ latitude: p.lat!, longitude: p.lng! })), {
            edgePadding: { top: 70, right: 50, bottom: 50 + padBottom, left: 50 },
            animated: false,
          })
        }
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        toolbarEnabled={false}
        liteMode={Platform.OS === 'android'}
      >
        {pts.map((p, i) => (
          <Marker key={i} coordinate={{ latitude: p.lat!, longitude: p.lng! }} tracksViewChanges={tracks} anchor={{ x: 0.5, y: 1 }}>
            <RutaPin name={p.name} logoUrl={p.logo_url} size={pinSize} route={false} />
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
