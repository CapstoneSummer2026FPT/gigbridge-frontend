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
        'postJob.durationUnits.weeks': 'weeks',
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

  it('shows milestone total / expected budget ratio when ratio props are provided', () => {
    render(
      <PostJobWizardShell {...baseProps} expectedBudget={100} estimatedDuration="4 weeks" milestoneTotal={200} />,
    );

    expect(screen.getByText('200 / 100 G-coin')).toBeInTheDocument();
    expect(screen.getByText('200 / 100 G-coin').className).toContain('is-over');
  });

  it('keeps the budget ratio in normal state when milestone total is within budget', () => {
    render(
      <PostJobWizardShell {...baseProps} expectedBudget={100} estimatedDuration="4 weeks" milestoneTotal={50} />,
    );

    const ratio = screen.getByText('50 / 100 G-coin');
    expect(ratio.className).not.toContain('is-over');
  });

  it('shows milestone weeks / estimated duration weeks ratio when ratio props are provided', () => {
    render(
      <PostJobWizardShell {...baseProps} expectedBudget={100} estimatedDuration="4 weeks" milestoneTotal={100} milestoneTotalWeeks={7} expectedDurationWeeks={4} />,
    );

    expect(screen.getByText('7 weeks / 4 weeks')).toBeInTheDocument();
    expect(screen.getByText('7 weeks / 4 weeks').className).toContain('is-over');
  });

  it('keeps the duration ratio in normal state when milestone weeks are within estimate', () => {
    render(
      <PostJobWizardShell {...baseProps} expectedBudget={100} estimatedDuration="4 weeks" milestoneTotal={100} milestoneTotalWeeks={3} expectedDurationWeeks={4} />,
    );

    const ratio = screen.getByText('3 weeks / 4 weeks');
    expect(ratio.className).not.toContain('is-over');
  });

  it('falls back to the single budget value when milestone total is not provided', () => {
    render(
      <PostJobWizardShell {...baseProps} expectedBudget={100} estimatedDuration="4 weeks" />,
    );

    expect(screen.getByText('100 G-coin')).toBeInTheDocument();
    expect(screen.getByText('4 weeks')).toBeInTheDocument();
  });
});
