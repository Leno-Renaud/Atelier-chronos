import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import {
  type Task,
  FREQUENCY_CONFIG,
  getMondayOfCurrentWeek,
  formatDateISO,
} from '../types/task';

const FIRED_NOTIFICATIONS_KEY = 'life_planner_fired_notifs_v1';

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * Vérifie si une tâche est programmée pour une date précise (Jour + Fréquence)
 */
export function isTaskScheduledForDate(task: Task, targetDate: Date): boolean {
  if (!task.enabled) return false;

  // Conversion JS getDay() (0=Dimanche..6=Samedi) vers ISO (1=Lundi..7=Dimanche)
  const jsDay = targetDate.getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;

  if (task.frequency === 'daily') {
    if (!task.daysOfWeek || task.daysOfWeek.length === 0) return true;
    return task.daysOfWeek.includes(isoDay);
  }

  if (task.frequency === 'weekly') {
    return task.daysOfWeek.includes(isoDay);
  }

  if (task.frequency === 'biweekly') {
    if (!task.daysOfWeek.includes(isoDay)) return false;
    const anchorMondayStr = task.biweeklyAnchor || getMondayOfCurrentWeek(new Date(task.createdAt));
    const currentMondayStr = getMondayOfCurrentWeek(targetDate);
    const anchorDate = new Date(`${anchorMondayStr}T00:00:00`);
    const currentMonday = new Date(`${currentMondayStr}T00:00:00`);
    const diffDays = Math.round(
      (currentMonday.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const diffWeeks = Math.round(diffDays / 7);
    return Math.abs(diffWeeks) % 2 === 0;
  }

  if (task.frequency === 'monthly') {
    const targetDayOfMonth = task.dayOfMonth ?? 1;
    const lastDayOfCurrentMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0
    ).getDate();
    const effectiveDay = Math.min(targetDayOfMonth, lastDayOfCurrentMonth);
    return targetDate.getDate() === effectiveDay;
  }

  return false;
}

/**
 * Calcule la prochaine occurrence exacte (Date) d'une tâche à partir de maintenant
 */
export function getNextOccurrenceDate(task: Task, fromDate: Date = new Date()): Date | null {
  if (!task.enabled) return null;
  const [hoursStr, minutesStr] = task.time.split(':');
  const hours = Number.parseInt(hoursStr || '9', 10);
  const minutes = Number.parseInt(minutesStr || '0', 10);

  for (let offset = 0; offset <= 62; offset++) {
    const candidate = new Date(fromDate);
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(hours, minutes, 0, 0);

    if (candidate.getTime() <= fromDate.getTime()) {
      continue;
    }

    if (isTaskScheduledForDate(task, candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Demande la permission d'envoyer des notifications (Android Capacitor ou Navigateur Web)
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display as NotificationPermissionState;
    } catch {
      return 'denied';
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') return 'granted';
  const result = await Notification.requestPermission();
  return result === 'default' ? 'prompt' : result;
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionState> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display as NotificationPermissionState;
    } catch {
      return 'prompt';
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

/**
 * Synchronise toutes les tâches actives avec le planificateur natif Android (Capacitor)
 */
export async function syncTaskNotifications(tasks: Task[]): Promise<number> {
  const activeTasks = tasks.filter((t) => t.enabled);

  if (Capacitor.isNativePlatform()) {
    try {
      // Création du canal Android haute priorité obligatoire
      await LocalNotifications.createChannel({
        id: 'chronos_reminders',
        name: 'Rappels Atelier Chronos',
        description: 'Notifications pour vos tâches et rappels',
        importance: 5,
        visibility: 1,
        vibration: true,
      });

      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      const notificationsToSchedule: LocalNotificationSchema[] = [];
      let notifIdCounter = 1000;
      const now = new Date();

      for (const task of activeTasks) {
        const [hoursStr, minutesStr] = task.time.split(':');
        const hours = Number.parseInt(hoursStr || '9', 10);
        const minutes = Number.parseInt(minutesStr || '0', 10);
        const freqLabel = FREQUENCY_CONFIG[task.frequency].label;

        // Programmation des prochaines occurrences sur 35 jours glissants pour fiabilité totale
        for (let dayOffset = 0; dayOffset <= 35; dayOffset++) {
          const candidate = new Date(now);
          candidate.setDate(candidate.getDate() + dayOffset);
          candidate.setHours(hours, minutes, 0, 0);

          if (candidate.getTime() <= now.getTime()) continue;

          if (isTaskScheduledForDate(task, candidate)) {
            notificationsToSchedule.push({
              id: notifIdCounter++,
              title: `Rappel · ${freqLabel}`,
              body: task.title,
              channelId: 'chronos_reminders',
              schedule: {
                at: candidate,
                allowWhileIdle: true,
              },
              extra: {
                taskId: task.id,
              },
            });
          }
        }
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule,
        });
      }

      return notificationsToSchedule.length;
    } catch (err) {
      console.warn('Erreur lors de la programmation Capacitor LocalNotifications:', err);
    }
  }

  return activeTasks.length;
}

/**
 * Vérifie à chaque tick (Web) si une tâche doit déclencher une notification à la minute courante
 */
export function checkAndFireWebNotifications(
  tasks: Task[],
  onInAppToast?: (task: Task) => void
): void {
  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  const todayISO = formatDateISO(now);

  let firedMap: Record<string, boolean> = {};
  try {
    const raw = window.localStorage.getItem(FIRED_NOTIFICATIONS_KEY);
    if (raw) firedMap = JSON.parse(raw);
  } catch {
    firedMap = {};
  }

  let updated = false;

  for (const task of tasks) {
    if (!task.enabled) continue;
    if (task.time !== currentHHMM) continue;
    if (!isTaskScheduledForDate(task, now)) continue;

    const dedupeKey = `${task.id}_${todayISO}_${currentHHMM}`;
    if (firedMap[dedupeKey]) continue;

    firedMap[dedupeKey] = true;
    updated = true;

    // Déclenche la notification système Web si autorisée
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const freqLabel = FREQUENCY_CONFIG[task.frequency].label;
      new Notification(`Rappel · ${freqLabel} (${task.time})`, {
        body: task.title,
        tag: dedupeKey,
      });
    }

    // Déclenche aussi l'alerte visuelle dans l'application
    if (onInAppToast) {
      onInAppToast(task);
    }
  }

  if (updated) {
    window.localStorage.setItem(FIRED_NOTIFICATIONS_KEY, JSON.stringify(firedMap));
  }
}

/**
 * Envoie une notification immédiate de test (Web ou Android)
 */
export async function triggerTestNotification(sampleText?: string): Promise<boolean> {
  const perm = await requestNotificationPermission();
  const bodyText =
    sampleText || 'Vos notifications Life Planner sont opérationnelles à l’heure programmée.';

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.createChannel({
        id: 'chronos_reminders',
        name: 'Rappels Atelier Chronos',
        description: 'Notifications pour vos tâches et rappels',
        importance: 5,
        visibility: 1,
        vibration: true,
      });

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 999999,
            title: 'Atelier Chronos · Test actif',
            body: bodyText,
            channelId: 'chronos_reminders',
            schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true },
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window && perm === 'granted') {
    new Notification('Life Planner · Notification active', {
      body: bodyText,
    });
    return true;
  }

  return false;
}
