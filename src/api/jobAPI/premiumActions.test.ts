import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('../../service/apiService', () => ({
  apiService: { get, post },
}));

import { jobGetAPI } from './GET';
import { jobPostAPI } from './POST';

describe('Premium client job actions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the current promotion policy before purchase confirmation', async () => {
    await jobGetAPI.getJobPromotionPolicy();
    expect(get).toHaveBeenCalledWith('JobPosts/promotion-policy');
  });

  it('keeps caller-owned idempotency and AI interview settings', async () => {
    await jobPostAPI.promoteJobPost('job-1', {
      idempotencyKey: 'promote-1',
      imageUrl: 'https://cdn.test/job.png',
      promotionTitle: 'Promoted title',
      promotionDescription: 'Promoted description',
    });
    await jobPostAPI.createAiInterview('job-1', {
      language: 'vi', mode: 'voice', questionCount: 7,
    });

    expect(post).toHaveBeenNthCalledWith(1, 'JobPosts/job-1/promote', {
      idempotencyKey: 'promote-1',
      imageUrl: 'https://cdn.test/job.png',
      promotionTitle: 'Promoted title',
      promotionDescription: 'Promoted description',
    });
    expect(post).toHaveBeenNthCalledWith(2, 'JobPosts/job-1/ai-interviews', {
      language: 'vi', mode: 'voice', questionCount: 7,
    });
  });
});
