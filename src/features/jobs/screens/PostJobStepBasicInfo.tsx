import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  BriefcaseBusiness, ChevronDown, Clock3, Coins, FileText, Plus, Save, Sparkles,
  ImagePlus, LoaderCircle, Tag, Trash2, X,
} from 'lucide-react';
import { jobAPI } from '../../../api/jobAPI';
import { useApp } from '../../../app/providers/AppProvider';
import { JobPostVisibility, type GetMyJobPostDto } from '../../../types/models/Job';
import { formatGigCoinToVnd } from '../../../shared/utils/gigcoin';
import { usePremiumStatus } from '../../premium/hooks';
import { PostJobAiInput } from '../components/PostJobAiInput';
import { PostJobLeavePrompt } from '../components/PostJobLeavePrompt';
import { PostJobWizardShell } from '../components/PostJobWizardShell';
import { usePostJob } from '../hooks/usePostJob';
import { CustomSelect } from '../../../shared/components/CustomSelect';
import { JOB_DURATION_UNITS } from '../utils/jobDuration';
import { AIGeneratedDetailsReviewModal } from '../components/AIGeneratedDetailsReviewModal';

export default function PostJobStepBasicInfo() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { role } = useApp();
  const premium = usePremiumStatus(role);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
    handleApproveDetails, handleCancelDetails, isInstantJobMode,
    setIsInstantJobMode,
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
          {!isInstantJobMode && (
            <button type="button" className="job-post-button job-post-button--primary" onClick={() => setIsInstantJobMode(true)}>
              <Sparkles size={15} />{t('postJobWizard.ai.open')}
            </button>
          )}
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
      promptInput={
        isInstantJobMode && (
          <PostJobAiInput
            isPremium={premium.isPremium}
            isLoading={isGeneratingInstant}
            onGenerate={handleGenerateInstantJob}
            onUpgrade={() => navigate('/premium/client/pricing')}
            onClose={() => setIsInstantJobMode(false)}
          />
        )
      }
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
              <label htmlFor="job-major">{t('postJob.major', 'Ngành')} *</label>
              <CustomSelect
                value={form.majorId}
                options={majors.map(m => ({ value: m.majorId, label: m.name }))}
                onChange={val => handleMajorChange(val)}
                disabled={isMajorsLoading}
                placeholder={isMajorsLoading ? t('postJob.loadingMajors', 'Đang tải ngành...') : t('postJob.selectMajor', 'Chọn ngành')}
                searchable
                searchPlaceholder={t('common.search', 'Tìm kiếm...')}
              />
            </div>
            <div className="job-post-field">
              <label htmlFor="job-category">{t('postJob.category', 'Danh mục')} *</label>
              <CustomSelect
                value={form.majorCategoryId}
                options={categories.map(c => ({ value: c.majorCategoryId, label: c.name }))}
                onChange={val => handleCategoryChange(val)}
                disabled={!form.majorId || isCategoriesLoading}
                placeholder={!form.majorId ? t('postJob.selectMajorFirst', 'Chọn ngành trước') : t('postJob.selectCategory', 'Chọn danh mục')}
                searchable
                searchPlaceholder={t('common.search', 'Tìm kiếm...')}
              />
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
            <div>
              <h2>{t('postJobWizard.details.budgetTimeline', 'Ngân sách & thời gian')}</h2>
              <p>{t('postJobWizard.details.budgetTimelineHint', 'Thiết lập kỳ vọng thực tế về thời hạn nhận proposal và triển khai.')}</p>
            </div>
          </div>
        </div>
        <div className="job-post-section__body">
          <div className="job-post-grid">
            {/* Expected Budget */}
            <div className="job-post-field">
              <label htmlFor="job-budget">{t('postJob.expectedBudget', 'Ngân sách dự kiến')}</label>
              <input id="job-budget" type="number" min="0" value={form.budget} onChange={event => setForm({ ...form, budget: event.target.value })} placeholder="0" />
              {/* Quick Budget Presets */}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Quick:</span>
                {[100, 300, 500, 1000].map(amount => (
                  <button
                    type="button"
                    key={amount}
                    onClick={() => setForm({ ...form, budget: String(amount) })}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition-all border ${
                      form.budget === String(amount)
                        ? 'bg-[var(--brand)] text-white border-[var(--brand)] shadow-sm'
                        : 'bg-muted/40 text-muted-foreground border-border hover:border-[var(--brand)] hover:text-foreground'
                    }`}
                  >
                    {amount} G-coin
                  </button>
                ))}
              </div>
              {Number(form.budget) > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--brand)_8%,var(--card))] border border-[color-mix(in_srgb,var(--brand)_20%,transparent)] px-3 py-1.5 text-xs text-foreground font-medium">
                  <Coins size={14} className="text-[var(--brand)] flex-shrink-0" />
                  <span>
                    ≈ <strong>{formatGigCoinToVnd(Number(form.budget))}</strong>
                    <span className="ml-1 text-muted-foreground text-[11px]">(1 G-coin = 1.000 VNĐ)</span>
                  </span>
                </div>
              )}
              <small className="mt-0.5 text-muted-foreground">{t('postJobWizard.details.budgetFromMilestones', 'Được tự động tính từ kế hoạch milestone.')}</small>
            </div>

            {/* Estimated Duration */}
            <div className="job-post-field">
              <label htmlFor="job-duration">{t('postJob.estimatedDuration', 'Thời gian dự kiến')} *</label>
              <div className="flex items-center rounded-xl border border-border bg-background focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand)]/15 transition-all overflow-hidden p-1 gap-1">
                <div className="flex items-center flex-1 pl-3 pr-1">
                  <Clock3 size={16} className="text-muted-foreground mr-2 flex-shrink-0" />
                  <input
                    id="job-duration"
                    type="number"
                    min="1"
                    value={form.estimatedDurationValue}
                    onChange={event => setForm({ ...form, estimatedDurationValue: event.target.value })}
                    placeholder="3"
                    className="w-full border-none bg-transparent p-1.5 text-sm font-bold text-foreground outline-none shadow-none focus:outline-none focus:shadow-none"
                  />
                </div>
                <div className="h-6 w-px bg-border/80 flex-shrink-0" />
                <div className="flex items-center gap-1 p-0.5 bg-muted/40 rounded-lg">
                  {JOB_DURATION_UNITS.map(unit => {
                    const isSelected = form.estimatedDurationUnit === unit;
                    const unitLabel = unit === 'weeks' ? 'Tuần' : unit === 'months' ? 'Tháng' : 'Năm';
                    return (
                      <button
                        type="button"
                        key={unit}
                        onClick={() => setForm({ ...form, estimatedDurationUnit: unit })}
                        className={`px-3 py-1.5 text-xs font-extrabold rounded-md transition-all ${
                          isSelected
                            ? 'bg-[var(--brand)] text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                        }`}
                      >
                        {t(`postJob.durationUnits.${unit}`, unitLabel)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <small className="text-muted-foreground">{t('postJobWizard.details.estimatedDurationHint', 'Thời gian dự kiến hoàn thành toàn bộ dự án.')}</small>
            </div>
          </div>

          {/* End Date / Deadline */}
          <div className="job-post-field">
            <label htmlFor="job-deadline">{t('postJob.endDate', 'Ngày kết thúc nhận proposal')} *</label>
            <input id="job-deadline" type="date" value={form.deadline} onChange={event => setForm({ ...form, deadline: event.target.value })} />
            <small className="text-muted-foreground">{t('postJobWizard.details.deadlineHint', 'Đây là hạn cuối nhận proposal, không phải ngày hoàn thành toàn bộ dự án.')}</small>
          </div>

          {/* Advanced Settings Accordion */}
          <div className="rounded-2xl border border-border/80 bg-muted/15 transition-all">
            <button
              type="button"
              className="job-post-accordion__trigger p-4.5 flex items-center justify-between w-full text-left"
              onClick={() => setShowAdvanced(current => !current)}
              aria-expanded={showAdvanced}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center font-bold text-xs">
                  <ImagePlus size={15} />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                  {t('postJob.advancedSettings', 'Cài đặt nâng cao (Hình ảnh & Phạm vi hiển thị)')}
                </span>
              </div>
              <ChevronDown size={18} className={`text-muted-foreground transition-transform duration-200 ${showAdvanced ? 'rotate-180 text-[var(--brand)]' : ''}`} />
            </button>
            {showAdvanced && (
              <div className="grid gap-5 border-t border-border/80 p-5 bg-card/50 rounded-b-2xl">
                {/* Project Reference Images */}
                <div className="job-post-field">
                  <span className="job-post-field__label font-bold text-foreground">
                    {t('postJobWizard.details.attachments', 'Hình ảnh dự án')}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {t('postJobWizard.details.attachmentsHint', 'Thêm hình ảnh tham khảo để freelancer hiểu rõ kết quả bạn mong muốn.')}
                  </p>
                  <label className={`job-post-image-picker mt-1 ${isUploadingAttachment ? 'pointer-events-none opacity-60' : ''}`}>
                    <span className="job-post-image-picker__icon">
                      {isUploadingAttachment ? <LoaderCircle className="animate-spin" size={21} /> : <ImagePlus size={21} />}
                    </span>
                    <span>
                      <strong className="text-sm font-bold text-foreground">
                        {isUploadingAttachment
                          ? t('postJobWizard.details.uploadingImage', 'Đang tải ảnh...')
                          : t('postJobWizard.details.chooseImages', 'Chọn hình ảnh dự án')}
                      </strong>
                      <small className="text-xs text-muted-foreground mt-0.5">
                        {t('postJobWizard.details.imagePolicy', 'Chỉ JPEG, PNG hoặc WebP · tối đa 5 MB mỗi ảnh · tối đa 5 ảnh')}
                      </small>
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
                  {attachmentError && <small className="text-red-500 font-medium">{attachmentError}</small>}
                  {attachments.length > 0 && (
                    <div className="job-post-image-grid mt-2">
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

                {/* Job Post Visibility */}
                <div className="job-post-field">
                  <label htmlFor="job-visibility" className="font-bold text-foreground">{t('postJob.visibility', 'Phạm vi hiển thị')}</label>
                  <CustomSelect
                    value={form.visibility}
                    options={[
                      { value: String(JobPostVisibility.Public), label: t('postJob.public', 'Công khai (Public)') },
                      { value: String(JobPostVisibility.Private), label: t('postJob.private', 'Riêng tư (Private)') },
                      { value: String(JobPostVisibility.InviteOnly), label: t('postJob.inviteOnly', 'Chỉ qua lời mời (Invite Only)') },
                    ]}
                    onChange={val => setForm({ ...form, visibility: val })}
                    searchable={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </PostJobWizardShell>
  );
}
