import { useEffect, type ReactNode } from 'react';
import { BackHandler, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { FullWindowOverlay } from 'react-native-screens';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { BaifoMascot } from '@/components/ui/BaifoMascot';
import { buzz } from '@/lib/haptics';
import { colors } from '@/theme/tokens';
import { useAppAlertStore, type AppAlert, type AppAlertButton } from '@/store/useAppAlertStore';

// Aviso de Camina: tarjeta con el Baifo, título, texto y botones. Reemplaza a la ventana gris del sistema.
// Tiene que verse por encima de todo, también de las hojas y modales abiertos:
// - iPhone: FullWindowOverlay (se dibuja sobre la ventana completa, encima de cualquier modal).
// - Android: un Modal transparente (los diálogos de Android se apilan sin problema).
// - Web: una capa fija.
function Layer({ children, onRequestClose }: { children: ReactNode; onRequestClose: () => void }) {
  if (Platform.OS === 'ios') return <FullWindowOverlay><View style={StyleSheet.absoluteFill}>{children}</View></FullWindowOverlay>;
  if (Platform.OS === 'android') {
    return <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={onRequestClose}>{children}</Modal>;
  }
  return <View style={[StyleSheet.absoluteFill, { position: 'fixed' as 'absolute', zIndex: 9999 }]}>{children}</View>;
}

function buttonLook(b: AppAlertButton, primary: boolean) {
  if (b.style === 'destructive') return { bg: colors.dangerFill, fg: '#FFFFFF' };
  if (primary) return { bg: colors.aquaDeep, fg: '#FFFFFF' };
  return { bg: 'transparent', fg: null };
}

function AlertCard({ alert }: { alert: AppAlert }) {
  const dismiss = useAppAlertStore((s) => s.dismiss);
  const cancel = alert.buttons.find((b) => b.style === 'cancel');
  // El botón principal es el primero que no cancela (o el único que hay).
  const primary = alert.buttons.find((b) => b.style !== 'cancel') ?? alert.buttons[0];
  const stacked = alert.buttons.length > 2 || alert.buttons.some((b) => (b.text ?? '').length > 14);

  const choose = (b?: AppAlertButton) => {
    dismiss(alert.id);
    b?.onPress?.();
  };
  // Tocar afuera o "atrás" equivale a cancelar; si el aviso no tiene cancelar y es de un solo botón, lo cierra.
  const close = () => {
    if (!alert.cancelable) return;
    if (cancel) choose(cancel);
    else if (alert.buttons.length === 1) choose(alert.buttons[0]);
  };

  useEffect(() => {
    if (alert.tone === 'error') buzz.error();
    else if (alert.tone === 'ok') buzz.light();
  }, [alert.id, alert.tone]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => sub.remove();
  });

  // Orden de los botones: en fila, cancelar a la izquierda y el principal a la derecha; apilados, el principal arriba.
  const ordered = stacked
    ? [...alert.buttons].sort((a, b) => Number(a.style === 'cancel') - Number(b.style === 'cancel'))
    : [...alert.buttons].sort((a, b) => Number(b.style === 'cancel') - Number(a.style === 'cancel'));

  return (
    <Layer onRequestClose={close}>
      <Animated.View entering={FadeIn.duration(140)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18,10,30,0.62)' }]}>
        <Press accessible={false} feedback="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }} onPress={close}>
          <Animated.View entering={ZoomIn.duration(180)} style={{ width: '100%', maxWidth: 360 }}>
            <Press accessible={false} feedback="none" onPress={() => {}} accessibilityViewIsModal className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark" style={{ borderRadius: 28, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 18, alignItems: 'center' }}>
              <BaifoMascot pose={alert.tone === 'ok' ? 'festeja' : 'confundido'} height={88} />
              <Text accessibilityRole="header" className="text-text-light dark:text-text-dark text-center" style={{ fontSize: 17, fontWeight: '800', marginTop: 12 }}>{alert.title}</Text>
              {alert.message ? (
                <ScrollView style={{ maxHeight: 220, alignSelf: 'stretch' }} showsVerticalScrollIndicator={false}>
                  <Text className="text-muted-light dark:text-muted-dark text-center" style={{ fontSize: 14, lineHeight: 20, marginTop: 6 }}>{alert.message}</Text>
                </ScrollView>
              ) : null}
              <View style={{ flexDirection: stacked ? 'column' : 'row', gap: 10, marginTop: 18, alignSelf: 'stretch' }}>
                {ordered.map((b, i) => {
                  const look = buttonLook(b, b === primary);
                  return (
                    <Press
                      key={`${b.text ?? 'ok'}-${i}`}
                      accessibilityRole="button"
                      haptic={b === primary ? 'light' : undefined}
                      onPress={() => choose(b)}
                      className={look.fg ? undefined : 'border border-line-light dark:border-line-dark'}
                      style={{ flex: stacked ? undefined : 1, backgroundColor: look.bg, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}
                    >
                      {look.fg ? (
                        <Text numberOfLines={2} style={{ color: look.fg, fontSize: 15, fontWeight: '800', textAlign: 'center' }}>{b.text ?? 'Entendido'}</Text>
                      ) : (
                        <Text numberOfLines={2} className="text-text-light dark:text-text-dark" style={{ fontSize: 15, fontWeight: '700', textAlign: 'center' }}>{b.text ?? 'Cancelar'}</Text>
                      )}
                    </Press>
                  );
                })}
              </View>
            </Press>
          </Animated.View>
        </Press>
      </Animated.View>
    </Layer>
  );
}

export function AppAlertHost() {
  const current = useAppAlertStore((s) => s.queue[0]);
  const setHostReady = useAppAlertStore((s) => s.setHostReady);
  useEffect(() => {
    setHostReady(true);
    return () => setHostReady(false);
  }, [setHostReady]);
  if (!current) return null;
  return <AlertCard key={current.id} alert={current} />;
}
