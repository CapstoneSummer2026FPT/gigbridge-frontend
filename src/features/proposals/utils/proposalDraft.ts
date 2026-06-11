import type { CreateProposalRequest } from '../../../types/models/Proposal';

export type DurationUnit = 'day' | 'week' | 'month' | 'year';

export type ProposalFormState = {
  coverLetter: string;
  proposedRate: string;
  durationValue: string;
  durationUnit: DurationUnit;
};

export type ProposalAnswerFlowState = {
  jobPostId: string;
  proposalId?: string;
  form: ProposalFormState;
};

export const durationUnits: DurationUnit[] = ['day', 'week', 'month', 'year'];

export const buildProposedDuration = (value: string, unit: DurationUnit) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return '';
  }

  const normalizedUnit = amount === 1 ? unit : `${unit}s`;
  return `${amount} ${normalizedUnit}`;
};

export const parseProposedDuration = (
  duration?: string | null
): Pick<ProposalFormState, 'durationValue' | 'durationUnit'> => {
  if (!duration) {
    return { durationValue: '', durationUnit: 'week' };
  }

  const match = duration
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s+(day|days|week|weeks|month|months|year|years)$/i);

  if (!match) {
    return { durationValue: '', durationUnit: 'week' };
  }

  const rawUnit = match[2].toLowerCase();

  const durationUnit: DurationUnit = rawUnit.startsWith('day')
    ? 'day'
    : rawUnit.startsWith('month')
      ? 'month'
      : rawUnit.startsWith('year')
        ? 'year'
        : 'week';

  return {
    durationValue: match[1],
    durationUnit,
  };
};

export const buildProposalPayload = (
  jobPostId: string,
  form: ProposalFormState
): CreateProposalRequest => ({
  jobPostsId: jobPostId,
  coverLetter: form.coverLetter.trim() || null,
  proposedBudget: Number(form.proposedRate),
  proposedDuration: buildProposedDuration(form.durationValue, form.durationUnit) || null,
});