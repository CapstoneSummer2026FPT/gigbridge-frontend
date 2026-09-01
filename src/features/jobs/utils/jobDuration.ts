import type { JobPostMilestonePlanDto } from '../../../types/models/Job';

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

// Work items are allowed a finer duration grain (day(s)) than milestones, which stay
// week(s)+ only via JOB_DURATION_UNITS/parseJobDuration above. This is a deliberately
// separate parser, mirroring the backend's split between MilestoneDeadlineCalculator's
// TryParseDurationDays (milestones) and TryParseWorkItemDurationDays (work items).
type WorkItemDurationUnit = 'days' | JobDurationUnit;

const WORK_ITEM_DURATION_PATTERN = /^\s*(\d+)\s*(day|days|ngày|ngay|week|weeks|month|months|year|years|tuần|tuan|tháng|thang|năm|nam)\s*$/iu;

const WORK_ITEM_DAYS_PER_UNIT: Record<WorkItemDurationUnit, number> = {
  days: 1,
  weeks: 7,
  months: 30,
  years: 365,
};

const normalizeWorkItemDurationUnit = (unit: string): WorkItemDurationUnit | null => {
  const normalized = unit.trim().toLowerCase();
  if (['day', 'days', 'ngày', 'ngay'].includes(normalized)) return 'days';
  if (['week', 'weeks', 'tuần', 'tuan'].includes(normalized)) return 'weeks';
  if (['month', 'months', 'tháng', 'thang'].includes(normalized)) return 'months';
  if (['year', 'years', 'năm', 'nam'].includes(normalized)) return 'years';
  return null;
};

export const parseWorkItemDuration = (
  duration: string | null | undefined
): { value: string; unit: WorkItemDurationUnit } | null => {
  if (!duration) return null;

  const match = duration.match(WORK_ITEM_DURATION_PATTERN);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = normalizeWorkItemDurationUnit(match[2]);
  if (!Number.isInteger(value) || value <= 0 || !unit) return null;

  return { value: String(value), unit };
};

export const workItemDurationToDays = (duration: string | null | undefined): number => {
  const parsed = parseWorkItemDuration(duration);
  return parsed ? Number(parsed.value) * WORK_ITEM_DAYS_PER_UNIT[parsed.unit] : 0;
};

export interface WorkItemDurationSummary {
  milestoneDays: number;
  totalWorkItemDays: number;
  remainingDays: number;
  overageDays: number;
}

// Mirrors the backend's TryGetWorkItemDurationOverage: an unset/unparseable milestone
// duration is a safe no-op (never reported as an overage), and work items contribute 0
// days when their own duration is blank/unparseable.
export const computeWorkItemDurationSummary = (
  milestone: Pick<JobPostMilestonePlanDto, 'estimatedDuration' | 'workItems'>
): WorkItemDurationSummary => {
  const milestoneParts = parseJobDuration(milestone.estimatedDuration);
  const milestoneDays = milestoneParts.value ? durationToDays(milestoneParts.value, milestoneParts.unit) : 0;
  const totalWorkItemDays = (milestone.workItems || []).reduce(
    (sum, item) => sum + workItemDurationToDays(item.estimatedDuration),
    0
  );
  const overageDays = milestoneDays > 0 ? Math.max(0, totalWorkItemDays - milestoneDays) : 0;
  const remainingDays = Math.max(0, milestoneDays - totalWorkItemDays);

  return { milestoneDays, totalWorkItemDays, remainingDays, overageDays };
};
