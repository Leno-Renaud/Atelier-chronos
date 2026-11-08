import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

export interface FirebaseConfigInput {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const FIREBASE_CONFIG_STORAGE_KEY = 'life_planner_firebase_config_v1';

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

export function getStoredFirebaseConfig(): FirebaseConfigInput | null {
  // 1. Priorité aux variables d'environnement (.env)
  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const envAppId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (envApiKey && envProjectId && envAppId) {
    return {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: envAppId,
    };
  }

  // 2. Sinon, lecture de la configuration enregistrée depuis l'interface
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FirebaseConfigInput;
        if (parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function saveFirebaseConfigToStorage(config: FirebaseConfigInput | null): void {
  if (typeof window === 'undefined') return;
  if (!config) {
    window.localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
  } else {
    window.localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }
  // Reset instances so next call re-initializes
  appInstance = null;
  dbInstance = null;
}

export function getFirestoreDb(): { db: Firestore | null; isCloudConnected: boolean; projectId?: string } {
  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return { db: null, isCloudConnected: false };
  }

  try {
    if (!appInstance) {
      const existing = getApps();
      appInstance = existing.length > 0 ? existing[0] : initializeApp(config);
    }
    if (!dbInstance) {
      try {
        dbInstance = initializeFirestore(appInstance, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch {
        dbInstance = getFirestore(appInstance);
      }
    }
    return { db: dbInstance, isCloudConnected: true, projectId: config.projectId };
  } catch (err) {
    console.warn('Erreur d’initialisation Firebase Firestore, bascule sur le cache local:', err);
    return { db: null, isCloudConnected: false };
  }
}
