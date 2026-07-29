import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../styles/job-post-stepper.css';

export interface StepInfo {
  number: number;
  key: string;
  labelKey: string;
}

const JOB_POST_STEPS: StepInfo[] = [
  { number: 1, key: 'details', labelKey: 'postJobStepper.details' },
  { number: 2, key: 'plan', labelKey: 'postJobStepper.plan' },
  { number: 3, key: 'review', labelKey: 'postJobStepper.review' },
];

interface JobPostStepperProps {
  currentStep: number;
  completedSteps: number[];
}

export default function JobPostStepper({ currentStep, completedSteps }: JobPostStepperProps) {
  const { t } = useTranslation('common');

  return (
    <div className="job-post-stepper" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={3}>
      <div className="job-post-stepper__inner">
        {JOB_POST_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.number);
          const isActive = step.number === currentStep;
          const isFuture = !isCompleted && !isActive;

          return (
            <div
              key={step.key}
              className={`job-post-stepper__step ${isActive ? 'step--active' : ''} ${isCompleted ? 'step--completed' : ''} ${isFuture ? 'step--future' : ''}`}
            >
              <div className="job-post-stepper__indicator-wrapper">
                <div className="job-post-stepper__indicator">
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>
                <span className="job-post-stepper__label">{t(step.labelKey)}</span>
              </div>
              {index < JOB_POST_STEPS.length - 1 && (
                <div className={`job-post-stepper__connector ${isCompleted ? 'connector--completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="job-post-stepper__mobile">
        <span>{t('postJobStepper.progress', { current: currentStep, total: JOB_POST_STEPS.length })}</span>
        <strong>{t(JOB_POST_STEPS[currentStep - 1]?.labelKey)}</strong>
        <div className="job-post-stepper__mobile-track">
          <span style={{ width: `${(currentStep / JOB_POST_STEPS.length) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
