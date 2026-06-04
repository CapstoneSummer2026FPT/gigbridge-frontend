import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Eye, EyeOff, Lock, AlertCircle, CheckCircle, Clock, DollarSign,
  User, FileText, Calendar, Download, ArrowLeft, Shield,
  Mail, MapPin, Briefcase, Heart, ShieldAlert
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { useApp } from '../../../app/providers/AppProvider';
import type { ContractDto, Milestone } from '../../../types/models/Contract';
import { ContractStatus, PaymentType, MilestoneStatus } from '../../../types/models/Contract';
import {
  getContractStatusLabel,
  getContractStatusClass,
  formatContractAmount,
  formatContractDate,
  getMilestoneStatusLabel,
  getMilestoneStatusClass
} from '../../../shared/utils/contractUtils';
import { MOCK_CONTRACTS_FOR_SCREENS } from '../mock/data-for-ContractScreens';
import '../styles/view-contract-details-screen.css';

interface AuditTrailEntry {
  id: string;
  action: string;
  timestamp: string;
  performedBy: string;
  performedByRole: 'Client' | 'Freelancer' | 'Admin';
  details?: string;
  metadata?: Record<string, any>;
}

interface ClientProfile {
  profilesId?: string;
  fullName?: string;
  email?: string;
  profileImageUrl?: string;
  avatarUrl?: string;
  companyName?: string;
  verificationStatus?: 'Verified' | 'Pending' | 'Unverified';
}

interface FreelancerProfile {
  profilesId?: string;
  fullName?: string;
  email?: string;
  profileImageUrl?: string;
  avatarUrl?: string;
  headline?: string;
  hourlyRate?: number;
  verificationStatus?: 'Verified' | 'Pending' | 'Unverified';
}

interface ContractDetailsData extends ContractDto {
  clientProfile?: ClientProfile;
  freelancerProfile?: FreelancerProfile;
  milestones?: Milestone[];
  auditTrail?: AuditTrailEntry[];
}

type UserRole = 'client' | 'freelancer' | 'admin' | 'none';

const CONTRACT_STATUSES = [
  { value: ContractStatus.Active, label: 'Active', color: '#10b981' },
  { value: ContractStatus.Completed, label: 'Completed', color: '#3b82f6' },
  { value: ContractStatus.Cancelled, label: 'Cancelled', color: '#ef4444' },
  { value: ContractStatus.Disputed, label: 'Disputed', color: '#f59e0b' },
];

