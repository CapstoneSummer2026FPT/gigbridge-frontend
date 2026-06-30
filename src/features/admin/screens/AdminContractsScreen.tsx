import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, Filter, FileText, Eye, Edit, MoreVertical, Calendar, Users, CheckCircle, XCircle, Clock, AlertCircle, Download, FileSignature } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { DB } from '../../../mock_backend';
import '../styles/admin-users-screen.css';

type Contract = {
  id: string;
  title: string;
  description: string;
  clientId: string;
  freelancerId: string;
  jobId: string;
  proposalId: string;
  totalBudget: number;
  status: 'active' | 'completed' | 'cancelled' | 'disputed';
  startDate: string;
  endDate?: string;
  eSign?: {
    id: string;
    clientName: string;
    freelancerName: string;
    url: string;
    createdAt: string;
  };
};

type ContractFilter = 'all' | 'active' | 'completed' | 'cancelled' | 'disputed';
type ContractSort = 'startDate' | 'title' | 'budget';

// Mock contract data
const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'cont_1',
    title: 'Full-Stack Web Development Contract',
    description: 'Development of e-commerce platform with React and Node.js',
    clientId: 'user_client_1',
    freelancerId: 'user_freelancer_1',
    jobId: 'job_1',
    proposalId: 'prop_1',
    totalBudget: 5000,
    status: 'active',
    startDate: '2024-05-01',
    eSign: {
      id: 'esign_1',
      clientName: 'TechCorp Inc.',
      freelancerName: 'John Developer',
      url: '/contracts/esign_1.pdf',
      createdAt: '2024-05-01T10:00:00Z',
    },
  },
  {
    id: 'cont_2',
    title: 'Mobile App UI/UX Design',
    description: 'Design mobile app interface for iOS and Android',
    clientId: 'user_client_2',
    freelancerId: 'user_freelancer_2',
    jobId: 'job_2',
    proposalId: 'prop_2',
    totalBudget: 3500,
    status: 'completed',
    startDate: '2024-04-15',
    endDate: '2024-05-10',
    eSign: {
      id: 'esign_2',
      clientName: 'StartupXYZ',
      freelancerName: 'Sarah Designer',
      url: '/contracts/esign_2.pdf',
      createdAt: '2024-04-15T09:30:00Z',
    },
  },
  {
    id: 'cont_3',
    title: 'Content Writing - Blog Articles',
    description: '10 SEO-optimized blog articles for tech website',
    clientId: 'user_client_3',
    freelancerId: 'user_freelancer_3',
    jobId: 'job_3',
    proposalId: 'prop_3',
    totalBudget: 1200,
    status: 'active',
    startDate: '2024-05-05',
  },
  {
    id: 'cont_4',
    title: 'Data Analysis Project',
    description: 'Customer behavior analysis using Python and SQL',
    clientId: 'user_client_4',
    freelancerId: 'user_freelancer_4',
    jobId: 'job_4',
    proposalId: 'prop_4',
    totalBudget: 2800,
    status: 'disputed',
    startDate: '2024-04-20',
  },
];

