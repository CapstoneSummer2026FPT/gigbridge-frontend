import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router';
import { Search, Filter, Users, UserCheck, UserX, Shield, Ban, CheckCircle, XCircle, Eye, Edit, MoreVertical, Mail, Calendar, Briefcase, Plus, KeyRound, Phone, Flag, Wallet, Folder, Crown } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { adminAPI } from '../../../api/adminAPI';
import type { AdminUserDto, User } from '../../../types';
import { UserRole } from '../../../types';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { UserProfilePreviewDrawer } from '../components/UserProfilePreviewDrawer';
import { AdminTablePageSize, AdminTablePagination } from '../components/AdminTableControls';
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
  // Premium is available to client and freelancer accounts. Use an explicit boolean check so
  // malformed values such as "false" cannot become truthy in the admin UI.
  const isPremium = (dto.role === UserRole.Client || dto.role === UserRole.Freelancer)
    && dto.isPremium === true;

  return {
    id: dto.userId,
    avatar: dto.avatar,
    email: dto.email,
    first_name: firstName,
    last_name: lastName,
    full_name: dto.fullName,
    phone_number: dto.phoneNumber ?? null,
    role: dto.role as UserRole,
    is_email_verified: dto.isEmailVerified,
    is_active: dto.isActive,
    account_status: dto.accountStatus,
    is_flagged: dto.isFlagged,
    violation_count: dto.violationCount,
    banned_at: dto.bannedAt ?? null,
    ban_reason: dto.banReason ?? null,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<UserFilter>('all');
  const [sortBy, setSortBy] = useState<UserSort>('joined');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'ban' | 'unban' | 'clearSuspension', user: User } | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '' });

  const previewUserId = searchParams.get('preview');
  const openPreview = (user: User) => {
    const next = new URLSearchParams(searchParams);
    next.set('preview', user.id);
    setSearchParams(next, { replace: false });
  };
  const closePreview = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('preview');
    setSearchParams(next, { replace: true });
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


  // Real API state
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reportedUserTotal, setReportedUserTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setUsersError(null);
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
      setUsersError(response.message || 'Unable to load users.');
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

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pageUsers = useMemo(
    () => filteredUsers.slice((page - 1) * pageSize, page * pageSize),
    [filteredUsers, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [filterType, pageSize, searchQuery, sortBy]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
    if (user.role !== UserRole.Client && user.role !== UserRole.Freelancer) return;
    const action = user.is_premium ? 'revoke Premium from' : 'promote to Premium';
    if (!window.confirm(`Are you sure you want to ${action} ${user.full_name}?`)) return;
    const response = user.is_premium
      ? await adminAPI.revokeUserPremium(user.id)
      : await adminAPI.grantUserPremium(user.id);
    if (!response.success) alert(response.message || 'Failed to update Premium status.');
    else await loadUsers();
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
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-secondary">
            {loading ? (
              <span>Loading users...</span>
            ) : (
              <>Showing <span className="text-primary font-semibold">{filteredUsers.length === 0 ? 0 : ((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, filteredUsers.length)}</span> of <span className="text-primary font-semibold">{filteredUsers.length}</span> matching users</>
            )}
          </p>
          <AdminTablePageSize pageSize={pageSize} totalEntries={filteredUsers.length} disabled={loading} onPageSizeChange={setPageSize} />
        </div>

        {/* Users Table */}
        {usersError && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--destructive)] bg-[color-mix(in_srgb,var(--destructive)_10%,transparent)] p-4" role="alert">
            <span className="text-sm text-[var(--destructive)]">{usersError}</span>
            <button className="btn-ghost-cyan px-4 py-2 text-sm" onClick={() => void loadUsers()}>Retry</button>
          </div>
        )}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-primary">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-primary">No.</th>
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
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-secondary">Loading users...</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageUsers.map((user, index) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => openPreview(user)}>
                      <td className="p-4 text-sm font-bold text-cyan">{((page - 1) * pageSize) + index + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <button type="button" className="flex items-center gap-3 text-left" onClick={event => { event.stopPropagation(); openPreview(user); }} aria-label={`Preview ${user.full_name}`}>
                            <UserAvatar name={user.full_name} src={user.avatar} premium={user.is_premium} />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-semibold ${user.is_currently_reported ? 'text-red' : 'text-primary'}`}>
                                  {user.full_name}
                                </span>
                                {user.is_currently_reported && (
                                <span className="badge-red text-xs inline-flex items-center gap-1" title="Open user reports">
                                  <Flag size={12} /> {user.open_report_count || 0}
                                </span>
                              )}
                              {user.is_premium && <span className="admin-premium-badge" title={user.premium_until ? `Premium through ${new Date(user.premium_until).toLocaleDateString()}` : 'Premium user'}><Crown size={11} /> Premium</span>}
                              {user.role === UserRole.Admin && <span className="badge-cyan text-xs">Protected Admin</span>}
                              {user.is_flagged && <span className="badge-red text-xs">Flagged · {user.violation_count ?? 0}</span>}
                            </div>
                            <p className="text-xs text-secondary">{user.id}</p>
                            </div>
                          </button>
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
                            onClick={(event) => { event.stopPropagation(); openPreview(user); }}
                            className="p-2 rounded-lg glass-button hover:bg-cyan/10 transition-colors"
                            title="Profile Preview"
                            aria-label={`Open Profile Preview for ${user.full_name}`}
                          >
                            <Folder size={16} className="text-cyan" />
                          </button>

                          <button
                            onClick={(event) => { event.stopPropagation(); openPreview(user); }}
                            className="p-2 rounded-lg glass-button hover:bg-cyan/10 transition-colors"
                            title="Preview Profile"
                            aria-label={`Preview ${user.full_name}`}
                          >
                            <Eye size={16} className="text-cyan" />
                          </button>

                          <button
                            onClick={(event) => { event.stopPropagation(); setSelectedUser(user); }}
                            className="p-2 rounded-lg glass-button hover:bg-purple/10 transition-colors"
                            title="Edit User"
                            aria-label={`Edit ${user.full_name}`}
                          >
                            <Edit size={16} className="text-purple" />
                          </button>

                          {user.is_currently_reported && (
                            <button
                              onClick={(event) => { event.stopPropagation(); navigate(`/admin/reports?reportedEntityType=User&reportedEntityId=${encodeURIComponent(user.id)}`); }}
                              className="p-2 rounded-lg glass-button hover:bg-red/10 transition-colors"
                              title={`View ${user.open_report_count || 0} open report${user.open_report_count === 1 ? '' : 's'}`}
                            >
                              <Flag size={16} className="text-red" />
                            </button>
                          )}

                          <div className="relative user-action-menu-container" onClick={event => event.stopPropagation()}>
                            <button
                              onClick={(event) => { event.stopPropagation(); setShowActionMenu(showActionMenu === user.id ? null : user.id); }}
                              className="p-2 rounded-lg glass-button hover:bg-amber/10 transition-colors"
                              title="More Actions"
                            >
                              <MoreVertical size={16} className="text-amber" />
                            </button>

                            {showActionMenu === user.id && (
                              <div className="absolute right-0 top-full mt-2 w-48 dropdown-menu p-2 z-50">
                                <button
                                  onClick={() => {
                                    openPreview(user);
                                    setShowActionMenu(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-cyan/10 text-cyan"
                                >
                                  <Wallet size={14} />
                                  Wallet Summary
                                </button>

                                <div className="h-px my-1 dropdown-divider" />

                                {(user.role === UserRole.Client || user.role === UserRole.Freelancer) && <button
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

        {!loading && totalPages > 1 && (
          <AdminTablePagination currentPage={page} totalPages={totalPages} onPageChange={setPage} ariaLabel="User list pagination" />
        )}

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


        {previewUserId && (
          <UserProfilePreviewDrawer userId={previewUserId} onClose={closePreview} onChanged={loadUsers} />
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
                <div className="grid grid-cols-1 gap-4">
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
                    if (confirmAction.type === 'ban' || confirmAction.type === 'unban') {
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
