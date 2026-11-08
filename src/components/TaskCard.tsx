import React, { useState } from 'react';
import {
  Check,
  Bell,
  BellOff,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  type Task,
  FREQUENCY_CONFIG,
  formatTaskScheduleSummary,
  formatDateISO,
} from '../types/task';

interface TaskCardProps {
  task: Task;
  onToggleDoneToday: (task: Task) => void;
  onToggleNotification: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleDoneToday,
  onToggleNotification,
  onEdit,
  onDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const todayISO = formatDateISO(new Date());
  const isCompletedToday = task.completedDates.includes(todayISO);
  const meta = FREQUENCY_CONFIG[task.frequency];
  const scheduleLabel = formatTaskScheduleSummary(task);
  const displayTime = task.time.replace(':', '.');

  return (
    <article
      className={`group relative flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-2.5 transition-all duration-150 ${
        isCompletedToday
          ? 'bg-white/[0.01] opacity-55'
          : 'sleek-task-row'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={() => onToggleDoneToday(task)}
          aria-label={isCompletedToday ? 'Décocher' : 'Cocher'}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] transition-all duration-150 active:scale-[0.92] ${
            isCompletedToday
              ? 'bg-indigo-500 text-white'
              : 'bg-[#0B0B0E] ring-1 ring-white/20 hover:ring-indigo-400'
          }`}
        >
          {isCompletedToday && <Check className="h-3.5 w-3.5 stroke-[2.8]" />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-medium transition-colors ${
              isCompletedToday ? 'text-zinc-500 line-through' : 'text-zinc-100'
            }`}
          >
            {task.title}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-400">
            <span
              className="font-mono font-semibold tabular-nums"
              style={{ color: meta.accentHex }}
            >
              {displayTime}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="truncate">{scheduleLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onToggleNotification(task)}
          aria-label="Notification"
          className={`flex h-7 w-7 items-center justify-center rounded-[8px] transition-all duration-150 active:scale-[0.95] ${
            task.enabled
              ? 'text-zinc-300 hover:bg-white/[0.08] hover:text-white'
              : 'text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-400'
          }`}
        >
          {task.enabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label="Modifier"
          className="flex h-7 w-7 items-center justify-center rounded-[8px] text-zinc-400 transition-all duration-150 hover:bg-white/[0.08] hover:text-white active:scale-[0.95]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="h-7 rounded-[8px] bg-rose-500 px-2 text-[11px] font-semibold text-white hover:bg-rose-400 active:scale-[0.95]"
            >
              Suppr.
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="h-7 rounded-[8px] bg-white/[0.08] px-2 text-[11px] text-zinc-300 hover:bg-white/[0.14]"
            >
              Non
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Supprimer"
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-zinc-400 transition-all duration-150 hover:bg-rose-500/15 hover:text-rose-400 active:scale-[0.95]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </article>
  );
};
