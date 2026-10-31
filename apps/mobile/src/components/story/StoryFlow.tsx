import { useCallback, useRef, useState } from 'react';
import { Alert, Modal, Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { KeyboardSafe } from '@/components/ui/KeyboardSafe';
import { ActionSheet } from '@/components/ActionSheet';
import { StoryComposer, StoryConfirmSheet, StoryPendingSheet } from '@/components/story/StoryShare';
import { useAuthStore } from '@/store/useAuthStore';
import { friendlyError } from '@/lib/errors';
import { loadSavedHandle, pickStoryPhoto, shareToInstagram, submitStory } from '@/lib/story';

export type StoryTarget = { redemptionId: string; businessName: string; benefitName: string };

type Step = 'idle' | 'pick' | 'compose' | 'confirm' | 'done';

// Todo el recorrido de la historia de un canje: elegir foto, verla como historia, publicarla y avisar.
// Uso: const story = useStoryFlow(); story.start({...}); y renderizar {story.element}.
export function useStoryFlow() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  const topInset = useSafeAreaInsets().top;
  const [target, setTarget] = useState<StoryTarget | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [photo, setPhoto] = useState<string | null>(null);
  const [composed, setComposed] = useState<string | null>(null);
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const shotRef = useRef<View>(null);

  const reset = useCallback(() => {
    setStep('idle');
    setTarget(null);
    setPhoto(null);
    setComposed(null);
    setBusy(false);
  }, []);

  const start = useCallback((t: StoryTarget) => {
    setTarget(t);
    setStep('pick');
    loadSavedHandle().then((h) => setHandle((cur) => cur || h));
  }, []);

  async function pick(source: 'camera' | 'library') {
    try {
      // En iOS el selector no abre si la hoja anterior todavía se está cerrando.
      if (Platform.OS === 'ios') await new Promise((r) => setTimeout(r, 400));
      const uri = await pickStoryPhoto(source);
      if (!uri) {
        if (!photo) reset();
        return;
      }
      setPhoto(uri);
      setComposed(null);
      setStep('compose');
    } catch (e) {
      Alert.alert('No pudimos abrir la foto', friendlyError(e, 'Prueba de nuevo.'));
      if (!photo) reset();
    }
  }

  // Captura la foto con el sticker de Camina; si falla (por ejemplo en la web), se usa la foto sola.
  async function composedUri(): Promise<string> {
    if (composed) return composed;
    let uri = photo!;
    try {
      if (shotRef.current) uri = await captureRef(shotRef, { format: 'jpg', quality: 0.9, result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile' });
    } catch {
      // Sigue con la foto original.
    }
    setComposed(uri);
    return uri;
  }

  async function publish() {
    setBusy(true);
    try {
      await shareToInstagram(await composedUri());
      setStep('confirm');
    } catch (e) {
      Alert.alert('No pudimos abrir Instagram', friendlyError(e, 'Prueba de nuevo.'));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!target || !userId) return;
    setBusy(true);
    try {
      await submitStory(userId, target.redemptionId, await composedUri(), handle);
      queryClient.invalidateQueries({ queryKey: ['story-shares'] });
      setStep('done');
    } catch (e) {
      Alert.alert('No pudimos mandar tu historia', friendlyError(e, 'Prueba de nuevo en un momento.'));
    } finally {
      setBusy(false);
    }
  }

  const element = (
    <>
      <ActionSheet
        visible={step === 'pick'}
        title="Sube tu historia"
        actions={[
          { label: 'Sacar una foto', onPress: () => pick('camera') },
          { label: 'Elegir de la galería', onPress: () => pick('library') },
        ]}
        onClose={() => {
          // El ActionSheet llama a onClose antes de cada acción: solo se resetea si no eligió nada.
          setTimeout(() => setStep((s) => (s === 'pick' ? (photo ? 'compose' : 'idle') : s)), 0);
        }}
      />
      <Modal
        visible={!!target && !!photo && (step === 'compose' || step === 'confirm' || step === 'done')}
        animationType="slide"
        onRequestClose={() => (step === 'compose' ? reset() : setStep('compose'))}
      >
        {target && photo ? (
          <View style={{ flex: 1 }}>
            <StoryComposer
              photo={{ uri: photo }}
              businessName={target.businessName}
              benefitName={target.benefitName}
              topInset={topInset}
              shotRef={shotRef}
              busy={busy && step === 'compose'}
              onClose={reset}
              onPublish={publish}
              onChangePhoto={() => setStep('pick')}
            />
            {step !== 'compose' ? (
              <KeyboardSafe style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(18,10,30,0.55)', justifyContent: 'flex-end' }}>
                {step === 'confirm' ? (
                  <StoryConfirmSheet handle={handle} onChangeHandle={setHandle} busy={busy} onConfirm={confirm} onLater={reset} />
                ) : (
                  <StoryPendingSheet onDone={reset} />
                )}
              </KeyboardSafe>
            ) : null}
          </View>
        ) : null}
      </Modal>
    </>
  );

  return { start, element };
}
