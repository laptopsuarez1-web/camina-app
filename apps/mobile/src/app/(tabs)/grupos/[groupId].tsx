import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Share, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Share2, Send, Trophy, Users, IconBubble } from '@/components/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupDetail, useGroupNotes, usePostGroupNote } from '@/hooks/useGroupDetail';
import { groupInviteLink } from '@/constants/sharing';
import { colors } from '@/theme/tokens';

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data, isLoading } = useGroupDetail(groupId);
  const { data: notes } = useGroupNotes(groupId);
  const postNote = usePostGroupNote(groupId);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const queryClient = useQueryClient();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  async function saveGoal() {
    const n = parseInt(goalInput.replace(/\D/g, ''), 10);
    if (!n || n < 5000 || n > 5_000_000) {
      Alert.alert('Meta no válida', 'Ingresá una meta semanal entre 5.000 y 5.000.000 de pasos.');
      return;
    }
    const { error } = await supabase.from('groups').update({ challenge_target: n }).eq('id', groupId!);
    if (error) {
      Alert.alert('No se pudo cambiar la meta', 'Solo quien creó el grupo puede cambiarla.');
      return;
    }
    setEditingGoal(false);
    queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  }

  async function share() {
    if (!data) return;
    await Share.share({
      message: `Unite a mi grupo "${data.group.name}" en Camina — caminemos y ganemos Puntos juntos.\n${groupInviteLink(data.group.id)}`,
      url: groupInviteLink(data.group.id),
    });
  }

  async function send() {
    if (!text.trim() || !userId) return;
    const value = text.trim();
    setText('');
    await postNote.mutateAsync({ userId, text: value });
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  if (isLoading || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark">
        <ActivityIndicator color={colors.aqua} />
      </View>
    );
  }

  const totalSteps = data.members.reduce((a, m) => a + m.steps, 0);
  const challengeTarget = data.group.challenge_target;
  const isCreator = data.group.created_by === userId;
  const challengePct = challengeTarget > 0 ? Math.min(100, (totalSteps / challengeTarget) * 100) : 0;

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg-light dark:bg-bg-dark" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="flex-row items-center justify-between px-5 pt-14 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={22} color={colors.light.text} />
        </Pressable>
        <Text className="text-base font-bold text-text-light dark:text-text-dark" numberOfLines={1}>
          {data.group.name}
        </Text>
        <Pressable onPress={share} hitSlop={10}>
          <IconBubble icon={Share2} tone="aqua" size={36} />
        </Pressable>
      </View>

      <View className="mx-5 bg-card-light dark:bg-card-dark rounded-2xl p-4 mb-3">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <IconBubble icon={Users} tone="purple" size={34} />
            <Text className="text-[14px] font-bold text-text-light dark:text-text-dark">Reto en equipo</Text>
          </View>
          <Pressable
            disabled={!isCreator}
            onPress={() => {
              setGoalInput(String(challengeTarget));
              setEditingGoal(true);
            }}
            hitSlop={8}
          >
            <Text className="text-xs text-muted-light dark:text-muted-dark">
              {totalSteps.toLocaleString('es-BO')} / {challengeTarget.toLocaleString('es-BO')} pasos{isCreator ? ' ✎' : ''}
            </Text>
          </Pressable>
        </View>
        {editingGoal && (
          <View className="flex-row items-center gap-2 mb-3">
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="number-pad"
              placeholder="Meta semanal de pasos"
              placeholderTextColor={colors.light.muted}
              className="flex-1 bg-bg-light dark:bg-bg-dark rounded-full px-3.5 py-2 text-xs text-text-light dark:text-text-dark"
            />
            <Pressable onPress={saveGoal} className="bg-purple rounded-full px-3.5 py-2">
              <Text className="text-xs font-semibold text-white">Guardar</Text>
            </Pressable>
            <Pressable onPress={() => setEditingGoal(false)}>
              <Text className="text-xs text-muted-light dark:text-muted-dark">Cancelar</Text>
            </Pressable>
          </View>
        )}
        <View className="h-2 rounded-full bg-line-light dark:bg-line-dark overflow-hidden">
          <View style={{ width: `${challengePct}%`, height: '100%', backgroundColor: colors.aqua }} />
        </View>
        <Text className="text-[11px] text-muted-light dark:text-muted-dark mt-2">
          Meta semanal compartida — sumen pasos juntos.{isCreator ? ' Tocá la meta para cambiarla.' : ''}
        </Text>
      </View>

      <View className="mx-5 bg-card-light dark:bg-card-dark rounded-2xl p-4 mb-3">
        <View className="flex-row items-center mb-3" style={{ gap: 10 }}>
          <IconBubble icon={Trophy} tone="gold" size={34} />
          <Text className="flex-1 text-[13px] font-bold text-text-light dark:text-text-dark">
            Ranking de la semana · {totalSteps.toLocaleString('es-BO')} pasos en total
          </Text>
        </View>
        {data.members.map((m, i) => (
          <View key={m.id} className="flex-row items-center gap-3 py-1.5">
            <Text className="w-5 text-xs font-bold text-muted-light dark:text-muted-dark">{i + 1}°</Text>
            {m.photoUrl ? (
              <Image source={{ uri: m.photoUrl }} className="w-8 h-8 rounded-full" />
            ) : (
              <View className="w-8 h-8 rounded-full bg-purple-light-light dark:bg-purple-light-dark items-center justify-center">
                <Text className="text-purple text-xs font-bold">{m.name[0]?.toUpperCase()}</Text>
              </View>
            )}
            <Text className="flex-1 text-[13px] text-text-light dark:text-text-dark" numberOfLines={1}>
              {m.id === userId ? `${m.name} (vos)` : m.name}
            </Text>
            <Text className="text-[12.5px] font-semibold text-muted-light dark:text-muted-dark">
              {m.steps.toLocaleString('es-BO')}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView ref={scrollRef} className="flex-1 px-5" contentContainerClassName="gap-2 pb-3" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        {(notes ?? []).map((n) => {
          const mine = n.user_id === userId;
          return (
            <View key={n.id} className={mine ? 'self-end items-end' : 'self-start items-start'} style={{ maxWidth: '78%' }}>
              {!mine && (
                <Text className="text-[10.5px] text-muted-light dark:text-muted-dark mb-0.5 px-1">
                  {n.author?.full_name ?? 'Caminante'}
                </Text>
              )}
              <View
                className="rounded-2xl px-3.5 py-2.5"
                style={{ backgroundColor: mine ? colors.aqua : colors.light.card, borderWidth: mine ? 0 : 1, borderColor: colors.light.line }}
              >
                <Text style={{ color: mine ? '#fff' : colors.light.text, fontSize: 13.5 }}>{n.text}</Text>
              </View>
            </View>
          );
        })}
        {(notes ?? []).length === 0 && (
          <Text className="text-center text-muted-light dark:text-muted-dark text-[13px] py-6">
            Todavía no hay mensajes. Escribí el primero.
          </Text>
        )}
      </ScrollView>

      <View className="flex-row items-center gap-2.5 px-5 py-3 border-t border-line-light dark:border-line-dark">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escribí un mensaje…"
          placeholderTextColor={colors.light.muted}
          className="flex-1 bg-card-light dark:bg-card-dark rounded-full px-4 py-2.5 text-[13.5px] text-text-light dark:text-text-dark"
          multiline
        />
        <Pressable onPress={send} disabled={!text.trim() || postNote.isPending} className="w-10 h-10 rounded-full bg-aqua items-center justify-center">
          <Send size={16} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
