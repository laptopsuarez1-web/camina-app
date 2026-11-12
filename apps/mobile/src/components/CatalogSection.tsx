import { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/ui/Text';
import { typo } from '@/theme/type';

export type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  price_bs: number | null;
  image_url: string | null;
  section: string | null;
};

// Catálogo o menú que carga el local desde el panel. Si no cargó nada, no se muestra.
export function useCatalog(businessId: string | undefined) {
  return useQuery({
    queryKey: ['catalog', businessId],
    enabled: !!businessId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_catalog_items')
        .select('id, name, description, price_bs, image_url, section')
        .eq('business_id', businessId!)
        .eq('active', true)
        .order('position')
        .order('created_at');
      if (error) throw error;
      return data as CatalogItem[];
    },
  });
}

function price(n: number) {
  return `Bs ${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')}`;
}

export function CatalogSection({ businessId }: { businessId: string }) {
  const { data } = useCatalog(businessId);
  const sections = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const it of data ?? []) {
      const k = it.section ?? '';
      map.set(k, [...(map.get(k) ?? []), it]);
    }
    return [...map.entries()];
  }, [data]);
  if (!data || data.length === 0) return null;
  return (
    <View className="mt-7">
      <Text className="text-text-light dark:text-text-dark mb-3" style={typo.section}>Catálogo</Text>
      {sections.map(([title, list]) => (
        <View key={title} className="mb-4">
          {title ? <Text className="text-muted-light dark:text-muted-dark mb-2 text-[13px] font-bold">{title}</Text> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {list.map((it) => (
              <View key={it.id} className="bg-card-light dark:bg-card-dark rounded-2xl overflow-hidden border border-line-light dark:border-line-dark" style={{ width: 150 }}>
                {it.image_url ? (
                  <Image source={{ uri: it.image_url }} style={{ width: 150, height: 110 }} contentFit="cover" accessibilityLabel={it.name} />
                ) : null}
                <View className="p-2.5">
                  <Text className="text-text-light dark:text-text-dark font-bold text-[13.5px]" numberOfLines={2}>{it.name}</Text>
                  {it.description ? <Text className="text-muted-light dark:text-muted-dark text-[12px] mt-0.5" numberOfLines={2}>{it.description}</Text> : null}
                  {it.price_bs != null ? <Text className="text-purple-ink dark:text-purple-soft font-extrabold text-[13.5px] mt-1">{price(it.price_bs)}</Text> : null}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}
