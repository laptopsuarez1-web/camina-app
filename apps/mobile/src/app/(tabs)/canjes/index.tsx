import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator, Alert } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useBenefits, useRedeemBenefit, useRegenerateCode } from '@/hooks/useBenefits';
import { usePointsBalance } from '@/hooks/usePoints';
import type { Redemption } from '@/lib/database.types';
import { colors } from '@/theme/tokens';
import { REDEMPTION_CODE_TTL_MINUTES } from '@/constants/business-rules';

function useCountdown(expiresAt: string | null) {
  const [remainingMs, setRemainingMs] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    function tick() {
      setRemainingMs(Math.max(0, new Date(expiresAt!).getTime() - Date.now()));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return remainingMs;
}

export default function CanjesScreen() {
  const { data: benefits, isLoading } = useBenefits();
  const { data: balance } = usePointsBalance();
  const redeem = useRedeemBenefit();
  const regenerate = useRegenerateCode();
  const [activeRedemption, setActiveRedemption] = useState<Redemption | null>(null);

  const remainingMs = useCountdown(activeRedemption?.code_expires_at ?? null);
  const expired = !!activeRedemption && remainingMs <= 0;

  async function handleRedeem(benefitId: string) {
    try {
      const result = await redeem.mutateAsync(benefitId);
      setActiveRedemption(result);
    } catch (e) {
      Alert.alert('No se pudo canjear', e instanceof Error ? e.message : 'Intentá de nuevo.');
    }
  }

  async function handleRegenerate() {
    if (!activeRedemption) return;
    const result = await regenerate.mutateAsync(activeRedemption.id);
    setActiveRedemption(result);
  }

  const mm = String(Math.floor(remainingMs / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0');

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <ScrollView contentContainerClassName="p-5 pt-14">
        <Text className="text-[21px] font-extrabold mb-0.5 text-text-light dark:text-text-dark">
          Canjear puntos
        </Text>
        <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-4">
          Tenés {balance ?? 0} Puntos disponibles
        </Text>

        {isLoading && <ActivityIndicator color={colors.aqua} />}

        <View className="gap-2.5">
          {(benefits ?? []).map((b) => {
            const canAfford = (balance ?? 0) >= b.cost_points;
            return (
              <View
                key={b.id}
                className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-md p-3.5"
              >
                <View className="flex-row items-center gap-3 mb-1">
                  <View className="w-11 h-11 rounded-full bg-aqua-light-light dark:bg-aqua-light-dark items-center justify-center">
                    <Text className="text-aqua font-bold">{b.business.name[0]}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-text-light dark:text-text-dark">
                      {b.business.name}
                    </Text>
                    <Text className="text-muted-light dark:text-muted-dark text-[13px]">{b.name}</Text>
                  </View>
                  <Heart size={17} color={colors.light.muted} />
                </View>
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="text-muted-light dark:text-muted-dark text-xs">
                    {b.type === 'gratis' ? 'Gratis' : b.discount_detail}
                  </Text>
                  <Pressable
                    onPress={() => handleRedeem(b.id)}
                    disabled={!canAfford || redeem.isPending}
                    className="rounded-full px-3.5 py-1.5"
                    style={{ backgroundColor: canAfford ? colors.aqua : colors.light.line }}
                  >
                    <Text
                      className="font-bold text-[13px]"
                      style={{ color: canAfford ? '#fff' : colors.light.muted }}
                    >
                      {b.cost_points} Pts
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          {!isLoading && (benefits ?? []).length === 0 && (
            <Text className="text-muted-light dark:text-muted-dark text-[13px] text-center py-6">
              Todavía no hay beneficios cargados.
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal visible={!!activeRedemption} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-card-light dark:bg-card-dark rounded-2xl p-6 w-full max-w-[320px] items-center">
            <Text className="font-semibold text-base mb-1 text-text-light dark:text-text-dark">
              Mostrá este código en el local
            </Text>
            <Text className="text-muted-light dark:text-muted-dark text-[13px] mb-4">
              Vence a los {REDEMPTION_CODE_TTL_MINUTES} minutos de generado.
            </Text>
            {!expired ? (
              <>
                <View className="bg-bg-light dark:bg-bg-dark rounded-2xl py-4 px-2 mb-2.5 w-full items-center">
                  <Text className="text-3xl font-bold tracking-[6px] text-purple">
                    {activeRedemption?.code}
                  </Text>
                </View>
                <Text className="text-xs text-muted-light dark:text-muted-dark mb-5">
                  Vence en {mm}:{ss}
                </Text>
              </>
            ) : (
              <>
                <View className="bg-bg-light dark:bg-bg-dark rounded-2xl py-4 px-2 mb-2.5 w-full items-center">
                  <Text className="text-warn font-semibold">Código vencido</Text>
                </View>
                <Pressable
                  onPress={handleRegenerate}
                  className="bg-purple rounded-xl py-3 px-6 mb-2.5 w-full items-center"
                >
                  <Text className="text-white font-semibold">Generar nuevo código</Text>
                </Pressable>
              </>
            )}
            <Pressable onPress={() => setActiveRedemption(null)} className="mt-1">
              <Text className="text-muted-light dark:text-muted-dark text-[13px]">Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
