import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bot, Briefcase, Calendar, Check, CheckCircle2, CircleDollarSign, Clock3, Coins, FileText, Globe, HelpCircle, Images, Layers, ListChecks, LoaderCircle, Pencil, Save, Tags } from 'lucide-react';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { formatGigCoin, formatGigCoinNumber, formatGigCoinToVnd } from '../../../shared/utils/gigcoin';
import { JobPostVisibility } from '../../../types/models/Job';
import { PostJobBudgetExceededPrompt } from '../components/PostJobBudgetExceededPrompt';
import { PostJobLeavePrompt } from '../components/PostJobLeavePrompt';
import {
  PostJobHiringPlanReviewEditor,
  PostJobProjectReviewEditor,
  PostJobTermsReviewEditor,
} from '../components/PostJobReviewEditors';
import { PostJobWizardShell } from '../components/PostJobWizardShell';
import { useApp } from '../../../app/providers/AppProvider';
import { usePremiumStatus } from '../../premium/hooks';
import '../../premium/styles/auto-renew.css';
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
  const { role } = useApp();
  const premiumStatus = usePremiumStatus(role);
  const routeState = location.state as PostJobRouteState | null;
  const controller = usePostJob();
  const {
    form, selectedOfficialSkills, selectedMajorName, selectedCategoryName,
    previewTitle, errorMessage, isActionDisabled, isDraftInitializing,
    draftError, questions, milestonePlans, milestonePlanTotal,
    aiInterviewEnabled, setAiInterviewEnabled,
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

  const handleAiInterviewToggle = (): void => {
    if (premiumStatus.loading) return;
    if (!premiumStatus.isPremium) {
      navigate('/premium/client/pricing');
      return;
    }
    setAiInterviewEnabled(current => !current);
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
      {/* HERO FREELANCER LIVE PREVIEW BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--brand)]/30 bg-gradient-to-br from-[var(--brand)]/10 via-purple-500/5 to-card p-6 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand)]/15 border border-[var(--brand)]/30 text-[11px] font-black tracking-widest text-[var(--brand)] uppercase">
              <span className="w-2 h-2 rounded-full bg-[var(--brand)] animate-pulse" />
              Chế độ xem trước của Freelancer (Live Preview)
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {form.title || 'Tiêu đề dự án của bạn'}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Đây là chính xác nội dung hiển thị cho các ứng viên freelancer khi bài đăng này được công khai trên nền tảng GigBridge.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-background/80 backdrop-blur-md p-3.5 rounded-2xl border border-border/70 shadow-xs">
            <div className="px-3 py-1.5 rounded-xl bg-muted/60 text-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Ngân sách</span>
              <strong className="text-sm font-black text-[var(--brand)] inline-flex items-center gap-1">
                <span>{formatGigCoinNumber(Number(form.budget) || milestonePlanTotal)}</span>
                <GCoinIcon size={14} />
                <span>G-coin</span>
              </strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-muted/60 text-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Milestones</span>
              <strong className="text-sm font-black text-foreground">{milestonePlans.length} Mốc</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-muted/60 text-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Trạng thái</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> Sẵn sàng
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: PROJECT OVERVIEW */}
      <section className="job-post-section !rounded-3xl !border-border/80 !bg-card !p-6 sm:!p-7 shadow-sm hover:shadow-md transition-all">
        <div className="job-post-section__header flex items-center justify-between pb-4 border-b border-border/60">
          <div className="job-post-section__heading flex items-center gap-3">
            <span className="job-post-section__icon bg-gradient-to-br from-[var(--brand)]/15 to-purple-500/15 text-[var(--brand)] p-2.5 rounded-2xl">
              <FileText size={18} />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-foreground">{t('postJobWizard.review.project')}</h2>
              <p className="text-xs text-muted-foreground">{t('postJobWizard.review.projectHint')}</p>
            </div>
          </div>
          {editButton('project', t('postJobWizard.edit'))}
        </div>
        <div className="job-post-section__body pt-5">
          {editingSection === 'project' ? (
            <PostJobProjectReviewEditor controller={controller} />
          ) : (
            <div className="space-y-6">
              {/* Category Breadcrumbs & Title */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedMajorName && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--brand)]/10 text-xs font-black text-[var(--brand)] border border-[var(--brand)]/20">
                      <Briefcase size={13} />
                      {selectedMajorName}
                    </span>
                  )}
                  {selectedCategoryName && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs font-bold text-foreground border border-border/60">
                      <Layers size={13} className="text-muted-foreground" />
                      {selectedCategoryName}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-snug">
                  {form.title}
                </h2>
              </div>

              {/* Styled Description Box */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  {t('postJob.jobDescription')}
                </span>
                <div className="rounded-2xl border-l-4 border-l-[var(--brand)] border border-border/70 bg-muted/20 p-5 text-sm leading-relaxed text-foreground whitespace-pre-line font-medium shadow-2xs">
                  {renderDescription(form.description)}
                </div>
              </div>

              {/* Required Skills Cloud */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tags size={13} className="text-[var(--brand)]" />
                  {t('postJob.requiredSkills')}
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {allSkills.length > 0 ? (
                    allSkills.map(skill => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[var(--brand)]/10 to-purple-500/10 text-[var(--brand)] border border-[var(--brand)]/20 px-4 py-1.5 text-xs font-extrabold rounded-full shadow-2xs hover:scale-105 transition-transform cursor-default"
                      >
                        ✦ {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">{t('postJobWizard.notProvided')}</span>
                  )}
                </div>
              </div>

              {/* Attachments Gallery */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Images size={13} className="text-[var(--brand)]" />
                  {t('postJobWizard.details.attachments')}
                </span>
                {attachments.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
                    {attachments.map(attachment => (
                      <figure
                        key={attachment.jobPostAttachmentsId}
                        className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm hover:border-[var(--brand)] hover:shadow-md transition-all aspect-video flex flex-col justify-end p-3 cursor-pointer"
                        onClick={() => window.open(attachment.fileUrl, '_blank')}
                      >
                        <img
                          src={attachment.fileUrl}
                          alt={attachment.fileName}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                        <figcaption
                          title={attachment.fileName}
                          className="relative z-10 text-[11px] font-bold text-white truncate drop-shadow-sm flex items-center gap-1"
                        >
                          <Images size={12} className="shrink-0 text-white/80" />
                          {attachment.fileName}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{t('postJobWizard.notProvided')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: TERMS & BUDGET */}
      <section className="job-post-section !rounded-3xl !border-border/80 !bg-card !p-6 sm:!p-7 shadow-sm hover:shadow-md transition-all">
        <div className="job-post-section__header flex items-center justify-between pb-4 border-b border-border/60">
          <div className="job-post-section__heading flex items-center gap-3">
            <span className="job-post-section__icon bg-gradient-to-br from-[var(--brand)]/15 to-purple-500/15 text-[var(--brand)] p-2.5 rounded-2xl">
              <CircleDollarSign size={18} />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-foreground">{t('postJobWizard.review.terms')}</h2>
              <p className="text-xs text-muted-foreground">{t('postJobWizard.review.termsHint')}</p>
            </div>
          </div>
          {editButton('terms', t('postJobWizard.edit'))}
        </div>
        <div className="job-post-section__body pt-5">
          {editingSection === 'terms' ? (
            <PostJobTermsReviewEditor controller={controller} />
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              {/* Stat 1: Budget */}
              <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 to-muted/10 p-4.5 space-y-1.5 hover:border-[var(--brand)]/50 transition-all">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Coins size={15} className="text-[var(--brand)]" />
                  {t('postJob.expectedBudget')}
                </span>
                <strong className="inline-flex items-center gap-1.5 text-xl font-black text-[var(--brand)]">
                  <span>{formatGigCoinNumber(Number(form.budget) || milestonePlanTotal)}</span>
                  <GCoinIcon size={16} />
                  <span>G-coin</span>
                </strong>
                {(Number(form.budget) > 0 || milestonePlanTotal > 0) && (
                  <span className="block text-[11px] font-extrabold text-muted-foreground">
                    ≈ {formatGigCoinToVnd(Number(form.budget) || milestonePlanTotal)}
                  </span>
                )}
              </div>

              {/* Stat 2: Duration */}
              <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 to-muted/10 p-4.5 space-y-1.5 hover:border-[var(--brand)]/50 transition-all">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock3 size={15} className="text-[var(--brand)]" />
                  {t('postJob.estimatedDuration')}
                </span>
                <strong className="block text-lg font-black text-foreground">
                  {form.estimatedDurationValue} {t(`postJob.durationUnits.${form.estimatedDurationUnit}`)}
                </strong>
                <span className="block text-[11px] font-medium text-muted-foreground">Thời gian hoàn thành</span>
              </div>

              {/* Stat 3: Deadline */}
              <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 to-muted/10 p-4.5 space-y-1.5 hover:border-[var(--brand)]/50 transition-all">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar size={15} className="text-[var(--brand)]" />
                  {t('postJob.endDate')}
                </span>
                <strong className="block text-lg font-black text-foreground">
                  {optional(form.deadline)}
                </strong>
                <span className="block text-[11px] font-medium text-muted-foreground">Hạn nhận hồ sơ</span>
              </div>

              {/* Stat 4: Visibility */}
              <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 to-muted/10 p-4.5 space-y-1.5 hover:border-[var(--brand)]/50 transition-all">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Globe size={15} className="text-[var(--brand)]" />
                  {t('postJob.visibility')}
                </span>
                <strong className="block text-lg font-black text-foreground">
                  {visibilityLabel}
                </strong>
                <span className="block text-[11px] font-medium text-muted-foreground">Phạm vi hiển thị</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: HIRING PLAN & QUESTIONS */}
      <section className="job-post-section !rounded-3xl !border-border/80 !bg-card !p-6 sm:!p-7 shadow-sm hover:shadow-md transition-all">
        <div className="job-post-section__header flex items-center justify-between pb-4 border-b border-border/60">
          <div className="job-post-section__heading flex items-center gap-3">
            <span className="job-post-section__icon bg-gradient-to-br from-[var(--brand)]/15 to-purple-500/15 text-[var(--brand)] p-2.5 rounded-2xl">
              <ListChecks size={18} />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-foreground">{t('postJobWizard.review.hiringPlan')}</h2>
              <p className="text-xs text-muted-foreground">{t('postJobWizard.review.hiringPlanHint')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all ${aiInterviewEnabled
                ? 'border-transparent bg-purple-500/10 text-purple-800 dark:text-purple-200 shadow-[0_0_14px_rgba(168,85,247,0.18)]'
                : 'border-border/70 bg-muted/30 text-muted-foreground'
              }`}>
              <Bot size={14} className="post-job-ai-toggle-label" />
              <span className="post-job-ai-toggle-label text-[10px] font-black uppercase tracking-wider">
                {t('postJobWizard.plan.aiInterviewShort', { defaultValue: 'AI Interview' })}
              </span>
              <label
                className={`cp-toggle cp-toggle--ai ${aiInterviewEnabled ? '' : 'off'}`}
                title={t(aiInterviewEnabled
                  ? 'postJobWizard.plan.aiEnableOnPublish'
                  : 'postJobWizard.plan.aiDisabled')}
              >
                <input
                  type="checkbox"
                  checked={aiInterviewEnabled}
                  disabled={premiumStatus.loading || isActionDisabled}
                  onChange={handleAiInterviewToggle}
                  aria-label={t(aiInterviewEnabled
                    ? 'postJobWizard.plan.aiEnableOnPublish'
                    : 'postJobWizard.plan.aiDisabled')}
                />
                <span className="cp-slider" />
              </label>
            </div>
            {editButton('hiringPlan', t('postJobWizard.edit'))}
          </div>
        </div>
        <div className="job-post-section__body pt-5">
          {editingSection === 'hiringPlan' ? (
            <PostJobHiringPlanReviewEditor controller={controller} />
          ) : (
            <div className="space-y-6">
              {/* Milestones Review */}
              <div className="space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  {t('postJobWizard.plan.milestones')} ({milestonePlans.length})
                </span>
                {milestonePlans.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">{t('postJobWizard.notProvided')}</p>
                ) : (
                  <div className="grid gap-4">
                    {milestonePlans.map((milestone, index) => (
                      <article
                        key={milestone.id || index}
                        className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3.5 hover:border-[var(--brand)]/40 transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/50">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 px-3.5 items-center justify-center rounded-full bg-[var(--brand)] text-white text-xs font-black shadow-xs">
                              {t('postJobWizard.plan.milestoneLabel', 'Mốc {{number}}', { number: index + 1 })}
                            </span>
                            <strong className="text-base font-extrabold text-foreground">{optional(milestone.title)}</strong>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 font-black text-sm text-[var(--brand)] bg-[var(--brand)]/10 px-3.5 py-1.5 rounded-xl border border-[var(--brand)]/20">
                              <span>{formatGigCoinNumber(Number(milestone.amount))}</span>
                              <GCoinIcon size={14} />
                              <span>G-coin</span>
                              <small className="font-bold text-muted-foreground text-[10px] ml-1">
                                (≈{formatGigCoinToVnd(Number(milestone.amount))})
                              </small>
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-4 text-xs sm:grid-cols-2 pt-1">
                          {milestone.estimatedDuration && (
                            <div>
                              <span className="font-extrabold uppercase text-[10px] tracking-wider text-muted-foreground block">
                                {t('postJobWizard.plan.milestoneCopy.duration')}
                              </span>
                              <span className="mt-1 block font-bold text-foreground flex items-center gap-1.5 text-xs">
                                <Clock3 size={13} className="text-[var(--brand)]" />
                                {milestone.estimatedDuration}
                              </span>
                            </div>
                          )}
                          {milestone.dueDate && (
                            <div>
                              <span className="font-extrabold uppercase text-[10px] tracking-wider text-muted-foreground block">
                                {t('postJobWizard.plan.milestoneCopy.deadline')}
                              </span>
                              <span className="mt-1 block font-bold text-foreground flex items-center gap-1.5 text-xs">
                                <Calendar size={13} className="text-[var(--brand)]" />
                                {milestone.dueDate}
                              </span>
                            </div>
                          )}
                          {milestone.deliverables && (
                            <div className="sm:col-span-2 space-y-1">
                              <span className="font-extrabold uppercase text-[10px] tracking-wider text-muted-foreground block">
                                {t('postJobWizard.plan.milestoneCopy.deliverables')}
                              </span>
                              <div className="font-medium text-foreground whitespace-pre-wrap leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/50">
                                {milestone.deliverables}
                              </div>
                            </div>
                          )}
                          {milestone.acceptanceCriteria && (
                            <div className="sm:col-span-2 space-y-1">
                              <span className="font-extrabold uppercase text-[10px] tracking-wider text-muted-foreground block">
                                {t('postJobWizard.plan.milestoneCopy.acceptanceCriteria')}
                              </span>
                              <div className="font-medium text-foreground whitespace-pre-wrap leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/50">
                                {milestone.acceptanceCriteria}
                              </div>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {/* Vetting Questions Review */}
              <div className={`space-y-3 transition-all duration-300 ${aiInterviewEnabled
                  ? 'job-post-ai-twilight rounded-3xl p-5'
                  : 'border-t border-border/60 pt-5'
                }`}>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-[var(--brand)]" />
                  {t('postJob.questionsForInterview')} ({answeredQuestions.length})
                </span>
                {answeredQuestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">{t('postJobWizard.notProvided')}</p>
                ) : (
                  <div className="grid gap-3">
                    {answeredQuestions.map((question, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm"
                      >
                        <span className="min-w-0 flex-1 font-bold text-foreground whitespace-pre-wrap leading-relaxed">
                          {index + 1}. {question.questionText}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${question.isRequired
                              ? 'bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20'
                              : 'bg-muted text-muted-foreground border border-border/60'
                            }`}
                        >
                          {t(question.isRequired ? 'postJob.required' : 'postJob.optional')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </PostJobWizardShell>
  );
}
