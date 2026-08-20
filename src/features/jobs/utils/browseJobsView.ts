export const BROWSE_JOBS_VIEW = {
  Profile: 'profile',
  Recommended: 'recommended',
  All: 'all',
} as const;

export type BrowseJobsView = typeof BROWSE_JOBS_VIEW[keyof typeof BROWSE_JOBS_VIEW];

export const resolveBrowseJobsView = (
  isAuthenticated: boolean,
  isFreelancer: boolean,
  requestedView: string | null,
  hasExplicitBrowseCriteria = false,
): BrowseJobsView => {
  if (!isAuthenticated || !isFreelancer) return BROWSE_JOBS_VIEW.All;
  if (requestedView === BROWSE_JOBS_VIEW.Recommended) return BROWSE_JOBS_VIEW.Recommended;
  if (requestedView === BROWSE_JOBS_VIEW.Profile) return BROWSE_JOBS_VIEW.Profile;
  if (requestedView === BROWSE_JOBS_VIEW.All || hasExplicitBrowseCriteria) {
    return BROWSE_JOBS_VIEW.All;
  }
  return BROWSE_JOBS_VIEW.Profile;
};
