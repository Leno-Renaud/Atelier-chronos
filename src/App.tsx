import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Cloud,
  Bell,
  BellRing,
  X,
} from 'lucide-react';
import {
  type Task,
  type TaskFrequency,
  FREQUENCY_ORDER,
  FREQUENCY_CONFIG,
  getMondayOfCurrentWeek,
  formatDateISO,
} from './types/task';
import {
  subscribeToTasks,
  saveTask,
  deleteTaskById,
  toggleTaskDoneToday,
  toggleTaskNotificationEnabled,
} from './services/taskRepository';
import { getFirestoreDb } from './services/firebase';
import {
  syncTaskNotifications,
  checkAndFireWebNotifications,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  triggerTestNotification,
  isTaskScheduledForDate,
  type NotificationPermissionState,
} from './services/notificationService';
import { NewTaskWindow } from './components/NewTaskWindow';
import { FrequencySection } from './components/FrequencySection';
import { CloudConfigModal } from './components/CloudConfigModal';
import { TaskCard } from './components/TaskCard';

export function App() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'today'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [syncMode, setSyncMode] = useState<'cloud' | 'local'>('local');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<TaskFrequency, boolean>>({
    daily: true,
    weekly: true,
    biweekly: true,
    monthly: true,
  });
  const [notifPerm, setNotifPerm] = useState<NotificationPermissionState>('prompt');
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);
  const [nowClock, setNowClock] = useState<Date>(() => new Date());
  const [liveToast, setLiveToast] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowClock(new Date());
      checkAndFireWebNotifications(tasks, (firedTask) => {
        const freqLabel = FREQUENCY_CONFIG[firedTask.frequency].label;
        setLiveToast({
          title: `${firedTask.time.replace(':', '.')} · ${freqLabel}`,
          body: firedTask.title,
        });
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [tasks]);

  useEffect(() => {
    void getNotificationPermissionStatus().then(setNotifPerm);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToTasks((loadedTasks, mode) => {
      setTasks(loadedTasks);
      setSyncMode(mode);
      void syncTaskNotifications(loadedTasks);
    });
    return () => unsubscribe();
  }, [configVersion]);

  const { isCloudConnected, projectId } = useMemo(() => {
    return getFirestoreDb();
  }, [configVersion, syncMode]);

  const groupedTasks = useMemo(() => {
    const map: Record<TaskFrequency, Task[]> = {
      daily: [],
      weekly: [],
      biweekly: [],
      monthly: [],
    };
    for (const task of tasks) {
      if (map[task.frequency]) {
        map[task.frequency].push(task);
      }
    }
    for (const freq of FREQUENCY_ORDER) {
      map[freq].sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [tasks]);

  const areAllExpanded = useMemo(() => {
    return FREQUENCY_ORDER.every((freq) => expandedSections[freq]);
  }, [expandedSections]);

  const handleToggleAllSections = () => {
    const targetState = !areAllExpanded;
    setExpandedSections({
      daily: targetState,
      weekly: targetState,
      biweekly: targetState,
      monthly: targetState,
    });
  };

  const handleToggleSingleSection = useCallback((frequency: TaskFrequency) => {
    setExpandedSections((prev) => ({
      ...prev,
      [frequency]: !prev[frequency],
    }));
  }, []);

  const handleSaveTask = async (taskInput: {
    id?: string;
    title: string;
    frequency: TaskFrequency;
    daysOfWeek: number[];
    dayOfMonth?: number;
    time: string;
  }) => {
    const existing = taskInput.id ? tasks.find((t) => t.id === taskInput.id) : undefined;
    const nowMs = Date.now();

    const taskToSave: Task = {
      id: existing ? existing.id : `task-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
      title: taskInput.title,
      frequency: taskInput.frequency,
      daysOfWeek: taskInput.daysOfWeek,
      dayOfMonth: taskInput.dayOfMonth,
      biweeklyAnchor:
        taskInput.frequency === 'biweekly'
          ? existing?.biweeklyAnchor || getMondayOfCurrentWeek()
          : undefined,
      time: taskInput.time,
      enabled: existing ? existing.enabled : true,
      completedDates: existing ? existing.completedDates : [],
      createdAt: existing ? existing.createdAt : nowMs,
      updatedAt: nowMs,
    };

    await saveTask(taskToSave);

    setExpandedSections((prev) => ({
      ...prev,
      [taskToSave.frequency]: true,
    }));
  };

  const handleDeleteTask = async (taskId: string) => {
    if (editingTask?.id === taskId) {
      setEditingTask(null);
    }
    await deleteTaskById(taskId);
  };

  const handleEnableNotifications = async () => {
    const status = await requestNotificationPermission();
    setNotifPerm(status);
  };

  const todayStats = useMemo(() => {
    const now = new Date();
    const todayISO = formatDateISO(now);
    const dueToday = tasks.filter((t) => isTaskScheduledForDate(t, now));
    const completedToday = dueToday.filter((t) => t.completedDates.includes(todayISO));
    return {
      totalTasks: tasks.length,
      dueTodayCount: dueToday.length,
      completedTodayCount: completedToday.length,
      dueTodayList: dueToday,
    };
  }, [tasks, nowClock]);

  return (
    <div className="sleek-canvas min-h-screen pb-20 text-zinc-100">
      {liveToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-xs animate-popover rounded-[14px] p-3 sleek-popover">
          <div className="flex items-start gap-2.5">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-zinc-100">{liveToast.title}</h4>
              <p className="mt-0.5 text-xs text-zinc-400">{liveToast.body}</p>
            </div>
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              className="rounded-md p-0.5 text-zinc-500 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Barre supérieure épurée : uniquement Atelier Chronos + Onglets + Actions */}
      <header className="sticky top-0 z-30 border-b border-white/[0.05] bg-[#09090B]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <h1 className="font-display text-lg font-semibold tracking-tight text-white">
              Atelier Chronos
            </h1>

            <nav aria-label="Navigation" className="flex items-center gap-1 rounded-[10px] bg-white/[0.04] p-1 ring-1 ring-white/[0.05]">
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-1.5 rounded-[7px] px-3 py-1 text-xs font-medium transition-all duration-150 ${
                  activeTab === 'tasks'
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Tâches</span>
                <span className="font-mono text-[10px] text-zinc-400 tabular-nums">
                  {todayStats.totalTasks}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('today')}
                className={`flex items-center gap-1.5 rounded-[7px] px-3 py-1 text-xs font-medium transition-all duration-150 ${
                  activeTab === 'today'
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Aujourd’hui</span>
                <span className="font-mono text-[10px] text-zinc-400 tabular-nums">
                  {todayStats.completedTodayCount}/{todayStats.dueTodayCount}
                </span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsCloudModalOpen(true)}
              className={`flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-xs font-medium transition-all duration-150 active:scale-[0.97] ${
                isCloudConnected
                  ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25'
                  : 'bg-white/[0.04] text-zinc-400 ring-1 ring-white/[0.06] hover:text-zinc-200'
              }`}
              title="Base de données Cloud"
            >
              <Cloud className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isCloudConnected ? 'Cloud' : 'BD'}</span>
            </button>

            <button
              type="button"
              onClick={handleEnableNotifications}
              className={`flex h-8 w-8 items-center justify-center rounded-[9px] transition-all duration-150 active:scale-[0.97] ${
                notifPerm === 'granted'
                  ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/25'
                  : 'bg-white/[0.04] text-zinc-400 ring-1 ring-white/[0.06] hover:text-zinc-200'
              }`}
              title="Notifications"
            >
              <Bell className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <NewTaskWindow
          editingTask={editingTask}
          onCancelEdit={() => setEditingTask(null)}
          onSaveTask={handleSaveTask}
        />

        {activeTab === 'tasks' ? (
          <>
            <div className="mb-3 flex items-center justify-end">
              <button
                type="button"
                onClick={handleToggleAllSections}
                className="flex items-center gap-1.5 rounded-[9px] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 ring-1 ring-white/[0.06] transition-all duration-150 hover:bg-white/[0.08] hover:text-white active:scale-[0.97]"
              >
                {areAllExpanded ? (
                  <>
                    <ChevronsDownUp className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Tout replier</span>
                  </>
                ) : (
                  <>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Tout déplier</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3">
              {FREQUENCY_ORDER.map((freq) => (
                <FrequencySection
                  key={freq}
                  frequency={freq}
                  tasks={groupedTasks[freq]}
                  isExpanded={expandedSections[freq]}
                  onToggleExpand={handleToggleSingleSection}
                  onToggleDoneToday={toggleTaskDoneToday}
                  onToggleNotification={toggleTaskNotificationEnabled}
                  onEditTask={(task) => setEditingTask(task)}
                  onDeleteTask={handleDeleteTask}
                />
              ))}
            </div>
          </>
        ) : (
          <section className="rounded-[18px] p-4 sleek-card">
            {todayStats.dueTodayList.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-500">
                Aucune tâche prévue aujourd’hui
              </p>
            ) : (
              <div className="space-y-2">
                {todayStats.dueTodayList.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleDoneToday={toggleTaskDoneToday}
                    onToggleNotification={toggleTaskNotificationEnabled}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setActiveTab('tasks');
                    }}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <CloudConfigModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onConfigUpdated={() => setConfigVersion((v) => v + 1)}
        isCloudConnected={isCloudConnected}
        projectId={projectId}
      />
    </div>
  );
}

export default App;
