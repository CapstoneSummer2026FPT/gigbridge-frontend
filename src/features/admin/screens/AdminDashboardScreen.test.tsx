import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ADMIN_MANAGERS } from '../adminManagers';
import AdminDashboardScreen from './AdminDashboardScreen';

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));
vi.mock('../../../shared/components/AppLayout', () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe('AdminDashboardScreen shortcuts', () => {
  it('renders a shortcut for every dashboard-enabled manager', () => {
    render(<MemoryRouter><AdminDashboardScreen /></MemoryRouter>);

    const expected = ADMIN_MANAGERS.filter(manager => manager.showOnDashboard && manager.group !== 'overview');
    for (const manager of expected) {
      expect(screen.getByText(manager.fallbackLabel)).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(expected.length);
  });

  it('publishes no placeholder or disconnected shortcut routes', () => {
    const dashboardPaths = ADMIN_MANAGERS
      .filter(manager => manager.showOnDashboard && manager.group !== 'overview')
      .map(manager => manager.path);

    expect(new Set(dashboardPaths).size).toBe(dashboardPaths.length);
    expect(dashboardPaths.every(path => path.startsWith('/admin/'))).toBe(true);
    expect(dashboardPaths).not.toContain('/admin/audit-logs');
    expect(dashboardPaths).not.toContain('/admin/contract-audit');
    expect(dashboardPaths).not.toContain('/admin/categories');
  });
});
