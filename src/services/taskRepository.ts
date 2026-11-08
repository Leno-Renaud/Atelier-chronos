import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { getFirestoreDb } from './firebase';
import {
  type Task,
  getMondayOfCurrentWeek,
  formatDateISO,
} from '../types/task';

const LOCAL_TASKS_STORAGE_KEY = 'life_planner_tasks_v1';
const COLLECTION_NAME = 'tasks';

const INITIAL_DEMO_TASKS: Task[] = [
  {
    id: 'task-daily-1',
    title: 'Revue matinale des priorités & hydratation (500 ml)',
    frequency: 'daily',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    time: '07:30',
    enabled: true,
    completedDates: [],
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'task-weekly-1',
    title: 'Séance de musculation & mobilité articulaire',
    frequency: 'weekly',
    daysOfWeek: [1, 3, 5],
    time: '18:30',
    enabled: true,
    completedDates: [],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'task-biweekly-1',
    title: 'Entretien complet de l’appartement & changement des draps',
    frequency: 'biweekly',
    daysOfWeek: [6],
    biweeklyAnchor: getMondayOfCurrentWeek(),
    time: '10:00',
    enabled: true,
    completedDates: [],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'task-monthly-1',
    title: 'Bilan financier mensuel, épargne & vérification des abonnements',
    frequency: 'monthly',
    daysOfWeek: [],
    dayOfMonth: 1,
    time: '20:00',
    enabled: true,
    completedDates: [],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
];

type TasksListener = (tasks: Task[], syncMode: 'cloud' | 'local') => void;
const localListeners = new Set<TasksListener>();

export function readLocalTasks(): Task[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_TASKS;
  try {
    const raw = window.localStorage.getItem(LOCAL_TASKS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        LOCAL_TASKS_STORAGE_KEY,
        JSON.stringify(INITIAL_DEMO_TASKS)
      );
      return INITIAL_DEMO_TASKS;
    }
    const parsed = JSON.parse(raw) as Task[];
    return Array.isArray(parsed) ? parsed : INITIAL_DEMO_TASKS;
  } catch {
    return INITIAL_DEMO_TASKS;
  }
}

function writeLocalTasks(tasks: Task[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

function notifyLocalListeners(tasks: Task[], mode: 'cloud' | 'local' = 'local') {
  for (const listener of localListeners) {
    listener(tasks, mode);
  }
}

/**
 * Abonnement temps réel aux tâches (Firebase Firestore si configuré, sinon LocalStorage réactif)
 */
export function subscribeToTasks(listener: TasksListener): () => void {
  localListeners.add(listener);
  const { db, isCloudConnected } = getFirestoreDb();

  if (db && isCloudConnected) {
    const q = query(collection(db, COLLECTION_NAME), orderBy('time', 'asc'));
    const unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        const remoteTasks: Task[] = [];
        snapshot.forEach((docSnap) => {
          remoteTasks.push(docSnap.data() as Task);
        });
        writeLocalTasks(remoteTasks);
        listener(remoteTasks, 'cloud');
      },
      (error) => {
        console.warn('Firestore snapshot error, fallback local:', error);
        listener(readLocalTasks(), 'local');
      }
    );

    return () => {
      localListeners.delete(listener);
      unsubscribeFirestore();
    };
  }

  // Mode local immédiat
  listener(readLocalTasks(), 'local');
  return () => {
    localListeners.delete(listener);
  };
}

/**
 * Crée ou met à jour une tâche dans la BD en ligne + cache local
 */
export async function saveTask(task: Task): Promise<void> {
  const current = readLocalTasks();
  const existingIndex = current.findIndex((t) => t.id === task.id);
  const updatedTask: Task = {
    ...task,
    updatedAt: Date.now(),
  };

  let nextTasks: Task[];
  if (existingIndex >= 0) {
    nextTasks = [...current];
    nextTasks[existingIndex] = updatedTask;
  } else {
    nextTasks = [updatedTask, ...current];
  }

  nextTasks.sort((a, b) => a.time.localeCompare(b.time));
  writeLocalTasks(nextTasks);

  const { db, isCloudConnected } = getFirestoreDb();
  if (db && isCloudConnected) {
    notifyLocalListeners(nextTasks, 'cloud');
    // Nettoyage des champs undefined pour Firestore
    const cleanPayload = JSON.parse(JSON.stringify(updatedTask));
    await setDoc(doc(db, COLLECTION_NAME, updatedTask.id), cleanPayload);
  } else {
    notifyLocalListeners(nextTasks, 'local');
  }
}

/**
 * Supprime une tâche de la BD en ligne + cache local
 */
export async function deleteTaskById(taskId: string): Promise<void> {
  const current = readLocalTasks();
  const nextTasks = current.filter((t) => t.id !== taskId);
  writeLocalTasks(nextTasks);

  const { db, isCloudConnected } = getFirestoreDb();
  if (db && isCloudConnected) {
    notifyLocalListeners(nextTasks, 'cloud');
    await deleteDoc(doc(db, COLLECTION_NAME, taskId));
  } else {
    notifyLocalListeners(nextTasks, 'local');
  }
}

/**
 * Coche / décoche la réalisation d'une tâche pour aujourd'hui
 */
export async function toggleTaskDoneToday(task: Task): Promise<void> {
  const todayISO = formatDateISO(new Date());
  const alreadyCompleted = task.completedDates.includes(todayISO);
  const nextCompleted = alreadyCompleted
    ? task.completedDates.filter((d) => d !== todayISO)
    : [...task.completedDates, todayISO];

  await saveTask({
    ...task,
    completedDates: nextCompleted,
  });
}

/**
 * Active / désactive la notification d'une tâche
 */
export async function toggleTaskNotificationEnabled(task: Task): Promise<void> {
  await saveTask({
    ...task,
    enabled: !task.enabled,
  });
}

/**
 * Pousse les tâches locales vers Firestore lors de la première connexion Cloud
 */
export async function pushLocalTasksToCloud(): Promise<number> {
  const { db, isCloudConnected } = getFirestoreDb();
  if (!db || !isCloudConnected) return 0;

  const localTasks = readLocalTasks();
  for (const task of localTasks) {
    const cleanPayload = JSON.parse(JSON.stringify(task));
    await setDoc(doc(db, COLLECTION_NAME, task.id), cleanPayload);
  }
  return localTasks.length;
}
