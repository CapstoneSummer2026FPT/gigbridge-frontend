import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, CheckCircle2, CircleDollarSign, Clock3, FileQuestion, FileText, Images, ListChecks, LoaderCircle, Pencil, Save, Tags } from 'lucide-react';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { JobPostVisibility } from '../../../types/models/Job';
import { PostJobBudgetExceededPrompt } from '../components/PostJobBudgetExceededPrompt';
import { PostJobLeavePrompt } from '../components/PostJobLeavePrompt';
import {
  PostJobHiringPlanReviewEditor,
  PostJobProjectReviewEditor,
  PostJobTermsReviewEditor,
} from '../components/PostJobReviewEditors';
import { PostJobWizardShell } from '../components/PostJobWizardShell';
import {
  usePostJob,
  type PostJobReviewSection,
  type PostJobRouteState,
} from '../hooks/usePostJob';
import { renderDescription } from '../utils/descriptionFormatter';

export default function PostJobReviewScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');
  const routeState = location.state as PostJobRouteState | null;
  const controller = usePostJob();
  const {
    form, selectedOfficialSkills, selectedMajorName, selectedCategoryName,
    previewTitle, errorMessage, isActionDisabled, isDraftInitializing,
    draftError, questions, milestonePlans, milestonePlanTotal,
    milestoneTotalWeeks, isBudgetExceeded, isDurationExceeded,
    attachments,
    isLeavePromptOpen, leaveAction, autosaveStatus, autosaveError,
    handleLeaveSaveDraft, handleLeaveDiscardDraft, cancelBlockedNavigation,
    submitDraftFlow, renderSubmitLabel, retryAutosave, navigateWizard,
    flushAutosave,
    isBudgetExceededPromptOpen, handleBudgetExceededConfirm, handleBudgetExceededCancel,
  } = controller;
  const [editingSection, setEditingSection] = useState<PostJobReviewSection | null>(null);
  const [isFinishingEdit, setIsFinishingEdit] = useState(false);

  useEffect(() => {
    if (!routeState?.jobPostId && !routeState?.jobData) navigate('/jobs/post', { replace: true });
  }, [navigate, routeState]);

  const answeredQuestions = questions.filter(question => question.questionText.trim());
  const allSkills = [...selectedOfficialSkills.map(skill => skill.name), ...form.customSkillNames];
  const optional = (value?: string | null) => value?.trim() || t('postJobWizard.notProvided');
  const completion = [
    form.title, form.majorId, form.majorCategoryId, form.description,
    form.estimatedDurationValue, form.deadline,
  ].filter(Boolean).length / 6 * 100;

  const visibilityLabel = form.visibility === String(JobPostVisibility.Private)
    ? t('postJob.private')
    : form.visibility === String(JobPostVisibility.InviteOnly)
      ? t('postJob.inviteOnly')
      : t('postJob.public');

  const finishCurrentEdit = async (nextSection: PostJobReviewSection | null): Promise<boolean> => {
    setIsFinishingEdit(true);
    try {
      await flushAutosave();
      setEditingSection(nextSection);
      return true;
    } catch {
      return false;
    } finally {
      setIsFinishingEdit(false);
    }
  };

  const toggleEditor = async (section: PostJobReviewSection): Promise<void> => {
    if (editingSection === null) {
      setEditingSection(section);
      return;
    }
    await finishCurrentEdit(editingSection === section ? null : section);
  };

  const focusValidationField = (fieldSelector?: string): void => {
    if (!fieldSelector) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(fieldSelector);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus();
    }));
  };

  const handlePublish = async (): Promise<void> => {
    const result = await submitDraftFlow('publish');
    if (result.status === 'validation-error') {
      setEditingSection(result.section);
      focusValidationField(result.fieldSelector);
    }
  };

  const editButton = (section: PostJobReviewSection, label: string) => {
    const isActive = editingSection === section;
    return (
      <button type="button" className="job-post-button job-post-button--ghost !min-h-0 !p-2" disabled={isFinishingEdit} onClick={() => void toggleEditor(section)}>
        {isFinishingEdit && isActive
          ? <LoaderCircle className="animate-spin" size={13} />
          : isActive ? <CheckCircle2 size={13} /> : <Pencil size={13} />}
        {isActive
          ? isFinishingEdit ? t('postJobWizard.review.savingInline') : t('postJobWizard.review.done')
          : label}
      </button>
    );
  };

  return (
    <PostJobWizardShell
      currentStep={3}
      title={t('postJobWizard.review.title')}
      subtitle={t('postJobWizard.review.subtitle')}
      previewTitle={previewTitle}
      completion={completion}
      budget={Number(form.budget) || milestonePlanTotal}
      milestoneCount={milestonePlans.length}
      questionCount={answeredQuestions.length}
      autosaveStatus={autosaveStatus}
      autosaveError={autosaveError}
      errorMessage={errorMessage || draftError}
      isLoading={isDraftInitializing}
      onRetryAutosave={retryAutosave}
      backAction={(
        <button type="button" className="job-post-button job-post-button--ghost" onClick={() => navigateWizard('/jobs/post/plan')}>
          <ArrowLeft size={15} />{t('postJobWizard.backPlan')}
        </button>
      )}
      secondaryAction={(
        <button type="button" className="job-post-button job-post-button--secondary" disabled={isActionDisabled || isFinishingEdit} onClick={() => submitDraftFlow('draft')}>
          <Save size={15} />{renderSubmitLabel('draft', t('postJobWizard.saveExit'))}
        </button>
      )}
      primaryAction={(
        <button type="button" className="job-post-button job-post-button--primary" disabled={isActionDisabled || isFinishingEdit} onClick={() => void handlePublish()}>
          <Check size={15} />{renderSubmitLabel('publish', t('postJob.publishProjectRequest'))}
        </button>
      )}
      overlay={(
        <>
          <PostJobLeavePrompt
            isOpen={isLeavePromptOpen}
            leaveAction={leaveAction}
            onSaveDraft={handleLeaveSaveDraft}
            onDiscardDraft={handleLeaveDiscardDraft}
            onCancel={cancelBlockedNavigation}
          />
          <PostJobBudgetExceededPrompt
            isOpen={isBudgetExceededPromptOpen}
            isBudgetExceeded={isBudgetExceeded}
            budgetTotal={formatGigCoin(milestonePlanTotal)}
            budgetExpected={formatGigCoin(Number(form.budget) || 0)}
            isDurationExceeded={isDurationExceeded}
            durationTotal={`${milestoneTotalWeeks} ${t('postJob.durationUnits.weeks')}`}
            durationExpected={form.estimatedDurationValue
              ? `${form.estimatedDurationValue} ${t(`postJob.durationUnits.${form.estimatedDurationUnit}`)}`
              : ''}
            onConfirm={handleBudgetExceededConfirm}
            onCancel={handleBudgetExceededCancel}
          />
        </>
      )}
    >
      <section className="job-post-section">
        <div className="job-post-section__header">
          <div className="job-post-section__heading">
            <span className="job-post-section__icon"><FileText size={17} /></span>
            <div><h2>{t('postJobWizard.review.project')}</h2><p>{t('postJobWizard.review.projectHint')}</p></div>
          </div>
          {editButton('project', t('postJobWizard.edit'))}
        </div>
        <div className="job-post-section__body">
          {editingSection === 'project' ? (
            <PostJobProjectReviewEditor controller={controller} />
          ) : <div className="grid gap-4">
            <div><span className="job-post-field__label">{t('postJob.jobTitle')}</span><strong className="mt-1 block text-base">{form.title}</strong></div>
            <div className="job-post-grid">
              <div><span className="job-post-field__label">{t('postJob.major')}</span><p className="mt-1 text-sm">{optional(selectedMajorName)}</p></div>
              <div><span className="job-post-field__label">{t('postJob.category')}</span><p className="mt-1 text-sm">{optional(selectedCategoryName)}</p></div>
            </div>
            <div><span className="job-post-field__label">{t('postJob.jobDescription')}</span><div className="mt-1 text-sm leading-7 whitespace-pre-line">{renderDescription(form.description)}</div></div>
            <div>
              <span className="job-post-field__label"><Tags size={13} className="mr-1 inline" />{t('postJob.requiredSkills')}</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {allSkills.length > 0
                  ? allSkills.map(skill => <span key={skill} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{skill}</span>)
                  : <span className="text-sm text-muted-foreground">{t('postJobWizard.notProvided')}</span>}
              </div>
            </div>
            <div>
              <span className="job-post-field__label"><Images size={13} className="mr-1 inline" />{t('postJobWizard.details.attachments')}</span>
              {attachments.length > 0 ? (
                <div className="job-post-image-grid mt-2">
                  {attachments.map(attachment => (
                    <figure key={attachment.jobPostAttachmentsId} className="job-post-image-card job-post-image-card--review">
                      <img src={attachment.fileUrl} alt={attachment.fileName} />
                      <figcaption title={attachment.fileName}>{attachment.fileName}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : <p className="mt-1 text-sm text-muted-foreground">{t('postJobWizard.notProvided')}</p>}
            </div>
          </div>}
        </div>
      </section>

      <section className="job-post-section">
        <div className="job-post-section__header">
          <div className="job-post-section__heading">
            <span className="job-post-section__icon"><CircleDollarSign size={17} /></span>
            <div><h2>{t('postJobWizard.review.terms')}</h2><p>{t('postJobWizard.review.termsHint')}</p></div>
          </div>
          {editButton('terms', t('postJobWizard.edit'))}
        </div>
        <div className="job-post-section__body">
          {editingSection === 'terms' ? (
            <PostJobTermsReviewEditor controller={controller} />
          ) : <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('postJob.expectedBudget')}</dt><dd className="font-bold">{formatGigCoin(Number(form.budget) || milestonePlanTotal)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground"><Clock3 size={14} className="mr-1 inline" />{t('postJob.estimatedDuration')}</dt><dd>{form.estimatedDurationValue} {t(`postJob.durationUnits.${form.estimatedDurationUnit}`)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('postJob.endDate')}</dt><dd>{optional(form.deadline)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('postJob.visibility')}</dt><dd>{visibilityLabel}</dd></div>
          </dl>}
        </div>
      </section>

      <section className="job-post-section">
        <div className="job-post-section__header">
          <div className="job-post-section__heading">
            <span className="job-post-section__icon"><ListChecks size={17} /></span>
            <div><h2>{t('postJobWizard.review.hiringPlan')}</h2><p>{t('postJobWizard.review.hiringPlanHint')}</p></div>
          </div>
          {editButton('hiringPlan', t('postJobWizard.edit'))}
        </div>
        <div className="job-post-section__body">
          {editingSection === 'hiringPlan' ? (
            <PostJobHiringPlanReviewEditor controller={controller} />
          ) : <>
          <div>
            <span className="job-post-field__label">{t('postJobWizard.plan.milestones')}</span>
            {milestonePlans.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t('postJobWizard.notProvided')}</p>
            ) : (
              <div className="mt-2 grid gap-2">
                {milestonePlans.map((milestone, index) => (
                  <article key={milestone.id || index} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <strong className="text-sm">{index + 1}. {optional(milestone.title)}</strong>
                      <strong className="text-sm text-[var(--brand)]">{formatGigCoin(Number(milestone.amount))}</strong>
                    </div>
                    <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                      <div>
                        <dt className="job-post-field__label">{t('postJobWizard.plan.milestoneCopy.duration')}</dt>
                        <dd className="mt-1 whitespace-pre-wrap">{optional(milestone.estimatedDuration)}</dd>
                      </div>
                      <div>
                        <dt className="job-post-field__label">{t('postJobWizard.plan.milestoneCopy.deadline')}</dt>
                        <dd className="mt-1 whitespace-pre-wrap">{optional(milestone.dueDate)}</dd>
                      </div>
                      <div className="md:col-span-2">
                        <dt className="job-post-field__label">{t('postJobWizard.plan.milestoneCopy.description')}</dt>
                        <dd className="mt-1 whitespace-pre-wrap leading-6">{optional(milestone.description)}</dd>
                      </div>
                      <div>
                        <dt className="job-post-field__label">{t('postJobWizard.plan.milestoneCopy.deliverables')}</dt>
                        <dd className="mt-1 whitespace-pre-wrap leading-6">{optional(milestone.deliverables)}</dd>
                      </div>
                      <div>
                        <dt className="job-post-field__label">{t('postJobWizard.plan.milestoneCopy.acceptanceCriteria')}</dt>
                        <dd className="mt-1 whitespace-pre-wrap leading-6">{optional(milestone.acceptanceCriteria)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-border pt-4">
            <span className="job-post-field__label"><FileQuestion size={13} className="mr-1 inline" />{t('postJob.questionsForInterview')}</span>
            {answeredQuestions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t('postJobWizard.notProvided')}</p>
            ) : (
              <ol className="mt-2 grid gap-2">
                {answeredQuestions.map((question, index) => (
                  <li key={index} className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-muted/50 p-3 text-sm">
                    <span className="min-w-0 flex-1 whitespace-pre-wrap">{index + 1}. {question.questionText}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${question.isRequired ? 'bg-[var(--brand)]/10 text-[var(--brand)]' : 'bg-muted text-muted-foreground'}`}>
                      {t(question.isRequired ? 'postJob.required' : 'postJob.optional')}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          </>}
        </div>
      </section>
    </PostJobWizardShell>
  );
}
