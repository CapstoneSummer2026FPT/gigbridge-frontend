import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, ChevronDown, GripVertical, ListChecks, Plus, Save, Trash2 } from 'lucide-react';
import {
  NestedMilestonePlanEditor,
  type EditableMilestonePlan,
} from '../../../shared/components/NestedMilestonePlanEditor';
import { PostJobLeavePrompt } from '../components/PostJobLeavePrompt';
import { PostJobWizardShell } from '../components/PostJobWizardShell';
import { usePostJob, type PostJobRouteState } from '../hooks/usePostJob';
import { JOB_DURATION_UNITS } from '../utils/jobDuration';

export default function PostJobMilestonesScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');
  const routeState = location.state as PostJobRouteState | null;
  const {
    form, previewTitle, errorMessage, isDraftInitializing, draftError,
    milestonePlans, setMilestonePlans, milestoneErrors, setMilestoneErrors,
    expandedMilestone, setExpandedMilestone, questions, setQuestions,
    draggedIndex, updateQuestion, handleDragStart, handleDragOver, handleDragEnd,
    MAX_QUESTION_LENGTH, milestonePlanTotal, isActionDisabled,
    isLeavePromptOpen, leaveAction, autosaveStatus, autosaveError,
    handleLeaveSaveDraft, handleLeaveDiscardDraft, cancelBlockedNavigation,
    submitDraftFlow, renderSubmitLabel, retryAutosave, navigateWizard,
  } = usePostJob();
  const questionCount = questions.filter(question => question.questionText.trim()).length;
  const [milestonesOpen, setMilestonesOpen] = useState(true);
  const [questionsOpen, setQuestionsOpen] = useState(questionCount > 0);

  useEffect(() => {
    if (!routeState?.jobPostId && !routeState?.jobData) navigate('/jobs/post', { replace: true });
  }, [navigate, routeState]);

  useEffect(() => {
    if (Object.keys(milestoneErrors).length > 0) setMilestonesOpen(true);
    if (questionCount > 0 || questions.some(question => question.questionText.length > MAX_QUESTION_LENGTH)) {
      setQuestionsOpen(true);
    }
  }, [MAX_QUESTION_LENGTH, milestoneErrors, questionCount, questions]);

  const completeMilestones = milestonePlans.filter(milestone =>
    milestone.title?.trim() && Number(milestone.amount) > 0
    && milestone.deliverables?.trim() && milestone.acceptanceCriteria?.trim()
  ).length;
  const completionParts = [
    milestonePlans.length === 0 || completeMilestones === milestonePlans.length,
    questions.every(question => !question.questionText.trim() || question.isRequired),
  ];

  return (
    <PostJobWizardShell
      currentStep={2}
      title={t('postJobWizard.plan.title')}
      subtitle={t('postJobWizard.plan.subtitle')}
      previewTitle={previewTitle}
      completion={completionParts.filter(Boolean).length / completionParts.length * 100}
      budget={Number(form.budget) || milestonePlanTotal}
      milestoneCount={milestonePlans.length}
      questionCount={questionCount}
      autosaveStatus={autosaveStatus}
      autosaveError={autosaveError}
      errorMessage={errorMessage || draftError}
      isLoading={isDraftInitializing}
      onRetryAutosave={retryAutosave}
      backAction={(
        <button type="button" className="job-post-button job-post-button--ghost" onClick={() => navigateWizard('/jobs/post')}>
          <ArrowLeft size={15} />{t('postJobWizard.backDetails')}
        </button>
      )}
      secondaryAction={(
        <button type="button" className="job-post-button job-post-button--secondary" disabled={isActionDisabled} onClick={() => submitDraftFlow('draft')}>
          <Save size={15} />{renderSubmitLabel('draft', t('postJobWizard.saveExit'))}
        </button>
      )}
      primaryAction={(
        <button type="button" className="job-post-button job-post-button--primary" disabled={isActionDisabled} onClick={() => submitDraftFlow('review')}>
          {renderSubmitLabel('review', t('postJobWizard.reviewContinue'))}
        </button>
      )}
      overlay={(
        <PostJobLeavePrompt
          isOpen={isLeavePromptOpen}
          leaveAction={leaveAction}
          onSaveDraft={handleLeaveSaveDraft}
          onDiscardDraft={handleLeaveDiscardDraft}
          onCancel={cancelBlockedNavigation}
        />
      )}
    >
      <section className="job-post-section">
        <button type="button" className="job-post-section__header job-post-accordion__trigger" onClick={() => setMilestonesOpen(current => !current)} aria-expanded={milestonesOpen}>
          <span className="job-post-section__heading">
            <span className="job-post-section__icon"><ListChecks size={17} /></span>
            <span><h2>{t('postJobWizard.plan.milestones')}</h2><p>{t('postJobWizard.plan.milestonesHint')}</p></span>
          </span>
          <span className="flex items-center gap-3">
            <small className="text-muted-foreground">{completeMilestones}/{milestonePlans.length} {t('postJobWizard.complete')}</small>
            <ChevronDown size={17} className={`transition-transform ${milestonesOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {milestonesOpen && (
          <div className="job-post-section__body">
            <NestedMilestonePlanEditor
              value={milestonePlans as EditableMilestonePlan[]}
              onChange={plans => {
                setMilestonePlans(plans);
                setMilestoneErrors({});
              }}
              optional
              showDueDate
              title={t('postJob.baselineMilestoneTitle')}
              description={t('postJob.baselineMilestoneDescription')}
              expandedIndex={expandedMilestone}
              onExpandedChange={setExpandedMilestone}
              errors={milestoneErrors}
              durationUnits={JOB_DURATION_UNITS.map(unit => ({ value: unit, label: t(`postJob.durationUnits.${unit}`) }))}
              uiCopy={{
                optional: t('postJobWizard.plan.milestoneCopy.optional'),
                addMilestone: t('postJobWizard.plan.milestoneCopy.addMilestone'),
                fixedProjectBudget: t('postJobWizard.plan.milestoneCopy.fixedProjectBudget'),
                noBaselinePlan: t('postJobWizard.plan.milestoneCopy.noBaselinePlan'),
                noBaselinePlanDescription: t('postJobWizard.plan.milestoneCopy.noBaselinePlanDescription'),
                addFirstMilestone: t('postJobWizard.plan.milestoneCopy.addFirstMilestone'),
                untitledMilestone: t('postJobWizard.plan.milestoneCopy.untitledMilestone'),
                workItems: t('postJobWizard.plan.milestoneCopy.workItems'),
                moveUp: t('postJobWizard.plan.milestoneCopy.moveUp'),
                moveDown: t('postJobWizard.plan.milestoneCopy.moveDown'),
                deleteMilestone: t('postJobWizard.plan.milestoneCopy.deleteMilestone'),
                milestoneTitle: t('postJobWizard.plan.milestoneCopy.milestoneTitle'),
                amount: t('postJobWizard.plan.milestoneCopy.amount'),
                duration: t('postJobWizard.plan.milestoneCopy.duration'),
                durationUnit: t('postJobWizard.plan.milestoneCopy.durationUnit'),
                deadline: t('postJobWizard.plan.milestoneCopy.deadline'),
                description: t('postJobWizard.plan.milestoneCopy.description'),
                deliverables: t('postJobWizard.plan.milestoneCopy.deliverables'),
                acceptanceCriteria: t('postJobWizard.plan.milestoneCopy.acceptanceCriteria'),
                workBreakdown: t('postJobWizard.plan.milestoneCopy.workBreakdown'),
                addWorkItem: t('postJobWizard.plan.milestoneCopy.addWorkItem'),
                workItem: t('postJobWizard.plan.milestoneCopy.workItem'),
                deleteWorkItem: t('postJobWizard.plan.milestoneCopy.deleteWorkItem'),
                workItemTitle: t('postJobWizard.plan.milestoneCopy.workItemTitle'),
                estimatedDuration: t('postJobWizard.plan.milestoneCopy.estimatedDuration'),
                taskDescription: t('postJobWizard.plan.milestoneCopy.taskDescription'),
                workItemDeliverables: t('postJobWizard.plan.milestoneCopy.workItemDeliverables'),
              }}
              fieldHints={{
                fixedProjectBudget: t('postJob.baselineBudgetHint'),
                milestoneTitle: t('postJob.baselineMilestoneTitleHint'),
                amount: t('postJob.baselineAmountHint'),
                duration: t('postJob.baselineDurationHint'),
                deadline: t('postJob.baselineDeadlineHint'),
                description: t('postJob.baselineDescriptionHint'),
                deliverables: t('postJob.baselineDeliverablesHint'),
                acceptanceCriteria: t('postJob.baselineAcceptanceCriteriaHint'),
                workBreakdown: t('postJob.baselineWorkBreakdownHint'),
                workItemTitle: t('postJob.baselineWorkItemTitleHint'),
                workItemDuration: t('postJob.baselineWorkItemDurationHint'),
                workItemDescription: t('postJob.baselineWorkItemDescriptionHint'),
                workItemDeliverables: t('postJob.baselineWorkItemDeliverablesHint'),
              }}
              fieldPlaceholders={{
                milestoneTitle: t('postJob.baselineMilestoneTitlePlaceholder'),
                amount: t('postJob.baselineAmountPlaceholder'),
                duration: t('postJob.baselineDurationPlaceholder'),
                description: t('postJob.baselineDescriptionPlaceholder'),
                deliverables: t('postJob.baselineDeliverablesPlaceholder'),
                acceptanceCriteria: t('postJob.baselineAcceptanceCriteriaPlaceholder'),
                workItemTitle: t('postJob.baselineWorkItemTitlePlaceholder'),
                workItemDuration: t('postJob.baselineWorkItemDurationPlaceholder'),
                workItemDescription: t('postJob.baselineWorkItemDescriptionPlaceholder'),
                workItemDeliverables: t('postJob.baselineWorkItemDeliverablesPlaceholder'),
              }}
            />
          </div>
        )}
      </section>

      <section className="job-post-section">
        <button type="button" className="job-post-section__header job-post-accordion__trigger" onClick={() => setQuestionsOpen(current => !current)} aria-expanded={questionsOpen}>
          <span className="job-post-section__heading">
            <span className="job-post-section__icon"><CheckCircle2 size={17} /></span>
            <span><h2>{t('postJob.questionsForInterview')}</h2><p>{t('postJob.questionsGuideDesc')}</p></span>
          </span>
          <span className="flex items-center gap-3">
            <small className="text-muted-foreground">{questionCount} {t('postJobWizard.plan.questionsAdded')}</small>
            <ChevronDown size={17} className={`transition-transform ${questionsOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {questionsOpen && (
          <div className="job-post-section__body">
            {questions.map((question, index) => (
              <article
                key={index}
                draggable
                onDragStart={event => handleDragStart(event, index)}
                onDragOver={event => handleDragOver(event, index)}
                onDragEnd={handleDragEnd}
                className={`rounded-xl border p-4 ${draggedIndex === index ? 'border-[var(--brand)] opacity-60' : 'border-border bg-background'}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <GripVertical size={14} />{t('postJob.question', { number: index + 1 })}
                    <em className="not-italic text-[var(--brand)]">{t('postJob.required')}</em>
                  </span>
                  <button type="button" onClick={() => setQuestions(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={t('postJob.deleteQuestion')}><Trash2 size={14} /></button>
                </div>
                <textarea
                  className="job-post-input"
                  rows={3}
                  maxLength={MAX_QUESTION_LENGTH}
                  value={question.questionText}
                  onChange={event => updateQuestion(index, { questionText: event.target.value, isRequired: true })}
                  placeholder={t('postJob.questionPlaceholder')}
                />
                <div className="mt-1 text-right text-[10px] text-muted-foreground">{question.questionText.length}/{MAX_QUESTION_LENGTH}</div>
              </article>
            ))}
            {questions.length === 0 && <p className="rounded-xl border border-dashed border-border p-7 text-center text-xs text-muted-foreground">{t('postJob.noQuestions')}</p>}
            <button type="button" className="job-post-button job-post-button--secondary w-full" onClick={() => setQuestions(current => [...current, { questionText: '', isRequired: true }])}>
              <Plus size={15} />{t('postJob.addQuestion')}
            </button>
          </div>
        )}
      </section>
    </PostJobWizardShell>
  );
}
