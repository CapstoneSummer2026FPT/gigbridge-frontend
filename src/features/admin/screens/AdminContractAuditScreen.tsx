import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Edit,
  FileCheck2,
  FileText,
  Filter,
  Save,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { AppLayout } from '../../../shared/components/AppLayout';
import { adminAPI } from '../../../api/adminAPI';
import type { ContractDto } from '../../../types/models/Contract';
import { ContractStatus } from '../../../types/models/Contract';
import { formatContractAmount, formatContractDate, getContractStatusLabel } from '../../../shared/utils/contractUtils';
import { ContractAreaTabs } from '../../contracts/components/ContractAreaTabs';
import { AdminTablePageSize, AdminTablePagination } from '../components/AdminTableControls';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import '../../contracts/styles/manage-contract-screen.css';
import '../../contracts/styles/esign-contracts-screen.css';
import '../styles/admin-contract-audit-screen.css';

interface ComplianceRequirement {
  name: string;
  met: boolean;
  description: string;
}

interface ContractAuditData extends ContractDto {
  complianceStatus?: 'compliant' | 'warning' | 'violation';
  complianceScore?: number;
  complianceRequirements?: ComplianceRequirement[];
  isOverdue?: boolean;
  isAtRisk?: boolean;
  lastUpdatedBy?: string;
  auditNotes?: string;
}

