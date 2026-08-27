import {
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '../../../shared/components/CustomSelect';
import {
  NestedMilestonePlanEditor,
  type EditableMilestonePlan,
} from '../../../shared/components/NestedMilestonePlanEditor';
import type { usePostJob } from '../hooks/usePostJob';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { formatGigCoinToVnd } from '../../../shared/utils/gigcoin';
import { JOB_DURATION_UNITS, type JobDurationUnit } from '../utils/jobDuration';
import { QuestionRequiredToggle } from './QuestionRequiredToggle';

type PostJobController = ReturnType<typeof usePostJob>;

interface EditorProps {
  controller: PostJobController;
}

export function PostJobProjectReviewEditor({ controller }: EditorProps) {
  const { t } = useTranslation('common');
  const {
    form, setForm, majors, categories, skillInput, setSkillInput,
    remainingSkills, selectedOfficialSkills, isMajorsLoading,
    isCategoriesLoading, isSkillsLoading, attachments,
    isUploadingAttachment, attachmentError, handleMajorChange,
    handleCategoryChange, addOfficialSkill, addSkill, removeOfficialSkill,
    removeCustomSkill, uploadAttachment, deleteAttachment,
  } = controller;

  return (
    <div className="grid gap-5">
      <div className="job-post-field">
        <label htmlFor="job-title">{t('postJob.jobTitle')} *</label>
        <input id="job-title" value={form.title} maxLength={200} onChange={event => setForm({ ...form, title: event.target.value })} placeholder={t('postJob.jobTitlePlaceholder')} />
        <small>{form.title.length}/200</small>
      </div>

      <div className="job-post-grid">
        <div className="job-post-field">
          <label htmlFor="job-major">{t('postJob.major')} *</label>
          <CustomSelect
            disabled={isMajorsLoading}
            value={form.majorId}
            options={majors.map(m => ({ value: m.majorId, label: m.name }))}
            onChange={val => handleMajorChange(val)}
            placeholder={isMajorsLoading ? t('postJob.loadingMajors') : t('postJob.selectMajor')}
            searchable={true}
          />
        </div>
        <div className="job-post-field">
          <label htmlFor="job-category">{t('postJob.category')} *</label>
          <CustomSelect
            disabled={!form.majorId || isCategoriesLoading}
            value={form.majorCategoryId}
            options={categories.map(c => ({ value: c.majorCategoryId, label: c.name }))}
            onChange={val => handleCategoryChange(val)}
            placeholder={!form.majorId ? t('postJob.selectMajorFirst') : t('postJob.selectCategory')}
            searchable={true}
          />
        </div>
      </div>

      <div className="job-post-field">
        <span className="job-post-field__label">{t('postJob.requiredSkills')}</span>
        <div className="job-post-input flex min-h-[3rem] flex-wrap items-center gap-2 focus-within:border-[var(--brand)]">
          {selectedOfficialSkills.map(skill => (
            <span key={skill.skillId} className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] px-2.5 py-1 text-xs font-bold text-[var(--brand)]">
              {skill.name}
              <button type="button" onClick={() => removeOfficialSkill(skill.skillId)} aria-label={t('postJobWizard.review.removeSkill', { name: skill.name })}><X size={11} /></button>
            </span>
          ))}
          {form.customSkillNames.map(skill => (
            <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
              {skill}
              <button type="button" onClick={() => removeCustomSkill(skill)} aria-label={t('postJobWizard.review.removeSkill', { name: skill })}><X size={11} /></button>
            </span>
          ))}
          <input
            className="min-w-[9rem] flex-1 border-none bg-transparent p-0 shadow-none outline-none"
            value={skillInput}
            disabled={!form.categoryId}
            placeholder={form.categoryId ? t('postJob.addSkillPlaceholder') : t('postJob.selectCategoryFirst')}
            onChange={event => setSkillInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && skillInput.trim()) {
                event.preventDefault();
                addSkill(skillInput);
              }
            }}
          />
          <button type="button" disabled={!skillInput.trim()} onClick={() => addSkill(skillInput)} aria-label={t('postJob.addSkill')}><Plus size={15} /></button>
        </div>
        {isSkillsLoading && <small>{t('postJob.loadingSkills')}</small>}
        {remainingSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {remainingSkills.slice(0, 6).map(skill => (
              <button type="button" key={skill.skillId} onClick={() => addOfficialSkill(skill)} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-[var(--brand)]">
                + {skill.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="job-post-field">
        <label htmlFor="job-description">{t('postJob.jobDescription')} *</label>
        <textarea id="job-description" rows={9} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder={t('postJob.jobDescPlaceholder')} />
      </div>

      <div className="job-post-field">
        <span className="job-post-field__label">{t('postJobWizard.details.attachments')}</span>
        <p className="text-xs text-muted-foreground">{t('postJobWizard.details.attachmentsHint')}</p>
        <label className={`job-post-image-picker ${isUploadingAttachment ? 'pointer-events-none opacity-60' : ''}`}>
          <span className="job-post-image-picker__icon">
            {isUploadingAttachment ? <LoaderCircle className="animate-spin" size={21} /> : <ImagePlus size={21} />}
          </span>
          <span>
            <strong>{isUploadingAttachment ? t('postJobWizard.details.uploadingImage') : t('postJobWizard.details.chooseImages')}</strong>
            <small>{t('postJobWizard.details.imagePolicy')}</small>
          </span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            disabled={isUploadingAttachment || attachments.length >= 5}
            onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void uploadAttachment(file);
            }}
          />
        </label>
        {attachmentError && <small className="text-red-500">{attachmentError}</small>}
        {attachments.length > 0 && (
          <div className="job-post-image-grid">
            {attachments.map(attachment => (
              <figure key={attachment.jobPostAttachmentsId} className="job-post-image-card">
                <img src={attachment.fileUrl} alt={attachment.fileName} />
                <figcaption title={attachment.fileName}>{attachment.fileName}</figcaption>
                <button type="button" onClick={() => void deleteAttachment(attachment.jobPostAttachmentsId)} aria-label={t('postJobWizard.details.deleteImage', { name: attachment.fileName })}>
                  <Trash2 size={14} />
                </button>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PostJobTermsReviewEditor({ controller }: EditorProps) {
  const { t } = useTranslation('common');
  const { form, setForm } = controller;

  return (
    <div className="grid gap-5">
      <div className="job-post-grid">
        <div className="job-post-field">
          <label htmlFor="job-budget">{t('postJob.expectedBudget')}</label>
          <div className="relative flex items-center">
            <input
              id="job-budget"
              type="number"
              min="0"
              value={form.budget}
              onChange={event => setForm({ ...form, budget: event.target.value })}
              placeholder="0"
              className="w-full pr-24 sm:pr-36 text-sm font-semibold"
            />
            {Number(form.budget) > 0 && (
              <div className="absolute right-2.5 flex items-center gap-1.5 rounded-md bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold text-[var(--brand)] pointer-events-none select-none">
                <span>= {formatGigCoinToVnd(Number(form.budget))}</span>
              </div>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--brand)_8%,var(--card))] border border-[color-mix(in_srgb,var(--brand)_20%,transparent)] px-3 py-1.5 text-xs text-foreground font-medium">
            <GCoinIcon size={15} />
            <span>
              Chú thích mệnh giá: <strong>1 G-coin = 1.000 VNĐ</strong>
            </span>
          </div>
          <small>{t('postJobWizard.details.budgetFromMilestones')}</small>
        </div>
        <div className="job-post-field">
          <label htmlFor="job-duration">{t('postJob.estimatedDuration')} *</label>
          <div className="grid grid-cols-[1fr_7.5rem] sm:grid-cols-[1fr_8rem] gap-2">
            <input id="job-duration" type="number" min="1" value={form.estimatedDurationValue} onChange={event => setForm({ ...form, estimatedDurationValue: event.target.value })} placeholder="3" />
            <CustomSelect
              value={form.estimatedDurationUnit}
              options={JOB_DURATION_UNITS.map(unit => ({ value: unit, label: t(`postJob.durationUnits.${unit}`) }))}
              onChange={val => setForm({ ...form, estimatedDurationUnit: val as JobDurationUnit })}
              searchable={false}
              className="cs-compact"
            />
          </div>
        </div>
      </div>
      <div className="job-post-field">
        <label htmlFor="job-deadline">{t('postJob.endDate')} *</label>
        <input id="job-deadline" type="date" value={form.deadline} onChange={event => setForm({ ...form, deadline: event.target.value })} />
        <small>{t('postJobWizard.details.deadlineHint')}</small>
      </div>
    </div>
  );
}

export function PostJobHiringPlanReviewEditor({ controller }: EditorProps) {
  const { t } = useTranslation('common');
  const {
    form,
    milestonePlansWithDeadlines, setMilestonePlans, milestoneErrors, setMilestoneErrors,
    expandedMilestone, setExpandedMilestone, questions, setQuestions,
    draggedIndex, updateQuestion, handleDragStart, handleDragOver,
    handleDragEnd, MAX_QUESTION_LENGTH,
  } = controller;

  return (
    <div className="grid gap-6">
      <NestedMilestonePlanEditor
        value={milestonePlansWithDeadlines as EditableMilestonePlan[]}
        onChange={plans => {
          setMilestonePlans(plans);
          setMilestoneErrors({});
        }}
        targetBudget={Number(form.budget) || null}
        optional
        showDueDate
        dueDateReadOnly
        showWorkItems={false}
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
        }}
        fieldPlaceholders={{
          milestoneTitle: t('postJob.baselineMilestoneTitlePlaceholder'),
          amount: t('postJob.baselineAmountPlaceholder'),
          duration: t('postJob.baselineDurationPlaceholder'),
          description: t('postJob.baselineDescriptionPlaceholder'),
          deliverables: t('postJob.baselineDeliverablesPlaceholder'),
          acceptanceCriteria: t('postJob.baselineAcceptanceCriteriaPlaceholder'),
        }}
      />

      <div className="grid gap-3 border-t border-border pt-5">
        <div>
          <h3 className="text-sm font-bold">{t('postJob.questionsForInterview')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t('postJob.questionsGuideDesc')}</p>
        </div>
        {questions.map((question, index) => (
          <article
            key={index}
            draggable
            onDragStart={event => handleDragStart(event, index)}
            onDragOver={event => handleDragOver(event, index)}
            onDragEnd={handleDragEnd}
            className={`rounded-xl border p-4 ${draggedIndex === index ? 'border-[var(--brand)] opacity-60' : 'border-border bg-background'}`}
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <GripVertical size={14} />{t('postJob.question', { number: index + 1 })}
              </span>
              <div className="flex items-center gap-3">
                <QuestionRequiredToggle
                  isRequired={question.isRequired}
                  questionNumber={index + 1}
                  onChange={isRequired => updateQuestion(index, { isRequired })}
                />
                <button type="button" onClick={() => setQuestions(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={t('postJob.deleteQuestion')}><Trash2 size={14} /></button>
              </div>
            </div>
            <textarea
              data-question-index={index}
              className="job-post-input"
              rows={3}
              maxLength={MAX_QUESTION_LENGTH}
              value={question.questionText}
              onChange={event => updateQuestion(index, { questionText: event.target.value })}
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
    </div>
  );
}
