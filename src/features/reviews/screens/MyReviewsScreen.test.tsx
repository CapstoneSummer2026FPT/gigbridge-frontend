import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewModerationStatus } from '../../../types/models/ReviewManagement';
import { UserRole } from '../../../types/models/User';

const api = vi.hoisted(() => ({ getMyReviews: vi.fn(), createReport: vi.fn() }));

vi.mock('../../../shared/components/AppLayout', () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../api/reviewAPI/GET', () => ({ reviewGetAPI: { getMyReviews: api.getMyReviews } }));
vi.mock('../../../api/reportAPI', () => ({ reportAPI: { createReport: api.createReport } }));
const translate = vi.hoisted(() => (key: string) => key);
vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: translate, i18n: { language: 'en' } }),
}));

import MyReviewsScreen from './MyReviewsScreen';

const review = {
  reviewId: 'review-1', contractId: 'contract-1', jobPostId: 'job-1', projectTitle: 'Mobile redesign',
  reviewerId: 'freelancer-1', reviewerName: 'Freelancer Tran', reviewerRole: UserRole.Freelancer,
  revieweeId: 'client-1', revieweeName: 'Client Nguyen', revieweeRole: UserRole.Client,
  rating: 4, communicationRating: 5, qualityRating: 4, timelinessRating: 4,
  comment: 'Clear project.', isAnonymous: false, moderationStatus: ReviewModerationStatus.Active,
  hasOpenReport: false, openReportCount: 0, totalReportCount: 0, createdAt: '2026-07-31T00:00:00Z',
};

describe('MyReviewsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getMyReviews.mockResolvedValue({ success: true, data: { items: [review], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } });
    api.createReport.mockResolvedValue({ success: true, data: 'report-1' });
  });

  it('loads received and sent reviews through separate tabs', async () => {
    render(<MyReviewsScreen />);
    expect(await screen.findByText('Mobile redesign')).toBeInTheDocument();
    expect(api.getMyReviews).toHaveBeenCalledWith('received', 1, 10);

    fireEvent.click(screen.getByRole('button', { name: 'reviewManagement.sent' }));
    await waitFor(() => expect(api.getMyReviews).toHaveBeenLastCalledWith('sent', 1, 10));
  });

  it('reports a received review and refreshes its open-report state', async () => {
    render(<MyReviewsScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'reviewManagement.report' }));
    fireEvent.change(screen.getByLabelText(/reviewManagement\.reason/), { target: { value: 'This content breaks the review policy.' } });
    fireEvent.click(screen.getByRole('button', { name: 'reviewManagement.submitReport' }));

    await waitFor(() => expect(api.createReport).toHaveBeenCalledWith(expect.objectContaining({
      reportedEntityId: 'review-1', reportedEntityType: 'Review', reason: 'This content breaks the review policy.',
    })));
    expect(api.getMyReviews.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
