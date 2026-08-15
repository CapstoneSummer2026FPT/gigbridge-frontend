import { describe, expect, it } from 'vitest';
import { BROWSE_JOBS_VIEW, resolveBrowseJobsView } from './browseJobsView';

describe('resolveBrowseJobsView', () => {
  it('defaults only authenticated freelancers to profile mode', () => {
    expect(resolveBrowseJobsView(true, true, null)).toBe(BROWSE_JOBS_VIEW.Profile);
    expect(resolveBrowseJobsView(false, true, null)).toBe(BROWSE_JOBS_VIEW.All);
    expect(resolveBrowseJobsView(true, false, null)).toBe(BROWSE_JOBS_VIEW.All);
  });

  it('preserves explicit profile, all, and AI views for freelancers', () => {
    expect(resolveBrowseJobsView(true, true, 'profile')).toBe(BROWSE_JOBS_VIEW.Profile);
    expect(resolveBrowseJobsView(true, true, 'all')).toBe(BROWSE_JOBS_VIEW.All);
    expect(resolveBrowseJobsView(true, true, 'recommended')).toBe(BROWSE_JOBS_VIEW.Recommended);
  });

  it('keeps legacy direct browse criteria in all mode', () => {
    expect(resolveBrowseJobsView(true, true, null, true)).toBe(BROWSE_JOBS_VIEW.All);
  });
});
