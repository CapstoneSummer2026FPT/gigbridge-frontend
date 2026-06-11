import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AdminContractAuditScreen from '../AdminContractAuditScreen';
import * as contractAPI from '../../../../api/contractAPI/GET';
import type { ContractDto } from '../../../../types/models/Contract';
import { ContractStatus } from '../../../../types/models/Contract';

// Mock the contract API
vi.mock('../../../../api/contractAPI/GET', () => ({
  contractGetAPI: {
    getAllContracts: vi.fn(),
  },
}));

// Mock AppLayout
vi.mock('../../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock useNavigate
vi.mock('react-router', () => ({
  ...vi.importActual('react-router'),
  useNavigate: () => vi.fn(),
}));

const mockContract: ContractDto = {
  contractsId: 'contract-1',
  jobPostsId: 'job-1',
  clientProfilesId: 'client-1',
  freelancerProfilesId: 'freelancer-1',
  title: 'Web Development Project',
  description: 'A comprehensive web development project',
  totalBudget: 5000,
  status: ContractStatus.Active,
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  esignContractPdfUrl: 'https://example.com/contract.pdf',
};

describe('AdminContractAuditScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(contractAPI.contractGetAPI.getAllContracts).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <AdminContractAuditScreen />
      </BrowserRouter>
    );

    expect(screen.getByText('Loading contracts...')).toBeInTheDocument();
  });

  it('displays contracts after loading', async () => {
    vi.mocked(contractAPI.contractGetAPI.getAllContracts).mockResolvedValue({
      success: true,
      data: [mockContract],
      message: 'Success',
    });

    render(
      <BrowserRouter>
        <AdminContractAuditScreen />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Web Development Project')).toBeInTheDocument();
    });
  });

  it('displays correct statistics', async () => {
    vi.mocked(contractAPI.contractGetAPI.getAllContracts).mockResolvedValue({
      success: true,
      data: [mockContract],
      message: 'Success',
    });

    render(
      <BrowserRouter>
        <AdminContractAuditScreen />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Contracts')).toBeInTheDocument();
      expect(screen.getByText('Active Contracts')).toBeInTheDocument();
      expect(screen.getByText('Compliant')).toBeInTheDocument();
    });
  });

  it('filters contracts by status', async () => {
    vi.mocked(contractAPI.contractGetAPI.getAllContracts).mockResolvedValue({
      success: true,
      data: [mockContract],
      message: 'Success',
    });

    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <AdminContractAuditScreen />
      </BrowserRouter>
    );

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText('Web Development Project')).toBeInTheDocument();
    });

    // Open filters
    const filterButton = screen.getByText('Filters');
    await user.click(filterButton);

    // Check that filter buttons are available
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument();
    });
  });

  it('searches contracts by title', async () => {
    vi.mocked(contractAPI.contractGetAPI.getAllContracts).mockResolvedValue({
      success: true,
      data: [mockContract],
      message: 'Success',
    });

    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <AdminContractAuditScreen />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Web Development Project')).toBeInTheDocument();
    });

    // Find search input
    const searchInput = screen.getByPlaceholderText('Search by contract title, client, or freelancer...');
    
    // Search for the contract
    await user.type(searchInput, 'Web Development');

    // Contract should still be visible
    expect(screen.getByText('Web Development Project')).toBeInTheDocument();
  });

  it('displays compliance score bar', async () => {
    vi.mocked(contractAPI.contractGetAPI.getAllContracts).mockResolvedValue({
      success: true,
      data: [mockContract],
      message: 'Success',
    });

    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <AdminContractAuditScreen />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Web Development Project')).toBeInTheDocument();
    });

    // Expand the contract row
    const expandButton = screen.getByRole('button', { name: /ChevronDown/i });
    await user.click(expandButton);

    // Check for compliance score section
    await waitFor(() => {
      expect(screen.getByText('Compliance Score')).toBeInTheDocument();
    });
  });

  it('exports contracts as CSV', async () => {
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    vi.mocked(contractAPI.contractGetAPI.getAllContracts).mockResolvedValue({
      success: true,
      data: [mockContract],
      message: 'Success',
    });

    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <AdminContractAuditScreen />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Web Development Project')).toBeInTheDocument();
    });

    // Click CSV export button
    const csvButton = screen.getByTitle('Export contracts data as CSV');
    await user.click(csvButton);

    // Verify blob was created
    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });
  });

  it('handles error state', async () => {
    const errorMessage = 'Failed to load contracts';
    vi.mocked(contractAPI.contractGetAPI.getAllContracts).mockResolvedValue({
      success: false,
      message: errorMessage,
    });

    render(
      <BrowserRouter>
        <AdminContractAuditScreen />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('displays overdue contract alerts', async () => {
    const overdueContract: ContractDto = {
      ...mockContract,
      contractsId: 'contract-overdue',
      endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Ended yesterday
    };

    vi.mocked(contractAPI.contractGetAPI.getAllContracts).mockResolvedValue({
      success: true,
      data: [overdueContract],
      message: 'Success',
    });

    render(
      <BrowserRouter>
        <AdminContractAuditScreen />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Overdue Contracts Alert')).toBeInTheDocument();
    });
  });

  it('displays at-risk contract alerts', async () => {
    const atRiskContract: ContractDto = {
      ...mockContract,
      contractsId: 'contract-at-risk',
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days remaining
    };

    vi.mocked(contractAPI.contractGetAPI.getAllContracts).mockResolvedValue({
      success: true,
      data: [atRiskContract],
      message: 'Success',
    });

    render(
      <BrowserRouter>
        <AdminContractAuditScreen />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('At-Risk Contracts Alert')).toBeInTheDocument();
    });
  });

  it('displays compliance checklist when contract is expanded', async () => {
    vi.mocked(contractAPI.contractGetAPI.getAllContracts).mockResolvedValue({
      success: true,
      data: [mockContract],
      message: 'Success',
    });

    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <AdminContractAuditScreen />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Web Development Project')).toBeInTheDocument();
    });

    // Expand the contract row
    const expandButton = screen.getByRole('button', { name: /ChevronDown/i });
    await user.click(expandButton);

    // Check for compliance checklist items
    await waitFor(() => {
      expect(screen.getByText('Compliance Requirements (BR-51, BR-52)')).toBeInTheDocument();
      expect(screen.getByText('Scope Defined')).toBeInTheDocument();
      expect(screen.getByText('Budget Specified')).toBeInTheDocument();
    });
  });
});
