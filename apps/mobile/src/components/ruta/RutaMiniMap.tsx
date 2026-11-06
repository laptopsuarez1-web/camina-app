import { useEffect, useRef, useState } from 'react';
import { Image, Platform, View, type LayoutChangeEvent } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { DARK_MAP_STYLE } from '@/constants/map-style';
import { MysteryPin, RutaPin } from './RutaPin';

type Place = { name: string; logo_url: string | null; lat: number | null; lng: number | null };

// Lugares de respaldo para la vista previa web (ahí no hay mapa).
// Lejos de las esquinas de arriba (ahí van los botones de volver y ?).
const SPOTS = [[0.22, 0.22], [0.5, 0.12], [0.4, 0.38], [0.74, 0.3], [0.08, 0.46], [0.58, 0.5], [0.3, 0.6], [0.66, 0.08], [0.86, 0.52]];
// Centro de la ciudad (Plaza Luis de Fuentes, Tarija). Si los locales están en otra ciudad se usa el centro de ellos.
const CITY_CENTER = { lat: -21.5355, lng: -64.7296 };
function cityCenter(places: Place[]) {
  const real = places.filter((p) => p.lat != null && p.lng != null);
  if (!real.length) return CITY_CENTER;
  const lat = real.reduce((a, p) => a + p.lat!, 0) / real.length;
  const lng = real.reduce((a, p) => a + p.lng!, 0) / real.length;
  const far = Math.abs(lat - CITY_CENTER.lat) > 0.08 || Math.abs(lng - CITY_CENTER.lng) > 0.08;
  return far ? { lat, lng } : CITY_CENTER;
}

// Vista previa web: el mapa de la ciudad con teselas de OpenStreetMap oscurecidas (en el celular es el mapa de Google).
export function WebCityMap({ center, zoom = 15, overlay }: {
  center: { lat: number; lng: number }; zoom?: number;
  // Dibuja encima (pines, línea): recibe una función que pasa de lat/lng a píxeles del mapa.
  overlay?: (project: (lat: number, lng: number) => { x: number; y: number }) => React.ReactNode;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const n = 2 ** zoom;
  const fx = ((center.lng + 180) / 360) * n;
  const rad = (center.lat * Math.PI) / 180;
  const fy = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  const tiles: { x: number; y: number; left: number; top: number }[] = [];
  if (size.w) {
    const x0 = Math.floor(fx - size.w / 512) - 1;
    const x1 = Math.floor(fx + size.w / 512) + 1;
    const y0 = Math.floor(fy - size.h / 512) - 1;
    const y1 = Math.floor(fy + size.h / 512) + 1;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      tiles.push({ x, y, left: size.w / 2 + (x - fx) * 256, top: size.h / 2 + (y - fy) * 256 });
    }
  }
  return (
    <View style={{ position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: '#17112a' }} onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {tiles.map((t) => (
        <Image key={`${t.x}-${t.y}`} source={{ uri: `https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png` }} style={{ position: 'absolute', left: t.left, top: t.top, width: 256, height: 256, filter: 'grayscale(1) brightness(0.42) contrast(1.15) sepia(1) hue-rotate(215deg) saturate(2.6)' } as never} />
      ))}
      {size.w && overlay
        ? overlay((lat, lng) => {
            const r = (lat * Math.PI) / 180;
            const x = ((lng + 180) / 360) * n;
            const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
            return { x: size.w / 2 + (x - fx) * 256, y: size.h / 2 + (y - fy) * 256 };
          })
        : null}
    </View>
  );
}

// Mapa sorpresa: la ciudad de fondo, centrada en el centro, con 9 pines "?" repartidos donde no tapan
// los botones de arriba ni el texto de abajo. No dice qué locales participan.
function MysteryMap({ places, padBottom, pinSize }: { places: Place[]; padBottom: number; pinSize: number }) {
  const c = cityCenter(places);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {Platform.OS === 'web' ? (
        <WebCityMap center={c} />
      ) : (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          customMapStyle={DARK_MAP_STYLE}
          initialRegion={{ latitude: c.lat, longitude: c.lng, latitudeDelta: 0.022, longitudeDelta: 0.022 }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          toolbarEnabled={false}
          liteMode={Platform.OS === 'android'}
        />
      )}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: padBottom }}>
        {SPOTS.map(([x, y], i) => (
          <View key={i} style={{ position: 'absolute', left: `${4 + x * 82}%`, top: `${14 + y * 110}%` }}>
            <MysteryPin size={pinSize} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function RutaMiniMap({ places, padBottom = 0, pinSize = 34, route = false, mystery = false }: { places: Place[]; padBottom?: number; pinSize?: number; route?: boolean; mystery?: boolean }) {
  if (mystery) return <MysteryMap places={places} padBottom={padBottom} pinSize={pinSize} />;
  return <PlacesMap places={places} padBottom={padBottom} pinSize={pinSize} route={route} />;
}

// Mapa con los logos de los locales (por ejemplo, la ruta de un mes ya completada).
function PlacesMap({ places, padBottom, pinSize, route }: { places: Place[]; padBottom: number; pinSize: number; route: boolean }) {
  const ref = useRef<MapView>(null);
  const [tracks, setTracks] = useState(true);
  const real = places.filter((p) => p.lat != null && p.lng != null);
  const pts = real;
  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 2500);
    return () => clearTimeout(t);
  }, []);

  if (Platform.OS === 'web' || pts.length === 0) {
    const list = places.slice(0, SPOTS.length);
    return (
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: '#17112a' }}>
        {list.map((l, i) => (
          <View key={i} style={{ position: 'absolute', left: `${SPOTS[i][0] * 100}%`, top: `${SPOTS[i][1] * 100}%` }}>
            <RutaPin name={l.name} logoUrl={l.logo_url} size={pinSize} route={route} />
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
            <RutaPin name={p.name} logoUrl={p.logo_url} size={pinSize} route={route} />
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
