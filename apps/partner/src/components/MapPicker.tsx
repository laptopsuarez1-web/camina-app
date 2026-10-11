'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

// Mapa para marcar dónde está el local: se toca el mapa o se arrastra el pin. Usa OpenStreetMap.
// Sin punto todavía, arranca en el centro de Tarija.
const CENTRO_TARIJA: [number, number] = [-21.5355, -64.7296];

export function MapPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (p: { lat: number; lng: number }) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const syncRef = useRef<() => void>(() => {});
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !el.current || mapRef.current) return;
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#8B4FD1;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);transform:rotate(-45deg)"></div>',
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });
      const start: [number, number] = value ? [value.lat, value.lng] : CENTRO_TARIJA;
      const map = L.map(el.current).setView(start, value ? 17 : 14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map);
      const poner = (lat: number, lng: number) => {
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else {
          const m = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
          m.on('dragend', () => {
            const p = m.getLatLng();
            onChangeRef.current({ lat: p.lat, lng: p.lng });
          });
          markerRef.current = m;
        }
      };
      syncRef.current = () => {
        const v = valueRef.current;
        if (!v) return;
        poner(v.lat, v.lng);
        map.setView([v.lat, v.lng], Math.max(map.getZoom(), 16));
      };
      syncRef.current();
      map.on('click', (e) => {
        poner(e.latlng.lat, e.latlng.lng);
        onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el punto cambia desde afuera (el local carga después, link pegado, "usar mi ubicación"), el pin lo sigue.
  useEffect(() => {
    syncRef.current();
  }, [value?.lat, value?.lng]);

  return <div ref={el} className="w-full h-[260px] rounded-[10px] border border-line overflow-hidden z-0" />;
}
