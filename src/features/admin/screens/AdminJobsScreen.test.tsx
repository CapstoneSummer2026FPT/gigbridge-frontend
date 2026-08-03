import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobPostStatus } from '../../../types/models/Job';

const api = vi.hoisted(() => ({
  getAllJobPosts: vi.fn(),
  lockJobPost: vi.fn(),
  deleteJobPost: vi.fn(),
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../shared/components/GCoinIcon', () => ({
  default: () => <span>GC</span>,
}));
vi.mock('../../../api/jobAPI/GET', () => ({
  jobGetAPI: {
    getAllJobPosts: api.getAllJobPosts,
    getJobPostQuestions: vi.fn(),
  },
}));
vi.mock('../../../api/adminAPI', () => ({
  adminAPI: {
    getJobPostDetail: vi.fn(),
    getAssets: vi.fn(),
    getContracts: vi.fn(),
    getContractMilestones: vi.fn(),
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    deleteMilestone: vi.fn(),
    overrideMilestone: vi.fn(),
    lockJobPost: api.lockJobPost,
    deleteJobPost: api.deleteJobPost,
  },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import AdminJobsScreen from './AdminJobsScreen';

const cancelledJob = {
  jobPostsId: 'job-cancelled',
  title: 'Cancelled design job',
  descriptionPreview: 'Cancelled by the client',
  categoryName: 'Design',
  budgetMin: 100,
  budgetMax: 200,
  createdAt: '2026-08-01T00:00:00Z',
  status: JobPostStatus.Cancelled,
  visibility: 0,
  clientProfilesId: 'client-1',
  clientFullName: 'Client One',
  skills: [],
  customSkillNames: [],
  skillNames: [],
};

describe('AdminJobsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getAllJobPosts.mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        items: [cancelledJob],
        pageIndex: 1,
        pageSize: 25,
        totalItems: 26,
        totalPages: 2,
        stats: { total: 30, draft: 4, open: 15, closed: 6, cancelled: 5, locked: 2 },
      },
    });
    api.lockJobPost.mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Job post locked successfully',
      data: true,
    });
    api.deleteJobPost.mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Job post deleted successfully',
      data: true,
    });
  });

  it('uses server pagination and exposes the cancelled status', async () => {
    render(<MemoryRouter><AdminJobsScreen /></MemoryRouter>);

    await waitFor(() => expect(api.getAllJobPosts).toHaveBeenCalledWith(expect.objectContaining({
      pageIndex: 1,
      pageSize: 25,
      sortBy: 'newest',
      includeSummary: true,
    })));

    expect(screen.getAllByText('Cancelled design job').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0);
    expect(screen.queryByText('In Progress')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancelled/ }));
    await waitFor(() => expect(api.getAllJobPosts).toHaveBeenLastCalledWith(expect.objectContaining({
      status: JobPostStatus.Cancelled,
    })));

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(api.getAllJobPosts).toHaveBeenLastCalledWith(expect.objectContaining({
      pageIndex: 2,
      status: JobPostStatus.Cancelled,
      includeSummary: false,
      knownTotalItems: 26,
    })));
  });

  it('updates lock and delete actions locally without reloading the job list', async () => {
    render(<MemoryRouter><AdminJobsScreen /></MemoryRouter>);

    await waitFor(() => expect(api.getAllJobPosts).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getAllByTitle('More Actions')[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Lock Job' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Lock Job' }));

    await waitFor(() => expect(api.lockJobPost).toHaveBeenCalledWith('job-cancelled'));
    expect(api.getAllJobPosts).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByTitle('More Actions')[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Job' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Job' }));

    await waitFor(() => expect(api.deleteJobPost).toHaveBeenCalledWith('job-cancelled'));
    expect(api.getAllJobPosts).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Cancelled design job')).not.toBeInTheDocument();
  });
});
