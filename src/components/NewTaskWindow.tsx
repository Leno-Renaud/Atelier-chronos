import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  ChevronDown,
  Clock,
  CalendarDays,
  Repeat,
  Check,
  X,
} from 'lucide-react';
import {
  type Task,
  type TaskFrequency,
  FREQUENCY_CONFIG,
  FREQUENCY_ORDER,
  DAYS_OF_WEEK,
  formatSelectedDays,
} from '../types/task';

interface NewTaskWindowProps {
  editingTask: Task | null;
  onCancelEdit: () => void;
  onSaveTask: (taskData: {
    id?: string;
    title: string;
    frequency: TaskFrequency;
    daysOfWeek: number[];
    dayOfMonth?: number;
    time: string;
  }) => Promise<void>;
}

type ActiveDropdown = 'frequency' | 'days' | 'time' | null;

export const NewTaskWindow: React.FC<NewTaskWindowProps> = ({
  editingTask,
  onCancelEdit,
  onSaveTask,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('');
  const [frequency, setFrequency] = useState<TaskFrequency>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [hours, setHours] = useState<string>('08');
  const [minutes, setMinutes] = useState<string>('00');
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTask) {
      setIsOpen(true);
      setTitle(editingTask.title);
      setFrequency(editingTask.frequency);
      setDaysOfWeek(
        editingTask.daysOfWeek && editingTask.daysOfWeek.length > 0
          ? editingTask.daysOfWeek
          : [1, 2, 3, 4, 5, 6, 7]
      );
      setDayOfMonth(editingTask.dayOfMonth ?? 1);
      const [h, m] = (editingTask.time || '08:00').split(':');
      setHours((h || '08').padStart(2, '0'));
      setMinutes((m || '00').padStart(2, '0'));
      setActiveDropdown(null);
      setErrorMsg(null);
      setTimeout(() => {
        titleInputRef.current?.focus();
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }
  }, [editingTask]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFrequencySelect = (nextFreq: TaskFrequency) => {
    setFrequency(nextFreq);
    if (nextFreq === 'daily' && daysOfWeek.length === 0) {
      setDaysOfWeek([1, 2, 3, 4, 5, 6, 7]);
    } else if ((nextFreq === 'weekly' || nextFreq === 'biweekly') && daysOfWeek.length === 7) {
      setDaysOfWeek([1]);
    }
    setActiveDropdown('days');
  };

  const toggleDayOfWeek = (dayId: number) => {
    setDaysOfWeek((prev) => {
      if (prev.includes(dayId)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== dayId);
      }
      return [...prev, dayId].sort((a, b) => a - b);
    });
  };

  const handleHourInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 2);
    if (!digits) {
      setHours('00');
      return;
    }
    const num = Math.min(23, Math.max(0, Number.parseInt(digits, 10)));
    setHours(String(num).padStart(2, '0'));
  };

  const handleMinuteInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 2);
    if (!digits) {
      setMinutes('00');
      return;
    }
    const num = Math.min(59, Math.max(0, Number.parseInt(digits, 10)));
    setMinutes(String(num).padStart(2, '0'));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setErrorMsg('Saisissez un intitulé de tâche.');
      titleInputRef.current?.focus();
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      await onSaveTask({
        id: editingTask?.id,
        title: trimmed,
        frequency,
        daysOfWeek: frequency === 'monthly' ? [] : daysOfWeek,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
        time: formattedTime,
      });

      setTitle('');
      setActiveDropdown(null);
      if (editingTask) {
        onCancelEdit();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlusClick = () => {
    if (!isOpen) {
      setIsOpen(true);
      setTimeout(() => titleInputRef.current?.focus(), 80);
      return;
    }
    if (title.trim()) {
      void handleSubmit();
    } else {
      titleInputRef.current?.focus();
    }
  };

  const currentFreqMeta = FREQUENCY_CONFIG[frequency];

  const daysSummaryLabel =
    frequency === 'monthly'
      ? dayOfMonth === 1
        ? '1er du mois'
        : `Le ${dayOfMonth}`
      : formatSelectedDays(daysOfWeek);

  const ALL_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const ALL_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const ALL_MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <section
      ref={containerRef}
      aria-label="Nouvelle tâche"
      className="relative z-40 mb-6 rounded-[20px] p-3.5 sleek-card"
    >
      {/* En-tête épuré avec bouton + */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="flex flex-1 items-center gap-2.5 text-left focus:outline-none"
        >
          <span
            className="h-2.5 w-2.5 rounded-full transition-colors duration-200"
            style={{
              backgroundColor: currentFreqMeta.accentHex,
              boxShadow: `0 0 10px ${currentFreqMeta.accentHex}`,
            }}
          />
          <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">
            {editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h2>
        </button>

        <div className="flex items-center gap-2">
          {editingTask && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="flex h-9 items-center gap-1 rounded-[10px] bg-white/[0.06] px-3 text-xs font-medium text-zinc-300 transition-all duration-150 hover:bg-white/[0.1] hover:text-white active:scale-[0.97]"
            >
              <X className="h-3.5 w-3.5" />
              <span>Annuler</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveDropdown(null);
              setIsOpen((prev) => !prev);
            }}
            aria-label={isOpen ? 'Replier' : 'Déplier'}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/[0.04] text-zinc-400 ring-1 ring-white/[0.06] transition-all duration-150 hover:bg-white/[0.08] hover:text-zinc-200 active:scale-[0.97]"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ease-out-expo ${
                isOpen ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </button>

          {/* Bouton + dans la fenêtre Nouvelle tâche */}
          <button
            type="button"
            onClick={handlePlusClick}
            disabled={isSubmitting}
            className="group flex h-9 items-center gap-1.5 rounded-[10px] bg-indigo-500 px-3.5 font-sans text-xs font-semibold text-white shadow-[0_0_20px_-4px_rgba(99,102,241,0.65),inset_0_1px_0_0_rgba(255,255,255,0.25)] transition-all duration-150 hover:bg-indigo-400 active:scale-[0.97] disabled:opacity-50"
          >
            <Plus className="h-4 w-4 stroke-[2.5] transition-transform duration-200 ease-out-expo group-hover:rotate-90" />
            <span>{editingTask ? 'Enregistrer' : 'Créer'}</span>
          </button>
        </div>
      </div>

      {/* Formulaire — sans overflow:hidden pour que les dropdowns s'affichent par-dessus tout */}
      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-3.5 space-y-2.5">
          <div className="relative">
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Intitulé de la tâche..."
              className="w-full rounded-[12px] bg-[#0B0B0E] px-3.5 py-3 pr-9 text-sm text-zinc-100 placeholder:text-zinc-500 ring-1 ring-white/[0.07] transition-all duration-150 focus:bg-[#0E0E12] focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
            {title && (
              <button
                type="button"
                onClick={() => setTitle('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-300"
                aria-label="Effacer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {errorMsg && (
            <p className="rounded-[10px] bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 ring-1 ring-rose-500/25">
              {errorMsg}
            </p>
          )}

          {/* Les 3 Dropdowns */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {/* 1. Fréquence */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown((prev) => (prev === 'frequency' ? null : 'frequency'))
                }
                aria-expanded={activeDropdown === 'frequency'}
                className={`flex w-full items-center justify-between rounded-[12px] px-3.5 py-2.5 text-left transition-all duration-150 ${
                  activeDropdown === 'frequency'
                    ? 'bg-[#18181F] ring-2 ring-indigo-500/60'
                    : 'bg-[#121217] ring-1 ring-white/[0.06] hover:bg-[#16161C]'
                }`}
              >
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                    <Repeat className="h-3 w-3 text-indigo-400" />
                    Fréquence
                  </span>
                  <div className="mt-0.5 flex items-center gap-2 truncate text-sm font-semibold text-zinc-100">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: currentFreqMeta.accentHex }}
                    />
                    <span className="truncate">{currentFreqMeta.label}</span>
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ease-out-expo ${
                    activeDropdown === 'frequency' ? 'rotate-180 text-indigo-400' : ''
                  }`}
                />
              </button>

              {activeDropdown === 'frequency' && (
                <div className="animate-popover absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-[14px] p-1.5 sleek-popover">
                  {FREQUENCY_ORDER.map((freqKey) => {
                    const meta = FREQUENCY_CONFIG[freqKey];
                    const isSelected = frequency === freqKey;
                    return (
                      <button
                        key={freqKey}
                        type="button"
                        onClick={() => handleFrequencySelect(freqKey)}
                        className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-sm transition-colors duration-120 ${
                          isSelected
                            ? 'bg-white/[0.09] font-semibold text-white'
                            : 'font-medium text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: meta.accentHex }}
                          />
                          <span>{meta.label}</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Jours concernés */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => (prev === 'days' ? null : 'days'))}
                aria-expanded={activeDropdown === 'days'}
                className={`flex w-full items-center justify-between rounded-[12px] px-3.5 py-2.5 text-left transition-all duration-150 ${
                  activeDropdown === 'days'
                    ? 'bg-[#18181F] ring-2 ring-indigo-500/60'
                    : 'bg-[#121217] ring-1 ring-white/[0.06] hover:bg-[#16161C]'
                }`}
              >
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                    <CalendarDays className="h-3 w-3 text-emerald-400" />
                    Jours
                  </span>
                  <div className="mt-0.5 truncate text-sm font-semibold text-zinc-100">
                    {daysSummaryLabel}
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ease-out-expo ${
                    activeDropdown === 'days' ? 'rotate-180 text-emerald-400' : ''
                  }`}
                />
              </button>

              {activeDropdown === 'days' && (
                <div className="animate-popover absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-[14px] p-3 sleek-popover sm:min-w-[270px]">
                  {frequency === 'monthly' ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                        <span>Jour du mois</span>
                        <span className="font-mono font-semibold text-rose-300 tabular-nums">
                          {dayOfMonth}
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {ALL_MONTH_DAYS.map((d) => {
                          const active = dayOfMonth === d;
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                setDayOfMonth(d);
                                setActiveDropdown('time');
                              }}
                              className={`flex h-8 items-center justify-center rounded-[8px] font-mono text-xs tabular-nums transition-all duration-120 active:scale-[0.95] ${
                                active
                                  ? 'bg-rose-500 font-semibold text-white'
                                  : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.1]'
                              }`}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDaysOfWeek([1, 2, 3, 4, 5, 6, 7])}
                          className="rounded-[7px] bg-white/[0.06] px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.12] hover:text-white"
                        >
                          Tous
                        </button>
                        <button
                          type="button"
                          onClick={() => setDaysOfWeek([1, 2, 3, 4, 5])}
                          className="rounded-[7px] bg-white/[0.06] px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.12] hover:text-white"
                        >
                          Lun–Ven
                        </button>
                        <button
                          type="button"
                          onClick={() => setDaysOfWeek([6, 7])}
                          className="rounded-[7px] bg-white/[0.06] px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.12] hover:text-white"
                        >
                          Week-end
                        </button>
                      </div>

                      <div className="space-y-1">
                        {DAYS_OF_WEEK.map((day) => {
                          const isChecked = daysOfWeek.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => toggleDayOfWeek(day.id)}
                              className={`flex w-full items-center justify-between rounded-[9px] px-3 py-2 text-left text-xs transition-colors duration-120 ${
                                isChecked
                                  ? 'bg-emerald-500/15 font-semibold text-white ring-1 ring-emerald-400/30'
                                  : 'font-medium text-zinc-300 hover:bg-white/[0.05]'
                              }`}
                            >
                              <span>{day.full}</span>
                              <span
                                className={`flex h-4 w-4 items-center justify-center rounded-[5px] transition-colors ${
                                  isChecked
                                    ? 'bg-emerald-400 text-zinc-950'
                                    : 'bg-white/[0.06] ring-1 ring-white/15'
                                }`}
                              >
                                {isChecked && <Check className="h-3 w-3 stroke-[2.5]" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Heure (HH.MM) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => (prev === 'time' ? null : 'time'))}
                aria-expanded={activeDropdown === 'time'}
                className={`flex w-full items-center justify-between rounded-[12px] px-3.5 py-2.5 text-left transition-all duration-150 ${
                  activeDropdown === 'time'
                    ? 'bg-[#18181F] ring-2 ring-indigo-500/60'
                    : 'bg-[#121217] ring-1 ring-white/[0.06] hover:bg-[#16161C]'
                }`}
              >
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                    <Clock className="h-3 w-3 text-sky-400" />
                    Heure
                  </span>
                  <div className="mt-0.5 font-mono text-sm font-semibold tracking-wider text-zinc-100 tabular-nums">
                    {hours}.{minutes}
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ease-out-expo ${
                    activeDropdown === 'time' ? 'rotate-180 text-sky-400' : ''
                  }`}
                />
              </button>

              {activeDropdown === 'time' && (
                <div className="animate-popover absolute right-0 left-0 sm:left-auto sm:w-[260px] top-[calc(100%+6px)] z-50 rounded-[14px] p-3 sleek-popover">
                  {/* Saisie directe HH . MM */}
                  <div className="mb-2.5 flex items-center justify-center gap-2 rounded-[10px] bg-[#0B0B0E] p-2 ring-1 ring-white/[0.07]">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={hours}
                      onChange={(e) => handleHourInput(e.target.value)}
                      aria-label="Heures"
                      className="w-14 rounded-[8px] bg-[#16161D] py-1 text-center font-mono text-base font-semibold text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                    />
                    <span className="font-mono text-lg font-bold text-indigo-400">.</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={minutes}
                      onChange={(e) => handleMinuteInput(e.target.value)}
                      aria-label="Minutes"
                      className="w-14 rounded-[8px] bg-[#16161D] py-1 text-center font-mono text-base font-semibold text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                    />
                  </div>

                  {/* Rouleaux 00-23 et 00-59 */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="max-h-36 overflow-y-auto rounded-[8px] bg-[#0B0B0E] p-1 ring-1 ring-white/[0.05]">
                      {ALL_HOURS.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHours(h)}
                          className={`flex w-full items-center justify-center rounded-[6px] py-1 font-mono text-xs tabular-nums transition-colors ${
                            hours === h
                              ? 'bg-indigo-500 font-semibold text-white'
                              : 'text-zinc-300 hover:bg-white/[0.06]'
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>

                    <div className="max-h-36 overflow-y-auto rounded-[8px] bg-[#0B0B0E] p-1 ring-1 ring-white/[0.05]">
                      {ALL_MINUTES.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMinutes(m)}
                          className={`flex w-full items-center justify-center rounded-[6px] py-1 font-mono text-xs tabular-nums transition-colors ${
                            minutes === m
                              ? 'bg-sky-500 font-semibold text-white'
                              : 'text-zinc-300 hover:bg-white/[0.06]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </section>
  );
};
