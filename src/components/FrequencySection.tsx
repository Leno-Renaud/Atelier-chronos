import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  type Task,
  type TaskFrequency,
  FREQUENCY_CONFIG,
} from '../types/task';
import { TaskCard } from './TaskCard';

interface FrequencySectionProps {
  frequency: TaskFrequency;
  tasks: Task[];
  isExpanded: boolean;
  onToggleExpand: (frequency: TaskFrequency) => void;
  onToggleDoneToday: (task: Task) => void;
  onToggleNotification: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const FrequencySection: React.FC<FrequencySectionProps> = ({
  frequency,
  tasks,
  isExpanded,
  onToggleExpand,
  onToggleDoneToday,
  onToggleNotification,
  onEditTask,
  onDeleteTask,
}) => {
  const meta = FREQUENCY_CONFIG[frequency];

  return (
    <section
      aria-label={meta.label}
      className="rounded-[18px] p-2.5 sleek-card transition-all duration-200"
    >
      <button
        type="button"
        onClick={() => onToggleExpand(frequency)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-left transition-colors duration-150 hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: meta.accentHex,
              boxShadow: `0 0 8px ${meta.accentHex}`,
            }}
          />
          <h3 className="font-display text-base font-semibold tracking-tight text-zinc-100">
            {meta.label}
          </h3>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums ${meta.badgeClass}`}
          >
            {tasks.length}
          </span>
        </div>

        <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-white/[0.04] text-zinc-400 ring-1 ring-white/[0.06]">
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ease-out-expo ${
              isExpanded ? 'rotate-180 text-zinc-200' : 'rotate-0'
            }`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-1.5">
          {tasks.length === 0 ? (
            <div className="rounded-[12px] bg-white/[0.015] px-4 py-4 text-center text-xs text-zinc-500">
              Aucune tâche
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleDoneToday={onToggleDoneToday}
                onToggleNotification={onToggleNotification}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
};
