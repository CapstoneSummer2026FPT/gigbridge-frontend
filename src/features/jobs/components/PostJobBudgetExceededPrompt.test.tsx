import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PostJobBudgetExceededPrompt } from './PostJobBudgetExceededPrompt';

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        'postJobWizard.budgetExceeded.title': 'Milestone plan exceeds expectations',
        'postJobWizard.budgetExceeded.question': 'Do you want to continue?',
        'postJobWizard.budgetExceeded.confirm': 'Update & continue',
        'common.cancel': 'Cancel',
      };
      if (key === 'postJobWizard.budgetExceeded.budgetDesc') {
        return `Budget ${params?.total} over ${params?.expected}`;
      }
      if (key === 'postJobWizard.budgetExceeded.durationDesc') {
        return `Duration ${params?.total} over ${params?.expected}`;
      }
      return map[key] || key;
    },
  }),
}));

const baseProps = {
  isBudgetExceeded: false,
  budgetTotal: '200 G-coin',
  budgetExpected: '100 G-coin',
  isDurationExceeded: false,
  durationTotal: '7 weeks',
  durationExpected: '4 weeks',
};

describe('PostJobBudgetExceededPrompt', () => {
  it('renders nothing when closed', () => {
    render(
      <PostJobBudgetExceededPrompt
        isOpen={false}
        {...baseProps}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByText('Milestone plan exceeds expectations')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the title, question, and budget warning when only budget is exceeded', () => {
    render(
      <PostJobBudgetExceededPrompt
        isOpen
        {...baseProps}
        isBudgetExceeded
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Milestone plan exceeds expectations')).toBeInTheDocument();
    expect(screen.getByText('Budget 200 G-coin over 100 G-coin')).toBeInTheDocument();
    expect(screen.queryByText(/Duration/)).not.toBeInTheDocument();
    expect(screen.getByText('Do you want to continue?')).toBeInTheDocument();
  });

  it('renders the duration warning when only duration is exceeded', () => {
    render(
      <PostJobBudgetExceededPrompt
        isOpen
        {...baseProps}
        isDurationExceeded
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Duration 7 weeks over 4 weeks')).toBeInTheDocument();
    expect(screen.queryByText(/Budget/)).not.toBeInTheDocument();
  });

  it('renders both warnings when both are exceeded', () => {
    render(
      <PostJobBudgetExceededPrompt
        isOpen
        {...baseProps}
        isBudgetExceeded
        isDurationExceeded
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Budget 200 G-coin over 100 G-coin')).toBeInTheDocument();
    expect(screen.getByText('Duration 7 weeks over 4 weeks')).toBeInTheDocument();
  });

  it('fires confirm and cancel callbacks', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <PostJobBudgetExceededPrompt
        isOpen
        {...baseProps}
        isBudgetExceeded
        isDurationExceeded
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Update & continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
