export interface CriteriaColorTheme {
  name: string;
  bgMark: string;
  borderMark: string;
  textMark: string;
  pillBg: string;
  cardBg: string;
  cardBorder: string;
  cardText: string;
}

export const CRITERIA_COLOR_PALETTE: CriteriaColorTheme[] = [
  {
    name: 'emerald',
    bgMark: 'bg-emerald-500/25 dark:bg-emerald-500/35',
    borderMark: 'border-emerald-500',
    textMark: 'text-emerald-950 dark:text-emerald-100',
    pillBg: 'bg-emerald-600',
    cardBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    cardBorder: 'border-emerald-500/30',
    cardText: 'text-emerald-800 dark:text-emerald-300',
  },
  {
    name: 'sky',
    bgMark: 'bg-sky-500/25 dark:bg-sky-500/35',
    borderMark: 'border-sky-500',
    textMark: 'text-sky-950 dark:text-sky-100',
    pillBg: 'bg-sky-600',
    cardBg: 'bg-sky-500/10 dark:bg-sky-500/15',
    cardBorder: 'border-sky-500/30',
    cardText: 'text-sky-800 dark:text-sky-300',
  },
  {
    name: 'violet',
    bgMark: 'bg-violet-500/25 dark:bg-violet-500/35',
    borderMark: 'border-violet-500',
    textMark: 'text-violet-950 dark:text-violet-100',
    pillBg: 'bg-violet-600',
    cardBg: 'bg-violet-500/10 dark:bg-violet-500/15',
    cardBorder: 'border-violet-500/30',
    cardText: 'text-violet-800 dark:text-violet-300',
  },
  {
    name: 'amber',
    bgMark: 'bg-amber-500/25 dark:bg-amber-500/35',
    borderMark: 'border-amber-500',
    textMark: 'text-amber-950 dark:text-amber-100',
    pillBg: 'bg-amber-600',
    cardBg: 'bg-amber-500/10 dark:bg-amber-500/15',
    cardBorder: 'border-amber-500/30',
    cardText: 'text-amber-800 dark:text-amber-300',
  },
  {
    name: 'rose',
    bgMark: 'bg-rose-500/25 dark:bg-rose-500/35',
    borderMark: 'border-rose-500',
    textMark: 'text-rose-950 dark:text-rose-100',
    pillBg: 'bg-rose-600',
    cardBg: 'bg-rose-500/10 dark:bg-rose-500/15',
    cardBorder: 'border-rose-500/30',
    cardText: 'text-rose-800 dark:text-rose-300',
  },
  {
    name: 'indigo',
    bgMark: 'bg-indigo-500/25 dark:bg-indigo-500/35',
    borderMark: 'border-indigo-500',
    textMark: 'text-indigo-950 dark:text-indigo-100',
    pillBg: 'bg-indigo-600',
    cardBg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    cardBorder: 'border-indigo-500/30',
    cardText: 'text-indigo-800 dark:text-indigo-300',
  },
  {
    name: 'teal',
    bgMark: 'bg-teal-500/25 dark:bg-teal-500/35',
    borderMark: 'border-teal-500',
    textMark: 'text-teal-950 dark:text-teal-100',
    pillBg: 'bg-teal-600',
    cardBg: 'bg-teal-500/10 dark:bg-teal-500/15',
    cardBorder: 'border-teal-500/30',
    cardText: 'text-teal-800 dark:text-teal-300',
  },
];

export const getCriteriaColorTheme = (index: number): CriteriaColorTheme => {
  const safeIdx = Math.max(0, index);
  return CRITERIA_COLOR_PALETTE[safeIdx % CRITERIA_COLOR_PALETTE.length];
};
