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
  visibility: number | null | undefined,
): readonly JobPostVisibility[] => {
  const normalizedVisibility = normalizeVisibility(visibility);

  if (normalizedVisibility === 3) return [];

  return [JobPostVisibility.Public, JobPostVisibility.InviteOnly];
};
