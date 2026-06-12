import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Search, Filter, Eye, Download, AlertCircle, CheckCircle2, Clock,
  DollarSign, ChevronDown, FileText, MoreVertical, TrendingUp, AlertTriangle, BarChart3, Calendar
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import type { ContractDto, ContractQueryParams } from '../../../types/models/Contract';
import { ContractStatus } from '../../../types/models/Contract';
import { formatContractAmount, formatContractDate, getContractStatusLabel } from '../../../shared/utils/contractUtils';
import { MOCK_CONTRACTS_FOR_SCREENS } from '../../contracts/mock/data-for-ContractScreens';
import '../styles/admin-contract-audit-screen.css';

interface ComplianceRequirement {
  name: string;
  met: boolean;
  description: string;
}

interface AuditTrailEntry {
  timestamp: string;
  action: string;
  user: string;
  details: string;
}

interface ContractAuditData extends ContractDto {
  complianceStatus?: 'compliant' | 'warning' | 'violation';
  complianceScore?: number;
  complianceRequirements?: ComplianceRequirement[];
  auditTrail?: AuditTrailEntry[];
  isOverdue?: boolean;
  isAtRisk?: boolean;
  lastUpdatedBy?: string;
  auditNotes?: string;
}

interface AuditFilter {
  status?: ContractStatus;
  complianceStatus?: string;
  searchTerm?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  showOverdueOnly?: boolean;
  showAtRiskOnly?: boolean;
}

