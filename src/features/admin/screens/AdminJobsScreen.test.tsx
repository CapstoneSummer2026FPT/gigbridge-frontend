import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobPostStatus } from '../../../types/models/Job';

const api = vi.hoisted(() => ({
  getAllJobPosts: vi.fn(),
  getJobPostDetail: vi.fn(),
  getAssets: vi.fn(),
  getContracts: vi.fn(),
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
    getJobPostDetail: api.getJobPostDetail,
    getAssets: api.getAssets,
    getContracts: api.getContracts,
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

const createListResponse = (
  items = [cancelledJob],
  totalItems = 26,
  totalPages = 2,
) => ({
  success: true,
  statusCode: 200,
  message: 'Success',
  data: {
    items,
    pageIndex: 1,
    pageSize: 25,
    totalItems,
    totalPages,
    stats: { total: totalItems, draft: 0, open: 0, closed: 0, cancelled: totalItems, locked: 0 },
  },
});

describe('AdminJobsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getAllJobPosts.mockResolvedValue(createListResponse());
    api.getJobPostDetail.mockResolvedValue({ success: true, data: { title: 'Related job' } });
    api.getAssets.mockResolvedValue({ success: true, data: [] });
    api.getContracts.mockResolvedValue({ success: true, data: [] });
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

  it('updates a lock action locally without reloading the job list', async () => {
    render(<MemoryRouter><AdminJobsScreen /></MemoryRouter>);

    await waitFor(() => expect(api.getAllJobPosts).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getAllByTitle('More Actions')[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Lock Job' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Lock Job' }));

    await waitFor(() => expect(api.lockJobPost).toHaveBeenCalledWith('job-cancelled'));
    expect(api.getAllJobPosts).toHaveBeenCalledTimes(1);
  });

  it('opens the requested job preview from the preview query parameter', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/jobs?preview=job-related']}>
        <AdminJobsScreen />
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.getJobPostDetail).toHaveBeenCalledWith('job-related'));
    expect(screen.getByText('ADMIN PREVIEW')).toBeInTheDocument();
  });

  it('ignores a stale response after the sort changes', async () => {
    let resolveFirst: (response: ReturnType<typeof createListResponse>) => void = () => undefined;
    let resolveSecond: (response: ReturnType<typeof createListResponse>) => void = () => undefined;
    const firstResponse = new Promise<ReturnType<typeof createListResponse>>(resolve => { resolveFirst = resolve; });
    const secondResponse = new Promise<ReturnType<typeof createListResponse>>(resolve => { resolveSecond = resolve; });
    api.getAllJobPosts
      .mockImplementationOnce(() => firstResponse)
      .mockImplementationOnce(() => secondResponse);

    render(<MemoryRouter><AdminJobsScreen /></MemoryRouter>);
    await waitFor(() => expect(api.getAllJobPosts).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'title' } });
    await waitFor(() => expect(api.getAllJobPosts).toHaveBeenCalledTimes(2));

    const currentJob = { ...cancelledJob, jobPostsId: 'job-current', title: 'Current sorted result' };
    await act(async () => resolveSecond(createListResponse([currentJob], 1, 1)));
    expect(screen.getAllByText('Current sorted result').length).toBeGreaterThan(0);

    const staleJob = { ...cancelledJob, jobPostsId: 'job-stale', title: 'Stale result' };
    await act(async () => resolveFirst(createListResponse([staleJob], 1, 1)));
    expect(screen.queryByText('Stale result')).not.toBeInTheDocument();
    expect(screen.getAllByText('Current sorted result').length).toBeGreaterThan(0);
  });

  it('refetches after deletion to backfill the current page', async () => {
    const backfilledJob = { ...cancelledJob, jobPostsId: 'job-backfilled', title: 'Backfilled job' };
    api.getAllJobPosts
      .mockResolvedValueOnce(createListResponse())
      .mockResolvedValueOnce(createListResponse([backfilledJob], 25, 1));

    render(<MemoryRouter><AdminJobsScreen /></MemoryRouter>);
    await waitFor(() => expect(api.getAllJobPosts).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getAllByTitle('More Actions')[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Job' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Job' }));

    await waitFor(() => expect(api.deleteJobPost).toHaveBeenCalledWith('job-cancelled'));
    await waitFor(() => expect(api.getAllJobPosts).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText('Backfilled job').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cancelled design job')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });
});
