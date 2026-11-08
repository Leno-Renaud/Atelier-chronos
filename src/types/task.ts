export type TaskFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface Task {
  id: string;
  title: string;
  frequency: TaskFrequency;
  daysOfWeek: number[];
  dayOfMonth?: number;
  biweeklyAnchor?: string;
  time: string;
  enabled: boolean;
  completedDates: string[];
  createdAt: number;
  updatedAt: number;
}

export interface FrequencyMeta {
  id: TaskFrequency;
  label: string;
  accentHex: string;
  badgeClass: string;
}

export const FREQUENCY_CONFIG: Record<TaskFrequency, FrequencyMeta> = {
  daily: {
    id: 'daily',
    label: 'Journalier',
    accentHex: '#818CF8',
    badgeClass: 'text-indigo-300 bg-indigo-500/15 ring-1 ring-indigo-400/25',
  },
  weekly: {
    id: 'weekly',
    label: 'Semaine',
    accentHex: '#34D399',
    badgeClass: 'text-emerald-300 bg-emerald-500/15 ring-1 ring-emerald-400/25',
  },
  biweekly: {
    id: 'biweekly',
    label: '2 semaines',
    accentHex: '#38BDF8',
    badgeClass: 'text-sky-300 bg-sky-500/15 ring-1 ring-sky-400/25',
  },
  monthly: {
    id: 'monthly',
    label: 'Mois',
    accentHex: '#FB7185',
    badgeClass: 'text-rose-300 bg-rose-500/15 ring-1 ring-rose-400/25',
  },
};

export const FREQUENCY_ORDER: TaskFrequency[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
];

export const DAYS_OF_WEEK = [
  { id: 1, short: 'Lun', full: 'Lundi' },
  { id: 2, short: 'Mar', full: 'Mardi' },
  { id: 3, short: 'Mer', full: 'Mercredi' },
  { id: 4, short: 'Jeu', full: 'Jeudi' },
  { id: 5, short: 'Ven', full: 'Vendredi' },
  { id: 6, short: 'Sam', full: 'Samedi' },
  { id: 7, short: 'Dim', full: 'Dimanche' },
] as const;

export function getMondayOfCurrentWeek(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatDateISO(d);
}

export function formatDateISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTaskScheduleSummary(task: Task): string {
  if (task.frequency === 'daily') {
    if (task.daysOfWeek.length === 7 || task.daysOfWeek.length === 0) {
      return 'Tous les jours';
    }
    return formatSelectedDays(task.daysOfWeek);
  }
  if (task.frequency === 'weekly' || task.frequency === 'biweekly') {
    return formatSelectedDays(task.daysOfWeek);
  }
  if (task.frequency === 'monthly') {
    const day = task.dayOfMonth ?? 1;
    return day === 1 ? 'Le 1er du mois' : `Le ${day} du mois`;
  }
  return '';
}

export function formatSelectedDays(days: number[]): string {
  if (!days || days.length === 0) return 'Aucun jour';
  if (days.length === 7) return 'Tous les jours';
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 5 && sorted[0] === 1 && sorted[4] === 5) {
    return 'Lun – Ven';
  }
  return sorted
    .map((id) => DAYS_OF_WEEK.find((d) => d.id === id)?.short ?? '')
    .filter(Boolean)
    .join(', ');
}
