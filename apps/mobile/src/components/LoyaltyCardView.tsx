import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Gift } from '@/components/icons';
import { Glass } from '@/components/ui/Glass';
import { Coin } from '@/components/ui/Coin';
import { colors } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useThemeColors';
import { GOLD } from '@/components/ui/Featured';
import { plural } from '@/lib/format';
import type { LoyaltyCard } from '@/lib/database.types';

const GOLD_INK = '#8F6307';

const dayFmt = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', timeZone: 'America/La_Paz' });
const formatDay = (iso: string) => dayFmt.format(new Date(iso)).replace('.', '');

// Los casilleros: un sello (huellas de Camina) por cada canje confirmado y el regalo al final.
export function Stamps({ card, size = 36 }: { card: LoyaltyCard; size?: number }) {
  const t = useThemeColors();
  return (
    <View className="flex-row items-center" style={{ gap: 7 }}>
      {Array.from({ length: card.goal }, (_, i) =>
        i < card.stamps ? (
          <Coin key={i} size={size} />
        ) : (
          <View
            key={i}
            style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderStyle: 'dashed', borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: t.muted }}>{i + 1}</Text>
          </View>
        )
      )}
      <View
        style={{
          width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: GOLD, alignItems: 'center', justifyContent: 'center',
          backgroundColor: card.ready ? GOLD : '#FFF4D6',
        }}
      >
        <Gift size={size * 0.48} color={card.ready ? '#fff' : GOLD_INK} />
      </View>
    </View>
  );
}

function statusLine(card: LoyaltyCard) {
  if (card.ready) return `¡Completa! Tu próximo ${card.benefit_name} sale gratis.`;
  const missing = card.goal - card.stamps;
  return `Te ${plural(missing, 'falta', 'faltan')} ${missing} ${plural(missing, 'canje', 'canjes')} para tu premio: ${card.benefit_name} gratis.`;
}

// Tarjeta de un local: en la ficha (compacta) y en "Mis tarjetas" (con el historial de canjes).
export function LoyaltyCardView({ card, showHistory, title }: { card: LoyaltyCard; showHistory?: boolean; title?: string }) {
  const t = useThemeColors();
  const [now] = useState(() => Date.now());
  return (
    <Glass
      className="rounded-3xl p-4"
      style={card.ready ? { borderWidth: 2, borderColor: GOLD } : undefined}
      accessible
      accessibilityLabel={`${title ?? 'Tu tarjeta'}: ${card.stamps} de ${card.goal} sellos. ${statusLine(card)}`}
    >
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-[15px] font-bold text-text-light dark:text-text-dark shrink" numberOfLines={1}>{title ?? 'Tu tarjeta de fidelidad'}</Text>
        <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: card.ready ? GOLD : t.dark ? colors.dark.purpleLight : colors.light.purpleLight }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: card.ready ? '#3D2A00' : t.purpleText }}>{card.stamps} de {card.goal}</Text>
        </View>
      </View>
      <Stamps card={card} size={showHistory ? 34 : 36} />
      <Text className="text-[13px] leading-[18px] text-text-light dark:text-text-dark mt-3">{statusLine(card)}</Text>
      {!card.ready && card.next_allowed_at && new Date(card.next_allowed_at).getTime() > now ? (
        <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-1">Tu próximo canje aquí, desde el {formatDay(card.next_allowed_at)}.</Text>
      ) : null}
      {showHistory && card.history.length > 0 ? (
        <View className="mt-3 pt-3 border-t border-line-light dark:border-line-dark">
          <Text className="text-[12px] font-semibold text-muted-light dark:text-muted-dark mb-1">Dónde y cuándo canjeaste</Text>
          <Text className="text-[13px] text-text-light dark:text-text-dark">
            {card.business_name}: {card.history.map(formatDay).join(' · ')}
          </Text>
        </View>
      ) : null}
    </Glass>
  );
}