export default function ViewContractDetailsScreen() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const { user } = useApp();

  // State
  const [contract, setContract] = useState<ContractDetailsData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('none');
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [showConfidential, setShowConfidential] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Determine user role relative to contract
  useEffect(() => {
    if (!user || !contract) return;

    const userProfileId = (user as any).profileId || user.id;

    // Admin role check - this would normally be done on backend
    const isAdmin = user.role === 2 || user.role === 'Admin' || user.role === 'admin';
    if (isAdmin) {
      setUserRole('admin');
      return;
    }

    // Check if user is client
    if (contract.clientProfilesId === userProfileId || (!((user as any).profileId) && user.role === 0)) {
      setUserRole('client');
      return;
    }

    // Check if user is freelancer
    if (contract.freelancerProfilesId === userProfileId || (!((user as any).profileId) && user.role === 1)) {
      setUserRole('freelancer');
      return;
    }

    setUserRole('none');
  }, [user, contract]);

  // Load contract details
  useEffect(() => {
    const loadContractDetails = async () => {
      if (!contractId) {
        setError('No contract ID provided');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch contract details
        const contractResponse = await contractGetAPI.getContractById(contractId);

        const fallbackContract = MOCK_CONTRACTS_FOR_SCREENS.find(item => item.contractsId === contractId);
        if (!contractResponse.success || !contractResponse.data) {
          if (!fallbackContract) throw new Error(contractResponse.message || 'Failed to load contract');
        }

        const contractData = (contractResponse.data || fallbackContract)!;
        setContract(contractData);

        // Fetch milestones
        try {
          const milestonesResponse = await contractGetAPI.getMilestonesByContract(contractId);
          if (milestonesResponse.success && milestonesResponse.data) {
            setMilestones(milestonesResponse.data);
          }
        } catch (err) {
          console.warn('Failed to load milestones:', err);
          if (fallbackContract?.milestones) setMilestones(fallbackContract.milestones);
        }

        if (fallbackContract?.milestones) {
          setMilestones(fallbackContract.milestones);
        }

        // Generate audit trail from contract data
        generateAuditTrail(contractData);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMsg);
        console.error('Failed to load contract:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContractDetails();
  }, [contractId]);

  // Generate audit trail entries from contract metadata
  const generateAuditTrail = (contractData: ContractDetailsData) => {
    const trail: AuditTrailEntry[] = [];

    // Contract created
    trail.push({
      id: '1',
      action: 'Contract Created',
      timestamp: contractData.createdAt,
      performedBy: contractData.clientProfilesId || 'Client',
      performedByRole: 'Client',
      details: `Contract "${contractData.title}" created from proposal`,
      metadata: {
        budget: contractData.totalBudget,
        paymentType: contractData.paymentType === PaymentType.Fixed ? 'Fixed' : 'Hourly'
      }
    });

    // Contract started
    if (contractData.startDate) {
      trail.push({
        id: '2',
        action: 'Contract Started',
        timestamp: contractData.startDate,
        performedBy: 'System',
        performedByRole: 'Admin',
        details: 'Contract work period began'
      });
    }

    // Contract status changes
    if (contractData.status === ContractStatus.Completed && contractData.completedAt) {
      trail.push({
        id: '3',
        action: 'Contract Completed',
        timestamp: contractData.completedAt,
        performedBy: contractData.clientProfilesId || 'Client',
        performedByRole: 'Client',
        details: 'All milestones approved and paid'
      });
    }

    setAuditTrail(trail);
  };

  // Check access permissions
  const hasAccess = (): boolean => {
    return userRole !== 'none';
  };

  // Get visible fields based on role
  const getVisibleFields = () => {
    const baseFields = ['title', 'description', 'totalBudget', 'paymentType', 'status', 'startDate', 'endDate'];
    const clientFields = [...baseFields, 'freelancerProfile'];
    const freelancerFields = [...baseFields, 'clientProfile'];
    const adminFields = [...baseFields, 'clientProfile', 'freelancerProfile', 'auditTrail'];

    switch (userRole) {
      case 'client':
        return clientFields;
      case 'freelancer':
        return freelancerFields;
      case 'admin':
        return adminFields;
      default:
        return [];
    }
  };

  // Copy to clipboard
  const handleCopyContractId = () => {
    if (contract?.contractsId) {
      navigator.clipboard.writeText(contract.contractsId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Download contract PDF
  const handleDownloadPDF = () => {
    if (contract?.esignContractPdfUrl) {
      window.open(contract.esignContractPdfUrl, '_blank');
    }
  };

  // Navigate to sign contract
  const handleSignContract = () => {
    navigate(`/contracts/${contractId}/sign`);
  };

  if (!contractId) {
    return (
      <AppLayout>
        <div className="contract-details-error">
          <AlertCircle className="error-icon" />
          <h2>Invalid Contract</h2>
          <p>No contract ID provided</p>
          <button onClick={() => navigate('/contracts')} className="btn-primary">
            Back to Contracts
          </button>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="contract-details-loading">
          <div className="spinner" />
          <p>Loading contract details...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !contract) {
    return (
      <AppLayout>
        <div className="contract-details-error">
          <AlertCircle className="error-icon" />
          <h2>Unable to Load Contract</h2>
          <p>{error || 'Contract not found'}</p>
          <button onClick={() => navigate('/contracts')} className="btn-primary">
            Back to Contracts
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!hasAccess()) {
    return (
      <AppLayout>
        <div className="contract-details-error">
          <Lock className="error-icon" />
          <h2>Access Denied</h2>
          <p>MSG57: You do not have permission to access this resource</p>
          <button onClick={() => navigate('/contracts')} className="btn-primary">
            Back to Contracts
          </button>
        </div>
      </AppLayout>
    );
  }

  const visibleFields = getVisibleFields();
  const contractStatus = CONTRACT_STATUSES.find(s => s.value === contract.status);
  const milestonesTotal = milestones.reduce((sum, m) => sum + m.amount, 0);
  const milestonesApproved = milestones.filter(m => m.status === MilestoneStatus.Approved).length;
  const milestonesPaid = milestones.filter(m => m.status === MilestoneStatus.Paid).length;

  return (
    <AppLayout>
      <div className="contract-details-screen">
        {/* Header */}
        <div className="contract-details-header">
          <div className="header-top">
            <button onClick={() => navigate('/contracts')} className="btn-back">
              <ArrowLeft size={20} />
              Back to Contracts
            </button>
            <div className="header-actions">
              {contract.esignContractPdfUrl && (
                <button onClick={handleDownloadPDF} className="btn-icon" title="Download PDF">
                  <Download size={20} />
                </button>
              )}
              {userRole === 'freelancer' && contract.status === ContractStatus.Active && (
                <button onClick={handleSignContract} className="btn-secondary">
                  <Shield size={18} />
                  Sign Contract
                </button>
              )}
              {userRole === 'client' && (
                <button onClick={() => navigate(`/contracts/${contractId}/milestones`)} className="btn-secondary">
                  <Briefcase size={18} />
                  Manage Milestones
                </button>
              )}
              {(userRole === 'client' || userRole === 'freelancer') && contract.status === ContractStatus.Active && (
                <button onClick={() => navigate(`/contracts/${contractId}/disputes/create`)} className="btn-secondary dispute-open-btn">
                  <ShieldAlert size={18} />
                  Open Dispute
                </button>
              )}
            </div>
          </div>

          <div className="header-content">
            <div className="title-section">
              <h1>{contract.title}</h1>
              <div className="contract-meta">
                <span className={`status-badge ${getContractStatusClass(contract.status)}`}>
                  {getContractStatusLabel(contract.status)}
                </span>
                {contractStatus && (
                  <span className="status-color" style={{ backgroundColor: contractStatus.color }} />
                )}
              </div>
            </div>

            <div className="header-stats">
              <div className="stat-box">
                <DollarSign size={18} />
                <div>
                  <span className="stat-label">Total Budget</span>
                  <span className="stat-value">{formatContractAmount(contract.totalBudget)}</span>
                </div>
              </div>
              <div className="stat-box">
                <Calendar size={18} />
                <div>
                  <span className="stat-label">Start Date</span>
                  <span className="stat-value">{formatContractDate(contract.startDate)}</span>
                </div>
              </div>
              {contract.endDate && (
                <div className="stat-box">
                  <Calendar size={18} />
                  <div>
                    <span className="stat-label">End Date</span>
                    <span className="stat-value">{formatContractDate(contract.endDate)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="contract-details-content">
          {/* Contract Information */}
          <section className="details-section">
            <h2>Contract Information</h2>
            <div className="contract-info">
              <div className="info-group">
                <label>Contract ID</label>
                <div className="contract-id-display">
                  <code>{contract.contractsId}</code>
                  <button
                    onClick={handleCopyContractId}
                    className="btn-copy"
                    title="Copy contract ID"
                  >
                    {copySuccess ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {contract.description && (
                <div className="info-group">
                  <label>Description</label>
                  <p className="description-text">{contract.description}</p>
                </div>
              )}

              <div className="info-group">
                <label>Payment Type</label>
                <p>{contract.paymentType === PaymentType.Fixed ? 'Fixed Price' : 'Hourly Rate'}</p>
              </div>

              <div className="info-group">
                <label>Job Post ID</label>
                <p className="text-muted">{contract.jobPostsId}</p>
              </div>

              {contract.createdAt && (
                <div className="info-group">
                  <label>Created</label>
                  <p>{new Date(contract.createdAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </section>

          {/* Parties Information */}
          <div className="parties-grid">
            {/* Client Information */}
            <section className="details-section party-section">
              <h2>
                <Briefcase size={18} />
                Client Information
              </h2>
              <div className="party-card">
                {contract.clientProfile ? (
                  <>
                    {contract.clientProfile.profileImageUrl && (
                      <img
                        src={contract.clientProfile.profileImageUrl}
                        alt={contract.clientProfile.fullName}
                        className="party-avatar"
                      />
                    )}
                    <div className="party-info">
                      <h3>{contract.clientProfile.fullName}</h3>
                      {contract.clientProfile.companyName && (
                        <p className="company">{contract.clientProfile.companyName}</p>
                      )}
                      {contract.clientProfile.email && (
                        <p className="contact">
                          <Mail size={14} />
                          {contract.clientProfile.email}
                        </p>
                      )}
                      {contract.clientProfile.verificationStatus && (
                        <div className="verification-status">
                          <Shield size={14} />
                          <span>{contract.clientProfile.verificationStatus}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-muted">Client profile not available</p>
                )}
              </div>
            </section>

            {/* Freelancer Information */}
            <section className="details-section party-section">
              <h2>
                <User size={18} />
                Freelancer Information
              </h2>
              <div className="party-card">
                {contract.freelancerProfile ? (
                  <>
                    {contract.freelancerProfile.profileImageUrl && (
                      <img
                        src={contract.freelancerProfile.profileImageUrl}
                        alt={contract.freelancerProfile.fullName}
                        className="party-avatar"
                      />
                    )}
                    <div className="party-info">
                      <h3>{contract.freelancerProfile.fullName}</h3>
                      {contract.freelancerProfile.headline && (
                        <p className="headline">{contract.freelancerProfile.headline}</p>
                      )}
                      {contract.freelancerProfile.email && (
                        <p className="contact">
                          <Mail size={14} />
                          {contract.freelancerProfile.email}
                        </p>
                      )}
                      {contract.freelancerProfile.hourlyRate && (
                        <p className="rate">
                          <DollarSign size={14} />
                          ${contract.freelancerProfile.hourlyRate}/hr
                        </p>
                      )}
                      {contract.freelancerProfile.verificationStatus && (
                        <div className="verification-status">
                          <Shield size={14} />
                          <span>{contract.freelancerProfile.verificationStatus}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-muted">Freelancer profile not available</p>
                )}
              </div>
            </section>
          </div>

          {/* Milestones Section */}
          {milestones.length > 0 && (
            <section className="details-section">
              <div className="section-header">
                <h2>Milestones ({milestones.length})</h2>
                <div className="milestone-stats">
                  <span className="stat">{milestonesApproved} Approved</span>
                  <span className="stat">{milestonesPaid} Paid</span>
                  <span className="total">Total: {formatContractAmount(milestonesTotal)}</span>
                </div>
              </div>

              <div className="milestones-list">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`milestone-item ${milestone.status === MilestoneStatus.Paid ? 'completed' : ''}`}
                  >
                    <div
                      className="milestone-header"
                      onClick={() =>
                        setExpandedMilestone(
                          expandedMilestone === milestone.id ? null : milestone.id
                        )
                      }
                    >
                      <div className="milestone-title-section">
                        <div className="milestone-icon">
                          {milestone.status === MilestoneStatus.Paid && <CheckCircle size={20} />}
                          {milestone.status === MilestoneStatus.Approved && <Clock size={20} />}
                          {milestone.status === MilestoneStatus.Pending && <Clock size={20} />}
                        </div>
                        <div>
                          <h3>{milestone.title}</h3>
                          <p className="milestone-meta">
                            <Calendar size={14} />
                            Due {formatContractDate(milestone.due_date)}
                          </p>
                        </div>
                      </div>

                      <div className="milestone-details-quick">
                        <span className="amount">{formatContractAmount(milestone.amount)}</span>
                        <span className={`status ${getMilestoneStatusClass(milestone.status)}`}>
                          {getMilestoneStatusLabel(milestone.status)}
                        </span>
                      </div>
                    </div>

                    {expandedMilestone === milestone.id && (
                      <div className="milestone-expanded">
                        <div className="expanded-content">
                          <div className="expanded-row">
                            <span className="label">Amount:</span>
                            <span className="value">{formatContractAmount(milestone.amount)}</span>
                          </div>
                          <div className="expanded-row">
                            <span className="label">Due Date:</span>
                            <span className="value">{formatContractDate(milestone.due_date)}</span>
                          </div>
                          <div className="expanded-row">
                            <span className="label">Status:</span>
                            <span className={`value ${getMilestoneStatusClass(milestone.status)}`}>
                              {getMilestoneStatusLabel(milestone.status)}
                            </span>
                          </div>
                          {milestone.paid_at && (
                            <div className="expanded-row">
                              <span className="label">Paid Date:</span>
                              <span className="value">{new Date(milestone.paid_at).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Audit Trail Section */}
          {(userRole === 'admin' || userRole === 'client') && (
            <section className="details-section audit-section">
              <div className="section-header">
                <h2>
                  <Clock size={18} />
                  Audit Trail
                </h2>
                <button
                  onClick={() => setShowAuditTrail(!showAuditTrail)}
                  className="btn-toggle"
                >
                  {showAuditTrail ? 'Hide' : 'Show'} History
                </button>
              </div>

              {showAuditTrail && (
                <div className="audit-trail">
                  {auditTrail.length > 0 ? (
                    <div className="timeline">
                      {auditTrail.map((entry) => (
                        <div key={entry.id} className="timeline-entry">
                          <div className="timeline-marker" />
                          <div className="timeline-content">
                            <div className="entry-header">
                              <h4>{entry.action}</h4>
                              <span className="timestamp">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="entry-performer">
                              <User size={14} />
                              {entry.performedBy}
                              <span className="role-badge">{entry.performedByRole}</span>
                            </p>
                            {entry.details && <p className="entry-details">{entry.details}</p>}
                            {entry.metadata && (
                              <div className="entry-metadata">
                                {Object.entries(entry.metadata).map(([key, value]) => (
                                  <span key={key} className="metadata-item">
                                    <strong>{key}:</strong> {String(value)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No audit history available</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Security Notice */}
          {userRole === 'admin' && (
            <section className="details-section security-section">
              <div className="security-notice">
                <Shield size={18} />
                <div>
                  <h3>Admin Access</h3>
                  <p>You are viewing this contract with admin privileges. All actions are logged.</p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
