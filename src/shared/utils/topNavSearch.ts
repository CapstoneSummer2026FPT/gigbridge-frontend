export const TOP_NAV_SEARCH_SCOPE = {
  Talent: 'talent',
  Projects: 'projects',
  Jobs: 'jobs',
} as const;

export type TopNavSearchScope = (
  typeof TOP_NAV_SEARCH_SCOPE[keyof typeof TOP_NAV_SEARCH_SCOPE]
);

const SEARCH_BASE_PATH: Record<TopNavSearchScope, string> = {
  [TOP_NAV_SEARCH_SCOPE.Talent]: '/freelancers',
  [TOP_NAV_SEARCH_SCOPE.Projects]: '/projects',
  [TOP_NAV_SEARCH_SCOPE.Jobs]: '/jobs',
};

export const getTopNavSearchPath = (
  scope: TopNavSearchScope,
  rawQuery: string,
): string => {
  const params = new URLSearchParams();
  const query = rawQuery.trim();

  if (query) params.set('q', query);
  if (scope === TOP_NAV_SEARCH_SCOPE.Jobs) params.set('view', 'all');

  const queryString = params.toString();
  return `${SEARCH_BASE_PATH[scope]}${queryString ? `?${queryString}` : ''}`;
};
