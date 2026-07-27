import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  Briefcase,
  FileText,
  HelpCircle,
  Shield,
  Users,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router';

import { adminAPI } from '../../../api/adminAPI';
import { AppLayout } from '../../../shared/components/AppLayout';
import type { AdminUserDto } from '../../../types';

interface AdminLink {
  readonly label: string;
  readonly description: string;
  readonly path: string;
  readonly icon: typeof Users;
}

const ADMIN_LINKS: readonly AdminLink[] = [
  { label: 'Manage Users', description: 'Review and manage platform users', path: '/admin/users', icon: Users },
  { label: 'Manage Jobs', description: 'Review job postings and moderation state', path: '/admin/jobs', icon: Briefcase },
  { label: 'Contract Audit', description: 'Inspect contract and milestone workflows', path: '/admin/contracts', icon: FileText },
  { label: 'Disputes', description: 'Review active reports and dispute evidence', path: '/admin/disputes', icon: Shield },
  { label: 'Notifications', description: 'Publish and manage admin notifications', path: '/admin/notifications', icon: Bell },
  { label: 'Withdrawals', description: 'Review and reconcile withdrawal requests', path: '/admin/withdrawals', icon: Wallet },
  { label: 'System Tracking', description: 'Inspect operational health and audit events', path: '/admin/system-tracking', icon: Activity },
  { label: 'FAQ Management', description: 'Maintain public help content', path: '/admin/faq-management', icon: HelpCircle },
] as const;

export default function AdminDashboardScreen() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadUsers(): Promise<void> {
      setIsLoading(true);
      setError(null);

      const response = await adminAPI.getAllUsers();
      if (!isMounted) return;

      if (response.success && response.data) {
        setUsers(response.data.items);
      } else {
        setUsers([]);
        setError(response.message || 'Users could not be loaded.');
      }

      setIsLoading(false);
    }

    void loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const active = users.filter(user => user.isActive).length;
    const premium = users.filter(user => user.isPremium).length;
    const reported = users.filter(user => user.isCurrentlyReported).length;

    return [
      { label: 'Loaded users', value: users.length },
      { label: 'Active users', value: active },
      { label: 'Premium users', value: premium },
      { label: 'Reported users', value: reported },
    ] as const;
  }, [users]);

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-purple-500">
            <Shield size={20} />
            <span className="text-xs font-bold uppercase tracking-widest">Admin panel</span>
          </div>
          <h1 className="text-3xl font-black text-primary">GigBridge Administration</h1>
          <p className="mt-2 text-sm text-secondary">
            This dashboard shows API-backed data only. Detailed metrics live in their dedicated operational screens.
          </p>
        </header>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
            {error}
          </div>
        ) : null}

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="User overview">
          {stats.map(stat => (
            <article key={stat.label} className="stat-card">
              <p className="text-sm text-secondary">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold text-primary">{isLoading ? '…' : stat.value.toLocaleString()}</p>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Administration areas">
          {ADMIN_LINKS.map(link => {
            const Icon = link.icon;
            return (
              <button
                key={link.path}
                type="button"
                onClick={() => navigate(link.path)}
                className="glass-card group cursor-pointer p-6 text-left transition-all hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-primary">{link.label}</h2>
                    <p className="mt-2 text-sm text-secondary">{link.description}</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-500 transition-transform group-hover:scale-110">
                    <Icon size={20} />
                  </span>
                </div>
              </button>
            );
          })}
        </section>
      </main>
    </AppLayout>
  );
}