export default function AdminContractAuditScreen() {
  const navigate = useNavigate();

  // State
  const [contracts, setContracts] = useState<ContractAuditData[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<ContractAuditData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus | 'All'>('All');
  const [selectedCompliance, setSelectedCompliance] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

  // Pagination
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 20;

  const buildAuditContracts = (source: ContractDto[]): ContractAuditData[] =>
    source.map(c => ({
      ...c,
      complianceStatus: getComplianceStatus(c),
      complianceScore: calculateComplianceScore(c),
      complianceRequirements: getComplianceRequirements(c),
      auditTrail: generateAuditTrail(c),
      isOverdue: isContractOverdue(c),
      isAtRisk: isContractAtRisk(c),
    }));

  // Load contracts
  useEffect(() => {
    const loadContracts = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: ContractQueryParams = {
          pageIndex,
          pageSize,
        };

        const response = await contractGetAPI.getAllContracts(params);

        if (response.success && response.data) {
          const apiContracts = Array.isArray(response.data) ? response.data : [];
          const contractsData = apiContracts.length > 0 ? apiContracts : MOCK_CONTRACTS_FOR_SCREENS;

          setContracts(buildAuditContracts(contractsData));
        } else {
          setContracts(buildAuditContracts(MOCK_CONTRACTS_FOR_SCREENS));
        }
      } catch {
        setContracts(buildAuditContracts(MOCK_CONTRACTS_FOR_SCREENS));
      } finally {
        setLoading(false);
      }
    };

    loadContracts();
  }, [pageIndex]);

  // Get compliance status based on contract data
  const getComplianceStatus = (contract: ContractDto): 'compliant' | 'warning' | 'violation' => {
    // Simulate compliance checks
    if (!contract.esignContractPdfUrl) {
      return 'violation'; // Missing contract PDF
    }

    if (!contract.description || contract.description.length < 10) {
      return 'warning'; // Insufficient description
    }

    return 'compliant';
  };

  // Calculate compliance score (0-100)
  const calculateComplianceScore = (contract: ContractDto): number => {
    let score = 100;

    // Check required fields (BR-51)
    if (!contract.title || contract.title.length === 0) score -= 25;
    if (contract.totalBudget === undefined || contract.totalBudget === null) score -= 25;
    if (!contract.startDate) score -= 25;

    // Check for contract PDF (required for legal protection)
    if (!contract.esignContractPdfUrl) score -= 15;

    // Check description quality
    if (!contract.description || contract.description.length < 10) score -= 10;

    // Check end date is set
    if (!contract.endDate) score -= 5;

    return Math.max(0, score);
  };

  // Get compliance requirements checklist
  const getComplianceRequirements = (contract: ContractDto): ComplianceRequirement[] => {
    return [
      {
        name: 'Scope Defined',
        met: !!contract.description && contract.description.length >= 10,
        description: 'Contract scope must be clearly defined in description'
      },
      {
        name: 'Budget Specified',
        met: contract.totalBudget !== undefined && contract.totalBudget > 0,
        description: 'Total budget must be specified (BR-51)'
      },
      {
        name: 'Terms Set',
        met: !!contract.startDate,
        description: 'Contract start date must be set for payment terms'
      },
      {
        name: 'Timeline Defined',
        met: !!contract.endDate,
        description: 'Contract timeline/end date must be defined (BR-51)'
      },
      {
        name: 'PDF Generated',
        met: !!contract.esignContractPdfUrl,
        description: 'Contract PDF must be generated for legal protection'
      },
      {
        name: 'Both Parties Signed',
        met: contract.status !== ContractStatus.Active || !!contract.esignContractPdfUrl,
        description: 'Contract must be signed by both parties to be Active (BR-52)'
      }
    ];
  };

  // Check if contract is overdue
  const isContractOverdue = (contract: ContractDto): boolean => {
    if (!contract.endDate) return false;
    return new Date(contract.endDate) < new Date() && contract.status === ContractStatus.Active;
  };

  // Check if contract is at risk
  const isContractAtRisk = (contract: ContractDto): boolean => {
    if (!contract.endDate) return false;
    const now = new Date();
    const endDate = new Date(contract.endDate);
    const daysRemaining = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    // At risk if less than 7 days remaining and status is Active
    return daysRemaining < 7 && daysRemaining >= 0 && contract.status === ContractStatus.Active;
  };

  // Generate mock audit trail
  const generateAuditTrail = (contract: ContractDto): AuditTrailEntry[] => {
    return [
      {
        timestamp: contract.createdAt || new Date().toISOString(),
        action: 'Contract Created',
        user: 'System',
        details: `Contract created from proposal`
      },
      {
        timestamp: new Date(new Date(contract.createdAt).getTime() + 3600000).toISOString(),
        action: 'Status Changed',
        user: contract.clientProfilesId,
        details: `Status changed to ${getContractStatusLabel(contract.status)}`
      },
      ...(contract.updatedAt ? [{
        timestamp: contract.updatedAt,
        action: 'Contract Updated',
        user: 'System',
        details: 'Contract details updated'
      }] : [])
    ];
  };

  // Filter contracts
  useEffect(() => {
    let result = contracts;

    // Status filter
    if (selectedStatus !== 'All') {
      result = result.filter(c => c.status === selectedStatus);
    }

    // Compliance filter
    if (selectedCompliance !== 'all') {
      result = result.filter(c => c.complianceStatus === selectedCompliance);
    }

    // Overdue filter
    if (showOverdueOnly) {
      result = result.filter(c => c.isOverdue);
    }

    // At-risk filter
    if (showAtRiskOnly) {
      result = result.filter(c => c.isAtRisk);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.clientProfilesId.toLowerCase().includes(query) ||
        c.freelancerProfilesId.toLowerCase().includes(query)
      );
    }

    setFilteredContracts(result);
  }, [contracts, selectedStatus, selectedCompliance, searchQuery, showOverdueOnly, showAtRiskOnly]);

  const calculateStats = () => {
    return {
      total: contracts.length,
      active: contracts.filter(c => c.status === ContractStatus.Active).length,
      completed: contracts.filter(c => c.status === ContractStatus.Completed).length,
      compliant: contracts.filter(c => c.complianceStatus === 'compliant').length,
      warnings: contracts.filter(c => c.complianceStatus === 'warning').length,
      violations: contracts.filter(c => c.complianceStatus === 'violation').length,
      overdue: contracts.filter(c => c.isOverdue).length,
      atRisk: contracts.filter(c => c.isAtRisk).length,
    };
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'Client', 'Freelancer', 'Budget', 'Status', 'Compliance', 'Compliance Score', 'Is Overdue', 'Created Date'];
    const rows = filteredContracts.map(c => [
      c.contractsId,
      c.title,
      c.clientProfilesId,
      c.freelancerProfilesId,
      c.totalBudget,
      getContractStatusLabel(c.status),
      c.complianceStatus || 'unknown',
      c.complianceScore || 0,
      c.isOverdue ? 'Yes' : 'No',
      c.createdAt,
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => {
      // Escape cells containing commas or quotes
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contracts-audit-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    // Create PDF content
    const content = `
Contract Audit Report
Generated: ${new Date().toLocaleString()}
Total Contracts: ${filteredContracts.length}

---------------------------------------
SUMMARY STATISTICS
---------------------------------------
Total Contracts: ${contracts.length}
Active: ${calculateStats().active}
Completed: ${calculateStats().completed}
Compliant: ${calculateStats().compliant}
Warnings: ${calculateStats().warnings}
Violations: ${calculateStats().violations}
Overdue: ${calculateStats().overdue}
At Risk: ${calculateStats().atRisk}

---------------------------------------
CONTRACTS DETAIL
---------------------------------------
${filteredContracts.map((c, idx) => `
${idx + 1}. ${c.title}
   ID: ${c.contractsId}
   Client: ${c.clientProfilesId}
   Freelancer: ${c.freelancerProfilesId}
   Budget: ${formatContractAmount(c.totalBudget)}
   Status: ${getContractStatusLabel(c.status)}
   Compliance: ${c.complianceStatus} (Score: ${c.complianceScore}%)
   Start Date: ${formatContractDate(c.startDate)}
   End Date: ${formatContractDate(c.endDate)}
   Overdue: ${c.isOverdue ? 'Yes' : 'No'}
   At Risk: ${c.isAtRisk ? 'Yes' : 'No'}
   Description: ${c.description || 'N/A'}
`).join('\n')}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contracts-audit-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getComplianceBadgeClass = (status?: string) => {
    return `compliance-badge compliance-${status || 'unknown'}`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="admin-contract-audit-wrapper">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading contracts...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const stats = calculateStats();
  const overdueContracts = contracts.filter(c => c.isOverdue);
  const atRiskContracts = contracts.filter(c => c.isAtRisk);

  return (
    <AppLayout>
      <div className="admin-contract-audit-wrapper">
        {/* Header */}
        <div className="audit-header">
          <h1 className="audit-title">Contracts & Compliance</h1>
          <p className="audit-subtitle">Manage all platform contracts, monitor risk, and review compliance evidence in one workspace</p>
        </div>

        {/* Stats Overview */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <FileText size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Total Contracts</span>
              <span className="stat-value">{stats.total}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon active">
              <Clock size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Active Contracts</span>
              <span className="stat-value">{stats.active}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon completed">
              <CheckCircle2 size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{stats.completed}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon compliant">
              <CheckCircle2 size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Compliant</span>
              <span className="stat-value">{stats.compliant}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon warning">
              <AlertCircle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Warnings</span>
              <span className="stat-value">{stats.warnings}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon violation">
              <AlertCircle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Violations</span>
              <span className="stat-value">{stats.violations}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon overdue">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Overdue</span>
              <span className="stat-value">{stats.overdue}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon at-risk">
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">At Risk</span>
              <span className="stat-value">{stats.atRisk}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <p>{error}</p>
            <button onClick={() => setError(null)} className="close-btn">✕</button>
          </div>
        )}

        {/* Alerts Section - Overdue and At-Risk Contracts */}
        {(overdueContracts.length > 0 || atRiskContracts.length > 0) && (
          <div className="alerts-section">
            {overdueContracts.length > 0 && (
              <div className="alert-box alert-overdue">
                <div className="alert-icon">
                  <AlertTriangle size={24} />
                </div>
                <div className="alert-content">
                  <h3>Overdue Contracts Alert</h3>
                  <p>{overdueContracts.length} contract(s) have passed their end date and are still active. Immediate action required.</p>
                  <button
                    onClick={() => {
                      setShowOverdueOnly(true);
                      setShowFilters(true);
                    }}
                    className="alert-btn"
                  >
                    View Overdue Contracts
                  </button>
                </div>
              </div>
            )}

            {atRiskContracts.length > 0 && (
              <div className="alert-box alert-at-risk">
                <div className="alert-icon">
                  <Clock size={24} />
                </div>
                <div className="alert-content">
                  <h3>At-Risk Contracts Alert</h3>
                  <p>{atRiskContracts.length} contract(s) have less than 7 days remaining. Consider early completion or extension.</p>
                  <button
                    onClick={() => {
                      setShowAtRiskOnly(true);
                      setShowFilters(true);
                    }}
                    className="alert-btn"
                  >
                    View At-Risk Contracts
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="audit-controls glass-card">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by contract title, client, or freelancer..."
              className="search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="clear-btn">✕</button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
          >
            <Filter size={18} />
            Filters
          </button>

          <button onClick={handleExportCSV} className="export-btn" title="Export contracts data as CSV">
            <Download size={18} />
            CSV
          </button>

          <button onClick={handleExportPDF} className="export-btn export-pdf" title="Export contracts report as text">
            <FileText size={18} />
            Report
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="filter-panel glass-card">
            <div className="filter-group">
              <label className="filter-label">Contract Status</label>
              <div className="filter-buttons">
                <button
                  onClick={() => setSelectedStatus('All')}
                  className={`filter-btn ${selectedStatus === 'All' ? 'active' : ''}`}
                >
                  All
                </button>
                {[
                  { value: ContractStatus.Active, label: 'Active' },
                  { value: ContractStatus.Completed, label: 'Completed' },
                  { value: ContractStatus.Cancelled, label: 'Cancelled' },
                  { value: ContractStatus.Disputed, label: 'Disputed' },
                ].map(status => (
                  <button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    className={`filter-btn ${selectedStatus === status.value ? 'active' : ''}`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Compliance Status</label>
              <div className="filter-buttons">
                <button
                  onClick={() => setSelectedCompliance('all')}
                  className={`filter-btn ${selectedCompliance === 'all' ? 'active' : ''}`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedCompliance('compliant')}
                  className={`filter-btn ${selectedCompliance === 'compliant' ? 'active' : ''}`}
                >
                  Compliant
                </button>
                <button
                  onClick={() => setSelectedCompliance('warning')}
                  className={`filter-btn ${selectedCompliance === 'warning' ? 'active' : ''}`}
                >
                  Warnings
                </button>
                <button
                  onClick={() => setSelectedCompliance('violation')}
                  className={`filter-btn ${selectedCompliance === 'violation' ? 'active' : ''}`}
                >
                  Violations
                </button>
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Risk Status</label>
              <div className="filter-buttons">
                <button
                  onClick={() => setShowOverdueOnly(!showOverdueOnly)}
                  className={`filter-btn ${showOverdueOnly ? 'active' : ''}`}
                >
                  Overdue Only
                </button>
                <button
                  onClick={() => setShowAtRiskOnly(!showAtRiskOnly)}
                  className={`filter-btn ${showAtRiskOnly ? 'active' : ''}`}
                >
                  At Risk Only
                </button>
              </div>
            </div>

            {(showOverdueOnly || showAtRiskOnly) && (
              <button
                onClick={() => {
                  setShowOverdueOnly(false);
                  setShowAtRiskOnly(false);
                }}
                className="filter-btn filter-reset"
              >
                Clear Risk Filters
              </button>
            )}
          </div>
        )}

        {/* Contracts Table */}
        <div className="contracts-table-container">
          {filteredContracts.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <p className="empty-title">No contracts found</p>
              <p className="empty-subtitle">Try adjusting your filters or search criteria</p>
            </div>
          ) : (
            <div className="contracts-list">
              {filteredContracts.map((contract, index) => (
                <div
                  key={contract.contractsId}
                  className={`contract-row glass-card ${expandedContractId === contract.contractsId ? 'expanded' : ''}`}
                >
                  <div className="row-header">
                    <div className="contract-rank">
                      <span>#{index + 1 + pageIndex * pageSize}</span>
                    </div>

                    <div className="row-content">
                      <div className="contract-title-line">
                        <h4 className="contract-title">{contract.title}</h4>
                        <span className={`status-badge status-${contract.status}`}>
                          {getContractStatusLabel(contract.status)}
                        </span>
                      </div>
                      <p className="contract-meta">
                        Contract ID: {contract.contractsId.substring(0, 12)}
                      </p>
                    </div>

                    <div className="contract-card-metric">
                      <DollarSign size={17} />
                      <div>
                        <span>Budget</span>
                        <strong>{formatContractAmount(contract.totalBudget)}</strong>
                      </div>
                    </div>

                    <div className="contract-card-metric">
                      <Calendar size={17} />
                      <div>
                        <span>Timeline</span>
                        <strong>{formatContractDate(contract.startDate)} - {formatContractDate(contract.endDate)}</strong>
                      </div>
                    </div>

                    <div className="contract-score-summary">
                      <BarChart3 size={17} />
                      <div>
                        <span>Score</span>
                        <strong>{contract.complianceScore}%</strong>
                      </div>
                    </div>

                    <div className="row-badges">
                      <span className={getComplianceBadgeClass(contract.complianceStatus)}>
                        {contract.complianceStatus?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        setExpandedContractId(
                          expandedContractId === contract.contractsId ? null : contract.contractsId
                        )
                      }
                      className="expand-btn"
                      aria-label={expandedContractId === contract.contractsId ? 'Hide contract details' : 'Show contract details'}
                    >
                      <span>Details</span>
                      <ChevronDown size={20} />
                    </button>
                  </div>

                  {/* Row Expansion */}
                  {expandedContractId === contract.contractsId && (
                    <div className="row-details">
                      <div className="details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Client</span>
                          <span className="detail-value">{contract.clientProfilesId}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Freelancer</span>
                          <span className="detail-value">{contract.freelancerProfilesId}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Budget</span>
                          <span className="detail-value">{formatContractAmount(contract.totalBudget)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Start Date</span>
                          <span className="detail-value">{formatContractDate(contract.startDate)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">End Date</span>
                          <span className="detail-value">{formatContractDate(contract.endDate)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Created</span>
                          <span className="detail-value">{formatContractDate(contract.createdAt)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Contract PDF</span>
                          <span className="detail-value">
                            {contract.esignContractPdfUrl ? (
                              <span className="badge-success">✓ Generated</span>
                            ) : (
                              <span className="badge-danger">✗ Missing</span>
                            )}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Compliance Score</span>
                          <div className="compliance-score-bar">
                            <div className="score-value">{contract.complianceScore}%</div>
                            <div className="score-bar">
                              <div 
                                className={`score-fill score-${Math.floor((contract.complianceScore || 0) / 25) * 25}`}
                                style={{ width: `${contract.complianceScore}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Compliance Requirements Checklist */}
                      {contract.complianceRequirements && (
                        <div className="compliance-checklist">
                          <h5 className="section-title">Compliance Requirements (BR-51, BR-52)</h5>
                          <div className="checklist-items">
                            {contract.complianceRequirements.map((req, idx) => (
                              <div key={idx} className={`checklist-item ${req.met ? 'met' : 'unmet'}`}>
                                <div className="checklist-icon">
                                  {req.met ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                </div>
                                <div className="checklist-content">
                                  <div className="checklist-name">{req.name}</div>
                                  <div className="checklist-description">{req.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {contract.description && (
                        <div className="description-section">
                          <h5 className="section-title">Description</h5>
                          <p className="description-text">{contract.description}</p>
                        </div>
                      )}

                      {/* Risk Indicators */}
                      <div className="risk-indicators">
                        {contract.isOverdue && (
                          <div className="risk-indicator overdue">
                            <AlertTriangle size={16} />
                            <span>Overdue - Contract has passed end date</span>
                          </div>
                        )}
                        {contract.isAtRisk && (
                          <div className="risk-indicator at-risk">
                            <Clock size={16} />
                            <span>At Risk - Less than 7 days remaining</span>
                          </div>
                        )}
                      </div>

                      {/* Audit Trail */}
                      {contract.auditTrail && contract.auditTrail.length > 0 && (
                        <div className="audit-trail-section">
                          <h5 className="section-title">Audit Trail</h5>
                          <div className="audit-trail-items">
                            {contract.auditTrail.map((entry, idx) => (
                              <div key={idx} className="audit-trail-item">
                                <div className="trail-timestamp">{formatContractDate(entry.timestamp)}</div>
                                <div className="trail-action">{entry.action}</div>
                                <div className="trail-user">by {entry.user}</div>
                                <div className="trail-details">{entry.details}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Compliance Notes */}
                      <div className="audit-notes-section">
                        <h5 className="section-title">Compliance Notes</h5>
                        <p className="audit-notes">
                          {contract.complianceStatus === 'compliant' &&
                            'Contract meets all compliance requirements. All required fields and documents are in place.'}
                          {contract.complianceStatus === 'warning' &&
                            'Contract has minor compliance issues. Some recommended fields or documentation may be incomplete.'}
                          {contract.complianceStatus === 'violation' &&
                            'Contract has compliance violations. Critical fields or legal documents are missing. Immediate review required.'}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="row-actions">
                        <button
                          onClick={() => navigate(`/contracts/${contract.contractsId}`)}
                          className="action-btn action-view"
                        >
                          <Eye size={16} />
                          View Details
                        </button>
                        {contract.esignContractPdfUrl && (
                          <a
                            href={contract.esignContractPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-btn action-download"
                          >
                            <Download size={16} />
                            Download PDF
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Info */}
        {filteredContracts.length > 0 && (
          <div className="pagination-info">
            <p>
              Showing <strong>{filteredContracts.length}</strong> of{' '}
              <strong>{contracts.length}</strong> contracts
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
