import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostJobPreGuideScreen from './PostJobPreGuideScreen';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  refresh: vi.fn(),
  premiumStatus: {
    data: undefined,
    loading: true,
    error: undefined as string | undefined,
    hasResolved: false,
    isPremium: false,
  },
}));

vi.mock('react-router', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../app/providers/AppProvider', () => ({
  useApp: () => ({ role: 0 }),
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../premium/hooks', () => ({
  usePremiumStatus: () => ({
    ...mocks.premiumStatus,
    refresh: mocks.refresh,
  }),
}));

vi.mock('../../premium/components/PremiumStatusBadge', () => ({
  PremiumStatusBadge: () => <span>premium-status-badge</span>,
}));

describe('PostJobPreGuideScreen Premium access state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mocks.premiumStatus, {
      data: undefined,
      loading: true,
      error: undefined,
      hasResolved: false,
      isPremium: false,
    });
  });

  it('disables the AI card while Premium access is loading', () => {
    render(<PostJobPreGuideScreen />);

    const aiCard = screen.getByRole('button', { name: /postJobGuide\.aiModeTitle/ });
    expect(aiCard).toBeDisabled();
    expect(aiCard).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(aiCard);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('shows a retry state instead of redirecting when Premium verification fails', () => {
    Object.assign(mocks.premiumStatus, {
      loading: false,
      error: 'Premium service unavailable',
      hasResolved: false,
    });

    render(<PostJobPreGuideScreen />);

    expect(screen.getByText('postJobGuide.premiumCheckFailed')).toBeInTheDocument();
    const aiCard = screen.getByRole('button', { name: /postJobGuide\.aiModeTitle/ });
    fireEvent.click(aiCard);

    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
