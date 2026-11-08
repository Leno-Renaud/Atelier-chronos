import React, { useState } from 'react';
import { X, Cloud, CheckCircle2, UploadCloud } from 'lucide-react';
import {
  getStoredFirebaseConfig,
  saveFirebaseConfigToStorage,
  type FirebaseConfigInput,
} from '../services/firebase';
import { pushLocalTasksToCloud } from '../services/taskRepository';

interface CloudConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
  isCloudConnected: boolean;
  projectId?: string;
}

export const CloudConfigModal: React.FC<CloudConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
  isCloudConnected,
  projectId,
}) => {
  const existing = getStoredFirebaseConfig();
  const [apiKey, setApiKey] = useState(existing?.apiKey || '');
  const [projId, setProjId] = useState(existing?.projectId || '');
  const [appId, setAppId] = useState(existing?.appId || '');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projId.trim() || !appId.trim()) {
      setStatusMessage('Renseignez apiKey, projectId et appId.');
      return;
    }

    const config: FirebaseConfigInput = {
      apiKey: apiKey.trim(),
      projectId: projId.trim(),
      appId: appId.trim(),
      authDomain: `${projId.trim()}.firebaseapp.com`,
      storageBucket: `${projId.trim()}.appspot.com`,
    };

    setIsSyncing(true);
    try {
      saveFirebaseConfigToStorage(config);
      const count = await pushLocalTasksToCloud();
      setStatusMessage(`Connecté (${count} tâches synchronisées).`);
      onConfigUpdated();
    } catch {
      setStatusMessage('Configuration enregistrée.');
      onConfigUpdated();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    saveFirebaseConfigToStorage(null);
    setApiKey('');
    setProjId('');
    setAppId('');
    setStatusMessage('Mode local activé.');
    onConfigUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="animate-popover relative w-full max-w-md rounded-[20px] p-5 sleek-popover">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <Cloud className="h-4 w-4 text-indigo-400" />
            <h3 className="font-display text-base font-semibold text-zinc-100">
              Synchronisation Firebase
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1 text-zinc-400 hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-zinc-300">
          {isCloudConnected && (
            <div className="flex items-center gap-2 rounded-[10px] bg-emerald-500/10 px-3 py-2 text-emerald-300 ring-1 ring-emerald-500/25">
              <CheckCircle2 className="h-4 w-4" />
              <span>Connecté à {projectId}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-2.5">
            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-[10px] bg-[#0B0B0E] px-3 py-2 font-mono text-xs text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">Project ID</label>
              <input
                type="text"
                value={projId}
                onChange={(e) => setProjId(e.target.value)}
                placeholder="mon-planner"
                className="w-full rounded-[10px] bg-[#0B0B0E] px-3 py-2 font-mono text-xs text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">App ID</label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1:123456:web:abcdef"
                className="w-full rounded-[10px] bg-[#0B0B0E] px-3 py-2 font-mono text-xs text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {statusMessage && (
              <p className="rounded-[9px] bg-indigo-500/15 px-3 py-2 text-xs text-indigo-200">
                {statusMessage}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              {isCloudConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="rounded-[10px] bg-rose-500/15 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/25"
                >
                  Déconnecter
                </button>
              ) : (
                <span />
              )}

              <button
                type="submit"
                disabled={isSyncing}
                className="flex items-center gap-1.5 rounded-[10px] bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400 active:scale-[0.97]"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>{isSyncing ? 'Connexion...' : 'Enregistrer'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
