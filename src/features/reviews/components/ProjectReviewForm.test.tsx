import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reviewPostAPI } from '../../../api/reviewAPI/POST';
import { ContractStatus, type ContractDto } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';
import { ProjectReviewForm } from './ProjectReviewForm';

vi.mock('../../../api/reviewAPI/POST', () => ({
  reviewPostAPI: { createReview: vi.fn() },
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      if (key === 'reviews.starAria') return `${values?.star} stars`;
      const labels: Record<string, string> = {
        'reviews.communication': 'Communication',
        'reviews.workQuality': 'Work quality',
        'reviews.requirementClarity': 'Requirement clarity',
        'reviews.onTimeDelivery': 'On-time delivery',
        'reviews.approvalPaymentTimeliness': 'Approval and payment timeliness',
        'reviews.reviewFreelancer': 'Freelancer',
        'reviews.reviewClient': 'Client',
        'reviews.project': 'Project',
        'reviews.overallScore': 'Overall score',
        'reviews.overallHint': 'Rounded for storage',
        'reviews.comment': 'Comment',
        'reviews.clientCommentPlaceholder': 'Share feedback',
        'reviews.freelancerCommentPlaceholder': 'Share feedback',
        'reviews.identityNotice': 'Your name is shown',
        'reviews.criteriaRequired': 'Select all criteria',
        'reviews.submit': 'Submit review',
        'reviews.submitting': 'Submitting',
        'common.cancel': 'Cancel',
      };
      return labels[key] ?? key;
    },
  }),
}));

const contract: ContractDto = {
  contractsId: 'contract-1',
  jobPostsId: 'job-1',
  clientProfilesId: 'client-profile-1',
  freelancerProfilesId: 'freelancer-profile-1',
  title: 'Build an analytics dashboard',
  jobTitle: 'Analytics dashboard',
  totalBudget: 120,
  status: ContractStatus.Completed,
  createdAt: '2026-07-01T00:00:00.000Z',
  clientName: 'Client Nguyen',
  freelancerName: 'Freelancer Tran',
};

const selectRating = (criterion: string, stars: number) => {
  const group = screen.getByRole('radiogroup', { name: criterion });
  fireEvent.click(within(group).getByRole('radio', { name: `${stars} stars` }));
};

describe('ProjectReviewForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reviewPostAPI.createReview).mockResolvedValue({
      success: true,
      statusCode: 201,
      message: 'Created',
      data: {
        reviewId: 'review-1',
        reviewerId: 'client-user-1',
        reviewerName: 'Client Nguyen',
        revieweeId: 'freelancer-user-1',
        rating: 4,
        communicationRating: 5,
        qualityRating: 4,
        timelinessRating: 4,
        isAnonymous: false,
        isVisible: true,
        createdAt: '2026-07-31T00:00:00.000Z',
      },
    });
  });

  it('uses freelancer criteria and submits the rounded average with named sub-ratings', async () => {
    const onSubmitted = vi.fn();
    render(<ProjectReviewForm contract={contract} role={UserRole.Client} onSubmitted={onSubmitted} />);

    expect(screen.getByText('Freelancer Tran')).toBeInTheDocument();
    expect(screen.getByText('Analytics dashboard')).toBeInTheDocument();
    selectRating('Communication', 5);
    selectRating('Work quality', 4);
    selectRating('On-time delivery', 4);
    expect(screen.getByText('4.3')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Share feedback'), { target: { value: 'Strong delivery.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    await waitFor(() => expect(reviewPostAPI.createReview).toHaveBeenCalledWith({
      contractId: 'contract-1',
      rating: 4,
      comment: 'Strong delivery.',
      communicationRating: 5,
      qualityRating: 4,
      timelinessRating: 4,
      isAnonymous: false,
    }));
    expect(onSubmitted).toHaveBeenCalledWith(expect.objectContaining({ reviewId: 'review-1' }));
  });

  it('uses client-specific criteria for freelancers', () => {
    render(<ProjectReviewForm contract={contract} role={UserRole.Freelancer} onSubmitted={vi.fn()} />);

    expect(screen.getByText('Client Nguyen')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Requirement clarity' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Approval and payment timeliness' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Work quality' })).not.toBeInTheDocument();
  });

  it('requires all three criteria before calling the API', () => {
    render(<ProjectReviewForm contract={contract} role={UserRole.Client} onSubmitted={vi.fn()} />);
    selectRating('Communication', 5);

    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Select all criteria');
    expect(reviewPostAPI.createReview).not.toHaveBeenCalled();
  });
});
