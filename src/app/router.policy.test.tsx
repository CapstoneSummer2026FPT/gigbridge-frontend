import type { ReactElement } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { UserRole } from '../types';

let router: typeof import('./router').router;

beforeAll(async () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      matches: false,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });

  ({ router } = await import('./router'));
});

describe('public policy routes', () => {
  const getPolicyElement = (path: string): ReactElement => {
    const rootRoute = router.routes.find((route) => route.path === '/');
    const policyRoute = rootRoute?.children?.find((route) => route.path === path);

    expect(policyRoute).toBeDefined();
    expect(policyRoute && 'element' in policyRoute).toBe(true);

    return (policyRoute && 'element' in policyRoute
      ? policyRoute.element
      : null) as ReactElement;
  };

  it.each(['policies', 'terms', 'privacy'])('maps /%s to the shared policy screen', (path) => {
    expect(getPolicyElement(path).type).toBe(getPolicyElement('policies').type);
  });

  it('does not expose the retired anti-cheat admin route', () => {
    const rootRoute = router.routes.find((route) => route.path === '/');
    const retiredRoute = rootRoute?.children?.find((route) => route.path === 'admin/cheating');

    expect(retiredRoute).toBeUndefined();
  });

  it('allows clients and freelancers to open milestone details', () => {
    const milestoneRoute = getPolicyElement('contracts/:contractId/milestones');

    expect(milestoneRoute.props.allowedRoles).toEqual([UserRole.Client, UserRole.Freelancer]);
  });
});
