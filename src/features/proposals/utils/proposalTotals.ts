export const PROPOSAL_DURATION_UNITS = ['days', 'weeks', 'months', 'years'] as const;
export const MILESTONE_DURATION_UNITS = ['weeks', 'months', 'years'] as const;

export type ProposalDurationUnit = typeof PROPOSAL_DURATION_UNITS[number];

export interface ProposalDurationParts {
  amount: number;
  unit: ProposalDurationUnit;
}

const UNIT_DAYS: Record<ProposalDurationUnit, number> = {
  days: 1,
  weeks: 7,
  months: 30,
  years: 365,
};

const UNIT_RANK: Record<ProposalDurationUnit, number> = {
  days: 0,
  weeks: 1,
  months: 2,
  years: 3,
};

const DURATION_PATTERN = /^\s*(\d+)\s*(day|days|week|weeks|month|months|year|years)\s*$/i;

const normalizeUnit = (value: string): ProposalDurationUnit => {
  const unit = value.toLowerCase();
  if (unit === 'day' || unit === 'days') return 'days';
  if (unit === 'week' || unit === 'weeks') return 'weeks';
  if (unit === 'month' || unit === 'months') return 'months';
  return 'years';
};

export const parseProposalDuration = (value?: string | null): ProposalDurationParts | null => {
  const match = value?.match(DURATION_PATTERN);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isInteger(amount) || amount <= 0) return null;

  return { amount, unit: normalizeUnit(match[2]) };
};

export const formatProposalDuration = (amount: number, unit: ProposalDurationUnit): string => {
  const singular = unit.slice(0, -1);
  return `${amount} ${amount === 1 ? singular : unit}`;
};

export const calculateProposalDuration = (
  durations: Array<string | null | undefined>
): string | null => {
  const parsed = durations
    .map(parseProposalDuration)
    .filter((item): item is ProposalDurationParts => item !== null);

  if (parsed.length === 0) return null;

  const outputUnit = parsed.reduce<ProposalDurationUnit>(
    (highest, item) => UNIT_RANK[item.unit] > UNIT_RANK[highest] ? item.unit : highest,
    'days'
  );
  const totalDays = parsed.reduce((total, item) => total + item.amount * UNIT_DAYS[item.unit], 0);
  const roundedAmount = Math.ceil(totalDays / UNIT_DAYS[outputUnit]);

  return formatProposalDuration(roundedAmount, outputUnit);
};

export const proposalDurationsEqual = (left?: string | null, right?: string | null): boolean => {
  const parsedLeft = parseProposalDuration(left);
  const parsedRight = parseProposalDuration(right);
  if (!parsedLeft || !parsedRight) return !parsedLeft && !parsedRight;

  return parsedLeft.amount * UNIT_DAYS[parsedLeft.unit] === parsedRight.amount * UNIT_DAYS[parsedRight.unit];
};

export const roundProposalAmount = (value: number): number =>
  Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

export const calculateProposalBudget = (amounts: Array<number | null | undefined>): number =>
  roundProposalAmount(amounts.reduce<number>((total, amount) => total + (Number(amount) || 0), 0));

