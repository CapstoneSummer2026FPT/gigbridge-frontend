import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, CircleDollarSign, Cloud, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '../../../shared/components/AppLayout';
import JobPostStepper from '../../../shared/components/JobPostStepper';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import type { AutosaveStatus } from '../hooks/usePostJob';
import '../../../shared/styles/job-post-stepper.css';
import '../styles/post-job-wizard.css';

interface Props {
  currentStep: 1 | 2 | 3;
  title: string;
  subtitle: string;
  previewTitle: string;
  completion: number;
  budget: number;
  milestoneCount: number;
  questionCount: number;
  autosaveStatus: AutosaveStatus;
  autosaveError?: string | null;
  errorMessage?: string | null;
  isLoading?: boolean;
  expectedBudget?: number | null;
  estimatedDuration?: string | null;
  headerAction?: ReactNode;
  backAction?: ReactNode;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  onRetryAutosave?: () => void;
  children: ReactNode;
  overlay?: ReactNode;
  promptInput?: ReactNode;
}

export function PostJobWizardShell({
  currentStep,
  title,
  subtitle,
  previewTitle,
  completion,
  budget,
  milestoneCount,
  questionCount,
  autosaveStatus,
  autosaveError,
  errorMessage,
  isLoading,
  expectedBudget,
  estimatedDuration,
  headerAction,
  backAction,
  primaryAction,
  secondaryAction,
  onRetryAutosave,
  children,
  overlay,
  promptInput,
}: Props) {
  const { t } = useTranslation('common');
  const completedSteps = Array.from({ length: currentStep - 1 }, (_, index) => index + 1);

  return (
    <>
      <AppLayout>
        <div className="job-post-wizard">
          <div className="job-post-wizard__mobile-progress">
            <JobPostStepper currentStep={currentStep} completedSteps={completedSteps} />
          </div>

          <header className="job-post-wizard__header">
            <div>
              <span className="job-post-wizard__eyebrow">
                {t('postJobWizard.stepOf', { current: currentStep, total: 3 })}
              </span>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {headerAction}
          </header>

          {errorMessage && (
            <div className="job-post-wizard__alert" role="alert">
              <AlertCircle size={17} />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoading && (
            <div className="job-post-wizard__notice">
              <RefreshCw size={16} className="animate-spin" />
              {t('postJob.loadingDraft')}
            </div>
          )}

          <div className="job-post-wizard__layout">
            <main className="job-post-wizard__main">{children}</main>

            <aside className="job-post-wizard__sidebar" aria-label={t('postJobWizard.summary')}>
              <div className="job-post-wizard__sidebar-card">
                <JobPostStepper currentStep={currentStep} completedSteps={completedSteps} />
              </div>
              <div className="job-post-wizard__sidebar-card">
                <span className="job-post-wizard__side-label">{t('postJobWizard.draft')}</span>
                <strong className="job-post-wizard__draft-title">{previewTitle}</strong>
                <div className={`job-post-wizard__save-state is-${autosaveStatus}`}>
                  {autosaveStatus === 'saved' ? <CheckCircle2 size={14} /> : <Cloud size={14} />}
                  <span>{t(`postJobWizard.autosave.${autosaveStatus}`)}</span>
                  {autosaveStatus === 'error' && onRetryAutosave && (
                    <button type="button" onClick={onRetryAutosave}>{t('postJob.retry')}</button>
                  )}
                </div>
                {autosaveError && <small className="job-post-wizard__save-error">{autosaveError}</small>}
                {(expectedBudget !== undefined && expectedBudget !== null) || estimatedDuration ? (
                  <dl className="job-post-wizard__stats job-post-wizard__draft-details">
                    {expectedBudget !== undefined && expectedBudget !== null && (
                      <div><dt>{t('postJob.expectedBudget')}</dt><dd>{formatGigCoin(expectedBudget)}</dd></div>
                    )}
                    {estimatedDuration && (
                      <div><dt>{t('postJob.estimatedDuration')}</dt><dd>{estimatedDuration}</dd></div>
                    )}
                  </dl>
                ) : null}
              </div>

              <div className="job-post-wizard__sidebar-card">
                <div className="job-post-wizard__completion-copy">
                  <span>{t('postJobWizard.completion')}</span>
                  <strong>{Math.round(completion)}%</strong>
                </div>
                <div className="job-post-wizard__completion-track"><span style={{ width: `${completion}%` }} /></div>
                <dl className="job-post-wizard__stats">
                  <div><dt><CircleDollarSign size={14} />{t('postJobWizard.budget')}</dt><dd>{budget.toLocaleString()} G-coin</dd></div>
                  <div><dt>{t('postJobWizard.milestones')}</dt><dd>{milestoneCount}</dd></div>
                  <div><dt>{t('postJobWizard.questions')}</dt><dd>{questionCount}</dd></div>
                </dl>
              </div>

              <div className="job-post-wizard__sidebar-actions">
                {primaryAction}
                {secondaryAction}
                {backAction}
              </div>
            </aside>
          </div>

          {promptInput && (
            <footer className="job-post-wizard__footer">
              {promptInput}
            </footer>
          )}
        </div>
      </AppLayout>
      {overlay}
    </>
  );
}

