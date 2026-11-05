import { ActivityIndicator, Image, Modal, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Camera, Check } from '@/components/icons';
import { ProfileBgThumb } from '@/components/profile/ProfileBanner';
import { PROFILE_BGS, profileBg } from '@/lib/profile-bg';

// Hoja para elegir el fondo del banner del perfil. La elección se ve al instante arriba; se guarda con "Guardar cambios".
export function ProfileBgSheet({ visible, value, onChange, onClose, photoUrl, onPickPhoto, picking }: {
  visible: boolean; value: string | null | undefined; onChange: (key: string) => void; onClose: () => void;
  photoUrl?: string | null; onPickPhoto?: () => void; picking?: boolean;
}) {
  const current = value === 'foto' ? 'foto' : profileBg(value).key;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Press accessible={false} feedback="none" className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.5)' }} onPress={onClose}>
        <Press accessible={false} feedback="none" className="bg-card-light dark:bg-card-dark rounded-t-[28px] px-5 pt-3 pb-9" onPress={() => {}}>
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-4" />
          <Text accessibilityRole="header" className="text-[17px] font-extrabold text-text-light dark:text-text-dark">Fondo del perfil</Text>
          <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-1 mb-4">Todos lo ven arriba de tu perfil.</Text>
          {onPickPhoto && (
            <>
              <Text className="text-[11.5px] font-bold tracking-wider text-aqua-ink dark:text-aqua mb-2">TU FOTO</Text>
              <View className="flex-row mb-4" style={{ gap: 10 }}>
                <Press accessibilityRole="button" accessibilityLabel="Subir una foto de fondo" onPress={onPickPhoto} style={{ width: '31.5%' }}>
                  <View style={{ height: 72, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(98,240,182,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                    {picking ? <ActivityIndicator color="#62F0B6" /> : <Camera size={20} color="#3B927E" />}
                  </View>
                  <Text className="text-[11.5px] text-center mt-1.5 text-muted-light dark:text-muted-dark">{photoUrl ? 'Cambiar foto' : 'Subir foto'}</Text>
                </Press>
                {photoUrl ? (
                  <Press accessibilityRole="button" accessibilityLabel="Usar tu foto" accessibilityState={{ selected: current === 'foto' }} onPress={() => onChange('foto')} style={{ width: '31.5%' }}>
                    <Image source={{ uri: photoUrl }} style={{ height: 72, borderRadius: 14, borderWidth: current === 'foto' ? 2.5 : 1, borderColor: current === 'foto' ? '#fff' : 'rgba(255,255,255,0.18)' }} />
                    {current === 'foto' ? (
                      <View style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={11} color="#111" weight="bold" />
                      </View>
                    ) : null}
                    <Text className="text-[11.5px] text-center mt-1.5 text-muted-light dark:text-muted-dark">Tu foto</Text>
                  </Press>
                ) : null}
              </View>
              <Text className="text-[11.5px] font-bold tracking-wider text-aqua-ink dark:text-aqua mb-2">ILUSTRACIONES</Text>
            </>
          )}
          <View className="flex-row flex-wrap justify-between" style={{ rowGap: 14 }}>
            {PROFILE_BGS.map((b) => {
              const on = current === b.key;
              return (
                <Press key={b.key} accessibilityRole="button" accessibilityLabel={`Fondo ${b.label}`} accessibilityState={{ selected: on }} onPress={() => onChange(b.key)} style={{ width: '31.5%' }}>
                  <ProfileBgThumb bg={b.key} selected={on} height={72} />
                  {on ? (
                    <View style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={11} color="#111" weight="bold" />
                    </View>
                  ) : null}
                  <Text className="text-[11.5px] text-center mt-1.5 text-muted-light dark:text-muted-dark" numberOfLines={2}>{b.label}</Text>
                </Press>
              );
            })}
          </View>
          <Press accessibilityRole="button" onPress={onClose} className="rounded-2xl py-3.5 items-center mt-6" style={{ backgroundColor: '#0F7A5C' }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Listo</Text>
          </Press>
        </Press>
      </Press>
    </Modal>
  );
}
