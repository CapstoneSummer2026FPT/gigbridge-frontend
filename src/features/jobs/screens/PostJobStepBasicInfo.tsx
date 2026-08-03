import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  BriefcaseBusiness, ChevronDown, Clock3, FileText, Plus, Save, Sparkles,
  ImagePlus, LoaderCircle, Tag, Trash2, X,
} from 'lucide-react';
import { jobAPI } from '../../../api/jobAPI';
import { useApp } from '../../../app/providers/AppProvider';
import { JobPostVisibility, type GetMyJobPostDto } from '../../../types/models/Job';
import { usePremiumStatus } from '../../premium/hooks';
import { PostJobAiDrawer } from '../components/PostJobAiDrawer';
import { PostJobLeavePrompt } from '../components/PostJobLeavePrompt';
import { PostJobWizardShell } from '../components/PostJobWizardShell';
import { usePostJob } from '../hooks/usePostJob';
import { JOB_DURATION_UNITS, type JobDurationUnit } from '../utils/jobDuration';
import { AIGeneratedDetailsReviewModal } from '../components/AIGeneratedDetailsReviewModal';

export default function PostJobStepBasicInfo() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { role } = useApp();
  const premium = usePremiumStatus(role);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [drafts, setDrafts] = useState<GetMyJobPostDto[]>([]);
  const [isDraftsLoading, setIsDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);

  const {
    form, setForm, majors, categories, skillInput, setSkillInput,
    remainingSkills, selectedOfficialSkills, previewTitle, errorMessage,
    isDraftInitializing, draftError, taxonomyError,
    isMajorsLoading, isCategoriesLoading, isSkillsLoading, isActionDisabled,
    isLeavePromptOpen, leaveAction, autosaveStatus, autosaveError,
    questions, milestonePlans, milestonePlanTotal,
    attachments, isUploadingAttachment, attachmentError,
    handleMajorChange, handleCategoryChange, addOfficialSkill, addSkill,
    removeOfficialSkill, removeCustomSkill, handleLeaveSaveDraft,
    handleLeaveDiscardDraft, cancelBlockedNavigation, submitDraftFlow,
    renderSubmitLabel, retryAutosave, resetToNewDraft,
    uploadAttachment, deleteAttachment,
    isGeneratingInstant, handleGenerateInstantJob,
    isReviewModalOpen, pendingGeneratedDetails, isGeneratingPlan,
    handleApproveDetails, handleCancelDetails,
  } = usePostJob();

  const completionItems = [
    form.title.trim(), form.majorId, form.majorCategoryId, form.description.trim(),
    form.estimatedDurationValue, form.deadline,
  ];
  const completion = completionItems.filter(Boolean).length / completionItems.length * 100;
  const questionCount = questions.filter(question => question.questionText.trim()).length;

  const loadDrafts = async () => {
    setIsDraftModalOpen(true);
    setIsDraftsLoading(true);
    setDraftsError(null);
    const response = await jobAPI.getMyDraftJobPosts();
    setIsDraftsLoading(false);
    if (!response.success || !response.data) {
      setDrafts([]);
      setDraftsError(response.message || t('postJob.noDrafts'));
      return;
    }
    setDrafts(response.data);
  };

  const continueDraft = (draft: GetMyJobPostDto) => {
    setIsDraftModalOpen(false);
    navigate('/jobs/post', { state: { jobPostId: draft.jobPostsId } });
  };

  const createNewDraft = () => {
    setIsDraftModalOpen(false);
    resetToNewDraft();
    navigate('/jobs/post', { replace: true, state: null });
  };

  const overlay = (
    <>
      <PostJobAiDrawer
        isOpen={showAiDrawer}
        isPremium={premium.isPremium}
        isLoading={isGeneratingInstant}
        onClose={() => setShowAiDrawer(false)}
        onGenerate={handleGenerateInstantJob}
        onUpgrade={() => navigate('/premium/client/pricing')}
      />

      {isDraftModalOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" onClick={() => setIsDraftModalOpen(false)}>
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="text-lg font-extrabold">{t('postJob.continueDraftTitle')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('postJob.continueDraftDesc', { count: drafts.length })}</p>
              </div>
              <button type="button" onClick={() => setIsDraftModalOpen(false)} aria-label={t('common.close')}><X size={18} /></button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-5">
              {isDraftsLoading && <p className="py-8 text-center text-sm text-muted-foreground">{t('postJob.checkingDrafts')}</p>}
              {draftsError && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-500">{draftsError}</p>}
              {!isDraftsLoading && !draftsError && drafts.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <FileText className="mx-auto mb-2 text-muted-foreground" />
                  <strong>{t('postJob.noDrafts')}</strong>
                  <p className="mt-1 text-xs text-muted-foreground">{t('postJob.noDraftsDesc')}</p>
                </div>
              )}
              <div className="grid gap-2">
                {drafts.map(draft => (
                  <button
                    type="button"
                    key={draft.jobPostsId}
                    onClick={() => continueDraft(draft)}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4 text-left hover:border-[var(--brand)]"
                  >
                    <span className="min-w-0">
                      <strong className="block truncate text-sm">{draft.title || t('postJob.untitledDraft')}</strong>
                      <small className="text-muted-foreground">{new Date(draft.updatedAt || draft.createdAt).toLocaleString()}</small>
                    </span>
                    <span className="text-xs font-bold text-[var(--brand)]">{t('postJob.editDraft')}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-4">
              <button type="button" className="job-post-button job-post-button--secondary" onClick={() => setIsDraftModalOpen(false)}>{t('postJob.cancel')}</button>
              <button type="button" className="job-post-button job-post-button--primary" onClick={createNewDraft}>{t('postJob.createNewJobPost2')}</button>
            </div>
          </div>
        </div>
      )}

      <PostJobLeavePrompt
        isOpen={isLeavePromptOpen}
        leaveAction={leaveAction}
        onSaveDraft={handleLeaveSaveDraft}
        onDiscardDraft={handleLeaveDiscardDraft}
        onCancel={cancelBlockedNavigation}
      />

      <AIGeneratedDetailsReviewModal
        isOpen={isReviewModalOpen}
        data={pendingGeneratedDetails}
        onClose={handleCancelDetails}
        onApprove={handleApproveDetails}
      />

      {isGeneratingPlan && (
        <div className="job-post-plan-spinner-overlay">
          <div className="job-post-spinner-logo">
            <div className="job-post-spinner-ring" />
            <Sparkles size={28} className="text-white" />
          </div>
          <h2>Generating Hiring Plan...</h2>
          <p>Analyzing requirements to build milestones & vetting questions</p>
        </div>
      )}
    </>
  );

  return (
    <PostJobWizardShell
      currentStep={1}
      title={t('postJobWizard.details.title')}
      subtitle={t('postJobWizard.details.subtitle')}
      previewTitle={previewTitle}
      completion={completion}
      budget={Number(form.budget) || milestonePlanTotal}
      milestoneCount={milestonePlans.length}
      questionCount={questionCount}
      autosaveStatus={autosaveStatus}
      autosaveError={autosaveError}
      errorMessage={errorMessage || taxonomyError || draftError}
      isLoading={isDraftInitializing}
      onRetryAutosave={retryAutosave}
      headerAction={(
        <div className="flex flex-wrap gap-2">
          <button type="button" className="job-post-button job-post-button--secondary" onClick={loadDrafts}>
            <FileText size={15} />{t('postJob.continueDraft')}
          </button>
          <button type="button" className="job-post-button job-post-button--primary" onClick={() => setShowAiDrawer(true)}>
            <Sparkles size={15} />{t('postJobWizard.ai.open')}
          </button>
        </div>
      )}
      secondaryAction={(
        <button type="button" className="job-post-button job-post-button--secondary" disabled={isActionDisabled} onClick={() => submitDraftFlow('draft')}>
          <Save size={15} />{renderSubmitLabel('draft', t('postJobWizard.saveExit'))}
        </button>
      )}
      primaryAction={(
        <button type="button" className="job-post-button job-post-button--primary" disabled={isActionDisabled} onClick={() => submitDraftFlow('plan')}>
          {renderSubmitLabel('plan', t('postJobWizard.continuePlan'))}
        </button>
      )}
      overlay={overlay}
    >
      <section className="job-post-section">
        <div className="job-post-section__header">
          <div className="job-post-section__heading">
            <span className="job-post-section__icon"><BriefcaseBusiness size={17} /></span>
            <div><h2>{t('postJobWizard.details.identity')}</h2><p>{t('postJobWizard.details.identityHint')}</p></div>
          </div>
        </div>
        <div className="job-post-section__body">
          <div className="job-post-field">
            <label htmlFor="job-title">{t('postJob.jobTitle')} *</label>
            <input id="job-title" value={form.title} maxLength={200} onChange={event => setForm({ ...form, title: event.target.value })} placeholder={t('postJob.jobTitlePlaceholder')} />
            <small>{form.title.length}/200</small>
          </div>
          <div className="job-post-grid">
            <div className="job-post-field">
              <label htmlFor="job-major">{t('postJob.major')} *</label>
              <select id="job-major" value={form.majorId} disabled={isMajorsLoading} onChange={event => handleMajorChange(event.target.value)}>
                <option value="">{isMajorsLoading ? t('postJob.loadingMajors') : t('postJob.selectMajor')}</option>
                {majors.map(major => <option key={major.majorId} value={major.majorId}>{major.name}</option>)}
              </select>
            </div>
            <div className="job-post-field">
              <label htmlFor="job-category">{t('postJob.category')} *</label>
              <select id="job-category" value={form.majorCategoryId} disabled={!form.majorId || isCategoriesLoading} onChange={event => handleCategoryChange(event.target.value)}>
                <option value="">{!form.majorId ? t('postJob.selectMajorFirst') : t('postJob.selectCategory')}</option>
                {categories.map(category => <option key={category.majorCategoryId} value={category.majorCategoryId}>{category.name}</option>)}
              </select>
            </div>
          </div>
          <div className="job-post-field">
            <span className="job-post-field__label">{t('postJob.requiredSkills')}</span>
            <div className="job-post-input flex min-h-[3rem] flex-wrap items-center gap-2 focus-within:border-[var(--brand)]">
              {selectedOfficialSkills.map(skill => (
                <span key={skill.skillId} className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] px-2.5 py-1 text-xs font-bold text-[var(--brand)]">
                  {skill.name}<button type="button" onClick={() => removeOfficialSkill(skill.skillId)}><X size={11} /></button>
                </span>
              ))}
              {form.customSkillNames.map(skill => (
                <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                  {skill}<button type="button" onClick={() => removeCustomSkill(skill)}><X size={11} /></button>
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
        </div>
      </section>

      <section className="job-post-section">
        <div className="job-post-section__header">
          <div className="job-post-section__heading">
            <span className="job-post-section__icon"><Tag size={17} /></span>
            <div><h2>{t('postJobWizard.details.requirements')}</h2><p>{t('postJobWizard.details.requirementsHint')}</p></div>
          </div>
        </div>
        <div className="job-post-section__body">
          <div className="job-post-field">
            <label htmlFor="job-description">{t('postJob.jobDescription')} *</label>
            <textarea id="job-description" rows={9} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder={t('postJob.jobDescPlaceholder')} />
          </div>
        </div>
      </section>

      <section className="job-post-section">
        <div className="job-post-section__header">
          <div className="job-post-section__heading">
            <span className="job-post-section__icon"><Clock3 size={17} /></span>
            <div><h2>{t('postJobWizard.details.budgetTimeline')}</h2><p>{t('postJobWizard.details.budgetTimelineHint')}</p></div>
          </div>
        </div>
        <div className="job-post-section__body">
          <div className="job-post-grid">
            <div className="job-post-field">
              <label htmlFor="job-budget">{t('postJob.expectedBudget')}</label>
              <input id="job-budget" type="number" min="0" value={form.budget} disabled={milestonePlans.length > 0} onChange={event => setForm({ ...form, budget: event.target.value })} placeholder="0" />
              <small>{milestonePlans.length ? t('postJobWizard.details.budgetFromMilestones') : t('postJobWizard.details.budgetHint')}</small>
            </div>
            <div className="job-post-field">
              <label>{t('postJob.estimatedDuration')} *</label>
              <div className="grid grid-cols-[1fr_8rem] gap-2">
                <input id="job-duration" type="number" min="1" value={form.estimatedDurationValue} onChange={event => setForm({ ...form, estimatedDurationValue: event.target.value })} placeholder="3" />
                <select value={form.estimatedDurationUnit} onChange={event => setForm({ ...form, estimatedDurationUnit: event.target.value as JobDurationUnit })}>
                  {JOB_DURATION_UNITS.map(unit => <option key={unit} value={unit}>{t(`postJob.durationUnits.${unit}`)}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="job-post-field">
            <label htmlFor="job-deadline">{t('postJob.endDate')} *</label>
            <input id="job-deadline" type="date" value={form.deadline} onChange={event => setForm({ ...form, deadline: event.target.value })} />
            <small>{t('postJobWizard.details.deadlineHint')}</small>
          </div>
          <div className="rounded-xl border border-border">
            <button type="button" className="job-post-accordion__trigger p-4" onClick={() => setShowAdvanced(current => !current)} aria-expanded={showAdvanced}>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('postJob.advancedSettings')}</span>
              <ChevronDown size={16} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
            {showAdvanced && (
              <div className="grid gap-5 border-t border-border p-4">
                <div className="job-post-field">
                  <span className="job-post-field__label">{t('postJobWizard.details.attachments')}</span>
                  <p className="text-xs text-muted-foreground">{t('postJobWizard.details.attachmentsHint')}</p>
                  <label className={`job-post-image-picker ${isUploadingAttachment ? 'pointer-events-none opacity-60' : ''}`}>
                    <span className="job-post-image-picker__icon">
                      {isUploadingAttachment ? <LoaderCircle className="animate-spin" size={21} /> : <ImagePlus size={21} />}
                    </span>
                    <span>
                      <strong>{isUploadingAttachment
                        ? t('postJobWizard.details.uploadingImage')
                        : t('postJobWizard.details.chooseImages')}</strong>
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
                          <button
                            type="button"
                            onClick={() => void deleteAttachment(attachment.jobPostAttachmentsId)}
                            aria-label={t('postJobWizard.details.deleteImage', { name: attachment.fileName })}
                          >
                            <Trash2 size={14} />
                          </button>
                        </figure>
                      ))}
                    </div>
                  )}
                </div>
                <div className="job-post-field">
                  <label htmlFor="job-visibility">{t('postJob.visibility')}</label>
                  <select id="job-visibility" value={form.visibility} onChange={event => setForm({ ...form, visibility: event.target.value })}>
                    <option value={JobPostVisibility.Public}>{t('postJob.public')}</option>
                    <option value={JobPostVisibility.Private}>{t('postJob.private')}</option>
                    <option value={JobPostVisibility.InviteOnly}>{t('postJob.inviteOnly')}</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </PostJobWizardShell>
  );
}
