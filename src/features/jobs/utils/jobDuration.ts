export const JOB_DURATION_UNITS = ['weeks', 'months', 'years'] as const;

export type JobDurationUnit = typeof JOB_DURATION_UNITS[number];

export interface JobDurationParts {
  value: string;
  unit: JobDurationUnit;
}

export const DEFAULT_JOB_DURATION_UNIT: JobDurationUnit = 'weeks';

const DURATION_PATTERN = /^\s*(\d+)(?:\s*[-–]\s*\d+)?\s*(week|weeks|month|months|year|years)\s*$/i;

const normalizeDurationUnit = (unit: string): JobDurationUnit | null => {
  const normalized = unit.trim().toLowerCase();
  if (normalized === 'week' || normalized === 'weeks') return 'weeks';
  if (normalized === 'month' || normalized === 'months') return 'months';
  if (normalized === 'year' || normalized === 'years') return 'years';
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
