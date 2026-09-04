import { JobPostStatus, JobPostVisibility, type Job } from '../../../types/models/Job';

export type JobPostStatusValue = JobPostStatus | Job['status'] | number | string | null | undefined;

const normalizeVisibility = (visibility: number | null | undefined): number => (
  visibility ?? JobPostVisibility.Public
);

export const isDraftJobPostStatus = (status: JobPostStatusValue): boolean => (
  status === JobPostStatus.Draft || status === '0' || status === 'draft'
);

export const canEditJobPostContent = (
  status: JobPostStatusValue,
  visibility: number | null | undefined,
): boolean => {
  const normalizedVisibility = normalizeVisibility(visibility);

  if (normalizedVisibility === 3) return false;

  return isDraftJobPostStatus(status);
};

export const getAllowedJobPostVisibilities = (
  status: JobPostStatusValue,
  visibility: number | null | undefined,
): readonly JobPostVisibility[] => {
  const normalizedVisibility = normalizeVisibility(visibility);

  if (normalizedVisibility === 3) return [];

  if (!isDraftJobPostStatus(status) && normalizedVisibility === JobPostVisibility.Public) {
    return [JobPostVisibility.Public];
  }

  return [JobPostVisibility.Public, JobPostVisibility.InviteOnly];
};

export const shouldConfirmPublicJobPostVisibilityChange = (
  status: JobPostStatusValue,
  currentVisibility: number | null | undefined,
  requestedVisibility: JobPostVisibility,
): boolean => (
  !isDraftJobPostStatus(status) &&
  normalizeVisibility(currentVisibility) === JobPostVisibility.InviteOnly &&
  requestedVisibility === JobPostVisibility.Public
);
