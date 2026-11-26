// Ficha de un lugar de Pasos dobles (x2): cuánto se puede ganar, fechas, cómo sumar y el botón para empezar.
// Con la sesión abierta muestra los pasos hechos adentro y los Puntos extra, con Actualizar y Terminar.
import { useState } from 'react';
import { View, ScrollView, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as CachedImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Spinner } from '@/components/ui/Spinner';
import { Footprints, Calendar, MapPin, X, MapIcon } from '@/components/icons';
import { colors } from '@/theme/tokens';
import { MONTHS, boliviaDate } from '@/lib/promo';
import { plural } from '@/lib/format';
import { friendlyServerError } from '@/lib/errors';
import { celebrate } from '@/store/useCelebrationStore';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import { isBoostLive, useOpenBoost, useStartBoost, useSyncBoost, type BoostPlace } from '@/hooks/useBoosts';

const COIN = require('@/../assets/camina-coin.png');

function longDate(iso: string) {
  const d = boliviaDate(iso);
  return `${d.day} ${MONTHS[d.month]}`;
}

export function BoostSheet({ place, onClose, onShowOnMap }: { place: BoostPlace; onClose: () => void; onShowOnMap?: () => void }) {
  const insets = useSafeAreaInsets();
  const { data: open } = useOpenBoost();
  const start = useStartBoost();
  const sync = useSyncBoost();
  const [note, setNote] = useState<string | null>(null);
  const live = isBoostLive(place);
  const mine = open && open.place_id === place.id ? open : null;
  const earned = mine ? Math.max(place.my_points, (mine.place_points ?? 0)) : place.my_points;
  const full = earned >= place.max_points;
  const perK = place.steps_per_point.toLocaleString('es-BO');

  async function onStart() {
    setNote(null);
    try {
      const res = await start.mutateAsync(place);
      if (res.ok) {
        celebrate({ kind: 'toast', icon: 'check', title: '¡Pasos dobles activados!', body: 'Camina dentro de la zona. Al irte, toca Terminar.' });
        return;
      }
      const msg: Record<string, string> = {
        lejos: res.distance_m != null ? `Estás a ${res.distance_m.toLocaleString('es-BO')} m. Entra a la zona y vuelve a tocar.` : 'Entra a la zona y vuelve a tocar.',
        sin_ubicacion: 'Necesitamos tu ubicación para ver si estás dentro de la zona. Actívala para Camina en Ajustes.',
        tope: `Ya ganaste los ${place.max_points} Puntos extra de este lugar.`,
        no_empezo: `Empieza el ${longDate(place.starts_at)}.`,
        termino: 'Este lugar ya terminó.',
        celular: 'En este celular suma pasos otra cuenta de Camina.',
      };
      setNote(msg[res.reason] ?? 'No pudimos empezar. Intenta de nuevo.');
    } catch (e) {
      Alert.alert('No pudimos empezar', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }

  async function onSync(end: boolean) {
    if (!mine) return;
    setNote(null);
    try {
      const before = mine.points;
      const res = await sync.mutateAsync({ session: mine, place, end });
      const gained = res.session.points;
      if (res.session.ended_at) {
        celebrate(
          gained > 0
            ? { kind: 'sheet', title: '¡Bien caminado!', body: `Hiciste ${res.session.steps.toLocaleString('es-BO')} pasos en ${place.name}.`, points: gained, sparks: true }
            : { kind: 'toast', icon: 'check', title: 'Pasos dobles terminados', body: res.inside ? undefined : 'Saliste de la zona.' },
        );
      } else if (gained > before) {
        celebrate({ kind: 'toast', icon: 'gift', title: `+${gained - before} ${plural(gained - before, 'Punto extra', 'Puntos extra')}` });
      } else {
        setNote(`Llevas ${res.session.steps.toLocaleString('es-BO')} pasos adentro. Cada ${perK} pasos suman 1 Punto extra.`);
      }
    } catch (e) {
      Alert.alert('No pudimos actualizar', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }

  const busy = start.isPending || sync.isPending;
  const sessionPts = mine?.points ?? 0;
  const pct = Math.min(1, earned / place.max_points);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.dark.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Portada: foto del lugar o el degradé de Camina con su logo */}
        <View style={{ height: 190 + insets.top }}>
          {place.cover_url ? (
            <CachedImage source={{ uri: place.cover_url }} contentFit="cover" style={{ flex: 1 }} accessibilityIgnoresInvertColors />
          ) : (
            <LinearGradient colors={['#3a2668', colors.purpleDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
          )}
        </View>
        <View style={{ marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.dark.bg, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ marginTop: -44, padding: 4, borderRadius: 24, backgroundColor: colors.mint }}>
              <BusinessAvatar logoUrl={place.logo_url} category="Compras" size={76} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.mintDark, borderWidth: 1, borderColor: colors.mintInk, marginTop: 12 }}>
              <Image source={COIN} style={{ width: 18, height: 18, borderRadius: 9 }} accessible={false} />
              <Text style={{ color: colors.mint, fontWeight: '800', fontSize: 13 }}>Hasta {place.max_points} Puntos extra</Text>
            </View>
          </View>

          <Text accessibilityRole="header" style={{ color: colors.dark.text, fontSize: 26, fontWeight: '800', marginTop: 14 }}>{place.name}</Text>
          {place.address ? <Text style={{ color: colors.dark.muted, fontSize: 14, marginTop: 2 }}>{place.address}</Text> : null}

          <View style={{ marginTop: 14, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Footprints size={16} color={colors.mint} />
              <Text style={{ color: colors.dark.muted, fontSize: 13.5, flex: 1 }}>Si caminas dentro de esta zona, tus pasos valen doble.</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} color={colors.mint} />
              <Text style={{ color: colors.dark.muted, fontSize: 13.5 }}>Del {longDate(place.starts_at)} al {longDate(place.ends_at)}</Text>
            </View>
          </View>

          {/* Progreso: lo ganado en este lugar (y la sesión abierta, si hay) */}
          {mine || earned > 0 ? (
            <View style={{ marginTop: 18, padding: 14, borderRadius: 22, backgroundColor: colors.dark.card, borderWidth: mine ? 2 : 1, borderColor: mine ? colors.mint : colors.dark.line }}>
              {mine ? (
                <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: colors.mint, marginBottom: 10 }}>
                  <Text style={{ color: colors.mintDark, fontWeight: '800', fontSize: 12.5 }}>x2 activo</Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {mine ? (
                  <View style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: colors.dark.purpleLight }}>
                    <Text style={{ color: colors.dark.muted, fontSize: 12 }}>Pasos adentro</Text>
                    <Text style={{ color: colors.dark.text, fontSize: 24, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] }}>{mine.steps.toLocaleString('es-BO')}</Text>
                  </View>
                ) : null}
                <View style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: colors.mintDark }}>
                  <Text style={{ color: colors.dark.muted, fontSize: 12 }}>{mine ? 'Puntos extra hoy' : 'Puntos extra ganados'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Image source={COIN} style={{ width: 22, height: 22, borderRadius: 11 }} accessible={false} />
                    <Text style={{ color: colors.mint, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] }}>+{mine ? sessionPts : earned}</Text>
                    <Text style={{ color: colors.dark.muted, fontSize: 13 }}>de {place.max_points}</Text>
                  </View>
                </View>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.dark.purpleLight, marginTop: 12, overflow: 'hidden' }}>
                <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: colors.mint }} />
              </View>
            </View>
          ) : null}

          <View style={{ height: 1, backgroundColor: colors.dark.line, marginTop: 20 }} />
          <Text accessibilityRole="header" style={{ color: colors.dark.text, fontSize: 18, fontWeight: '800', marginTop: 18 }}>Cómo sumar doble</Text>
          {[
            'Al llegar, toca «¡Quiero sumar doble!». Revisamos que estés dentro de la zona.',
            `Camina adentro: cada ${perK} pasos te dan 1 Punto extra, hasta ${place.max_points}. Puedes bloquear el celular.`,
            'Al irte, toca «Terminar» o abre Camina: sumamos los pasos que hiciste adentro. Si sales de la zona, deja de sumar y lo ganado se queda.',
          ].map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.mintDark, fontWeight: '800', fontSize: 13.5 }}>{i + 1}</Text>
              </View>
              <Text style={{ color: colors.dark.text, fontSize: 14.5, lineHeight: 21, flex: 1 }}>{t}</Text>
            </View>
          ))}
          <Text style={{ color: colors.dark.muted, fontSize: 12.5, marginTop: 16, lineHeight: 18 }}>Los Puntos extra van aparte de tus Puntos diarios por caminar.</Text>

          {onShowOnMap ? (
            <Press accessibilityRole="button" onPress={onShowOnMap} style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.dark.line }}>
              <MapIcon size={16} color={colors.mint} />
              <Text style={{ color: colors.mint, fontWeight: '700', fontSize: 13.5 }}>Ver la zona en el mapa</Text>
            </Press>
          ) : null}
          {note ? (
            <View style={{ marginTop: 16, flexDirection: 'row', gap: 8, padding: 12, borderRadius: 16, backgroundColor: colors.dark.purpleLight }}>
              <MapPin size={16} color={colors.warnSoft} />
              <Text style={{ color: colors.dark.text, fontSize: 13.5, flex: 1, lineHeight: 19 }}>{note}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Botones abajo, fijos */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 14, backgroundColor: colors.dark.bg, borderTopWidth: 1, borderColor: colors.dark.line }}>
        {mine ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Press accessibilityRole="button" disabled={busy} onPress={() => onSync(false)} style={{ flex: 1, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.aquaDeep }}>
              {sync.isPending && !sync.variables?.end ? <Spinner size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Actualizar</Text>}
            </Press>
            <Press accessibilityRole="button" disabled={busy} onPress={() => onSync(true)} style={{ flex: 1, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dark.card, borderWidth: 1, borderColor: colors.dark.line }}>
              {sync.isPending && sync.variables?.end ? <Spinner size="small" color="#fff" /> : <Text style={{ color: colors.dark.text, fontWeight: '800', fontSize: 15 }}>Terminar</Text>}
            </Press>
          </View>
        ) : (
          <Press
            accessibilityRole="button"
            disabled={busy || !live || full}
            onPress={onStart}
            style={{ height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: !live || full ? colors.dark.card : colors.aquaDeep }}
          >
            {start.isPending ? (
              <Spinner size="small" color="#fff" />
            ) : (
              <Text style={{ color: !live || full ? colors.dark.muted : '#fff', fontWeight: '800', fontSize: 15.5 }}>
                {full ? `Ya ganaste tus ${place.max_points} Puntos extra aquí` : !live ? `Empieza el ${longDate(place.starts_at)}` : '¡Quiero sumar doble!'}
              </Text>
            )}
          </Press>
        )}
      </View>

      <Press accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={8} style={{ position: 'absolute', top: insets.top + 12, left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <X size={18} color={colors.light.text} />
      </Press>
    </View>
  );
}
