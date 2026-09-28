// Estilo oscuro para el mapa de Canjes (Google Maps style JSON — formato
// estable, no depende de la versión de Expo). Tonos alineados a la paleta de
// marca (fondo #120a1e / #1c1030, texto lila) en vez del negro genérico.
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1c1030' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#B9AEDC' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#120a1e' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3a2668' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2F1E5C' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9385B5' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4A3A78' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#120a1e' }] },
];
