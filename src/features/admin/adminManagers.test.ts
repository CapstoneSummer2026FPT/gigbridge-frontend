import { describe, expect, it } from 'vitest';
import { ADMIN_MANAGERS } from './adminManagers';

describe('Admin manager registry', () => {
  it('contains unique routes and assigns reports to Content Management', () => {
    const visible = ADMIN_MANAGERS.filter(manager => manager.showInNavigation);
    expect(new Set(visible.map(manager => manager.path)).size).toBe(visible.length);
    expect(visible.find(manager => manager.id === 'account-reports')).toBeUndefined();
    expect(visible.find(manager => manager.id === 'contract-reports')?.group).toBe('content');
    expect(visible.some(manager => manager.path === '/admin/audit-logs')).toBe(false);
    expect(visible.find(manager => manager.id === 'system-tracking')?.path).toBe('/admin/system-tracking');
  });

  it('does not publish shortcuts for manager routes that do not exist', () => {
    const dashboardPaths = ADMIN_MANAGERS.filter(manager => manager.showOnDashboard).map(manager => manager.path);
    expect(dashboardPaths).not.toContain('/admin/categories');
    expect(dashboardPaths).not.toContain('/admin/skills');
    expect(dashboardPaths).not.toContain('/admin/ai-interviews');
    expect(dashboardPaths).not.toContain('/admin/audit-logs');
  });
});
