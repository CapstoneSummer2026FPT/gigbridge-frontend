import { Check } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import '../styles/create-proposal-screen.css';

export type ProposalStepNumber = 1 | 2 | 3;

const PROPOSAL_STEPS: Array<{ number: ProposalStepNumber; labelKey: string }> = [
  { number: 1, labelKey: 'proposalStepper.details' },
  { number: 2, labelKey: 'proposalStepper.interview' },
  { number: 3, labelKey: 'proposalStepper.review' },
];

interface ProposalStepperProps {
  currentStep: ProposalStepNumber;
  /** Set when the job post has no interview questions, so step 2 is never visited. */
  skippedSteps?: ProposalStepNumber[];
}

export function ProposalStepper({ currentStep, skippedSteps = [] }: ProposalStepperProps) {
  const { t } = useTranslation(['proposals', 'common']);

  return (
    <div
      className="cps-step-bar"
      role="progressbar"
      aria-label={t('proposalStepper.label')}
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={PROPOSAL_STEPS.length}
    >
      {PROPOSAL_STEPS.map(step => {
        const isSkipped = skippedSteps.includes(step.number);
        const isActive = step.number === currentStep;
        const isDone = !isActive && (step.number < currentStep || isSkipped);
        const state = isActive ? 'active' : isDone ? 'done' : 'upcoming';

        return (
          <div key={step.number} className={`cps-step-item is-${state}`} aria-current={isActive ? 'step' : undefined}>
            <span className="cps-step-indicator">
              {isDone ? <Check size={12} strokeWidth={3} /> : step.number}
            </span>
            <span>{t(step.labelKey)}</span>
            {isSkipped && (
              <span className="cps-step-skipped">{t('proposalStepper.skipped')}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
