import { ChevronRight, Shield } from 'lucide-react';
import { useNavigate } from 'react-router';

import { AppLayout } from '../../../shared/components/AppLayout';
import { useTranslation } from '../../../hooks/useTranslation';
import { ADMIN_GROUPS, ADMIN_MANAGERS } from '../adminManagers';

export default function AdminDashboardScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const label = (key: string, fallback: string) => t(key, { defaultValue: fallback });

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-[var(--brand)]">
            <Shield size={20} />
            <span className="text-xs font-bold uppercase tracking-widest">{label('adminDashboard.kicker', 'Admin panel')}</span>
          </div>
          <h1 className="text-3xl font-black text-primary">{label('adminDashboard.title', 'GigBridge Administration')}</h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary">
            {label('adminDashboard.subtitle', 'Open a management area. Counts are shown only when a dedicated aggregate API is available.')}
          </p>
        </header>

        <div className="space-y-8">
          {ADMIN_GROUPS.filter(group => group.id !== 'overview').map(group => {
            const managers = ADMIN_MANAGERS.filter(manager => manager.group === group.id && manager.showOnDashboard);
            if (managers.length === 0) return null;
            return (
              <section key={group.id} aria-labelledby={`admin-group-${group.id}`}>
                <h2 id={`admin-group-${group.id}`} className="mb-3 text-sm font-bold uppercase tracking-wider text-secondary">
                  {label(group.labelKey, group.fallbackLabel)}
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {managers.map(manager => {
                    const Icon = manager.icon;
                    return (
                      <button
                        key={manager.path}
                        type="button"
                        onClick={() => navigate(manager.path)}
                        className="glass-card group flex min-h-32 items-start gap-4 p-5 text-left transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                          <Icon size={21} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold text-primary">{label(manager.labelKey, manager.fallbackLabel)}</span>
                          <span className="mt-1 block text-sm leading-5 text-secondary">{label(manager.descriptionKey, manager.fallbackDescription)}</span>
                        </span>
                        <ChevronRight size={18} className="mt-1 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </AppLayout>
  );
}
