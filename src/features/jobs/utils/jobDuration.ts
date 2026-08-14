export const JOB_DURATION_UNITS = ['weeks', 'months', 'years'] as const;

export type JobDurationUnit = typeof JOB_DURATION_UNITS[number];

export interface JobDurationParts {
  value: string;
  unit: JobDurationUnit;
}

export const DEFAULT_JOB_DURATION_UNIT: JobDurationUnit = 'weeks';

const DURATION_PATTERN = /^\s*(\d+)(?:\s*[-–]\s*\d+)?\s*(week|weeks|month|months|year|years|tuần|tuan|tháng|thang|năm|nam)\s*$/iu;

const normalizeDurationUnit = (unit: string): JobDurationUnit | null => {
  const normalized = unit.trim().toLowerCase();
  if (['week', 'weeks', 'tuần', 'tuan'].includes(normalized)) return 'weeks';
  if (['month', 'months', 'tháng', 'thang'].includes(normalized)) return 'months';
  if (['year', 'years', 'năm', 'nam'].includes(normalized)) return 'years';
  return null;
};

export const parseJobDuration = (
  duration: string | null | undefined,
  fallbackUnit: JobDurationUnit = DEFAULT_JOB_DURATION_UNIT
): JobDurationParts => {
  if (!duration) {
    return { value: '', unit: fallbackUnit };
  }

  const match = duration.match(DURATION_PATTERN);
  if (!match) {
    return { value: '', unit: fallbackUnit };
  }

  const value = Number(match[1]);
  const unit = normalizeDurationUnit(match[2]);
  if (!Number.isInteger(value) || value <= 0 || !unit) {
    return { value: '', unit: fallbackUnit };
  }

  return { value: String(value), unit };
};

export const formatJobDuration = (value: string, unit: JobDurationUnit): string | null => {
  const durationValue = Number(value);
  if (!Number.isInteger(durationValue) || durationValue <= 0) {
    return null;
  }

  const singularUnit = unit.slice(0, -1);
  return `${durationValue} ${durationValue === 1 ? singularUnit : unit}`;
};

export const isValidJobDurationValue = (value: string): boolean => {
  if (!value.trim()) {
    return true;
  }

  const durationValue = Number(value);
  return Number.isInteger(durationValue) && durationValue > 0;
};

// Approximate conversions used only for comparing milestone totals against the
// job's estimated duration (e.g. 2 months -> 8 weeks, 1 year -> 52 weeks).
const WEEKS_PER_UNIT: Record<JobDurationUnit, number> = {
  weeks: 1,
  months: 4,
  years: 52,
};

export const durationToWeeks = (
  value: string,
  unit: JobDurationUnit = DEFAULT_JOB_DURATION_UNIT
): number => {
  const durationValue = Number(value);
  if (!Number.isInteger(durationValue) || durationValue <= 0) {
    return 0;
  }

  return durationValue * WEEKS_PER_UNIT[unit];
};

// Exact day conversions used for milestone deadline arithmetic, matching the
// backend's MilestonePlanDeadlineCalculator so both sides compute the same dates.
const DAYS_PER_UNIT: Record<JobDurationUnit, number> = {
  weeks: 7,
  months: 30,
  years: 365,
};

export const durationToDays = (
  value: string,
  unit: JobDurationUnit = DEFAULT_JOB_DURATION_UNIT
): number => {
  const durationValue = Number(value);
  if (!Number.isInteger(durationValue) || durationValue <= 0) {
    return 0;
  }

  return durationValue * DAYS_PER_UNIT[unit];
};

// Pure calendar-date math done entirely in UTC so it's unaffected by the browser's local
// timezone offset — parsing "YYYY-MM-DD" at local midnight and round-tripping through
// toISOString() would silently lose a day for any timezone ahead of UTC (e.g. Vietnam,
// UTC+7), since local midnight is still the previous evening in UTC.
export const addDaysToDateString = (dateString: string, days: number): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().split('T')[0];
};

// Chains a sequence of milestone durations into deadlines. Milestone 1 starts the day
// after `anchorDate` (job closing date, proposal's job closing date, or "today" for
// negotiations); each following milestone starts the day after the previous one's
// deadline. The start day itself counts as day 1 of a milestone's duration. Once the
// chain can no longer be computed (no anchor yet, or an unparseable duration), that
// entry and every one after it come back null.
export const computeChainedDueDates = (
  anchorDate: string | null | undefined,
  durations: Array<string | null | undefined>
): (string | null)[] => {
  let nextStart = anchorDate ? addDaysToDateString(anchorDate, 1) : null;

  return durations.map(duration => {
    const parsed = parseJobDuration(duration);
    const days = parsed.value ? durationToDays(parsed.value, parsed.unit) : 0;

    if (!nextStart || days <= 0) {
      nextStart = null;
      return null;
    }

    const dueDate = addDaysToDateString(nextStart, days - 1);
    nextStart = addDaysToDateString(dueDate, 1);
    return dueDate;
  });
};
