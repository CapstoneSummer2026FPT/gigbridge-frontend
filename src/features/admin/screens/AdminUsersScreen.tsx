import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { Search, Filter, Users, UserCheck, UserX, Shield, Ban, CheckCircle, XCircle, Eye, Edit, MoreVertical, Download, Mail, Calendar, Briefcase, Plus, KeyRound, Phone, Flag, Wallet, Folder, File as FileIcon, Image, Film, FileText, Crown } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { adminAPI } from '../../../api/adminAPI';
import type { AdminUserDto, User } from '../../../types';
import { UserRole } from '../../../types';
import '../styles/admin-users-screen.css';

type UserFilter = 'all' | 'client' | 'freelancer' | 'premium' | 'admin' | 'banned';
type UserSort = 'name' | 'joined' | 'status';

const isUserSuspended = (user: User): boolean => {
  if (!user.suspended_until) {
    return false;
  }

  return new Date(user.suspended_until).getTime() > Date.now();
};

const getUserStatusRank = (user: User): number => {
  if (isUserSuspended(user)) return 2;
  if (!user.is_active) return 3;
  if (!user.is_email_verified) return 1;
  return 0;
};

const initialCreateForm = {
  fullName: '',
  email: '',
  password: '',
  phoneNumber: '',
  role: UserRole.Client,
  isEmailVerified: false,
};

const mapAdminUserDtoToUser = (dto: AdminUserDto): User => {
  const spaceIndex = dto.fullName.indexOf(' ');
  const firstName = spaceIndex >= 0 ? dto.fullName.slice(0, spaceIndex) : dto.fullName;
  const lastName = spaceIndex >= 0 ? dto.fullName.slice(spaceIndex + 1) : '';
  // Premium is a freelancer-only entitlement. Use an explicit boolean check so
  // malformed values such as "false" cannot become truthy in the admin UI.
  const isPremium = dto.role === UserRole.Freelancer && dto.isPremium === true;

  return {
    id: dto.userId,
    email: dto.email,
    first_name: firstName,
    last_name: lastName,
    full_name: dto.fullName,
    phone_number: dto.phoneNumber ?? null,
    role: dto.role as UserRole,
    is_email_verified: dto.isEmailVerified,
    is_active: dto.isActive,
    suspended_until: dto.suspendedUntil ?? null,
    suspended_at: dto.suspendedAt ?? null,
    suspension_reason: dto.suspensionReason ?? null,
    is_setup: false,
    preferred_language: dto.preferredLanguage || 'en',
    last_login_at: null,
    login_failed_time: null,
    access_failed_count: 0,
    elo_points: 0,
    gigcoin_balance: 0,
    open_report_count: dto.openReportCount,
    is_currently_reported: dto.isCurrentlyReported,
    is_premium: isPremium,
    premium_until: isPremium ? dto.premiumUntil ?? null : null,
    created_at: dto.createdAt,
    updated_at: dto.updatedAt || dto.createdAt,
  };
};

