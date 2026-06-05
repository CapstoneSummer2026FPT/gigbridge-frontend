import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, Filter, Users, UserCheck, UserX, Shield, Ban, CheckCircle, XCircle, Eye, Edit, MoreVertical, Download, Mail, Calendar, Briefcase, DollarSign, Plus, KeyRound, Phone } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { adminAPI } from '../../../api/adminAPI';
import type { AdminUserDto, User } from '../../../types';
import { UserRole } from '../../../types';
import '../styles/admin-users-screen.css';

type UserFilter = 'all' | 'client' | 'freelancer' | 'admin' | 'banned';
type UserSort = 'name' | 'joined' | 'status';

const initialCreateForm = {
  fullName: '',
  email: '',
  password: '',
  phoneNumber: '',
  role: UserRole.Client,
};

const mapAdminUserDtoToUser = (dto: AdminUserDto): User => {
  const spaceIndex = dto.fullName.indexOf(' ');
  const firstName = spaceIndex >= 0 ? dto.fullName.slice(0, spaceIndex) : dto.fullName;
  const lastName = spaceIndex >= 0 ? dto.fullName.slice(spaceIndex + 1) : '';

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
    is_setup: false,
    preferred_language: dto.preferredLanguage || 'en',
    last_login_at: null,
    login_failed_time: null,
    access_failed_count: 0,
    gigcoin_balance: 0,
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
  const [confirmAction, setConfirmAction] = useState<{type: 'ban' | 'unban' | 'role', user: User, newRole?: 0 | 1 | 2} | null>(null);
  const [editForm, setEditForm] = useState({firstName: '', lastName: '', email: ''});

  // Real API state
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const response = await adminAPI.getAllUsers();
    setUsers(response.success && response.data ? response.data.items.map(mapAdminUserDtoToUser) : []);
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
        filterType === 'admin' ? user.role === 2 :
        filterType === 'banned' ? !user.is_active : true;

      return matchesSearch && matchesFilter;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
      if (sortBy === 'joined') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'status') return (a.is_active ? 0 : 1) - (b.is_active ? 0 : 1);
      return 0;
    });

    return filtered;
  }, [allUsers, searchQuery, filterType, sortBy]);

  const stats = useMemo(() => {
    const total = allUsers.length;
    const clients = allUsers.filter(u => u.role === 0).length;
    const freelancers = allUsers.filter(u => u.role === 1).length;
    const admins = allUsers.filter(u => u.role === 2).length;
    const banned = allUsers.filter(u => !u.is_active).length;
    const verified = allUsers.filter(u => u.is_email_verified).length;

    return { total, clients, freelancers, admins, banned, verified };
  }, [allUsers]);

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

  const handleChangeRole = async (userId: string, newRole: 0 | 1 | 2) => {
    alert('Role changes are not yet supported through the API.');
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
              className="btn-cyan px-4 py-2 text-sm flex items-center gap-2"
            >
              <Plus size={16} />
              Create User
            </button>
            <button className="btn-ghost-cyan px-4 py-2 text-sm flex items-center gap-2">
              <Download size={16} />
              Export Users
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.total.toLocaleString(), icon: <Users size={16} />, color: 'cyan' },
            { label: 'Clients', value: stats.clients.toLocaleString(), icon: <Briefcase size={16} />, color: 'purple' },
            { label: 'Freelancers', value: stats.freelancers.toLocaleString(), icon: <UserCheck size={16} />, color: 'green' },
            { label: 'Admins', value: stats.admins.toString(), icon: <Shield size={16} />, color: 'amber' },
            { label: 'Verified', value: stats.verified.toLocaleString(), icon: <CheckCircle size={16} />, color: 'green' },
            { label: 'Banned', value: stats.banned.toString(), icon: <Ban size={16} />, color: 'red' },
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
                    { type: 'admin', label: 'Admins', icon: <Shield size={16} />, color: 'amber' },
                    { type: 'banned', label: 'Banned', icon: <Ban size={16} />, color: 'red' },
                  ].map(filter => (
                    <button
                      key={filter.type}
                      onClick={() => setFilterType(filter.type as UserFilter)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                        filterType === filter.type
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
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-sm font-bold text-white">
                            {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-primary">{user.full_name}</p>
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

                          <div className="relative">
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
                                    setConfirmAction({type: 'role', user, newRole: 0});
                                    setShowActionMenu(null);
                                  }}
                                  disabled={user.role === 0}
                                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary disabled:opacity-50"
                                >
                                  <Briefcase size={14} />
                                  Set as Client
                                </button>

                                <button
                                  onClick={() => {
                                    setConfirmAction({type: 'role', user, newRole: 1});
                                    setShowActionMenu(null);
                                  }}
                                  disabled={user.role === 1}
                                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary disabled:opacity-50"
                                >
                                  <UserCheck size={14} />
                                  Set as Freelancer
                                </button>

                                <button
                                  onClick={() => {
                                    setConfirmAction({type: 'role', user, newRole: 2});
                                    setShowActionMenu(null);
                                  }}
                                  disabled={user.role === 2}
                                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary disabled:opacity-50"
                                >
                                  <Shield size={14} />
                                  Set as Admin
                                </button>

                                <div className="h-px my-1 dropdown-divider" />

                                <button
                                  onClick={() => {
                                    setConfirmAction({type: user.is_active ? 'ban' : 'unban', user});
                                    setShowActionMenu(null);
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-red-500/10 ${
                                    !user.is_active ? 'text-green' : 'text-red'
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
        {showCreateUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreateUser(false)}>
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
                        className={`p-4 rounded-xl text-left transition-all border ${
                          createForm.role === option.role
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
                    <p className="text-xs text-muted mt-2">The backend creates the account as active and unverified by default.</p>
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
                  className="btn-cyan px-6 py-2 flex items-center gap-2 disabled:opacity-50"
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
          </div>
        )}

        {/* Preview Profile Modal */}
        {previewUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewUser(null)}>
            <div className="glass-card max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-primary">Profile Preview</h2>
                <button
                  onClick={() => setPreviewUser(null)}
                  className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                >
                  <XCircle size={20} className="text-red" />
                </button>
              </div>

              <div className="space-y-6">
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
                      <p className="text-muted mb-1">Joined Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-cyan" />
                        <p className="text-primary">{new Date(previewUser.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted mb-1">First Name</p>
                      <p className="text-primary">{previewUser.first_name}</p>
                    </div>
                    <div>
                      <p className="text-muted mb-1">Last Name</p>
                      <p className="text-primary">{previewUser.last_name}</p>
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
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setPreviewUser(null)}
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
                        onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                        className="input-gb w-full px-4 py-2.5 text-sm"
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-secondary mb-2 block">Last Name</label>
                      <input
                        type="text"
                        defaultValue={selectedUser.last_name}
                        onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                        className="input-gb w-full px-4 py-2.5 text-sm"
                        placeholder="Enter last name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-secondary mb-2 block">Email Address</label>
                      <input
                        type="email"
                        defaultValue={selectedUser.email}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
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
                            setConfirmAction({type: 'role', user: selectedUser, newRole: r.role as 0 | 1 | 2});
                          }}
                          disabled={selectedUser.role === r.role}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                            selectedUser.role === r.role
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

                      <button
                        onClick={() => {
                          setConfirmAction({type: selectedUser.is_active ? 'ban' : 'unban', user: selectedUser});
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          !selectedUser.is_active
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
                    setEditForm({firstName: '', lastName: '', email: ''});
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
                    }
                    setConfirmAction(null);
                    setSelectedUser(null);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                    confirmAction.type === 'ban'
                      ? 'bg-red/20 text-red border border-red hover:bg-red/30'
                      : confirmAction.type === 'unban'
                      ? 'bg-green/20 text-green border border-green hover:bg-green/30'
                      : 'btn-cyan'
                  }`}
                >
                  {confirmAction.type === 'ban' && 'Ban User'}
                  {confirmAction.type === 'unban' && 'Unban User'}
                  {confirmAction.type === 'role' && 'Change Role'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Click outside to close action menu */}
        {showActionMenu && (
          <div className="fixed inset-0 z-40" onClick={() => setShowActionMenu(null)} />
        )}
      </div>
    </AppLayout>
  );
}
