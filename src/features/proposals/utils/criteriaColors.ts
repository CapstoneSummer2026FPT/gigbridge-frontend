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
    bgMark: 'bg-emerald-500/15 dark:bg-emerald-500/25',
    borderMark: 'border-emerald-500',
    textMark: 'text-text-primary',
    pillBg: 'bg-emerald-600 dark:bg-emerald-500',
    cardBg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
    cardBorder: 'border-emerald-500/30 dark:border-emerald-500/40',
    cardText: 'text-emerald-700 dark:text-emerald-400',
  },
  {
    name: 'violet',
    bgMark: 'bg-violet-500/15 dark:bg-violet-500/25',
    borderMark: 'border-violet-500',
    textMark: 'text-text-primary',
    pillBg: 'bg-violet-600 dark:bg-violet-500',
    cardBg: 'bg-violet-500/5 dark:bg-violet-500/10',
    cardBorder: 'border-violet-500/30 dark:border-violet-500/40',
    cardText: 'text-violet-700 dark:text-violet-400',
  },
  {
    name: 'sky',
    bgMark: 'bg-sky-500/15 dark:bg-sky-500/25',
    borderMark: 'border-sky-500',
    textMark: 'text-text-primary',
    pillBg: 'bg-sky-600 dark:bg-sky-500',
    cardBg: 'bg-sky-500/5 dark:bg-sky-500/10',
    cardBorder: 'border-sky-500/30 dark:border-sky-500/40',
    cardText: 'text-sky-700 dark:text-sky-400',
  },
  {
    name: 'amber',
    bgMark: 'bg-amber-500/15 dark:bg-amber-500/25',
    borderMark: 'border-amber-500',
    textMark: 'text-text-primary',
    pillBg: 'bg-amber-600 dark:bg-amber-500',
    cardBg: 'bg-amber-500/5 dark:bg-amber-500/10',
    cardBorder: 'border-amber-500/30 dark:border-amber-500/40',
    cardText: 'text-amber-700 dark:text-amber-400',
  },
  {
    name: 'rose',
    bgMark: 'bg-rose-500/15 dark:bg-rose-500/25',
    borderMark: 'border-rose-500',
    textMark: 'text-text-primary',
    pillBg: 'bg-rose-600 dark:bg-rose-500',
    cardBg: 'bg-rose-500/5 dark:bg-rose-500/10',
    cardBorder: 'border-rose-500/30 dark:border-rose-500/40',
    cardText: 'text-rose-700 dark:text-rose-400',
  },
  {
    name: 'indigo',
    bgMark: 'bg-indigo-500/15 dark:bg-indigo-500/25',
    borderMark: 'border-indigo-500',
    textMark: 'text-text-primary',
    pillBg: 'bg-indigo-600 dark:bg-indigo-500',
    cardBg: 'bg-indigo-500/5 dark:bg-indigo-500/10',
    cardBorder: 'border-indigo-500/30 dark:border-indigo-500/40',
    cardText: 'text-indigo-700 dark:text-indigo-400',
  },
  {
    name: 'teal',
    bgMark: 'bg-teal-500/15 dark:bg-teal-500/25',
    borderMark: 'border-teal-500',
    textMark: 'text-text-primary',
    pillBg: 'bg-teal-600 dark:bg-teal-500',
    cardBg: 'bg-teal-500/5 dark:bg-teal-500/10',
    cardBorder: 'border-teal-500/30 dark:border-teal-500/40',
    cardText: 'text-teal-700 dark:text-teal-400',
  },
];

export const getCriteriaColorTheme = (index: number): CriteriaColorTheme => {
  const safeIdx = Math.max(0, index);
  return CRITERIA_COLOR_PALETTE[safeIdx % CRITERIA_COLOR_PALETTE.length];
};
