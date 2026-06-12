import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  ListChecks,
  RefreshCw,
  Save,
  Shield,
} from 'lucide-react';

import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import {
  ContractStatus,
  MilestoneStatus,
  type ContractDto,
  type Milestone,
  type UpdateContractDetailsRequest,
} from '../../../types/models/Contract';
import { UserRole as AppUserRole } from '../../../types/models/User';
import {
  formatContractAmount,
  formatContractDate,
} from '../../../shared/utils/contractUtils';
import { MOCK_CONTRACTS_FOR_SCREENS } from '../mock/data-for-ContractScreens';
import '../styles/view-contract-details-screen.css';

type ContractViewerRole = 'client' | 'freelancer' | 'admin' | 'none';

type FormMilestone = {
  milestoneId: string | null;
  title: string;
  amount: string;
  dueDate: string;
};

const statusLabels: Record<number, string> = {
  [ContractStatus.Draft]: 'Draft',
  [ContractStatus.PendingFreelancerSelection]: 'Pending Freelancer Selection',
  [ContractStatus.InNegotiation]: 'In Negotiation',
  [ContractStatus.PendingContractDetails]: 'Pending Contract Details',
  [ContractStatus.PendingContractConfirmation]: 'Pending Contract Confirmation',
  [ContractStatus.PendingEscrow]: 'Pending Escrow',
  [ContractStatus.PendingSignature]: 'Pending Signature',
  [ContractStatus.Active]: 'Active',
  [ContractStatus.Completed]: 'Completed',
  [ContractStatus.Cancelled]: 'Cancelled',
  [ContractStatus.Disputed]: 'Disputed',
};

const milestoneStatusLabels: Record<number, string> = {
  [MilestoneStatus.Pending]: 'Pending',
  [MilestoneStatus.InProgress]: 'In Progress',
  [MilestoneStatus.Submitted]: 'Submitted',
  [MilestoneStatus.Approved]: 'Approved',
  [MilestoneStatus.PaymentProofUploaded]: 'Payment Proof Uploaded',
  [MilestoneStatus.PaymentConfirmed]: 'Payment Confirmed',
  [MilestoneStatus.Disputed]: 'Disputed',
};

const getContractId = (contract: ContractDto | null, routeId?: string) =>
  contract?.contractId || contract?.contractsId || routeId || '';

const getJobPostId = (contract: ContractDto) =>
  contract.jobPostId || contract.jobPostsId || '';

const getClientProfileId = (contract: ContractDto) =>
  contract.clientProfileId || contract.clientProfilesId || '';

const getFreelancerProfileId = (contract: ContractDto) =>
  contract.freelancerProfileId || contract.freelancerProfilesId || '';

const getStatusLabel = (status: ContractStatus | number) =>
  statusLabels[Number(status)] || 'Unknown';

const getMilestoneStatusLabel = (status: MilestoneStatus | number) =>
  milestoneStatusLabels[Number(status)] || 'Unknown';

const toDateInputValue = (value?: string | null) => value ? value.slice(0, 10) : '';

const toFormMilestone = (milestone: Milestone): FormMilestone => ({
  milestoneId: milestone.milestoneId || milestone.id || null,
  title: milestone.title,
  amount: String(milestone.amount ?? 0),
  dueDate: toDateInputValue(milestone.dueDate || milestone.due_date),
});

