export const BROWSE_JOBS_VIEW = {
  Profile: 'profile',
  Recommended: 'recommended',
  All: 'all',
} as const;

export type BrowseJobsView = typeof BROWSE_JOBS_VIEW[keyof typeof BROWSE_JOBS_VIEW];

export const PROFILE_CATEGORY_PARAM = 'profileCats';

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

export const parseProfileCategoryIds = (value: string | null): string[] | null => {
  if (value === null) return null;
  if (value === 'none' || !value.trim()) return [];
  return Array.from(new Set(
    value.split(',').map(id => id.trim().toLowerCase()).filter(Boolean),
  ));
};

export const serializeProfileCategoryIds = (ids: readonly string[]): string => {
  const normalized = Array.from(new Set(ids.map(id => id.trim().toLowerCase()).filter(Boolean)));
  return normalized.length > 0 ? normalized.join(',') : 'none';
};

export interface BrowseCategoryTag {
  majorCategoryId: string;
  name: string;
  isFromProfile: boolean;
}

interface CategoryMapping {
  majorCategoryId: string;
  categoryName: string;
}

interface ProfileCategoryMapping {
  majorCategoryId: string;
  name: string;
}

export const buildBrowseCategoryTags = (
  taxonomy: readonly CategoryMapping[],
  profileCategories: readonly ProfileCategoryMapping[],
): BrowseCategoryTag[] => {
  const profileIds = new Set(profileCategories.map(category => category.majorCategoryId.toLowerCase()));
  const byName = new Map<string, BrowseCategoryTag>();

  for (const category of [...profileCategories.map(item => ({
    majorCategoryId: item.majorCategoryId,
    categoryName: item.name,
  })), ...taxonomy]) {
    const name = category.categoryName.trim();
    const majorCategoryId = category.majorCategoryId.trim().toLowerCase();
    if (!name || !majorCategoryId) continue;
    const key = name.toLocaleLowerCase();
    const candidate = {
      majorCategoryId,
      name,
      isFromProfile: profileIds.has(majorCategoryId),
    };
    const current = byName.get(key);
    if (!current || (!current.isFromProfile && candidate.isFromProfile)) byName.set(key, candidate);
  }

  return Array.from(byName.values()).sort((left, right) => {
    if (left.isFromProfile !== right.isFromProfile) return left.isFromProfile ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
};
