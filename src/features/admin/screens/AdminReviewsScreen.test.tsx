import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewModerationStatus } from '../../../types/models/ReviewManagement';
import { UserRole } from '../../../types/models/User';

const api = vi.hoisted(() => ({ getAdminReviews: vi.fn(), moderateReview: vi.fn() }));
const translate = vi.hoisted(() => (key: string) => key);
vi.mock('../../../shared/components/AppLayout', () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../api/reviewAPI/GET', () => ({ reviewGetAPI: { getAdminReviews: api.getAdminReviews } }));
vi.mock('../../../api/reviewAPI/PUT', () => ({ reviewPutAPI: { moderateReview: api.moderateReview } }));
vi.mock('../../../hooks/useTranslation', () => ({ useTranslation: () => ({ t: translate, i18n: { language: 'en' } }) }));

import AdminReviewsScreen from './AdminReviewsScreen';

const review = {
  reviewId: 'review-1', contractId: 'contract-1', jobPostId: 'job-1', projectTitle: 'Mobile redesign',
  reviewerId: 'client-1', reviewerName: 'Client Nguyen', reviewerRole: UserRole.Client,
  revieweeId: 'freelancer-1', revieweeName: 'Freelancer Tran', revieweeRole: UserRole.Freelancer,
  rating: 5, communicationRating: 5, qualityRating: 5, timelinessRating: 5, comment: 'Excellent.',
  isAnonymous: false, moderationStatus: ReviewModerationStatus.Active, hasOpenReport: true,
  openReportCount: 1, totalReportCount: 2, createdAt: '2026-07-31T00:00:00Z',
};

describe('AdminReviewsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getAdminReviews.mockResolvedValue({ success: true, data: { items: [review], summary: { total: 1, active: 1, hidden: 0, withOpenReports: 1 }, page: 1, pageSize: 15, totalItems: 1, totalPages: 1 } });
    api.moderateReview.mockResolvedValue({ success: true, data: { ...review, moderationStatus: ReviewModerationStatus.Hidden } });
  });

  it('shows review identities and moderates from the detail drawer', async () => {
    render(<MemoryRouter><AdminReviewsScreen /></MemoryRouter>);
    expect(await screen.findByText('Mobile redesign')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'adminReviews.view' }));
    expect(screen.getAllByText('Client Nguyen').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'adminReviews.hideAction' }));
    fireEvent.change(screen.getByLabelText(/adminReviews\.note/), { target: { value: 'Confirmed policy violation.' } });
    fireEvent.click(screen.getByRole('button', { name: 'adminReviews.confirm' }));

    await waitFor(() => expect(api.moderateReview).toHaveBeenCalledWith('review-1', ReviewModerationStatus.Hidden, 'Confirmed policy violation.'));
  });

  it('sends selected filters to the admin API', async () => {
    render(<MemoryRouter><AdminReviewsScreen /></MemoryRouter>);
    await screen.findByText('Mobile redesign');
    fireEvent.change(screen.getByDisplayValue('adminReviews.allRatings'), { target: { value: '5' } });
    await waitFor(() => expect(api.getAdminReviews).toHaveBeenLastCalledWith(expect.objectContaining({ rating: 5 })));
  });
});