export default function AdminContractsScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContractFilter>('all');
  const [sortBy, setSortBy] = useState<ContractSort>('startDate');
  const [viewContract, setViewContract] = useState<Contract | null>(null);
  const [editTemplate, setEditTemplate] = useState(false);
  const [templateContent, setTemplateContent] = useState(`FREELANCE SERVICE AGREEMENT

This Agreement is entered into as of [START_DATE] between:

CLIENT: [CLIENT_NAME]
FREELANCER: [FREELANCER_NAME]

1. SCOPE OF WORK
[DESCRIPTION]

2. COMPENSATION
Total Budget: [TOTAL_BUDGET] G-coin
Contract Type: Fixed Price

3. TERM
This agreement shall commence on [START_DATE] and continue until completion.

4. PAYMENT TERMS
Payment shall be made according to the agreed milestones and terms.

5. INTELLECTUAL PROPERTY
All work products created under this agreement shall be owned by the Client upon full payment.

6. CONFIDENTIALITY
Both parties agree to maintain confidentiality of all proprietary information.

7. TERMINATION
Either party may terminate this agreement with written notice.

_________________________
Client Signature

_________________________
Freelancer Signature`);

  const allContracts = MOCK_CONTRACTS;

  // Filter and sort contracts
  const filteredContracts = useMemo(() => {
    let filtered = allContracts.filter(contract => {
      const matchesSearch = searchQuery === '' ||
        contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterType === 'all' ? true :
        contract.status === filterType;

      return matchesSearch && matchesFilter;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'startDate') return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      if (sortBy === 'budget') return b.totalBudget - a.totalBudget;
      return 0;
    });

    return filtered;
  }, [allContracts, searchQuery, filterType, sortBy]);

  const stats = useMemo(() => {
    const total = allContracts.length;
    const active = allContracts.filter(c => c.status === 'active').length;
    const completed = allContracts.filter(c => c.status === 'completed').length;
    const cancelled = allContracts.filter(c => c.status === 'cancelled').length;
    const disputed = allContracts.filter(c => c.status === 'disputed').length;
    const eSigned = allContracts.filter(c => c.eSign).length;

    return { total, active, completed, cancelled, disputed, eSigned };
  }, [allContracts]);

  const getStatusBadge = (status: string) => {
    if (status === 'active') return <span className="badge-green text-xs">Active</span>;
    if (status === 'completed') return <span className="badge-cyan text-xs">Completed</span>;
    if (status === 'cancelled') return <span className="badge-gray text-xs">Cancelled</span>;
    return <span className="badge-red text-xs">Disputed</span>;
  };

  const getClientName = (clientId: string) => {
    const user = DB.getUserById(clientId);
    return user?.full_name || 'Unknown Client';
  };

  const getFreelancerName = (freelancerId: string) => {
    const user = DB.getUserById(freelancerId);
    return user?.full_name || 'Unknown Freelancer';
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText size={20} className="text-cyan" />
                <span className="badge-cyan text-xs">Contract Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Manage Contracts</h1>
              <p className="text-sm text-secondary mt-1">View and manage all platform contracts</p>
            </div>
            <button
              onClick={() => setEditTemplate(true)}
              className="btn-cyan px-4 py-2 text-sm flex items-center gap-2"
            >
              <Edit size={16} />
              Edit Template
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
              { label: 'Total Contracts', value: stats.total.toString(), icon: <FileText size={16} />, color: 'cyan' },
              { label: 'Active', value: stats.active.toString(), icon: <CheckCircle size={16} />, color: 'green' },
              { label: 'Completed', value: stats.completed.toString(), icon: <CheckCircle size={16} />, color: 'cyan' },
              { label: 'Cancelled', value: stats.cancelled.toString(), icon: <XCircle size={16} />, color: 'gray' },
              { label: 'Disputed', value: stats.disputed.toString(), icon: <AlertCircle size={16} />, color: 'red' },
              { label: 'E-Signed', value: stats.eSigned.toString(), icon: <FileSignature size={16} />, color: 'purple' },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-secondary truncate">{stat.label}</p>
                  <span className={`icon-${stat.color} flex-shrink-0`}>{stat.icon}</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-primary">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters and Search */}
          <div className="glass-card overflow-hidden mb-6">
            <div className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-gradient-to-r from-cyan/5 to-purple/5">
              <Filter size={18} className="text-cyan flex-shrink-0" />
              <h3 className="font-semibold text-primary text-sm sm:text-base">Search & Filters</h3>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by title or description..."
                    className="input-gb w-full py-3 text-sm"
                    style={{ paddingLeft: '3rem', paddingRight: '1rem' }}
                  />
                </div>

                {/* Filters Row */}
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { type: 'all', label: 'All Contracts', icon: <FileText size={14} />, color: 'cyan' },
                      { type: 'active', label: 'Active', icon: <CheckCircle size={14} />, color: 'green' },
                      { type: 'completed', label: 'Completed', icon: <CheckCircle size={14} />, color: 'cyan' },
                      { type: 'cancelled', label: 'Cancelled', icon: <XCircle size={14} />, color: 'gray' },
                      { type: 'disputed', label: 'Disputed', icon: <AlertCircle size={14} />, color: 'red' },
                    ].map(filter => (
                      <button
                        key={filter.type}
                        onClick={() => setFilterType(filter.type as ContractFilter)}
                        className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                          filterType === filter.type
                            ? `bg-${filter.color}/20 text-${filter.color} border border-${filter.color} shadow-lg shadow-${filter.color}/20`
                            : 'glass-button text-secondary hover:text-primary hover:border-white/20'
                        }`}
                      >
                        <span className={filterType === filter.type ? `text-${filter.color}` : 'text-muted'}>
                          {filter.icon}
                        </span>
                        <span>{filter.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-secondary">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as ContractSort)}
                      className="input-gb px-3 sm:px-4 py-2 pr-8 sm:pr-10 flex-1 sm:flex-initial sm:min-w-[160px] text-xs sm:text-sm font-medium cursor-pointer"
                    >
                      <option value="startDate">Newest First</option>
                      <option value="title">Title A-Z</option>
                      <option value="budget">Highest Budget</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs sm:text-sm text-secondary">
              Showing <span className="text-primary font-semibold">{filteredContracts.length}</span> of <span className="text-primary font-semibold">{allContracts.length}</span> contracts
            </p>
          </div>

          {/* Contracts Cards */}
          <div className="space-y-4">
            {filteredContracts.map(contract => (
              <div key={contract.id} className="glass-card p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base sm:text-lg font-bold text-primary truncate flex-1">{contract.title}</h3>
                      <div className="flex gap-2 ml-2 flex-shrink-0">
                        {getStatusBadge(contract.status)}
                        {contract.eSign && (
                          <span className="badge-purple text-xs flex items-center gap-1">
                            <FileSignature size={10} />
                            E-Signed
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-secondary line-clamp-2 mb-3">{contract.description}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-muted mb-1">Client</p>
                        <p className="text-primary font-medium truncate">{getClientName(contract.clientId)}</p>
                      </div>
                      <div>
                        <p className="text-muted mb-1">Freelancer</p>
                        <p className="text-primary font-medium truncate">{getFreelancerName(contract.freelancerId)}</p>
                      </div>
                      <div>
                        <p className="text-muted mb-1">Budget</p>
                        <div className="flex items-center gap-1">
                          <GCoinIcon size={12} />
                          <span className="text-primary font-semibold">
                            {contract.totalBudget.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted mb-1">Start Date</p>
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-cyan" />
                          <span className="text-primary font-medium">
                            {new Date(contract.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      {contract.endDate && (
                        <div>
                          <p className="text-muted mb-1">End Date</p>
                          <div className="flex items-center gap-1">
                            <Calendar size={12} className="text-purple" />
                            <span className="text-primary font-medium">
                              {new Date(contract.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 lg:flex-col lg:w-auto">
                    <button
                      onClick={() => setViewContract(contract)}
                      className="flex-1 lg:flex-initial btn-ghost-cyan px-4 py-2 text-xs flex items-center justify-center gap-2"
                    >
                      <Eye size={14} />
                      View Details
                    </button>
                    {contract.eSign && (
                      <button
                        className="flex-1 lg:flex-initial btn-ghost-purple px-4 py-2 text-xs flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredContracts.length === 0 && (
              <div className="glass-card text-center py-16">
                <FileText size={48} className="mx-auto mb-4 text-muted" />
                <p className="text-primary font-medium mb-2">No contracts found</p>
                <p className="text-sm text-secondary">Try adjusting your search or filters</p>
              </div>
            )}
          </div>

          {/* View Contract Detail Modal */}
          {viewContract && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewContract(null)}>
              <div className="glass-card max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-primary">Contract Details</h2>
                  <button
                    onClick={() => setViewContract(null)}
                    className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle size={20} className="text-red" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Contract Header */}
                  <div className="glass-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-primary mb-2">{viewContract.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(viewContract.status)}
                          <span className="badge-purple text-xs">Fixed Price</span>
                          {viewContract.eSign && (
                            <span className="badge-purple text-xs flex items-center gap-1">
                              <FileSignature size={12} />
                              E-Signed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted mb-1">Contract ID</p>
                        <p className="text-sm font-semibold text-primary font-mono">{viewContract.id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted mb-1">Total Budget</p>
                        <div className="flex items-center gap-1">
                          <GCoinIcon size={14} />
                          <p className="text-sm font-semibold text-primary">
                            {viewContract.totalBudget.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted mb-1">Start Date</p>
                        <div className="flex items-center gap-1">
                          <Calendar size={14} className="text-cyan" />
                          <p className="text-sm font-semibold text-primary">
                            {new Date(viewContract.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      {viewContract.endDate && (
                        <div>
                          <p className="text-xs text-muted mb-1">End Date</p>
                          <div className="flex items-center gap-1">
                            <Calendar size={14} className="text-purple" />
                            <p className="text-sm font-semibold text-primary">
                              {new Date(viewContract.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="glass-card p-5">
                    <h4 className="text-sm font-semibold text-primary mb-3">Description</h4>
                    <p className="text-sm text-secondary leading-relaxed">{viewContract.description}</p>
                  </div>

                  {/* Parties */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-card p-5">
                      <h4 className="text-sm font-semibold text-primary mb-3">Client</h4>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-sm font-bold text-white">
                          {getClientName(viewContract.clientId).split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary">{getClientName(viewContract.clientId)}</p>
                          <p className="text-xs text-secondary">Client ID: {viewContract.clientId}</p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card p-5">
                      <h4 className="text-sm font-semibold text-primary mb-3">Freelancer</h4>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green to-cyan flex items-center justify-center text-sm font-bold text-white">
                          {getFreelancerName(viewContract.freelancerId).split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary">{getFreelancerName(viewContract.freelancerId)}</p>
                          <p className="text-xs text-secondary">Freelancer ID: {viewContract.freelancerId}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* E-Sign Info */}
                  {viewContract.eSign && (
                    <div className="glass-card p-5">
                      <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                        <FileSignature size={16} className="text-purple" />
                        E-Signature Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted mb-1">Client Name</p>
                          <p className="text-primary font-medium">{viewContract.eSign.clientName}</p>
                        </div>
                        <div>
                          <p className="text-muted mb-1">Freelancer Name</p>
                          <p className="text-primary font-medium">{viewContract.eSign.freelancerName}</p>
                        </div>
                        <div>
                          <p className="text-muted mb-1">Signed At</p>
                          <p className="text-primary font-medium">
                            {new Date(viewContract.eSign.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted mb-1">Document</p>
                          <button className="text-cyan text-sm font-medium hover:underline flex items-center gap-1">
                            <Download size={12} />
                            Download PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="glass-card p-5">
                    <h4 className="text-sm font-semibold text-primary mb-3">Additional Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted mb-1">Job Post ID</p>
                        <p className="text-primary font-mono text-xs">{viewContract.jobId}</p>
                      </div>
                      <div>
                        <p className="text-muted mb-1">Proposal ID</p>
                        <p className="text-primary font-mono text-xs">{viewContract.proposalId}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setViewContract(null)}
                    className="btn-ghost-cyan px-6 py-2"
                  >
                    Close
                  </button>
                  {viewContract.eSign && (
                    <button className="btn-cyan px-6 py-2 flex items-center gap-2">
                      <Download size={16} />
                      Download Contract
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Edit Template Modal */}
          {editTemplate && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditTemplate(false)}>
              <div className="glass-card max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-primary">Edit Contract Template</h2>
                  <button
                    onClick={() => setEditTemplate(false)}
                    className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle size={20} className="text-red" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="glass-card p-4 bg-cyan/5">
                    <h4 className="text-sm font-semibold text-primary mb-2">Available Variables</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <code className="text-cyan">[CLIENT_NAME]</code>
                      <code className="text-cyan">[FREELANCER_NAME]</code>
                      <code className="text-cyan">[START_DATE]</code>
                      <code className="text-cyan">[DESCRIPTION]</code>
                      <code className="text-cyan">[TOTAL_BUDGET]</code>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-primary mb-2 block">Template Content</label>
                    <textarea
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      className="input-gb w-full h-96 font-mono text-sm"
                      placeholder="Enter contract template..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setEditTemplate(false)}
                    className="btn-ghost-cyan px-6 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      alert('Template saved successfully!');
                      setEditTemplate(false);
                    }}
                    className="btn-cyan px-6 py-2 flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
