import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateProposalScreen from './CreateProposalScreen';

const navigateMock = vi.fn();
const { createProposalMock } = vi.hoisted(() => ({ createProposalMock: vi.fn() }));

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ jobPostId: 'job-1' }),
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../shared/components/MarkdownEditor', () => ({
  MarkdownEditor: ({ label }: { label: string }) => <div>{label} Markdown editor</div>,
}));

vi.mock('../../../api/jobAPI/GET', () => ({
  jobGetAPI: {
    getJobPostDetail: vi.fn().mockResolvedValue({
      success: true,
      data: { jobPostsId: 'job-1', title: 'Build a marketplace' },
    }),
    getJobPostQuestions: vi.fn(),
  },
}));

vi.mock('../../../api/proposalAPI/GET', () => ({
  proposalGetAPI: {
    getMyProposalByJobPost: vi.fn().mockResolvedValue({ success: false, data: null }),
    getProposalDetail: vi.fn(),
  },
}));

vi.mock('../../../api/proposalAPI/POST', () => ({ proposalPostAPI: { createProposal: createProposalMock } }));
vi.mock('../../../api/proposalAPI/PUT', () => ({ proposalPutAPI: { updateProposal: vi.fn() } }));
vi.mock('../../../api/proposalAPI/PATCH', () => ({ proposalPatchAPI: { updateProposalStatus: vi.fn() } }));

describe('CreateProposalScreen Phase 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createProposalMock.mockResolvedValue({ success: true, data: 'proposal-1' });
  });

  it('renders rich analysis, work breakdown, and milestone payment planning', async () => {
    render(<CreateProposalScreen />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Project Proposal' })).toBeInTheDocument());

    expect(screen.getByText('Requirement analysis Markdown editor')).toBeInTheDocument();
    expect(screen.getByText('Solution approach Markdown editor')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Work breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Milestone and payment plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit proposal/i })).toBeInTheDocument();
  });

  it('calculates budget from milestone amounts and serializes structured duration', async () => {
    render(<CreateProposalScreen />);
    await screen.findByRole('heading', { name: 'Project Proposal' });

    fireEvent.change(screen.getByLabelText('Amount *'), { target: { value: '12.5' } });
    const spinButtons = screen.getAllByRole('spinbutton');
    fireEvent.change(spinButtons[1], { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => expect(createProposalMock).toHaveBeenCalled());
    expect(createProposalMock.mock.calls[0][0]).toMatchObject({
      proposedBudget: 12.5,
      milestonePlans: [expect.objectContaining({ amount: 12.5, estimatedDuration: '2 weeks' })],
    });
    expect(screen.getAllByText(/12\.5 G-coin/i).length).toBeGreaterThan(0);
  });

  it('opens a newly added milestone card', async () => {
    render(<CreateProposalScreen />);
    await screen.findByRole('heading', { name: 'Project Proposal' });

    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));

    expect(screen.getByRole('button', { name: /untitled milestone 2/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByLabelText('Title *')).toHaveLength(1);
  });
});
