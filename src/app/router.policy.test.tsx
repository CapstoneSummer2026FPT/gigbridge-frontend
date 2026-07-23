import type { ReactElement } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';

let router: typeof import('./router').router;
let PolicyScreen: typeof import('../features/company/screens/PolicyScreen').default;

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
  ({ default: PolicyScreen } = await import('../features/company/screens/PolicyScreen'));
});

describe('public policy routes', () => {
  it.each(['policies', 'terms', 'privacy'])('maps /%s to the shared policy screen', (path) => {
    const rootRoute = router.routes.find((route) => route.path === '/');
    const policyRoute = rootRoute?.children?.find((route) => route.path === path);

    expect(policyRoute).toBeDefined();
    expect((policyRoute?.element as ReactElement).type).toBe(PolicyScreen);
  });
});
