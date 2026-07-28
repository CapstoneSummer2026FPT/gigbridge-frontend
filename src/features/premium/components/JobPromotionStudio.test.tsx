import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GetMyJobPostDto, JobPostPromotionDto } from '../../../types/models/Job';
import { JobPromotionStudio } from './JobPromotionStudio';

const mocks = vi.hoisted(() => ({
  getJobPromotionPolicy: vi.fn(),
  endJobPromotion: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../../api/jobAPI', () => ({
  jobAPI: {
    getJobPromotionPolicy: mocks.getJobPromotionPolicy,
    getMyJobPosts: vi.fn(),
    uploadJobPromotionImage: vi.fn(),
    promoteJobPost: vi.fn(),
    endJobPromotion: mocks.endJobPromotion,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.success,
    error: mocks.error,
  },
}));

const activeJob = {
  jobPostsId: 'job-1',
  title: 'Backend Engineer',
  description: 'Build reliable APIs.',
  status: 1,
  isFeatured: true,
  featuredUntil: '2026-08-04T00:00:00.000Z',
} as GetMyJobPostDto;

const endedPromotion: JobPostPromotionDto = {
  jobPostId: 'job-1',
  isFeatured: false,
  featuredFrom: '2026-07-28T00:00:00.000Z',
  featuredUntil: '2026-07-29T00:00:00.000Z',
  tokenCost: 10,
  walletTransactionId: 'wallet-1',
  promotionId: 'promotion-1',
  imageUrl: 'https://cdn.test/job.png',
  promotionTitle: 'Backend Engineer',
  promotionDescription: 'Build reliable APIs.',
};

describe('JobPromotionStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getJobPromotionPolicy.mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'OK',
      data: { tokenCost: 10, durationDays: 7 },
    });
    mocks.endJobPromotion.mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Job promotion ended',
      data: endedPromotion,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows an active promotion to be ended even without current Premium entitlement', async () => {
    const onDeactivated = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <JobPromotionStudio
        entitled={false}
        initialJob={activeJob}
        onDeactivated={onDeactivated}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'End promotion now' }));

    await waitFor(() => {
      expect(mocks.endJobPromotion).toHaveBeenCalledWith('job-1');
    });
    expect(onDeactivated).toHaveBeenCalledWith(endedPromotion);
    expect(mocks.success).toHaveBeenCalledWith('Job promotion ended.');
  });
});
