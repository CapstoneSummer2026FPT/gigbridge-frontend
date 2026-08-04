import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PostJobWizardShell } from './PostJobWizardShell';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'postJob.expectedBudget': 'Expected budget',
        'postJob.estimatedDuration': 'Estimated duration',
        'postJobWizard.draft': 'Current draft',
        'postJobWizard.autosave.saved': 'Saved',
      };
      return map[key] || key;
    },
  }),
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../shared/components/JobPostStepper', () => ({
  default: () => <div />,
}));

const baseProps = {
  currentStep: 2 as const,
  title: 'Plan your milestones',
  subtitle: 'Step 2',
  previewTitle: 'Vendor onboarding portal',
  completion: 50,
  budget: 999,
  milestoneCount: 1,
  questionCount: 0,
  autosaveStatus: 'saved' as const,
  primaryAction: <button type="button">Continue</button>,
  children: <div>content</div>,
};

describe('PostJobWizardShell', () => {
  it('renders expected budget and estimated duration rows when provided', () => {
    render(
      <PostJobWizardShell {...baseProps} expectedBudget={200} estimatedDuration="3 weeks" />,
    );

    expect(screen.getByText('Expected budget')).toBeInTheDocument();
    expect(screen.getByText('200 G-coin')).toBeInTheDocument();
    expect(screen.getByText('Estimated duration')).toBeInTheDocument();
    expect(screen.getByText('3 weeks')).toBeInTheDocument();
  });

  it('omits the draft details block when neither budget nor duration is provided', () => {
    render(
      <PostJobWizardShell {...baseProps} expectedBudget={null} estimatedDuration={null} />,
    );

    expect(screen.queryByText('Expected budget')).not.toBeInTheDocument();
    expect(screen.queryByText('Estimated duration')).not.toBeInTheDocument();
  });

  it('renders only the budget row when duration is missing', () => {
    render(
      <PostJobWizardShell {...baseProps} expectedBudget={200} estimatedDuration={null} />,
    );

    expect(screen.getByText('Expected budget')).toBeInTheDocument();
    expect(screen.getByText('200 G-coin')).toBeInTheDocument();
    expect(screen.queryByText('Estimated duration')).not.toBeInTheDocument();
  });

  it('renders only the duration row when budget is missing', () => {
    render(
      <PostJobWizardShell {...baseProps} expectedBudget={null} estimatedDuration="3 weeks" />,
    );

    expect(screen.queryByText('Expected budget')).not.toBeInTheDocument();
    expect(screen.getByText('Estimated duration')).toBeInTheDocument();
    expect(screen.getByText('3 weeks')).toBeInTheDocument();
  });
});
