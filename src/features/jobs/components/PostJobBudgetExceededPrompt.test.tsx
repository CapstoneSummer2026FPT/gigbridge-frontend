import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PostJobBudgetExceededPrompt } from './PostJobBudgetExceededPrompt';

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        'postJobWizard.budgetExceeded.title': 'Milestone total exceeds expected budget',
        'postJobWizard.budgetExceeded.confirm': 'Update budget & continue',
        'common.cancel': 'Cancel',
      };
      if (key === 'postJobWizard.budgetExceeded.desc') {
        return `Totals ${params?.total}, expected ${params?.expected}`;
      }
      return map[key] || key;
    },
  }),
}));

describe('PostJobBudgetExceededPrompt', () => {
  it('renders nothing when closed', () => {
    render(
      <PostJobBudgetExceededPrompt
        isOpen={false}
        total="200 G-coin"
        expected="100 G-coin"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByText('Milestone total exceeds expected budget')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the title and interpolated totals when open', () => {
    render(
      <PostJobBudgetExceededPrompt
        isOpen
        total="200 G-coin"
        expected="100 G-coin"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Milestone total exceeds expected budget')).toBeInTheDocument();
    expect(screen.getByText('Totals 200 G-coin, expected 100 G-coin')).toBeInTheDocument();
  });

  it('fires confirm and cancel callbacks', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <PostJobBudgetExceededPrompt
        isOpen
        total="200 G-coin"
        expected="100 G-coin"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Update budget & continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
