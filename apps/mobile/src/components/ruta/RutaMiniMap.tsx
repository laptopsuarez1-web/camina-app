import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { DARK_MAP_STYLE } from '@/constants/map-style';
import { MysteryPin, RutaPin } from './RutaPin';

type Place = { name: string; logo_url: string | null; lat: number | null; lng: number | null };

// Lugares de respaldo para la vista previa web (ahí no hay mapa).
// Lejos de las esquinas de arriba (ahí van los botones de volver y ?).
const SPOTS = [[0.22, 0.22], [0.5, 0.12], [0.4, 0.38], [0.74, 0.3], [0.08, 0.46], [0.58, 0.5], [0.3, 0.6], [0.66, 0.08], [0.86, 0.52]];
// Pines sorpresa que siempre se ven en la tarjeta del evento (aunque haya menos locales).
const MYSTERY_COUNT = 9;

// Completa hasta 9 lugares con puntos alrededor de los locales reales (repetibles, sin azar).
function withDecoys(pts: { lat: number; lng: number }[]) {
  if (pts.length === 0) return pts;
  const lat = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
  const lng = pts.reduce((a, p) => a + p.lng, 0) / pts.length;
  const out = [...pts];
  for (let i = 0; out.length < MYSTERY_COUNT; i++) {
    const a = i * 2.39996; // ángulo de oro: los reparte parejo
    const r = 0.0035 + (i % 3) * 0.0022;
    out.push({ lat: lat + Math.sin(a) * r, lng: lng + Math.cos(a) * r * 1.2 });
  }
  return out.slice(0, MYSTERY_COUNT);
}

// Mapa quieto de fondo con los locales que participan (pines blancos, como en Canjes). No dice cuáles te tocaron.
// `padBottom` deja libre la parte de abajo, donde va el texto de la tarjeta.
// `mystery`: en vez de los logos van 9 pines con "?" (la tarjeta del evento no dice qué locales te tocan).
export function RutaMiniMap({ places, padBottom = 0, pinSize = 34, route = false, mystery = false }: { places: Place[]; padBottom?: number; pinSize?: number; route?: boolean; mystery?: boolean }) {
  const ref = useRef<MapView>(null);
  const [tracks, setTracks] = useState(true);
  const real = places.filter((p) => p.lat != null && p.lng != null);
  const pts = mystery ? withDecoys(real.map((p) => ({ lat: p.lat!, lng: p.lng! }))).map((p) => ({ name: '?', logo_url: null, lat: p.lat, lng: p.lng })) : real;
  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 2500);
    return () => clearTimeout(t);
  }, []);

  if (Platform.OS === 'web' || pts.length === 0) {
    const list = mystery ? SPOTS.map(() => null) : places.slice(0, SPOTS.length);
    return (
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: '#17112a' }}>
        {list.map((l, i) => (
          <View key={i} style={{ position: 'absolute', left: `${SPOTS[i][0] * 100}%`, top: `${SPOTS[i][1] * 100}%` }}>
            {l ? <RutaPin name={l.name} logoUrl={l.logo_url} size={pinSize} route={route} /> : <MysteryPin size={pinSize} />}
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
            {mystery ? <MysteryPin size={pinSize} /> : <RutaPin name={p.name} logoUrl={p.logo_url} size={pinSize} route={route} />}
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
