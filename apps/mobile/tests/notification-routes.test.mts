// lib/notification-routes.ts: a qué pantalla lleva cada aviso (al tocar la notificación o la fila de la bandeja).
import test from 'node:test';
import assert from 'node:assert/strict';
import { routeForNotification } from '../src/lib/notification-routes.ts';

test('puntos por vencer y puntos por invitar llevan a Tus Puntos', () => {
  assert.equal(routeForNotification('points_expiring'), '/(tabs)/puntos');
  assert.equal(routeForNotification('referral_credited'), '/(tabs)/puntos');
});

test('avisos de grupo (desafío, fin del desafío, semana) llevan a Grupos', () => {
  for (const t of ['group_challenge', 'group_challenge_end', 'group_week']) assert.equal(routeForNotification(t), '/(tabs)/grupos', t);
});

test('canjes, retos y sorteos siguen en su pantalla; la racha lleva a Inicio', () => {
  for (const t of ['redemption', 'redemption_expiring', 'nearby']) assert.equal(routeForNotification(t), '/(tabs)/canjes', t);
  for (const t of ['reto', 'promotion_win']) assert.equal(routeForNotification(t), '/(tabs)/eventos', t);
  for (const t of ['streak', 'streak_reminder']) assert.equal(routeForNotification(t), '/(tabs)', t);
});

test('solicitudes y aceptaciones de amistad llevan a Amigos; la invitación a un grupo, a Grupos', () => {
  for (const t of ['friend_request', 'friend_accepted']) assert.equal(routeForNotification(t), '/(tabs)/amigos', t);
  assert.equal(routeForNotification('group_invite'), '/(tabs)/grupos');
});

test('un tipo desconocido o sin tipo abre la bandeja de Avisos (la fila queda solo para leer)', () => {
  assert.equal(routeForNotification('algo_nuevo'), '/(tabs)/notificaciones');
  assert.equal(routeForNotification(undefined), '/(tabs)/notificaciones');
});
