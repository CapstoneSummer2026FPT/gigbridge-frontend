import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, CircleDollarSign, Cloud, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '../../../shared/components/AppLayout';
import JobPostStepper from '../../../shared/components/JobPostStepper';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { formatGigCoinNumber, formatGigCoinToVnd } from '../../../shared/utils/gigcoin';
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
  milestoneTotal?: number;
  milestoneTotalWeeks?: number;
  expectedDurationWeeks?: number;
  headerAction?: ReactNode;
  backAction?: ReactNode;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  onRetryAutosave?: () => void;
  children: ReactNode;
  overlay?: ReactNode;
  promptInput?: ReactNode;
  hideAIWidget?: boolean;
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
  milestoneTotal,
  milestoneTotalWeeks,
  expectedDurationWeeks,
  headerAction,
  backAction,
  primaryAction,
  secondaryAction,
  onRetryAutosave,
  children,
  overlay,
  promptInput,
  hideAIWidget,
}: Props) {
  const { t } = useTranslation('common');
  const completedSteps = Array.from({ length: currentStep - 1 }, (_, index) => index + 1);

  return (
    <AppLayout hideAIWidget={Boolean(promptInput || hideAIWidget)} fullWidth>
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
                    <div>
                      <dt>{t('postJob.expectedBudget')}</dt>
                      <dd>
                        {milestoneTotal !== undefined && milestoneTotal > 0 ? (
                          <span className={`job-post-ratio flex items-center gap-1${milestoneTotal > expectedBudget ? ' is-over' : ''}`}>
                            {milestoneTotal > expectedBudget && <AlertTriangle size={12} />}
                            <span>{formatGigCoinNumber(milestoneTotal)} / {formatGigCoinNumber(expectedBudget)}</span>
                            <GCoinIcon size={12} />
                            <span>G-coin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <span>{formatGigCoinNumber(expectedBudget)}</span>
                            <GCoinIcon size={12} />
                            <span>G-coin</span>
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                  {estimatedDuration && (
                    <div>
                      <dt>{t('postJob.estimatedDuration')}</dt>
                      <dd>
                        {milestoneTotalWeeks !== undefined && expectedDurationWeeks !== undefined && milestoneTotalWeeks > 0 && expectedDurationWeeks > 0 ? (
                          <span className={`job-post-ratio${milestoneTotalWeeks > expectedDurationWeeks ? ' is-over' : ''}`}>
                            {milestoneTotalWeeks > expectedDurationWeeks && <AlertTriangle size={12} />}
                            {milestoneTotalWeeks} {t('postJob.durationUnits.weeks')} / {expectedDurationWeeks} {t('postJob.durationUnits.weeks')}
                          </span>
                        ) : estimatedDuration}
                      </dd>
                    </div>
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
                <div>
                  <dt><CircleDollarSign size={14} />{t('postJobWizard.budget')}</dt>
                  <dd className="flex flex-col items-end">
                    <span className="inline-flex items-center gap-1">
                      <span>{budget.toLocaleString()}</span>
                      <GCoinIcon size={13} />
                      <span>G-coin</span>
                    </span>
                    {budget > 0 && <small className="text-[11px] font-normal text-muted-foreground">≈ {formatGigCoinToVnd(budget)}</small>}
                  </dd>
                </div>
                <div><dt>{t('postJobWizard.milestones')}</dt><dd>{milestoneCount}</dd></div>
                <div><dt>{t('postJobWizard.questions')}</dt><dd>{questionCount}</dd></div>
              </dl>
            </div>

            {promptInput && (
              <div className="job-post-wizard__sidebar-actions">
                {primaryAction}
                {secondaryAction}
                {backAction}
              </div>
            )}
          </aside>
        </div>

        {promptInput ? (
          <footer className="job-post-wizard__footer">
            {promptInput}
          </footer>
        ) : (
          <footer className="job-post-wizard__footer">
            <div>{backAction}</div>
            <div className="job-post-wizard__footer-actions">
              {secondaryAction}
              {primaryAction}
            </div>
          </footer>
        )}
      </div>
      {overlay}
    </AppLayout>
  );
}