export default function AdminUsersScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<UserFilter>('all');
  const [sortBy, setSortBy] = useState<UserSort>('joined');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [previewUser, setPreviewUser] = useState<User | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'ban' | 'unban' | 'clearSuspension' | 'role', user: User, newRole?: 0 | 1 | 2 } | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '' });

  // Wallet moderation states
  const [activeTab, setActiveTab] = useState<'profile' | 'wallet' | 'assets'>('profile');
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [walletHistory, setWalletHistory] = useState<any[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // User assets states
  const [userAssets, setUserAssets] = useState<any[]>([]);
  const [isLoadingUserAssets, setIsLoadingUserAssets] = useState(false);
  const [userAssetSearch, setUserAssetSearch] = useState('');
  const [userAssetTypeFilter, setUserAssetTypeFilter] = useState<'all' | 'Deliverable' | 'MilestoneAttachment'>('all');
  const [userAssetJobFilter, setUserAssetJobFilter] = useState<string>('all');
  const [amount, setAmount] = useState<string>('');
  const [walletNote, setWalletNote] = useState<string>('');
  const [walletActionLoading, setWalletActionLoading] = useState(false);

  const loadUserWallet = async (userId: string) => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const balanceRes = await adminAPI.getWalletBalance(userId);
      const historyRes = await adminAPI.getWalletHistory(userId);
      if (balanceRes.success) {
        setWalletInfo(balanceRes.data);
      } else {
        setWalletError(balanceRes.message || 'Failed to load wallet balance.');
      }
      if (historyRes.success) {
        setWalletHistory(historyRes.data || []);
      }
    } catch (err) {
      setWalletError('An unexpected error occurred while loading wallet info.');
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    if (previewUser && activeTab === 'wallet') {
      loadUserWallet(previewUser.id);
    } else {
      setWalletInfo(null);
      setWalletHistory([]);
      setWalletError(null);
      setAmount('');
      setWalletNote('');
    }
  }, [previewUser, activeTab]);

  useEffect(() => {
    if (previewUser && activeTab === 'assets') {
      const loadUserAssets = async () => {
        setIsLoadingUserAssets(true);
        try {
          const res = await adminAPI.getAssets({ uploadedByUserId: previewUser.id });
          if (res.success && res.data) {
            setUserAssets(res.data);
          } else {
            setUserAssets([]);
          }
        } catch (err) {
          console.error("Failed to load user assets:", err);
          setUserAssets([]);
        } finally {
          setIsLoadingUserAssets(false);
        }
      };
      loadUserAssets();
    } else if (!previewUser) {
      setUserAssets([]);
      setUserAssetSearch('');
      setUserAssetTypeFilter('all');
      setUserAssetJobFilter('all');
    }
  }, [previewUser, activeTab]);

  const uniqueJobsFromAssets = useMemo(() => {
    const jobsMap = new Map<string, string>();
    userAssets.forEach(a => {
      if (a.contractId && a.contractTitle) {
        jobsMap.set(a.contractId, a.contractTitle);
      }
    });
    return Array.from(jobsMap.entries()).map(([id, title]) => ({ id, title }));
  }, [userAssets]);

  const filteredUserAssets = useMemo(() => {
    return userAssets.filter(asset => {
      const matchesSearch = userAssetSearch === '' ||
        asset.fileName.toLowerCase().includes(userAssetSearch.toLowerCase()) ||
        asset.contractTitle.toLowerCase().includes(userAssetSearch.toLowerCase());

      const matchesType = userAssetTypeFilter === 'all' || asset.assetType === userAssetTypeFilter;

      const matchesJob = userAssetJobFilter === 'all' || asset.contractId === userAssetJobFilter;

      return matchesSearch && matchesType && matchesJob;
    });
  }, [userAssets, userAssetSearch, userAssetTypeFilter, userAssetJobFilter]);

  const getFileIcon = (mimeType?: string, fileName?: string) => {
    const name = fileName?.toLowerCase() || '';
    const mime = mimeType?.toLowerCase() || '';

    if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) {
      return <Image size={14} className="text-cyan flex-shrink-0" />;
    }
    if (mime.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(name)) {
      return <Film size={14} className="text-purple flex-shrink-0" />;
    }
    if (mime === 'application/pdf' || name.endsWith('.pdf')) {
      return <FileText size={14} className="text-red flex-shrink-0" />;
    }
    return <FileIcon size={14} className="text-secondary flex-shrink-0" />;
  };

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null || bytes === 0) return 'Unknown Size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (!showActionMenu) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-action-menu-container')) {
        setShowActionMenu(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [showActionMenu]);

  const handleWalletAction = async (type: 'credit' | 'debit') => {
    if (!previewUser) return;
    const tokenAmount = parseFloat(amount);
    if (isNaN(tokenAmount) || tokenAmount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    const currentBalance = walletInfo?.availableTokens ?? 0;

    if (type === 'debit' && currentBalance < tokenAmount) {
      alert('Insufficient wallet balance for debit.');
      return;
    }

    setWalletActionLoading(true);
    try {
      const payload = {
        tokenAmount: tokenAmount,
        note: walletNote.trim() || `${type === 'credit' ? 'Credited' : 'Debited'} ${tokenAmount} G-coins via admin adjustment.`,
        idempotencyKey: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
      };

      const response = type === 'credit'
        ? await adminAPI.creditWallet(previewUser.id, payload)
        : await adminAPI.debitWallet(previewUser.id, payload);

      if (response.success) {
        const newBalance = type === 'credit' ? currentBalance + tokenAmount : currentBalance - tokenAmount;
        alert(`Wallet balance updated successfully! New balance: ${newBalance} G-coins.`);
        setAmount('');
        setWalletNote('');
        await loadUserWallet(previewUser.id);
      } else {
        alert(response.message || 'Failed to update wallet balance.');
      }
    } catch (err) {
      alert('An error occurred while executing wallet action.');
    } finally {
      setWalletActionLoading(false);
    }
  };


  // Real API state
  const [users, setUsers] = useState<User[]>([]);
  const [reportedUserTotal, setReportedUserTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const response = await adminAPI.getAllUsers();
    if (response.success && response.data) {
      setUsers(response.data.items.map(mapAdminUserDtoToUser));
      setReportedUserTotal(
        response.data.reportedUserCount
        ?? response.data.items.filter(user => user.isCurrentlyReported).length
        ?? 0,
      );
    } else {
      setUsers([]);
      setReportedUserTotal(0);
    }
    setLoading(false);
  };

  const allUsers = users;

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let filtered = allUsers.filter(user => {
      const matchesSearch = searchQuery === '' ||
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterType === 'all' ? true :
          filterType === 'client' ? user.role === 0 :
            filterType === 'freelancer' ? user.role === 1 :
              filterType === 'premium' ? user.is_premium === true :
              filterType === 'admin' ? user.role === 2 :
                filterType === 'banned' ? !user.is_active || isUserSuspended(user) : true;

      return matchesSearch && matchesFilter;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
      if (sortBy === 'joined') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'status') return getUserStatusRank(a) - getUserStatusRank(b);
      return 0;
    });

    return filtered;
  }, [allUsers, searchQuery, filterType, sortBy]);

  const stats = useMemo(() => {
    const total = allUsers.length;
    const clients = allUsers.filter(u => u.role === 0).length;
    const freelancers = allUsers.filter(u => u.role === 1).length;
    const admins = allUsers.filter(u => u.role === 2).length;
    const banned = allUsers.filter(u => !u.is_active || isUserSuspended(u)).length;
    const verified = allUsers.filter(u => u.is_email_verified).length;
    const premium = allUsers.filter(u => u.is_premium).length;
    const reported = reportedUserTotal;

    return { total, clients, freelancers, admins, banned, verified, premium, reported };
  }, [allUsers, reportedUserTotal]);

  const handleBanUser = async (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      const response = await adminAPI.toggleUserActivity(user.email);
      if (response.success) {
        await loadUsers();
      } else {
        alert(response.message || 'Failed to update user status');
      }
      setShowActionMenu(null);
    }
  };

  const handleClearSuspension = async (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      const response = await adminAPI.clearUserSuspension(user.email);
      if (response.success) {
        await loadUsers();
      } else {
        alert(
          response.statusCode === 404
            ? 'Clear suspension endpoint was not found. Please restart or update the backend API.'
            : response.message || 'Failed to clear user suspension'
        );
      }
      setShowActionMenu(null);
    }
  };

  const handlePremiumAction = async (user: User) => {
    if (user.role !== UserRole.Freelancer) return;
    const action = user.is_premium ? 'revoke Premium from' : 'promote to Premium';
    if (!window.confirm(`Are you sure you want to ${action} ${user.full_name}?`)) return;
    const response = user.is_premium
      ? await adminAPI.revokeUserPremium(user.id)
      : await adminAPI.grantUserPremium(user.id);
    if (!response.success) alert(response.message || 'Failed to update Premium status.');
    else await loadUsers();
    setShowActionMenu(null);
  };

  const handleChangeRole = async (_userId: string, _newRole: 0 | 1 | 2) => {
    alert('Role changes are not yet supported through the API. This will be integrated in Step 2.');
    setShowActionMenu(null);
  };

  const handleCreateUser = async () => {
    const fullName = createForm.fullName.trim();
    const email = createForm.email.trim();
    const password = createForm.password;
    const phoneNumber = createForm.phoneNumber.trim();

    if (!fullName || !email || !password) {
      setCreateError('Full name, email, and password are required.');
      return;
    }

    if (password.length < 6) {
      setCreateError('Password must be at least 6 characters.');
      return;
    }

    setCreatingUser(true);
    setCreateError(null);

    const response = await adminAPI.createUser({
      fullName,
      email,
      password,
      role: createForm.role,
      phoneNumber: phoneNumber || undefined,
      isEmailVerified: createForm.isEmailVerified,
    });

    if (response.success) {
      await loadUsers();
      setShowCreateUser(false);
      setCreateForm(initialCreateForm);
    } else {
      setCreateError(response.message || 'Failed to create user.');
    }

    setCreatingUser(false);
  };

  const getRoleBadge = (role: number) => {
    if (role === 0) return <span className="badge-cyan text-xs">Client</span>;
    if (role === 1) return <span className="badge-purple text-xs">Freelancer</span>;
    return <span className="badge-amber text-xs">Admin</span>;
  };

  const getStatusBadge = (user: User) => {
    if (isUserSuspended(user)) return <span className="badge-amber text-xs">Suspended</span>;
    if (!user.is_active) return <span className="badge-red text-xs">Banned</span>;
    if (!user.is_email_verified) return <span className="badge-gray text-xs">Unverified</span>;
    return <span className="badge-green text-xs">Active</span>;
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={20} className="text-cyan" />
              <span className="badge-cyan text-xs">User Management</span>
            </div>
            <h1 className="text-3xl font-black text-primary">Manage Users</h1>
            <p className="text-sm text-secondary mt-1">View and manage all platform users</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCreateError(null);
                setShowCreateUser(true);
              }}
              className="btn-cyan px-4 py-2 text-sm items-center gap-2 whitespace-nowrap"
              style={{ display: 'inline-flex' }}
            >
              <Plus size={16} className="flex-shrink-0" />
              Create User
            </button>
            <button className="btn-ghost-cyan px-4 py-2 text-sm flex items-center gap-2">
              <Download size={16} />
              Export Users
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.total.toLocaleString(), icon: <Users size={16} />, color: 'cyan' },
            { label: 'Clients', value: stats.clients.toLocaleString(), icon: <Briefcase size={16} />, color: 'purple' },
            { label: 'Freelancers', value: stats.freelancers.toLocaleString(), icon: <UserCheck size={16} />, color: 'green' },
            { label: 'Admins', value: stats.admins.toString(), icon: <Shield size={16} />, color: 'amber' },
            { label: 'Verified', value: stats.verified.toLocaleString(), icon: <CheckCircle size={16} />, color: 'green' },
            { label: 'Premium', value: stats.premium.toLocaleString(), icon: <Crown size={16} />, color: 'purple' },
            { label: 'Restricted', value: stats.banned.toString(), icon: <Ban size={16} />, color: 'red' },
            { label: 'Reported Users', value: (stats.reported ?? 0).toLocaleString(), icon: <Flag size={16} />, color: 'red' },
          ].map(stat => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-secondary">{stat.label}</p>
                <span className={`icon-${stat.color}`}>{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="glass-card overflow-hidden mb-6">
          {/* Header */}
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-gradient-to-r from-cyan/5 to-purple/5">
            <Filter size={18} className="text-cyan" />
            <h3 className="font-semibold text-primary">Search & Filters</h3>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex flex-col gap-6">
              {/* Search Bar */}
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="input-gb w-full py-3 text-sm"
                  style={{ paddingLeft: '3rem', paddingRight: '1rem' }}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Filter Label */}
                <div className="flex items-center gap-2 min-w-fit">
                  <span className="text-sm font-medium text-secondary">Filter by:</span>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2 flex-wrap flex-1">
                  {[
                    { type: 'all', label: 'All Users', icon: <Users size={16} />, color: 'cyan' },
                    { type: 'client', label: 'Clients', icon: <Briefcase size={16} />, color: 'purple' },
                    { type: 'freelancer', label: 'Freelancers', icon: <UserCheck size={16} />, color: 'green' },
                    { type: 'premium', label: 'Premium', icon: <Crown size={16} />, color: 'purple' },
                    { type: 'admin', label: 'Admins', icon: <Shield size={16} />, color: 'amber' },
                    { type: 'banned', label: 'Restricted', icon: <Ban size={16} />, color: 'red' },
                  ].map(filter => (
                    <button
                      key={filter.type}
                      onClick={() => setFilterType(filter.type as UserFilter)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${filterType === filter.type
                        ? `bg-${filter.color}/20 text-${filter.color} border border-${filter.color} shadow-lg shadow-${filter.color}/20`
                        : 'glass-button text-secondary hover:text-primary hover:border-white/20'
                        }`}
                    >
                      <span className={filterType === filter.type ? `text-${filter.color}` : 'text-muted'}>
                        {filter.icon}
                      </span>
                      <span className="hidden sm:inline">{filter.label}</span>
                    </button>
                  ))}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 min-w-fit">
                  <span className="text-sm font-medium text-secondary hidden sm:block">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as UserSort)}
                    className="input-gb px-4 py-2.5 pr-10 min-w-[160px] text-sm font-medium cursor-pointer"
                  >
                    <option value="joined">Newest First</option>
                    <option value="name">Name A-Z</option>
                    <option value="status">Status</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-secondary">
            {loading ? (
              <span>Loading users...</span>
            ) : (
              <>Showing <span className="text-primary font-semibold">{filteredUsers.length}</span> of <span className="text-primary font-semibold">{allUsers.length}</span> users</>
            )}
          </p>
        </div>

        {/* Users Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-primary">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-primary">User</th>
                  <th className="text-left p-4 text-sm font-semibold text-primary">Email</th>
                  <th className="text-left p-4 text-sm font-semibold text-primary">Role</th>
                  <th className="text-left p-4 text-sm font-semibold text-primary">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-primary">Joined</th>
                  <th className="text-left p-4 text-sm font-semibold text-primary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-secondary">Loading users...</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-sm font-bold text-white ${user.is_premium ? 'admin-premium-avatar' : ''}`}>
                            {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm font-semibold ${user.is_currently_reported ? 'text-red' : 'text-primary'}`}>
                                {user.full_name}
                              </p>
                              {user.is_currently_reported && (
                                <span className="badge-red text-xs inline-flex items-center gap-1" title="Open user reports">
                                  <Flag size={12} /> {user.open_report_count || 0}
                                </span>
                              )}
                              {user.is_premium && <span className="admin-premium-badge" title={user.premium_until ? `Premium through ${new Date(user.premium_until).toLocaleDateString()}` : 'Premium user'}><Crown size={11} /> Premium</span>}
                            </div>
                            <p className="text-xs text-secondary">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-muted" />
                          <span className="text-sm text-secondary">{user.email}</span>
                          {user.is_email_verified && <CheckCircle size={14} className="text-green" />}
                        </div>
                      </td>
                      <td className="p-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(user)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-muted" />
                          <span className="text-sm text-secondary">
                            {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewUser(user)}
                            className="p-2 rounded-lg glass-button hover:bg-cyan/10 transition-colors"
                            title="Preview Profile"
                          >
                            <Eye size={16} className="text-cyan" />
                          </button>

                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 rounded-lg glass-button hover:bg-purple/10 transition-colors"
                            title="Edit User"
                          >
                            <Edit size={16} className="text-purple" />
                          </button>

                          {user.is_currently_reported && (
                            <button
                              onClick={() => navigate(`/admin/reports?reportedEntityType=User&reportedEntityId=${encodeURIComponent(user.id)}`)}
                              className="p-2 rounded-lg glass-button hover:bg-red/10 transition-colors"
                              title={`View ${user.open_report_count || 0} open report${user.open_report_count === 1 ? '' : 's'}`}
                            >
                              <Flag size={16} className="text-red" />
                            </button>
                          )}

                          <div className="relative user-action-menu-container">
                            <button
                              onClick={() => setShowActionMenu(showActionMenu === user.id ? null : user.id)}
                              className="p-2 rounded-lg glass-button hover:bg-amber/10 transition-colors"
                              title="More Actions"
                            >
                              <MoreVertical size={16} className="text-amber" />
                            </button>

                            {showActionMenu === user.id && (
                              <div className="absolute right-0 top-full mt-2 w-48 dropdown-menu p-2 z-50">
                                <button
                                  onClick={() => {
                                    setPreviewUser(user);
                                    setActiveTab('wallet');
                                    setShowActionMenu(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-cyan/10 text-cyan"
                                >
                                  <Wallet size={14} />
                                  Add Fund
                                </button>

                                <div className="h-px my-1 dropdown-divider" />

                                {user.role === UserRole.Freelancer && <button
                                  onClick={() => void handlePremiumAction(user)}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${user.is_premium ? 'hover:bg-red/10 text-red' : 'hover:bg-purple/10 text-purple'}`}
                                >
                                  <Crown size={14} />
                                  {user.is_premium ? 'Revoke Premium' : 'Promote to Premium'}
                                </button>}

                                <div className="h-px my-1 dropdown-divider" />

                                {isUserSuspended(user) ? (
                                  <button
                                    onClick={() => {
                                      setConfirmAction({ type: 'clearSuspension', user });
                                      setShowActionMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-amber/10 text-amber"
                                  >
                                    <CheckCircle size={14} />
                                    Clear Suspension
                                  </button>
                                ) : null}

                                <button
                                  onClick={() => {
                                    setConfirmAction({ type: user.is_active ? 'ban' : 'unban', user });
                                    setShowActionMenu(null);
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-red-500/10 ${!user.is_active ? 'text-green' : 'text-red'
                                    }`}
                                >
                                  {!user.is_active ? (
                                    <>
                                      <CheckCircle size={14} />
                                      Unban User
                                    </>
                                  ) : (
                                    <>
                                      <Ban size={14} />
                                      Ban User
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredUsers.length === 0 && (
            <div className="text-center py-16">
              <UserX size={48} className="mx-auto mb-4 text-muted" />
              <p className="text-primary font-medium mb-2">No users found</p>
              <p className="text-sm text-secondary">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* Create User Modal */}
        {showCreateUser && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowCreateUser(false)}>
            <div className="glass-card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-primary">Create New User</h2>
                  <p className="text-sm text-secondary mt-1">Add a platform account with a role and temporary password</p>
                </div>
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                >
                  <XCircle size={20} className="text-red" />
                </button>
              </div>

              {createError && (
                <div className="mb-5 p-3 rounded-lg bg-red/10 border border-red/30">
                  <p className="text-sm text-red">{createError}</p>
                </div>
              )}

              <div className="space-y-5">
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={16} className="text-cyan" />
                    <p className="text-sm font-semibold text-primary">Account Details</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs text-secondary mb-2 block">Full Name</label>
                      <input
                        type="text"
                        value={createForm.fullName}
                        onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })}
                        className="input-gb w-full px-4 py-2.5 text-sm"
                        placeholder="Jane Nguyen"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-secondary mb-2 block">Email Address</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                          type="email"
                          value={createForm.email}
                          onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                          className="input-gb w-full py-2.5 text-sm"
                          style={{ paddingLeft: '2.25rem', paddingRight: '1rem' }}
                          placeholder="jane@example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-secondary mb-2 block">Phone Number</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                          type="tel"
                          value={createForm.phoneNumber}
                          onChange={e => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                          className="input-gb w-full py-2.5 text-sm"
                          style={{ paddingLeft: '2.25rem', paddingRight: '1rem' }}
                          placeholder="+84..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={16} className="text-purple" />
                    <p className="text-sm font-semibold text-primary">Role Section</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { role: UserRole.Client, label: 'Client', icon: <Briefcase size={16} />, desc: 'Can post jobs' },
                      { role: UserRole.Freelancer, label: 'Freelancer', icon: <UserCheck size={16} />, desc: 'Can submit proposals' },
                      { role: UserRole.Admin, label: 'Admin', icon: <Shield size={16} />, desc: 'Can manage platform' },
                    ].map(option => (
                      <button
                        key={option.role}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, role: option.role })}
                        className={`p-4 rounded-xl text-left transition-all border ${createForm.role === option.role
                          ? 'bg-cyan/20 text-cyan border-cyan'
                          : 'glass-button text-secondary border-white/10 hover:text-primary'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          {option.icon}
                          {createForm.role === option.role && <CheckCircle size={16} />}
                        </div>
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p className="text-xs opacity-80 mt-1">{option.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <KeyRound size={16} className="text-amber" />
                    <p className="text-sm font-semibold text-primary">Security Section</p>
                  </div>
                  <div>
                    <label className="text-xs text-secondary mb-2 block">Temporary Password</label>
                    <div className="relative">
                      <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                        className="input-gb w-full py-2.5 text-sm"
                        style={{ paddingLeft: '2.25rem', paddingRight: '1rem' }}
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                    <label className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 p-3 cursor-pointer hover:bg-white/5 transition-colors">
                      <input
                        type="checkbox"
                        checked={createForm.isEmailVerified}
                        onChange={e => setCreateForm({ ...createForm, isEmailVerified: e.target.checked })}
                        className="w-4 h-4 accent-[var(--gb-cyan)]"
                      />
                      <span>
                        <span className="text-sm font-semibold text-primary block">Mark email as verified</span>
                        <span className="text-xs text-muted">The admin confirms this email address without the normal verification link.</span>
                      </span>
                    </label>
                    <p className="text-xs text-muted mt-2">
                      The account will be created as active and {createForm.isEmailVerified ? 'email verified' : 'email unverified'}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateUser(false);
                    setCreateForm(initialCreateForm);
                    setCreateError(null);
                  }}
                  className="btn-ghost-cyan px-6 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={creatingUser}
                  className="btn-cyan px-6 py-2 items-center gap-2 whitespace-nowrap disabled:opacity-50"
                  style={{ display: 'inline-flex' }}
                >
                  {creatingUser ? (
                    <div className="w-4 h-4 border-2 border-[#0A0F1C] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  Create User
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

        {/* Preview Profile Modal */}
        {previewUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setPreviewUser(null); setActiveTab('profile'); }}>
            <div className="glass-card max-w-4xl w-full p-6 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-primary">Profile Preview</h2>
                <button
                  onClick={() => { setPreviewUser(null); setActiveTab('profile'); }}
                  className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                >
                  <XCircle size={20} className="text-red" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/10 mb-6">
                <button
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${activeTab === 'profile'
                      ? 'border-cyan text-cyan'
                      : 'border-transparent text-secondary hover:text-primary'
                    }`}
                  onClick={() => setActiveTab('profile')}
                >
                  Profile Details
                </button>
                <button
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'wallet'
                      ? 'border-cyan text-cyan'
                      : 'border-transparent text-secondary hover:text-primary'
                    }`}
                  onClick={() => setActiveTab('wallet')}
                >
                  <Wallet size={16} />
                  Wallet & G-coins
                </button>
                <button
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'assets'
                      ? 'border-cyan text-cyan'
                      : 'border-transparent text-secondary hover:text-primary'
                    }`}
                  onClick={() => setActiveTab('assets')}
                >
                  <Folder size={16} />
                  User Assets ({userAssets.length})
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto pr-1 flex-1">
                {activeTab === 'profile' && (
                  <>
                    {/* User Info */}
                    <div className="flex items-center gap-4 p-4 glass-card">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-2xl font-bold text-white">
                        {previewUser.first_name.charAt(0)}{previewUser.last_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xl font-bold text-primary">{previewUser.full_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail size={14} className="text-muted" />
                          <p className="text-sm text-secondary">{previewUser.email}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {getRoleBadge(previewUser.role)}
                          {getStatusBadge(previewUser)}
                        </div>
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="glass-card p-4">
                      <p className="text-sm font-semibold text-primary mb-4">User Information</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted mb-1">User ID</p>
                          <p className="text-primary font-mono text-xs">{previewUser.id}</p>
                        </div>
                        <div>
                          <p className="text-muted mb-1">Joined</p>
                          <p className="text-primary">{new Date(previewUser.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted mb-1">Phone Number</p>
                          <p className="text-primary flex items-center gap-1">
                            <Phone size={12} className="text-cyan" />
                            {previewUser.phone_number || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted mb-1">Role Type</p>
                          <p className="text-primary font-semibold">
                            {previewUser.role === 0 ? 'Client / Employer' : previewUser.role === 1 ? 'Freelancer' : 'Platform Administrator'}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted mb-1">Email Verification</p>
                          <div className="flex items-center gap-2">
                            {previewUser.is_email_verified ? (
                              <>
                                <CheckCircle size={16} className="text-green" />
                                <span className="text-green text-sm">Verified</span>
                              </>
                            ) : (
                              <>
                                <XCircle size={16} className="text-red" />
                                <span className="text-red text-sm">Not Verified</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'wallet' && (
                  <div className="space-y-6">
                    {walletLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan"></div>
                      </div>
                    ) : walletError ? (
                      <div className="p-4 glass-card text-center text-red text-sm">
                        {walletError}
                      </div>
                    ) : (
                      <>
                        {/* Balance Overview */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="glass-card p-3 text-center">
                            <p className="text-[10px] text-muted mb-0.5">Available Tokens</p>
                            <p className="text-lg font-bold text-green">{walletInfo?.availableTokens ?? 0} G</p>
                            <p className="text-[9px] text-muted">~{(walletInfo?.availableVnd ?? 0).toLocaleString('vi-VN')} VND</p>
                          </div>
                          <div className="glass-card p-3 text-center">
                            <p className="text-[10px] text-muted mb-0.5">Held in Escrow</p>
                            <p className="text-lg font-bold text-purple">{walletInfo?.heldTokens ?? 0} G</p>
                            <p className="text-[9px] text-muted">~{(walletInfo?.heldVnd ?? 0).toLocaleString('vi-VN')} VND</p>
                          </div>
                          <div className="glass-card p-3 text-center">
                            <p className="text-[10px] text-muted mb-0.5">Total Valuation</p>
                            <p className="text-lg font-bold text-cyan">
                              {((walletInfo?.availableTokens ?? 0) + (walletInfo?.heldTokens ?? 0))} G
                            </p>
                            <p className="text-[9px] text-muted">
                              ~{((walletInfo?.availableVnd ?? 0) + (walletInfo?.heldVnd ?? 0)).toLocaleString('vi-VN')} VND
                            </p>
                          </div>
                        </div>

                        {/* Credit/Debit Form */}
                        <div className="glass-card p-4 space-y-4">
                          <p className="text-sm font-semibold text-primary">Manual Adjustment (G-coins)</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-muted block mb-1">Token Amount</label>
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full text-sm glass-input p-2 rounded"
                                placeholder="e.g. 50"
                                disabled={walletActionLoading}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted block mb-1">Reference Note</label>
                              <input
                                type="text"
                                value={walletNote}
                                onChange={e => setWalletNote(e.target.value)}
                                className="w-full text-sm glass-input p-2 rounded"
                                placeholder="e.g. Test adjustment"
                                disabled={walletActionLoading}
                              />
                            </div>
                          </div>
                          <div className="flex gap-3 justify-end pt-2">
                            <button
                              disabled={walletActionLoading}
                              onClick={() => handleWalletAction('debit')}
                              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-pink-500 to-red-500 rounded hover:opacity-90 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md shadow-red-500/10"
                            >
                              Deduct / Debit
                            </button>
                            <button
                              disabled={walletActionLoading}
                              onClick={() => handleWalletAction('credit')}
                              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-400 to-blue-500 rounded hover:opacity-90 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md shadow-cyan-500/10"
                            >
                              Add / Credit
                            </button>
                          </div>
                        </div>

                        {/* Transaction History */}
                        <div className="glass-card p-4 space-y-3">
                          <p className="text-sm font-semibold text-primary">Transaction Ledger</p>
                          <div className="max-h-[22vh] overflow-y-auto space-y-2 pr-1 text-xs">
                            {walletHistory.length === 0 ? (
                              <p className="text-center text-muted py-4">No transactions recorded</p>
                            ) : (
                              walletHistory.map((tx: any) => {
                                const isDeduction = tx.type !== 0 && tx.type !== 1 && tx.type !== 3;
                                return (
                                  <div key={tx.walletTransactionsId} className="flex justify-between items-center p-2.5 glass-card">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${tx.type === 0 ? 'bg-green/10 text-green' :
                                            tx.type === 5 ? 'bg-red/10 text-red' : 'bg-white/10 text-secondary'
                                          }`}>
                                          {tx.type === 0 ? 'Admin Credit' :
                                            tx.type === 1 ? 'Top Up' :
                                              tx.type === 2 ? 'Escrow Hold' :
                                                tx.type === 3 ? 'Escrow Release' :
                                                  tx.type === 4 ? 'Escrow Refund' : 'Adjustment'}
                                        </span>
                                        <span className="text-[10px] text-muted">
                                          {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      {tx.note && <p className="text-[10px] text-secondary mt-1">{tx.note}</p>}
                                    </div>
                                    <div className="text-right">
                                      <p className={`font-semibold ${isDeduction ? 'text-red' : 'text-green'}`}>
                                        {isDeduction ? '-' : '+'}{tx.tokenAmount} G
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'assets' && (
                  <div className="space-y-4">
                    {/* User Assets Search & Filters */}
                    <div className="glass-card p-3 space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {/* Search */}
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                          <input
                            type="text"
                            placeholder="Search file name or job..."
                            value={userAssetSearch}
                            onChange={e => setUserAssetSearch(e.target.value)}
                            style={{ paddingLeft: '2.25rem' }}
                            className="w-full pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-primary placeholder-muted focus:outline-none focus:border-cyan text-xs"
                          />
                        </div>

                        {/* Type filter */}
                        <select
                          value={userAssetTypeFilter}
                          onChange={e => setUserAssetTypeFilter(e.target.value as any)}
                          style={{ backgroundColor: '#111827', color: '#f3f4f6' }}
                          className="px-2 py-1.5 rounded-lg border border-white/10 text-secondary focus:outline-none focus:border-cyan text-xs"
                        >
                          <option value="all" style={{ backgroundColor: '#111827', color: '#f3f4f6' }}>All Types</option>
                          <option value="Deliverable" style={{ backgroundColor: '#111827', color: '#f3f4f6' }}>Final Handoffs</option>
                          <option value="MilestoneAttachment" style={{ backgroundColor: '#111827', color: '#f3f4f6' }}>Milestone Files</option>
                        </select>

                        {/* Job filter */}
                        <select
                          value={userAssetJobFilter}
                          onChange={e => setUserAssetJobFilter(e.target.value)}
                          style={{ backgroundColor: '#111827', color: '#f3f4f6' }}
                          className="px-2 py-1.5 rounded-lg border border-white/10 text-secondary focus:outline-none focus:border-cyan text-xs max-w-[200px]"
                        >
                          <option value="all" style={{ backgroundColor: '#111827', color: '#f3f4f6' }}>All Jobs</option>
                          {uniqueJobsFromAssets.map(job => (
                            <option key={job.id} value={job.id} style={{ backgroundColor: '#111827', color: '#f3f4f6' }} className="truncate">
                              {job.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Assets list */}
                    {isLoadingUserAssets ? (
                      <div className="text-center py-12 glass-card">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan mx-auto mb-2" />
                        <p className="text-xs text-secondary">Loading user assets...</p>
                      </div>
                    ) : filteredUserAssets.length === 0 ? (
                      <div className="text-center py-12 glass-card border border-dashed border-white/10">
                        <Folder size={32} className="mx-auto mb-2 text-muted" />
                        <p className="text-sm text-primary font-medium">No assets found</p>
                        <p className="text-xs text-secondary mt-0.5">This user hasn't uploaded any files matching these filters.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                        {filteredUserAssets.map(asset => (
                          <div key={asset.assetId} className="p-3 rounded-lg glass-card text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-cyan/20 transition-all">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div className="p-2 rounded bg-white/5 flex-shrink-0">
                                {getFileIcon(asset.mimeType, asset.fileName)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-primary truncate" title={asset.fileName}>{asset.fileName}</p>
                                <p className="text-[10px] text-secondary mt-0.5 truncate">
                                  Job: <span className="text-primary font-medium">{asset.contractTitle}</span>
                                </p>
                                <p className="text-[10px] text-muted mt-0.5 font-mono">
                                  {formatBytes(asset.fileSize)} • Uploaded: {new Date(asset.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 justify-between sm:justify-end flex-shrink-0">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${asset.assetType === 'Deliverable'
                                  ? 'bg-green/10 text-green border border-green/20'
                                  : 'bg-purple/10 text-purple border border-purple/20'
                                }`}>
                                {asset.assetType === 'Deliverable' ? 'Final Handoff' : 'Milestone File'}
                              </span>

                              {asset.fileUrl ? (
                                <a
                                  href={asset.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-cyan hover:underline font-semibold"
                                >
                                  <Download size={12} />
                                  Download
                                </a>
                              ) : (
                                <span className="text-muted">No Link</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={() => { setPreviewUser(null); setActiveTab('profile'); }}
                  className="btn-ghost-cyan px-6 py-2"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    navigate(`/profile/${previewUser.role === 1 ? 'freelancer' : 'client'}/${previewUser.id}`);
                  }}
                  className="btn-cyan px-6 py-2 flex items-center gap-2"
                >
                  <Eye size={16} />
                  Go to Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Edit Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
            <div className="glass-card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-primary">Edit User</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                >
                  <XCircle size={20} className="text-red" />
                </button>
              </div>

              <div className="space-y-6">
                {/* User Info */}
                <div className="flex items-center gap-4 p-4 glass-card">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-xl font-bold text-white">
                    {selectedUser.first_name.charAt(0)}{selectedUser.last_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-primary">{selectedUser.full_name}</p>
                    <p className="text-sm text-secondary">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(selectedUser.role)}
                      {getStatusBadge(selectedUser)}
                    </div>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="glass-card p-4">
                  <p className="text-sm font-semibold text-primary mb-4">Basic Information</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-secondary mb-2 block">First Name</label>
                      <input
                        type="text"
                        defaultValue={selectedUser.first_name}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        className="input-gb w-full px-4 py-2.5 text-sm"
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-secondary mb-2 block">Last Name</label>
                      <input
                        type="text"
                        defaultValue={selectedUser.last_name}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        className="input-gb w-full px-4 py-2.5 text-sm"
                        placeholder="Enter last name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-secondary mb-2 block">Email Address</label>
                      <input
                        type="email"
                        defaultValue={selectedUser.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="input-gb w-full px-4 py-2.5 text-sm"
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-4">
                    <p className="text-sm text-secondary mb-3">Role Management</p>
                    <div className="space-y-2">
                      {[
                        { role: 0, label: 'Client', icon: <Briefcase size={14} /> },
                        { role: 1, label: 'Freelancer', icon: <UserCheck size={14} /> },
                        { role: 2, label: 'Admin', icon: <Shield size={14} /> },
                      ].map(r => (
                        <button
                          key={r.role}
                          onClick={() => {
                            setConfirmAction({ type: 'role', user: selectedUser, newRole: r.role as 0 | 1 | 2 });
                          }}
                          disabled={selectedUser.role === r.role}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${selectedUser.role === r.role
                            ? 'bg-cyan/20 text-cyan border border-cyan'
                            : 'glass-button text-secondary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                        >
                          {r.icon}
                          {r.label}
                          {selectedUser.role === r.role && <CheckCircle size={14} className="ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="glass-card p-4">
                    <p className="text-sm text-secondary mb-3">Account Status</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 glass-card">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-muted" />
                          <span className="text-sm text-secondary">Email Verified</span>
                        </div>
                        {selectedUser.is_email_verified ? (
                          <CheckCircle size={16} className="text-green" />
                        ) : (
                          <XCircle size={16} className="text-red" />
                        )}
                      </div>

                      {isUserSuspended(selectedUser) ? (
                        <div className="p-3 glass-card">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-amber">Temporarily Suspended</p>
                              <p className="text-xs text-secondary mt-1">
                                Until {new Date(selectedUser.suspended_until || '').toLocaleString()}
                              </p>
                              {selectedUser.suspension_reason ? (
                                <p className="text-xs text-muted mt-1">{selectedUser.suspension_reason}</p>
                              ) : null}
                            </div>
                            <button
                              onClick={() => {
                                setConfirmAction({ type: 'clearSuspension', user: selectedUser });
                              }}
                              className="px-3 py-2 rounded-lg text-xs font-medium bg-amber/20 text-amber border border-amber hover:bg-amber/30 transition-all"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <button
                        onClick={() => {
                          setConfirmAction({ type: selectedUser.is_active ? 'ban' : 'unban', user: selectedUser });
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${!selectedUser.is_active
                          ? 'bg-green/20 text-green border border-green hover:bg-green/30'
                          : 'bg-red/20 text-red border border-red hover:bg-red/30'
                          }`}
                      >
                        {!selectedUser.is_active ? (
                          <>
                            <CheckCircle size={14} />
                            Unban Account
                          </>
                        ) : (
                          <>
                            <Ban size={14} />
                            Ban Account
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* User Details */}
                <div className="glass-card p-4">
                  <p className="text-sm text-secondary mb-3">System Information</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted mb-1">User ID</p>
                      <p className="text-primary font-mono text-xs">{selectedUser.id}</p>
                    </div>
                    <div>
                      <p className="text-muted mb-1">Joined</p>
                      <p className="text-primary">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="btn-ghost-cyan px-6 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const fullName = [editForm.firstName || selectedUser.first_name, editForm.lastName || selectedUser.last_name]
                      .filter(Boolean).join(' ');

                    const response = await adminAPI.updateUser(selectedUser.email, {
                      fullName: fullName || undefined,
                    });

                    if (response.success && response.data) {
                      await loadUsers();
                      alert('User information updated successfully!');
                    } else {
                      alert(response.message || 'Failed to update user');
                    }
                    setSelectedUser(null);
                    setEditForm({ firstName: '', lastName: '', email: '' });
                  }}
                  className="btn-cyan px-6 py-2 flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setConfirmAction(null)}>
            <div className="glass-card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-primary">Confirm Action</h3>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                >
                  <XCircle size={18} className="text-red" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-3 p-4 glass-card mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-sm font-bold text-white">
                    {confirmAction.user.first_name.charAt(0)}{confirmAction.user.last_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">{confirmAction.user.full_name}</p>
                    <p className="text-xs text-secondary">{confirmAction.user.email}</p>
                  </div>
                </div>

                <p className="text-secondary text-sm">
                  {confirmAction.type === 'ban' && `Are you sure you want to ban this user? They will lose access to the platform.`}
                  {confirmAction.type === 'unban' && `Are you sure you want to unban this user? They will regain access to the platform.`}
                  {confirmAction.type === 'clearSuspension' && `Are you sure you want to clear this user's temporary suspension? Their access will be restored if the account is active.`}
                  {confirmAction.type === 'role' && `Are you sure you want to change this user's role to ${confirmAction.newRole === 0 ? 'Client' : confirmAction.newRole === 1 ? 'Freelancer' : 'Admin'}?`}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 btn-ghost-cyan px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (confirmAction.type === 'role' && confirmAction.newRole !== undefined) {
                      handleChangeRole(confirmAction.user.id, confirmAction.newRole);
                    } else if (confirmAction.type === 'ban' || confirmAction.type === 'unban') {
                      await handleBanUser(confirmAction.user.id);
                    } else if (confirmAction.type === 'clearSuspension') {
                      await handleClearSuspension(confirmAction.user.id);
                    }
                    setConfirmAction(null);
                    setSelectedUser(null);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${confirmAction.type === 'ban'
                    ? 'bg-red/20 text-red border border-red hover:bg-red/30'
                    : confirmAction.type === 'unban'
                      ? 'bg-green/20 text-green border border-green hover:bg-green/30'
                      : confirmAction.type === 'clearSuspension'
                        ? 'bg-amber/20 text-amber border border-amber hover:bg-amber/30'
                        : 'btn-cyan'
                    }`}
                >
                  {confirmAction.type === 'ban' && 'Ban User'}
                  {confirmAction.type === 'unban' && 'Unban User'}
                  {confirmAction.type === 'clearSuspension' && 'Clear Suspension'}
                  {confirmAction.type === 'role' && 'Change Role'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Click outside handled via useEffect listener */}
      </div>
    </AppLayout>
  );
}
