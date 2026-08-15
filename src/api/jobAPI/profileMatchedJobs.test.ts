import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../../service/apiService', () => ({
  apiService: { get },
}));

import { jobGetAPI } from './GET';

describe('jobGetAPI.getProfileMatchedJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'analytics-session'),
      setItem: vi.fn(),
    });
  });

  it('does not send profile categories or skills derived from the profile', async () => {
    get.mockResolvedValue({
      success: true,
      data: {
        items: [],
        totalResults: 0,
        pageIndex: 1,
        pageSize: 20,
        searchEventId: null,
      },
    });

    await jobGetAPI.getProfileMatchedJobs({
      pageIndex: 1,
      pageSize: 20,
      skills: 'React',
      sortBy: 'relevance',
    });

    const endpoint = get.mock.calls[0][0] as string;
    const query = new URLSearchParams(endpoint.split('?')[1]);
    expect(endpoint.startsWith('JobPosts/profile-matches?')).toBe(true);
    expect(query.has('majorCategoryIds')).toBe(false);
    expect(query.get('skills')).toBe('React');
  });
});