export default function ViewContractDetailsScreen() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const { user } = useApp();

  const [contract, setContract] = useState<ContractDto | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [scopeOfWork, setScopeOfWork] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [intellectualPropertyTerms, setIntellectualPropertyTerms] = useState('');
  const [confidentialityTerms, setConfidentialityTerms] = useState('');
  const [cancellationTerms, setCancellationTerms] = useState('');
  const [disputeTerms, setDisputeTerms] = useState('');
  const [formMilestones, setFormMilestones] = useState<FormMilestone[]>([]);

  const viewerRole = useMemo<ContractViewerRole>(() => {
    if (!user || !contract) return 'none';
    if (user.role === AppUserRole.Admin) return 'admin';

    const userProfileId = String((user as any).profileId || user.id || '');
    const clientProfileId = getClientProfileId(contract);
    const freelancerProfileId = getFreelancerProfileId(contract);
    const isMockContract = getContractId(contract).includes('mock');

    if (clientProfileId === userProfileId || (isMockContract && user.role === AppUserRole.Client)) {
      return 'client';
    }

    if (freelancerProfileId === userProfileId || (isMockContract && user.role === AppUserRole.Freelancer)) {
      return 'freelancer';
    }

    if (user.role === AppUserRole.Client) return 'client';
    if (user.role === AppUserRole.Freelancer) return 'freelancer';
    return 'none';
  }, [contract, user]);

  const populateForm = useCallback((contractData: ContractDto, milestoneList: Milestone[]) => {
    setScopeOfWork(contractData.scopeOfWork || '');
    setPaymentTerms(contractData.paymentTerms || '');
    setIntellectualPropertyTerms(contractData.intellectualPropertyTerms || '');
    setConfidentialityTerms(contractData.confidentialityTerms || '');
    setCancellationTerms(contractData.cancellationTerms || '');
    setDisputeTerms(contractData.disputeTerms || '');
    setFormMilestones(milestoneList.map(toFormMilestone));
  }, []);

  const loadContractDetails = useCallback(async () => {
    if (!contractId) {
      setError('No contract ID provided.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const contractResponse = await contractGetAPI.getContractById(contractId);
      if (contractResponse.success && contractResponse.data) {
        const contractData = contractResponse.data;
        const resolvedContractId = getContractId(contractData, contractId);
        const milestonesResponse = await contractGetAPI.getMilestonesByContract(resolvedContractId);
        const milestoneList = milestonesResponse.success ? milestonesResponse.data || [] : [];

        setContract(contractData);
        setMilestones(milestoneList);
        populateForm(contractData, milestoneList);

        if (contractData.status === ContractStatus.PendingEscrow && user?.role === AppUserRole.Client) {
          const walletResponse = await walletGetAPI.getMyWallet();
          setWalletBalance(walletResponse.success && walletResponse.data
            ? walletResponse.data.availableTokens
            : null);
        }
        return;
      }

      if (import.meta.env.VITE_USE_MOCK === 'true') {
        const mockContract = MOCK_CONTRACTS_FOR_SCREENS.find(item =>
          item.contractsId === contractId || item.contractId === contractId
        );

        if (mockContract) {
          setContract(mockContract);
          setMilestones(mockContract.milestones || []);
          populateForm(mockContract, mockContract.milestones || []);
          return;
        }
      }

      setError(contractResponse.message || 'Failed to retrieve contract details.');
    } catch (loadError) {
      console.error('Failed to load contract details:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to retrieve contract details.');
    } finally {
      setLoading(false);
    }
  }, [contractId, populateForm, user?.role]);

  useEffect(() => {
    loadContractDetails();
  }, [loadContractDetails]);

  const activeContractId = getContractId(contract, contractId);
  const canEditDetails =
    viewerRole === 'client' || viewerRole === 'admin';
  const canSubmitDetails =
    canEditDetails
    && contract?.status !== ContractStatus.PendingEscrow
    && contract?.status !== ContractStatus.PendingSignature
    && contract?.status !== ContractStatus.Active
    && contract?.status !== ContractStatus.Completed;
  const canConfirmDetails =
    (viewerRole === 'freelancer' || viewerRole === 'admin')
    && contract?.status === ContractStatus.PendingContractConfirmation;
  const canFundEscrow =
    (viewerRole === 'client' || viewerRole === 'admin')
    && contract?.status === ContractStatus.PendingEscrow;
  const canSign =
    (viewerRole === 'client' || viewerRole === 'freelancer' || viewerRole === 'admin')
    && contract?.status === ContractStatus.PendingSignature;

  const milestonesTotal = useMemo(
    () => formMilestones.reduce((sum, milestone) => sum + (Number(milestone.amount) || 0), 0),
    [formMilestones]
  );

  const handleMilestoneChange = (
    index: number,
    field: keyof FormMilestone,
    value: string
  ) => {
    setFormMilestones(prev =>
      prev.map((milestone, milestoneIndex) =>
        milestoneIndex === index ? { ...milestone, [field]: value } : milestone
      )
    );
  };

  const handleAddMilestone = () => {
    setFormMilestones(prev => [
      ...prev,
      {
        milestoneId: null,
        title: `Milestone ${prev.length + 1}`,
        amount: '0',
        dueDate: '',
      },
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    setFormMilestones(prev => prev.filter((_, milestoneIndex) => milestoneIndex !== index));
  };

  const buildDetailsPayload = (): UpdateContractDetailsRequest => ({
    scopeOfWork: scopeOfWork.trim(),
    paymentTerms: paymentTerms.trim(),
    intellectualPropertyTerms: intellectualPropertyTerms.trim(),
    confidentialityTerms: confidentialityTerms.trim(),
    cancellationTerms: cancellationTerms.trim(),
    disputeTerms: disputeTerms.trim(),
    milestones: formMilestones.map((milestone, index) => ({
      milestoneId: milestone.milestoneId,
      title: milestone.title.trim(),
      amount: Number(milestone.amount) || 0,
      dueDate: milestone.dueDate || null,
      sortOrder: index + 1,
    })),
  });

  const runAction = async (
    action: () => Promise<{ success: boolean; message?: string }>,
    successText: string
  ) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccessMessage('');

      const response = await action();
      if (!response.success) {
        setError(response.message || 'Contract action failed.');
        return;
      }

      setSuccessMessage(successText);
      await loadContractDetails();
    } catch (actionError) {
      console.error('Contract action failed:', actionError);
      setError(actionError instanceof Error ? actionError.message : 'Contract action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!activeContractId) return;
    await runAction(
      () => contractPutAPI.updateDetails(activeContractId, buildDetailsPayload()),
      'Contract details saved.'
    );
  };

  const handleSubmitDetails = async () => {
    if (!activeContractId || !contract) return;

    if (Math.abs(milestonesTotal - contract.totalBudget) > 0.01) {
      setError(
        `Milestone total ${formatContractAmount(milestonesTotal)} must equal contract budget ${formatContractAmount(contract.totalBudget)}.`
      );
      return;
    }

    await runAction(async () => {
      const updateResponse = await contractPutAPI.updateDetails(activeContractId, buildDetailsPayload());
      if (!updateResponse.success) return updateResponse;
      return contractPostAPI.submitDetails(activeContractId);
    }, 'Contract details submitted to the freelancer.');
  };

  const handleConfirmDetails = async () => {
    if (!activeContractId) return;
    await runAction(
      () => contractPostAPI.confirmDetails(activeContractId),
      'Contract terms confirmed.'
    );
  };

  const handleRequestChange = async () => {
    if (!activeContractId) return;
    const reason = window.prompt('Please enter the requested changes.');
    if (!reason?.trim()) return;

    await runAction(
      () => contractPostAPI.requestChange(activeContractId, reason.trim()),
      'Change request sent.'
    );
  };

  const handleFundEscrow = async () => {
    if (!activeContractId) return;
    await runAction(
      () => contractPostAPI.fundEscrow(activeContractId),
      'Escrow funded.'
    );
  };

  const handleSignContract = async () => {
    if (!activeContractId) return;
    await runAction(
      () => contractPostAPI.sign(activeContractId, {
        signatureImageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      }),
      'Contract signed.'
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <Clock size={40} className="mx-auto mb-4 text-muted" />
          <p className="text-primary font-semibold">Loading contract details...</p>
        </div>
      </AppLayout>
    );
  }

  if (!contract) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-ghost-cyan px-4 py-2 flex items-center gap-2 mb-6"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="glass-card p-8 text-center">
            <AlertCircle size={40} className="mx-auto mb-4 text-red" />
            <p className="text-primary font-semibold mb-2">Contract not found</p>
            <p className="text-sm text-secondary">{error || 'No contract details are available.'}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn-ghost-cyan px-4 py-2 flex items-center gap-2 mb-6"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileCheck size={20} className="text-cyan" />
              <span className="badge-cyan text-xs">
                {getStatusLabel(contract.status)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-primary">
              {contract.title}
            </h1>
            <p className="text-sm text-secondary mt-2 max-w-3xl">
              {contract.description || 'No description provided.'}
            </p>
          </div>

          <div className="glass-card p-4 min-w-[220px]">
            <p className="text-xs text-muted mb-1">Contract Budget</p>
            <p className="text-2xl font-black text-green">
              {formatContractAmount(contract.totalBudget)}
            </p>
          </div>
        </div>

        {(error || successMessage) && (
          <div className={`glass-card p-4 mb-6 flex items-start gap-3 ${
            error ? 'border border-red/30' : 'border border-green/30'
          }`}
          >
            {error ? (
              <AlertCircle size={18} className="text-red flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle size={18} className="text-green flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${error ? 'text-red' : 'text-green'}`}>
              {error || successMessage}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={18} className="text-cyan" />
                <h2 className="text-primary font-bold">Contract Terms</h2>
              </div>

              <div className="space-y-4">
                {[
                  ['Scope of Work', scopeOfWork, setScopeOfWork],
                  ['Payment Terms', paymentTerms, setPaymentTerms],
                  ['Intellectual Property Terms', intellectualPropertyTerms, setIntellectualPropertyTerms],
                  ['Confidentiality Terms', confidentialityTerms, setConfidentialityTerms],
                  ['Cancellation Terms', cancellationTerms, setCancellationTerms],
                  ['Dispute Terms', disputeTerms, setDisputeTerms],
                ].map(([label, value, setter]) => (
                  <label key={label as string} className="block">
                    <span className="text-primary text-sm font-semibold block mb-2">
                      {label as string}
                    </span>
                    <textarea
                      value={value as string}
                      onChange={event => (setter as (next: string) => void)(event.target.value)}
                      disabled={!canEditDetails || actionLoading}
                      rows={3}
                      className="input-gb w-full px-4 py-3 text-sm resize-none disabled:opacity-60"
                      placeholder={`Enter ${String(label).toLowerCase()}`}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="glass-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <ListChecks size={18} className="text-cyan" />
                  <h2 className="text-primary font-bold">Milestones</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-purple text-xs">
                    Total {formatContractAmount(milestonesTotal)}
                  </span>
                  {canEditDetails && (
                    <button
                      type="button"
                      onClick={handleAddMilestone}
                      disabled={actionLoading}
                      className="btn-ghost-cyan px-3 py-1.5 text-xs"
                    >
                      Add Milestone
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {formMilestones.map((milestone, index) => {
                  const savedMilestone = milestones.find(item =>
                    (item.milestoneId || item.id) === milestone.milestoneId
                  );

                  return (
                    <div key={milestone.milestoneId || index} className="glass-card p-4">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_160px_auto] gap-3 items-start">
                        <input
                          type="text"
                          value={milestone.title}
                          onChange={event => handleMilestoneChange(index, 'title', event.target.value)}
                          disabled={!canEditDetails || actionLoading}
                          className="input-gb px-3 py-2 text-sm disabled:opacity-60"
                          placeholder="Milestone title"
                        />
                        <input
                          type="number"
                          min="0"
                          value={milestone.amount}
                          onChange={event => handleMilestoneChange(index, 'amount', event.target.value)}
                          disabled={!canEditDetails || actionLoading}
                          className="input-gb px-3 py-2 text-sm disabled:opacity-60"
                          placeholder="Amount"
                        />
                        <input
                          type="date"
                          value={milestone.dueDate}
                          onChange={event => handleMilestoneChange(index, 'dueDate', event.target.value)}
                          disabled={!canEditDetails || actionLoading}
                          className="input-gb px-3 py-2 text-sm disabled:opacity-60"
                        />
                        {canEditDetails && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMilestone(index)}
                            disabled={actionLoading}
                            className="btn-ghost-red px-3 py-2 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {savedMilestone && (
                        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-secondary">
                          <span>{getMilestoneStatusLabel(savedMilestone.status)}</span>
                          <span>Released: {formatContractAmount(savedMilestone.releasedAmount || 0)}</span>
                          {savedMilestone.lastReleasedAt && (
                            <span>Last release: {formatContractDate(savedMilestone.lastReleasedAt)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {formMilestones.length === 0 && (
                  <p className="text-sm text-secondary text-center py-8">
                    No milestones have been defined yet.
                  </p>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-cyan" />
                <h2 className="text-primary font-bold">Contract Metadata</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted">Contract ID</p>
                  <p className="text-primary font-mono text-xs break-all">{activeContractId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Job Post ID</p>
                  <p className="text-primary font-mono text-xs break-all">{getJobPostId(contract)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Client Profile</p>
                  <p className="text-primary font-mono text-xs break-all">{getClientProfileId(contract)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Freelancer Profile</p>
                  <p className="text-primary font-mono text-xs break-all">
                    {getFreelancerProfileId(contract) || 'Not selected'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted">Start</p>
                    <p className="text-primary">{formatContractDate(contract.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">End</p>
                    <p className="text-primary">{formatContractDate(contract.endDate)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted">Created</p>
                  <p className="text-primary flex items-center gap-1">
                    <Calendar size={13} />
                    {formatContractDate(contract.createdAt)}
                  </p>
                </div>
              </div>
            </section>

            {contract.escrow && (
              <section className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign size={18} className="text-green" />
                  <h2 className="text-primary font-bold">Escrow</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-secondary">
                    Required: {formatContractAmount(contract.escrow.requiredAmount)}
                  </p>
                  <p className="text-secondary">
                    Funded: {formatContractAmount(contract.escrow.fundedAmount)}
                  </p>
                  <p className="text-secondary">
                    Released: {formatContractAmount(contract.escrow.releasedAmount)}
                  </p>
                  {walletBalance !== null && (
                    <p className="text-secondary">
                      Wallet balance: {walletBalance.toLocaleString()} tokens
                    </p>
                  )}
                </div>
              </section>
            )}

            <section className="glass-card p-5">
              <h2 className="text-primary font-bold mb-4">Workflow Actions</h2>
              <div className="space-y-3">
                {canEditDetails && (
                  <button
                    type="button"
                    onClick={handleSaveDetails}
                    disabled={actionLoading}
                    className="btn-ghost-cyan w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <Save size={16} />
                    Save Details
                  </button>
                )}

                {canSubmitDetails && (
                  <button
                    type="button"
                    onClick={handleSubmitDetails}
                    disabled={actionLoading}
                    className="btn-cyan w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <FileCheck size={16} />
                    Submit Details
                  </button>
                )}

                {canConfirmDetails && (
                  <>
                    <button
                      type="button"
                      onClick={handleConfirmDetails}
                      disabled={actionLoading}
                      className="btn-green w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      <CheckCircle size={16} />
                      Confirm Details
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestChange}
                      disabled={actionLoading}
                      className="btn-ghost-cyan w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      <RefreshCw size={16} />
                      Request Change
                    </button>
                  </>
                )}

                {canFundEscrow && (
                  <button
                    type="button"
                    onClick={handleFundEscrow}
                    disabled={actionLoading}
                    className="btn-green w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <DollarSign size={16} />
                    Fund Escrow
                  </button>
                )}

                {canSign && (
                  <button
                    type="button"
                    onClick={handleSignContract}
                    disabled={actionLoading}
                    className="btn-cyan w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <FileCheck size={16} />
                    Sign Contract
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate(`/contracts/${activeContractId}/milestones`)}
                  className="btn-ghost-cyan w-full py-2.5 flex items-center justify-center gap-2"
                >
                  <ListChecks size={16} />
                  Manage Milestones
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
