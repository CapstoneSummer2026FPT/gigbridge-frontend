import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Plus, Edit, Trash2, AlertCircle, CheckCircle2, Clock, DollarSign,
  Calendar, ChevronDown, Save, X, Eye, ArrowLeft
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import type { ContractDto, Milestone } from '../../../types/models/Contract';
import { MilestoneStatus } from '../../../types/models/Contract';
import { canEditMilestone, getMilestoneStatusLabel, formatContractAmount, formatContractDate } from '../../../shared/utils/contractUtils';
import { MOCK_CONTRACTS_FOR_SCREENS } from '../mock/data-for-ContractScreens';
import '../styles/manage-milestones-screen.css';

interface MilestoneFormData {
  title: string;
  amount: number;
  due_date: string;
  description?: string;
}

export default function ManageMilestonesScreen() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();

  // State
  const [contract, setContract] = useState<ContractDto | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MilestoneFormData>({
    title: '',
    amount: 0,
    due_date: '',
    description: '',
  });
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load contract and milestones
  useEffect(() => {
    const loadData = async () => {
      if (!contractId) {
        setError('No contract ID provided');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const contractResponse = await contractGetAPI.getContractById(contractId);
        const mockContract = MOCK_CONTRACTS_FOR_SCREENS.find(item => item.contractsId === contractId);
        const loadedContract = contractResponse.success && contractResponse.data ? contractResponse.data : mockContract;

        if (!loadedContract) {
          throw new Error('Failed to load contract');
        }

        setContract(loadedContract);

        // Fetch milestones
        const milestonesResponse = await contractGetAPI.getMilestonesByContract(contractId);
        if (milestonesResponse.success && milestonesResponse.data) {
          setMilestones(milestonesResponse.data);
        } else if (mockContract?.milestones) {
          setMilestones(mockContract.milestones);
        }
      } catch (err) {
        const mockContract = MOCK_CONTRACTS_FOR_SCREENS.find(item => item.contractsId === contractId);
        if (mockContract) {
          setContract(mockContract);
          setMilestones(mockContract.milestones);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [contractId]);

  // Calculate remaining budget
  const calculateRemainingBudget = () => {
    if (!contract) return 0;
    const usedBudget = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    return Math.max(0, contract.totalBudget - usedBudget);
  };

  // Validate form
  const validateForm = (data: MilestoneFormData): string | null => {
    if (!data.title.trim() || data.title.trim().length > 255) {
      return 'Milestone title must be 1-255 characters (BR-54)';
    }

    if (data.amount <= 0) {
      return 'MSG41: Milestone amount must be greater than 0 and within the remaining budget';
    }

    const budgetUsedByOtherMilestones = milestones
      .filter(m => m.id !== editingId)
      .reduce((sum, m) => sum + (m.amount || 0), 0);
    const maxAllowed = (contract?.totalBudget || 0) - budgetUsedByOtherMilestones;
    if (data.amount > maxAllowed) {
      return `MSG41: Milestone amount exceeds remaining budget of ${formatContractAmount(maxAllowed)} (BR-53)`;
    }

    if (!data.due_date) {
      return 'Due date is required';
    }

    const dueDate = new Date(data.due_date);
    const today = new Date();
    if (dueDate <= today) {
      return 'MSG38: Deadline must be a future date';
    }

    return null;
  };

  const handleCreateClick = () => {
    setEditingId(null);
    setFormData({
      title: '',
      amount: 0,
      due_date: '',
      description: '',
    });
    setShowCreateForm(true);
  };

  const handleEditClick = (milestone: Milestone) => {
    setEditingId(milestone.id);
    setFormData({
      title: milestone.title,
      amount: milestone.amount,
      due_date: milestone.due_date,
      description: '',
    });
    setShowCreateForm(true);
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setFormData({
      title: '',
      amount: 0,
      due_date: '',
      description: '',
    });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      let operationSucceeded = false;

      if (editingId) {
        // Update existing milestone
        const response = await contractPutAPI.updateMilestone(editingId, {
          id: editingId,
          contract_id: contractId!,
          title: formData.title,
          amount: formData.amount,
          due_date: formData.due_date,
          status: milestones.find(m => m.id === editingId)?.status || MilestoneStatus.Pending,
          paid_at: milestones.find(m => m.id === editingId)?.paid_at || null,
        });

        if (response.success) {
          setMilestones(prev =>
            prev.map(m =>
              m.id === editingId ? response.data! : m
            )
          );
          setSuccessMessage('Milestone updated successfully');
          operationSucceeded = true;
        } else {
          setMilestones(prev =>
            prev.map(m =>
              m.id === editingId
                ? { ...m, title: formData.title.trim(), amount: formData.amount, due_date: formData.due_date }
                : m
            )
          );
          setSuccessMessage('Milestone updated in mock data');
          operationSucceeded = true;
        }
      } else {
        const nextMilestone: Milestone = {
          id: `milestone_mock_${Date.now()}`,
          contract_id: contractId!,
          title: formData.title.trim(),
          amount: formData.amount,
          due_date: formData.due_date,
          status: MilestoneStatus.NotStarted,
          paid_at: null,
        };

        setMilestones(prev => [...prev, nextMilestone]);
        setSuccessMessage('Milestone created successfully');
        operationSucceeded = true;
      }

      if (operationSucceeded) {
        handleCancelForm();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!window.confirm('Are you sure you want to delete this milestone?')) {
      return;
    }

    try {
      setError(null);
      setMilestones(prev => prev.filter(m => m.id !== milestoneId));
      setSuccessMessage('Milestone deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete milestone');
    }
  };

  const handleStatusChange = async (milestoneId: string, newStatus: number) => {
    try {
      setError(null);
      const response = await contractPutAPI.updateMilestoneStatus(milestoneId, newStatus);

      if (response.success) {
        setMilestones(prev =>
          prev.map(m =>
            m.id === milestoneId ? response.data! : m
          )
        );
        setSuccessMessage('Milestone status updated');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setMilestones(prev =>
          prev.map(m =>
            m.id === milestoneId ? { ...m, status: newStatus as MilestoneStatus } : m
          )
        );
        setSuccessMessage('Milestone status updated in mock data');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setMilestones(prev =>
        prev.map(m =>
          m.id === milestoneId ? { ...m, status: newStatus as MilestoneStatus } : m
        )
      );
      setSuccessMessage('Milestone status updated in mock data');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="manage-milestones-wrapper">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading milestones...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const remainingBudget = calculateRemainingBudget();
  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const completedMilestones = milestones.filter(m => m.status === MilestoneStatus.Approved || m.status === MilestoneStatus.Paid).length;

  return (
    <AppLayout>
      <div className="manage-milestones-wrapper">
        {/* Header with back button */}
        <div className="manage-milestones-header">
          <button
            onClick={() => navigate(-1)}
            className="back-button"
            title="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="header-content">
            <h1 className="page-title">Manage Milestones</h1>
            {contract && (
              <p className="page-subtitle">Contract: {contract.title}</p>
            )}
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="success-message">
            <CheckCircle2 size={20} />
            <p>{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="message-close"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="message-close"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        {contract && (
          <>
            {/* Budget Overview */}
            <div className="budget-overview glass-card">
              <div className="budget-stat">
                <span className="stat-label">Total Budget</span>
                <span className="stat-value">{formatContractAmount(contract.totalBudget)}</span>
              </div>
              <div className="budget-stat">
                <span className="stat-label">Allocated to Milestones</span>
                <span className="stat-value">{formatContractAmount(totalMilestoneAmount)}</span>
              </div>
              <div className="budget-stat">
                <span className="stat-label">Remaining Budget</span>
                <span className={`stat-value ${remainingBudget === 0 ? 'full' : ''}`}>
                  {formatContractAmount(remainingBudget)}
                </span>
              </div>
              <div className="budget-stat">
                <span className="stat-label">Completed Milestones</span>
                <span className="stat-value">{completedMilestones}/{milestones.length}</span>
              </div>
            </div>

            {/* Create/Edit Form */}
            {showCreateForm && (
              <div className="milestone-form-container glass-card">
                <div className="form-header">
                  <h3 className="form-title">
                    {editingId ? 'Edit Milestone' : 'Create New Milestone'}
                  </h3>
                  <button
                    onClick={handleCancelForm}
                    className="form-close-btn"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitForm} className="milestone-form">
                  <div className="form-group">
                    <label htmlFor="title" className="form-label">
                      Milestone Title
                      <span className="required">*</span>
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter milestone title"
                      className="form-input"
                      maxLength={255}
                    />
                    <div className="form-hint">
                      {formData.title.length}/255 characters (BR-54)
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="amount" className="form-label">
                        Amount (VND)
                        <span className="required">*</span>
                      </label>
                      <input
                        id="amount"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="form-input"
                        min="0"
                      />
                      <div className="form-hint">
                        Max: {formatContractAmount(remainingBudget + (editingId ? milestones.find(m => m.id === editingId)?.amount || 0 : 0))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="due_date" className="form-label">
                        Due Date
                        <span className="required">*</span>
                      </label>
                      <input
                        id="due_date"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="action-btn action-cancel"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="action-btn action-save"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-small"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          {editingId ? 'Update' : 'Create'} Milestone
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Milestones List */}
            <div className="milestones-section">
              <div className="milestones-header">
                <h2 className="milestones-title">
                  Milestones ({milestones.length})
                </h2>
                <button
                  onClick={handleCreateClick}
                  className="create-milestone-btn"
                  disabled={showCreateForm}
                >
                  <Plus size={18} />
                  Create Milestone
                </button>
              </div>

              {milestones.length === 0 ? (
                <div className="empty-state glass-card">
                  <Clock size={48} />
                  <p className="empty-title">No milestones yet</p>
                  <p className="empty-subtitle">Create your first milestone to track project progress</p>
                </div>
              ) : (
                <div className="milestones-list">
                  {milestones.map((milestone, index) => (
                    <div
                      key={milestone.id}
                      className={`milestone-card glass-card ${expandedMilestoneId === milestone.id ? 'expanded' : ''}`}
                    >
                      {/* Card Header */}
                      <div className="milestone-card-header">
                        <div className="milestone-info-primary">
                          <span className="milestone-number">#{index + 1}</span>
                          <h3 className="milestone-title">{milestone.title}</h3>
                          <span className={`milestone-status-badge status-${milestone.status}`}>
                                {milestone.status === MilestoneStatus.Pending || milestone.status === MilestoneStatus.NotStarted ? (
                                  <>
                                    <Clock size={14} />
                                    {getMilestoneStatusLabel(milestone.status)}
                                  </>
                                ) : milestone.status === MilestoneStatus.Approved ? (
                              <>
                                <CheckCircle2 size={14} />
                                Approved
                              </>
                            ) : (
                                  <>
                                    <CheckCircle2 size={14} />
                                    {getMilestoneStatusLabel(milestone.status)}
                                  </>
                                )}
                          </span>
                        </div>

                        <div className="milestone-amount">
                          <DollarSign size={18} />
                          {formatContractAmount(milestone.amount)}
                        </div>

                        <button
                          onClick={() =>
                            setExpandedMilestoneId(
                              expandedMilestoneId === milestone.id ? null : milestone.id
                            )
                          }
                          className={`expand-btn ${expandedMilestoneId === milestone.id ? 'expanded' : ''}`}
                        >
                          <ChevronDown size={20} />
                        </button>
                      </div>

                      {/* Card Body - Collapsed */}
                      <div className="milestone-card-body-collapsed">
                        <span className="due-date">
                          <Calendar size={16} />
                          Due: {formatContractDate(milestone.due_date)}
                        </span>
                      </div>

                      {/* Card Body - Expanded */}
                      {expandedMilestoneId === milestone.id && (
                        <div className="milestone-card-body-expanded">
                          <div className="milestone-details-grid">
                            <div className="detail-item">
                              <span className="detail-label">Amount</span>
                              <span className="detail-value">{formatContractAmount(milestone.amount)}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Due Date</span>
                              <span className="detail-value">{formatContractDate(milestone.due_date)}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Status</span>
                              <span className="detail-value">
                                {getMilestoneStatusLabel(milestone.status)}
                              </span>
                            </div>
                            {milestone.paid_at && (
                              <div className="detail-item">
                                <span className="detail-label">Paid Date</span>
                                <span className="detail-value">{formatContractDate(milestone.paid_at)}</span>
                              </div>
                            )}
                          </div>

                          {/* Status Workflow */}
                          {milestone.status !== MilestoneStatus.Paid && (
                            <div className="status-workflow">
                              <label className="workflow-label">Update Status:</label>
                              <div className="workflow-buttons">
                                {(milestone.status === MilestoneStatus.NotStarted || milestone.status === MilestoneStatus.Pending) && (
                                  <button
                                    onClick={() => handleStatusChange(milestone.id, MilestoneStatus.InProgress)}
                                    className="workflow-btn btn-paid"
                                  >
                                    <Clock size={16} />
                                    Start Work
                                  </button>
                                )}
                                {milestone.status === MilestoneStatus.InProgress && (
                                  <button
                                    onClick={() => handleStatusChange(milestone.id, MilestoneStatus.SubmittedForReview)}
                                    className="workflow-btn btn-paid"
                                  >
                                    <CheckCircle2 size={16} />
                                    Submit for Review
                                  </button>
                                )}
                                {milestone.status === MilestoneStatus.SubmittedForReview && (
                                  <button
                                    onClick={() => handleStatusChange(milestone.id, MilestoneStatus.Approved)}
                                    className="workflow-btn btn-approve"
                                  >
                                    <CheckCircle2 size={16} />
                                    Approve
                                  </button>
                                )}
                                {milestone.status === MilestoneStatus.Approved && (
                                  <button
                                    onClick={() => handleStatusChange(milestone.id, MilestoneStatus.Paid)}
                                    className="workflow-btn btn-paid"
                                  >
                                    <CheckCircle2 size={16} />
                                    Mark as Paid
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="milestone-actions">
                            <button
                              onClick={() => handleEditClick(milestone)}
                              className="action-btn action-edit"
                              disabled={!canEditMilestone(milestone.status)}
                            >
                              <Edit size={16} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMilestone(milestone.id)}
                              className="action-btn action-delete"
                              disabled={!canEditMilestone(milestone.status)}
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="page-actions">
              <button
                onClick={() => navigate(`/contracts/${contractId}`)}
                className="action-btn action-back"
              >
                <Eye size={18} />
                View Contract Details
              </button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