export default function AdminContractAuditScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [routeSearchParams] = useSearchParams();

  // State
  const [contracts, setContracts] = useState<ContractAuditData[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<ContractAuditData[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Contract States
  const [editingContract, setEditingContract] = useState<ContractAuditData | null>(null);
  const [contractForm, setContractForm] = useState({
    title: '',
    description: '',
    totalBudget: 0,
    status: 7, // Active
    startDate: '',
    endDate: '',
    esignContractPdfUrl: ''
  });
  const [isContractActionLoading, setIsContractActionLoading] = useState(false);
  const [contractActionError, setContractActionError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus | 'All'>('All');
  const [selectedCompliance, setSelectedCompliance] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

  // GSAP Entrance Animations
  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.esign-gsap-header', y: 20, duration: 0.55 },
      { selector: '.esign-gsap-metrics', y: 16, duration: 0.5, stagger: 0.06 },
      { selector: '.alerts-section', y: 18, duration: 0.45 },
      { selector: '.esign-gsap-main', y: 24, duration: 0.5 },
      { selector: '.contract-row', y: 16, duration: 0.4, stagger: 0.05 },
    ],
  });

  useEffect(() => {
    const contractId = routeSearchParams.get('contractId');
    if (contractId && contracts.some(contract => contract.contractsId === contractId)) {
      setExpandedContractId(contractId);
    }
  }, [contracts, routeSearchParams]);

  const getComplianceStatus = (contract: ContractDto): 'compliant' | 'warning' | 'violation' => {
    if (!contract.esignContractPdfUrl) return 'violation';
    if (!contract.description || contract.description.length < 10) return 'warning';
    return 'compliant';
  };

  const calculateComplianceScore = (contract: ContractDto): number => {
    let score = 100;
    if (!contract.title || contract.title.length === 0) score -= 25;
    if (contract.totalBudget === undefined || contract.totalBudget === null) score -= 25;
    if (!contract.startDate) score -= 25;
    if (!contract.esignContractPdfUrl) score -= 15;
    if (!contract.description || contract.description.length < 10) score -= 10;
    if (!contract.endDate) score -= 5;
    return Math.max(0, score);
  };

  const getComplianceRequirements = (contract: ContractDto): ComplianceRequirement[] => [
    {
      name: 'Scope Defined',
      met: !!contract.description && contract.description.length >= 10,
      description: 'Contract scope must be clearly defined in description'
    },
    {
      name: 'Budget Specified',
      met: contract.totalBudget !== undefined && contract.totalBudget > 0,
      description: 'Total budget must be specified'
    },
    {
      name: 'Terms Set',
      met: !!contract.startDate,
      description: 'Contract start date must be set for payment terms'
    },
    {
      name: 'Timeline Defined',
      met: !!contract.endDate,
      description: 'Contract timeline/end date must be defined'
    },
    {
      name: 'E-sign PDF Generated',
      met: !!contract.esignContractPdfUrl,
      description: 'Contract PDF & signatures must be generated for legal protection'
    },
  ];

  const isContractOverdue = (contract: ContractDto): boolean => {
    if (!contract.endDate) return false;
    return new Date(contract.endDate) < new Date() && contract.status === ContractStatus.Active;
  };

  const isContractAtRisk = (contract: ContractDto): boolean => {
    if (!contract.endDate) return false;
    const now = new Date();
    const endDate = new Date(contract.endDate);
    const daysRemaining = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysRemaining < 7 && daysRemaining >= 0 && contract.status === ContractStatus.Active;
  };

  const buildAuditContracts = (source: ContractDto[]): ContractAuditData[] =>
    source.map(c => ({
      ...c,
      complianceStatus: getComplianceStatus(c),
      complianceScore: calculateComplianceScore(c),
      complianceRequirements: getComplianceRequirements(c),
      isOverdue: isContractOverdue(c),
      isAtRisk: isContractAtRisk(c),
    }));

  const loadContractsList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminAPI.getContracts();

      if (response.success && response.data) {
        const apiContracts = Array.isArray(response.data) ? response.data : [];
        const mappedContracts = apiContracts.map(c => ({
          contractsId: c.contractsId,
          jobPostsId: c.jobPostsId,
          clientProfilesId: c.clientProfilesId,
          freelancerProfilesId: c.freelancerProfilesId || '',
          proposalsId: c.proposalsId || '',
          title: c.title,
          description: c.description || '',
          totalBudget: c.totalBudget,
          status: c.status,
          startDate: c.startDate || c.createdAt,
          endDate: c.endDate || undefined,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          esignContractPdfUrl: c.esignContractPdfUrl
        }));

        setContracts(buildAuditContracts(mappedContracts));
      } else {
        setContracts([]);
        setError(response.message || 'Failed to load contracts.');
      }
    } catch (err) {
      setContracts([]);
      setError('An unexpected error occurred while fetching contracts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContractsList();
  }, [loadContractsList]);

  const handleUpdateContract = async () => {
    if (!editingContract) return;
    if (!contractForm.title.trim()) {
      setContractActionError('Title is required');
      return;
    }
    setIsContractActionLoading(true);
    setContractActionError(null);
    try {
      const res = await adminAPI.updateContract(editingContract.contractsId, {
        title: contractForm.title,
        description: contractForm.description,
        totalBudget: contractForm.totalBudget,
        status: contractForm.status,
        startDate: contractForm.startDate || undefined,
        endDate: contractForm.endDate || undefined,
        esignContractPdfUrl: contractForm.esignContractPdfUrl || undefined
      });
      if (res.success) {
        await loadContractsList();
        setEditingContract(null);
      } else {
        setContractActionError(res.message || 'Failed to update contract');
      }
    } catch (err) {
      setContractActionError('An error occurred while updating the contract');
    } finally {
      setIsContractActionLoading(false);
    }
  };

  useEffect(() => {
    let result = contracts;

    if (selectedStatus !== 'All') {
      result = result.filter(c => c.status === selectedStatus);
    }

    if (selectedCompliance !== 'all') {
      result = result.filter(c => c.complianceStatus === selectedCompliance);
    }

    if (showOverdueOnly) {
      result = result.filter(c => c.isOverdue);
    }

    if (showAtRiskOnly) {
      result = result.filter(c => c.isAtRisk);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.contractsId.toLowerCase().includes(query) ||
        c.clientProfilesId.toLowerCase().includes(query) ||
        (c.freelancerProfilesId?.toLowerCase().includes(query) ?? false)
      );
    }

    setFilteredContracts(result);
  }, [contracts, selectedStatus, selectedCompliance, searchQuery, showOverdueOnly, showAtRiskOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / pageSize));
  const paginatedContracts = filteredContracts.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [pageSize, searchQuery, selectedCompliance, selectedStatus, showAtRiskOnly, showOverdueOnly]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const stats = useMemo(() => ({
    total: contracts.length,
    active: contracts.filter(c => c.status === ContractStatus.Active).length,
    completed: contracts.filter(c => c.status === ContractStatus.Completed).length,
    compliant: contracts.filter(c => c.complianceStatus === 'compliant').length,
    warnings: contracts.filter(c => c.complianceStatus === 'warning').length,
    violations: contracts.filter(c => c.complianceStatus === 'violation').length,
    overdue: contracts.filter(c => c.isOverdue).length,
    atRisk: contracts.filter(c => c.isAtRisk).length,
  }), [contracts]);

  const overdueContracts = useMemo(() => contracts.filter(c => c.isOverdue), [contracts]);
  const atRiskContracts = useMemo(() => contracts.filter(c => c.isAtRisk), [contracts]);

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
    const content = `
Contract Audit Report
Generated: ${new Date().toLocaleString()}
Total Contracts: ${filteredContracts.length}

=======================================
SUMMARY STATISTICS
=======================================
Total Contracts: ${contracts.length}
Active: ${stats.active}
Completed: ${stats.completed}
Compliant: ${stats.compliant}
Warnings: ${stats.warnings}
Violations: ${stats.violations}
Overdue: ${stats.overdue}
At Risk: ${stats.atRisk}

=======================================
CONTRACTS DETAIL
=======================================
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

  return (
    <AppLayout fullWidth>
      <div ref={containerRef} className="min-h-[calc(100vh-4rem)] bg-background text-text-primary">

        {/* Sticky Top Header Bar with ContractAreaTabs Toggle */}
        <header className="esign-gsap-header sticky top-0 z-40 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-brand">
                <Sparkles size={14} />
                Contracts & E-Sign Audit
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
                Contracts <span className="text-brand italic font-light">& E-Sign Management</span>
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-text-muted">Monitor platform contracts, review legal e-signatures, inspect compliance audit trails, and manage risks.</p>
            </div>

            {/* Navigation Tabs Bar (Exact Same Toggle as /admin/contracts/esign) */}
            <ContractAreaTabs />
          </div>
        </header>

        {/* Main Workspace Content */}
        <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 lg:px-8">

          {/* Stats Metrics Overview Grid */}
          <section aria-label="Contracts Metrics" className="esign-gsap-metrics grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Total</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-text-primary">{stats.total}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <FileText size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Active</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-cyan-400">{stats.active}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Clock size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Completed</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-emerald-400">{stats.completed}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Compliant</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-emerald-400">{stats.compliant}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Shield size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Warnings</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-amber-400">{stats.warnings}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <AlertCircle size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Violations</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-rose-400">{stats.violations}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                  <AlertTriangle size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Overdue</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-rose-400">{stats.overdue}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                  <Clock size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">At Risk</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-amber-400">{stats.atRisk}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <TrendingUp size={18} />
                </span>
              </div>
            </article>
          </section>

          {/* Error Notification Message */}
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">
              <AlertCircle size={20} />
              <p className="flex-1">{error}</p>
              <button type="button" onClick={() => setError(null)} className="cursor-pointer">✕</button>
            </div>
          )}

          {/* Risk Alerts Banner */}
          {(overdueContracts.length > 0 || atRiskContracts.length > 0) && (
            <section className="alerts-section space-y-3">
              {overdueContracts.length > 0 && (
                <div className="flex items-start gap-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold">
                    <AlertTriangle size={20} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-text-primary">Overdue Contracts Alert ({overdueContracts.length})</h3>
                    <p className="mt-0.5 text-xs font-bold text-text-secondary leading-relaxed">{overdueContracts.length} active contract(s) have exceeded their scheduled end date.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOverdueOnly(true);
                        setShowFilters(true);
                      }}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-300 hover:bg-rose-500/25 px-3.5 py-1.5 text-xs font-black cursor-pointer shadow-sm transition"
                    >
                      View Overdue Contracts
                    </button>
                  </div>
                </div>
              )}

              {atRiskContracts.length > 0 && (
                <div className="flex items-start gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold">
                    <Clock size={20} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-text-primary">At-Risk Contracts Alert ({atRiskContracts.length})</h3>
                    <p className="mt-0.5 text-xs font-bold text-text-secondary leading-relaxed">{atRiskContracts.length} contract(s) have less than 7 days remaining before deadline.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAtRiskOnly(true);
                        setShowFilters(true);
                      }}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300 hover:bg-amber-500/25 px-3.5 py-1.5 text-xs font-black cursor-pointer shadow-sm transition"
                    >
                      View At-Risk Contracts
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Search & Action Controls Section */}
          <section className="esign-gsap-main rounded-2xl border border-border bg-background p-4 shadow-sm space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by contract title, ID, client, or freelancer..."
                  className="input-gb w-full pl-10 pr-9 py-2 text-xs font-semibold"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted hover:text-text-primary">✕</button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-extrabold cursor-pointer transition ${showFilters ? 'border-brand bg-brand text-white' : 'border-border bg-background text-text-primary hover:border-brand/40'
                    }`}
                >
                  <Filter size={15} />
                  Filters
                </button>

                <button type="button" onClick={handleExportCSV} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-extrabold text-emerald-500 hover:bg-emerald-500/20 cursor-pointer transition">
                  <Download size={15} />
                  CSV
                </button>

                <button type="button" onClick={handleExportPDF} className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-extrabold text-purple-400 hover:bg-purple-500/20 cursor-pointer transition">
                  <FileText size={15} />
                  Report
                </button>

                <AdminTablePageSize pageSize={pageSize} totalEntries={filteredContracts.length} disabled={loading} onPageSizeChange={setPageSize} />
              </div>
            </div>

            {/* Filter Options Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border/50">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">Contract Status</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedStatus('All')}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${selectedStatus === 'All' ? 'bg-brand text-white' : 'bg-surface-muted/60 text-text-muted hover:text-text-primary'}`}
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
                        type="button"
                        onClick={() => setSelectedStatus(status.value)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${selectedStatus === status.value ? 'bg-brand text-white' : 'bg-surface-muted/60 text-text-muted hover:text-text-primary'}`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">Compliance Status</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCompliance('all')}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${selectedCompliance === 'all' ? 'bg-brand text-white' : 'bg-surface-muted/60 text-text-muted hover:text-text-primary'}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCompliance('compliant')}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${selectedCompliance === 'compliant' ? 'bg-brand text-white' : 'bg-surface-muted/60 text-text-muted hover:text-text-primary'}`}
                    >
                      Compliant
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCompliance('warning')}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${selectedCompliance === 'warning' ? 'bg-brand text-white' : 'bg-surface-muted/60 text-text-muted hover:text-text-primary'}`}
                    >
                      Warnings
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCompliance('violation')}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${selectedCompliance === 'violation' ? 'bg-brand text-white' : 'bg-surface-muted/60 text-text-muted hover:text-text-primary'}`}
                    >
                      Violations
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">Risk Status</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowOverdueOnly(!showOverdueOnly)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${showOverdueOnly ? 'bg-rose-500 text-white' : 'bg-surface-muted/60 text-text-muted hover:text-text-primary'}`}
                    >
                      Overdue Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAtRiskOnly(!showAtRiskOnly)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${showAtRiskOnly ? 'bg-amber-500 text-white' : 'bg-surface-muted/60 text-text-muted hover:text-text-primary'}`}
                    >
                      At Risk Only
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Contracts List with Responsive Flex Truncation Protection */}
            {loading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
                <FileCheck2 size={42} className="text-brand animate-pulse" />
                <p className="mt-2 text-sm font-extrabold text-text-primary">Loading contracts data...</p>
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center space-y-2">
                <FileText size={42} className="text-text-muted/40" />
                <h3 className="text-sm font-black text-text-primary">No contracts found</h3>
                <p className="text-xs font-semibold text-text-muted">Try adjusting search query, status, or compliance filters.</p>
              </div>
            ) : (
              <div className="contracts-list space-y-3">
                {paginatedContracts.map((contract, index) => (
                  <div
                    key={contract.contractsId}
                    className={`rounded-2xl border transition overflow-hidden ${expandedContractId === contract.contractsId
                        ? 'border-brand bg-brand/5 shadow-sm'
                        : 'border-border bg-background hover:border-brand/40'
                      }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4">
                      {/* Left Info Column with flex-1 min-w-0 */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-extrabold text-xs">
                          #{((page - 1) * pageSize) + index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="text-sm font-extrabold text-text-primary truncate flex-1 min-w-0" title={contract.title}>
                              {contract.title}
                            </h3>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${contract.status === ContractStatus.Active ? 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400' :
                                contract.status === ContractStatus.Completed ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' :
                                  'border border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400'
                              }`}>
                              {getContractStatusLabel(contract.status)}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-text-muted font-mono mt-0.5 truncate">ID: {contract.contractsId}</p>
                        </div>
                      </div>

                      {/* Right Metrics & Action Column with shrink-0 */}
                      <div className="flex items-center flex-wrap gap-3 shrink-0">
                        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-muted/40 px-3 py-1.5 text-xs">
                          <GCoinIcon size={16} />
                          <div>
                            <p className="text-[9px] font-black uppercase text-text-muted">Budget</p>
                            <p className="font-extrabold text-text-primary">{formatContractAmount(contract.totalBudget)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-muted/40 px-3 py-1.5 text-xs">
                          <Calendar size={16} className="text-brand" />
                          <div>
                            <p className="text-[9px] font-black uppercase text-text-muted">Timeline</p>
                            <p className="font-extrabold text-text-primary">{formatContractDate(contract.startDate)} - {formatContractDate(contract.endDate)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs">
                          <BarChart3 size={16} className="text-brand" />
                          <div>
                            <p className="text-[9px] font-black uppercase text-brand">Score</p>
                            <p className="font-extrabold text-brand">{contract.complianceScore}%</p>
                          </div>
                        </div>

                        <span className={getComplianceBadgeClass(contract.complianceStatus)}>
                          {contract.complianceStatus?.toUpperCase() || 'UNKNOWN'}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedContractId(
                              expandedContractId === contract.contractsId ? null : contract.contractsId
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/10 px-3.5 py-2 text-xs font-extrabold text-brand hover:bg-brand/20 transition cursor-pointer"
                        >
                          <span>Details</span>
                          <ChevronDown size={15} className={`transition-transform ${expandedContractId === contract.contractsId ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Row Expansion Drawer Details */}
                    {expandedContractId === contract.contractsId && (
                      <div className="border-t border-border/60 bg-surface-muted/20 p-4 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                          <div className="rounded-xl border border-border/50 bg-background p-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Client ID</span>
                            <p className="text-xs font-bold text-text-primary truncate mt-0.5">{contract.clientProfilesId}</p>
                          </div>
                          <div className="rounded-xl border border-border/50 bg-background p-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Freelancer ID</span>
                            <p className="text-xs font-bold text-text-primary truncate mt-0.5">{contract.freelancerProfilesId || 'Pending'}</p>
                          </div>
                          <div className="rounded-xl border border-border/50 bg-background p-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Total Budget</span>
                            <p className="text-xs font-bold text-text-primary mt-0.5">{formatContractAmount(contract.totalBudget)}</p>
                          </div>
                          <div className="rounded-xl border border-border/50 bg-background p-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Start Date</span>
                            <p className="text-xs font-bold text-text-primary mt-0.5">{formatContractDate(contract.startDate)}</p>
                          </div>
                          <div className="rounded-xl border border-border/50 bg-background p-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">End Date</span>
                            <p className="text-xs font-bold text-text-primary mt-0.5">{formatContractDate(contract.endDate)}</p>
                          </div>
                          <div className="rounded-xl border border-border/50 bg-background p-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">E-sign PDF</span>
                            <p className="text-xs font-bold text-emerald-400 mt-0.5">
                              {contract.esignContractPdfUrl ? '✓ E-Sign PDF Ready' : '❌ No PDF Document'}
                            </p>
                          </div>
                        </div>

                        {contract.description && (
                          <div className="rounded-xl border border-border/50 bg-background p-3.5 space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Scope Description</span>
                            <p className="text-xs font-medium text-text-secondary leading-relaxed">{contract.description}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2 text-xs font-extrabold text-brand hover:bg-brand/20 transition cursor-pointer"
                            onClick={() => {
                              setEditingContract(contract);
                              setContractForm({
                                title: contract.title,
                                description: contract.description || '',
                                totalBudget: contract.totalBudget,
                                status: contract.status,
                                startDate: contract.startDate ? new Date(contract.startDate).toISOString().substring(0, 10) : '',
                                endDate: contract.endDate ? new Date(contract.endDate).toISOString().substring(0, 10) : '',
                                esignContractPdfUrl: contract.esignContractPdfUrl || '',
                              });
                            }}
                          >
                            <Edit size={15} /> Edit Contract
                          </button>

                          {contract.esignContractPdfUrl && (
                            <a
                              href={contract.esignContractPdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-extrabold text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                            >
                              <Download size={15} /> View E-Sign Document
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Footer */}
            {filteredContracts.length > 0 && (
              <AdminTablePagination
                currentPage={page}
                totalPages={totalPages}
                disabled={loading}
                onPageChange={setPage}
              />
            )}
          </section>
        </main>

        {/* Modal Edit Contract Form */}
        {editingContract && (
          <div className="modal-backdrop">
            <div className="modal-card space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-black text-text-primary">Edit Contract</h3>
                <button type="button" onClick={() => setEditingContract(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              {contractActionError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-400">
                  <AlertCircle size={16} />
                  <p>{contractActionError}</p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">Title</label>
                  <input
                    value={contractForm.title}
                    onChange={e => setContractForm({ ...contractForm, title: e.target.value })}
                    className="input-gb w-full py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">Total Budget (GCoin)</label>
                  <input
                    type="number"
                    value={contractForm.totalBudget}
                    onChange={e => setContractForm({ ...contractForm, totalBudget: Number(e.target.value) })}
                    className="input-gb w-full py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">E-Sign Document URL</label>
                  <input
                    value={contractForm.esignContractPdfUrl}
                    onChange={e => setContractForm({ ...contractForm, esignContractPdfUrl: e.target.value })}
                    placeholder="https://..."
                    className="input-gb w-full py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">Description</label>
                  <textarea
                    value={contractForm.description}
                    onChange={e => setContractForm({ ...contractForm, description: e.target.value })}
                    rows={4}
                    className="input-gb w-full py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setEditingContract(null)} className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-extrabold text-text-primary hover:border-brand/40 transition cursor-pointer" disabled={isContractActionLoading}>
                  Cancel
                </button>
                <button type="button" onClick={handleUpdateContract} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white hover:opacity-90 transition cursor-pointer shadow-sm" disabled={isContractActionLoading}>
                  <Save size={15} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
