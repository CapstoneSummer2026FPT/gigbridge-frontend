export const BROWSE_JOBS_VIEW = {
  Recommended: 'recommended',
  All: 'all',
} as const;

export type BrowseJobsView = typeof BROWSE_JOBS_VIEW[keyof typeof BROWSE_JOBS_VIEW];

export const shouldUseRecommendedJobsByDefault = (
  isAuthenticated: boolean,
  isFreelancer: boolean,
  requestedView: string | null,
  hasExplicitBrowseCriteria = false,
): boolean => (
  isAuthenticated
  && isFreelancer
  && requestedView !== BROWSE_JOBS_VIEW.All
  && (requestedView === BROWSE_JOBS_VIEW.Recommended || !hasExplicitBrowseCriteria)
);
