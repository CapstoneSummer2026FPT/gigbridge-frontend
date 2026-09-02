import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, Briefcase, Calendar, Check, CheckCircle2, CircleDollarSign, Clock3, Coins, FileText, Globe, HelpCircle, Images, Layers, ListChecks, LoaderCircle, Mail, Pencil, Save, Sparkles, Tags } from 'lucide-react';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { formatGigCoin, formatGigCoinNumber, formatGigCoinToVnd } from '../../../shared/utils/gigcoin';
import { JobPostVisibility } from '../../../types/models/Job';
import { useApp } from '../../../app/providers/AppProvider';
import { usePremiumStatus } from '../../premium/hooks';
import { PostJobBudgetExceededPrompt } from '../components/PostJobBudgetExceededPrompt';
import { PostJobAiInterviewToggle } from '../components/PostJobAiInterviewToggle';
import { PostJobLeavePrompt } from '../components/PostJobLeavePrompt';
import { PostJobVisibilityModal } from '../components/PostJobVisibilityModal';
import {
  PostJobHiringPlanReviewEditor,
  PostJobProjectReviewEditor,
  PostJobTermsReviewEditor,
} from '../components/PostJobReviewEditors';
import { PostJobWizardShell } from '../components/PostJobWizardShell';
import { BrandSweepBackButton } from '../components/BrandSweepBackButton';
import {
  usePostJob,
  type PostJobReviewSection,
  type PostJobRouteState,
} from '../hooks/usePostJob';
import { renderDescription } from '../utils/descriptionFormatter';

const normalizePublishVisibility = (visibility: string): JobPostVisibility => {
  const value = Number(visibility);
  if (value === JobPostVisibility.InviteOnly) return value;
  return JobPostVisibility.Public;
};

export default function PostJobReviewScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');
  const { role } = useApp();
  const { isPremium } = usePremiumStatus(role);
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
    hasAiInterview, setHasAiInterview,
  } = controller;
  const [editingSection, setEditingSection] = useState<PostJobReviewSection | null>(null);
  const [isFinishingEdit, setIsFinishingEdit] = useState(false);
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);
  const [publishVisibility, setPublishVisibility] = useState<JobPostVisibility>(JobPostVisibility.Public);
  const answeredQuestions = questions.filter(question => question.questionText.trim());
  const hasInterviewQuestions = answeredQuestions.length > 0;
  const isAiInterviewEnabled = hasInterviewQuestions && hasAiInterview;

  const handleToggleAiInterview = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!hasInterviewQuestions) return;

    if (!isPremium) {
      toast.info(
        t('postJobWizard.plan.aiPremiumRequired', {
          defaultValue: 'Tính năng AI Phỏng vấn tự động yêu cầu tài khoản Client Premium. Đang chuyển hướng đến trang nâng cấp...',
        })
      );
      navigate('/premium/client/pricing');
      return;
    }

    setHasAiInterview(prev => {
      const next = !prev;
      toast.success(
        next
          ? t('postJobWizard.plan.aiEnabledToast', { defaultValue: 'Đã bật AI Phỏng vấn tự động cho bài đăng này!' })
          : t('postJobWizard.plan.aiDisabledToast', { defaultValue: 'Đã tắt AI Phỏng vấn tự động.' })
      );
      return next;
    });
  };

  useEffect(() => {
    if (!routeState?.jobPostId && !routeState?.jobData) navigate('/jobs/post', { replace: true });
  }, [navigate, routeState]);

  const allSkills = [...selectedOfficialSkills.map(skill => skill.name), ...form.customSkillNames];
  const optional = (value?: string | null) => value?.trim() || t('postJobWizard.notProvided');
  const completion = [
    form.title, form.majorId, form.majorCategoryId, form.description,
    form.estimatedDurationValue, form.deadline,
  ].filter(Boolean).length / 6 * 100;

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

  const handlePublishClick = (): void => {
    setPublishVisibility(normalizePublishVisibility(form.visibility));
    setIsVisibilityModalOpen(true);
  };

  const handleVisibilityCancel = (): void => {
    setIsVisibilityModalOpen(false);
  };

  const handleVisibilityChange = (value: JobPostVisibility): void => {
    setPublishVisibility(value);
  };

  const handleVisibilityConfirm = async (): Promise<void> => {
    controller.setForm(current => ({
      ...current,
      visibility: String(publishVisibility),
    }));

    const result = await submitDraftFlow('publish', publishVisibility);
    setIsVisibilityModalOpen(false);

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
        <BrandSweepBackButton onClick={() => navigateWizard('/jobs/post/plan')} className="w-full sm:w-auto justify-center">
          <ArrowLeft size={15} />{t('postJobWizard.backPlan')}
        </BrandSweepBackButton>
      )}
      secondaryAction={(
        <button type="button" className="job-post-button job-post-button--secondary w-full sm:w-auto justify-center" disabled={isActionDisabled || isFinishingEdit} onClick={() => submitDraftFlow('draft')}>
          <Save size={15} />{renderSubmitLabel('draft', t('postJobWizard.saveExit'))}
        </button>
      )}
      primaryAction={(
        <button type="button" className="job-post-button job-post-button--primary w-full sm:w-auto justify-center" disabled={isActionDisabled || isFinishingEdit} onClick={handlePublishClick}>
          <Check size={15} />{renderSubmitLabel('publish', t('postJob.publishProjectRequest'))}
        </button>
      )}
      overlay={(
        <>
          <PostJobVisibilityModal
            isOpen={isVisibilityModalOpen}
            value={publishVisibility}
            isSubmitting={isActionDisabled}
            onChange={handleVisibilityChange}
            onCancel={handleVisibilityCancel}
            onConfirm={handleVisibilityConfirm}
          />
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
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--brand)]/30 bg-gradient-to-br from-[var(--brand)]/10 via-purple-500/5 to-card p-4 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[var(--brand)]/15 border border-[var(--brand)]/30 text-[10px] sm:text-[11px] font-black tracking-widest text-[var(--brand)] uppercase">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--brand)] animate-pulse" />
              Chế độ xem trước của Freelancer (Live Preview)
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight break-words [overflow-wrap:anywhere]">
              {form.title || 'Tiêu đề dự án của bạn'}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Đây là chính xác nội dung hiển thị cho các ứng viên freelancer khi bài đăng này được công khai trên nền tảng GigBridge.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:flex md:flex-wrap items-center bg-background/80 backdrop-blur-md p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-border/70 shadow-xs">
            <div className="px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-muted/60 text-center flex-1 min-w-0">
              <span className="text-[9.5px] sm:text-[10px] font-bold text-muted-foreground uppercase block truncate">Ngân sách</span>
              <strong className="text-xs sm:text-sm font-black text-[var(--brand)] inline-flex items-center justify-center gap-0.5 sm:gap-1 truncate max-w-full">
                <span className="truncate">{formatGigCoinNumber(Number(form.budget) || milestonePlanTotal)}</span>
                <GCoinIcon size={13} className="shrink-0" />
              </strong>
            </div>
            <div className="px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-muted/60 text-center flex-1 min-w-0">
              <span className="text-[9.5px] sm:text-[10px] font-bold text-muted-foreground uppercase block truncate">Milestones</span>
              <strong className="text-xs sm:text-sm font-black text-foreground truncate block">{milestonePlans.length} Mốc</strong>
            </div>
            <div className="px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-muted/60 text-center flex-1 min-w-0">
              <span className="text-[9.5px] sm:text-[10px] font-bold text-muted-foreground uppercase block truncate">Trạng thái</span>
              <span className="text-[11px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 truncate">
                <CheckCircle2 size={12} className="shrink-0" /> Sẵn sàng
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: PROJECT OVERVIEW */}
      <section className="job-post-section !rounded-2xl sm:!rounded-3xl !border-border/80 !bg-card !p-4 sm:!p-7 shadow-sm hover:shadow-md transition-all">
        <div className="job-post-section__header flex items-center justify-between pb-3.5 sm:pb-4 border-b border-border/60 gap-2">
          <div className="job-post-section__heading flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="job-post-section__icon bg-gradient-to-br from-[var(--brand)]/15 to-purple-500/15 text-[var(--brand)] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0">
              <FileText size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-foreground truncate">{t('postJobWizard.review.project')}</h2>
              <p className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">{t('postJobWizard.review.projectHint')}</p>
            </div>
          </div>
          {editButton('project', t('postJobWizard.edit'))}
        </div>
        <div className="job-post-section__body pt-4 sm:pt-5">
          {editingSection === 'project' ? (
            <PostJobProjectReviewEditor controller={controller} />
          ) : (
            <div className="space-y-5 sm:space-y-6">
              {/* Category Breadcrumbs & Title */}
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {selectedMajorName && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[var(--brand)]/10 text-[11px] sm:text-xs font-black text-[var(--brand)] border border-[var(--brand)]/20">
                      <Briefcase size={12} />
                      {selectedMajorName}
                    </span>
                  )}
                  {selectedCategoryName && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-muted text-[11px] sm:text-xs font-bold text-foreground border border-border/60">
                      <Layers size={12} className="text-muted-foreground" />
                      {selectedCategoryName}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-foreground tracking-tight leading-snug break-words [overflow-wrap:anywhere]">
                  {form.title}
                </h2>
              </div>

              {/* Styled Description Box */}
              <div className="space-y-1.5 sm:space-y-2">
                <span className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  {t('postJob.jobDescription')}
                </span>
                <div className="rounded-xl sm:rounded-2xl border-l-4 border-l-[var(--brand)] border border-border/70 bg-muted/20 p-4 sm:p-5 text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-line font-medium shadow-2xs break-words [overflow-wrap:anywhere]">
                  {renderDescription(form.description)}
                </div>
              </div>

              {/* Required Skills Cloud */}
              <div className="space-y-1.5 sm:space-y-2">
                <span className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tags size={13} className="text-[var(--brand)]" />
                  {t('postJob.requiredSkills')}
                </span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
                  {allSkills.length > 0 ? (
                    allSkills.map(skill => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 bg-gradient-to-r from-[var(--brand)]/10 to-purple-500/10 text-[var(--brand)] border border-[var(--brand)]/20 px-3 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs font-extrabold rounded-full shadow-2xs hover:scale-105 transition-transform cursor-default"
                      >
                        ✦ {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs sm:text-sm text-muted-foreground italic">{t('postJobWizard.notProvided')}</span>
                  )}
                </div>
              </div>

              {/* Attachments Gallery */}
              <div className="space-y-1.5 sm:space-y-2">
                <span className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Images size={13} className="text-[var(--brand)]" />
                  {t('postJobWizard.details.attachments')}
                </span>
                {attachments.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 pt-0.5 sm:pt-1">
                    {attachments.map(attachment => (
                      <figure
                        key={attachment.jobPostAttachmentsId}
                        className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-border/80 bg-card shadow-sm hover:border-[var(--brand)] hover:shadow-md transition-all aspect-video flex flex-col justify-end p-2.5 sm:p-3 cursor-pointer"
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
                          className="relative z-10 text-[10.5px] sm:text-[11px] font-bold text-white truncate drop-shadow-sm flex items-center gap-1"
                        >
                          <Images size={11} className="shrink-0 text-white/80" />
                          {attachment.fileName}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground italic">{t('postJobWizard.notProvided')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: TERMS & BUDGET */}
      <section className="job-post-section !rounded-2xl sm:!rounded-3xl !border-border/80 !bg-card !p-4 sm:!p-7 shadow-sm hover:shadow-md transition-all">
        <div className="job-post-section__header flex items-center justify-between pb-3.5 sm:pb-4 border-b border-border/60 gap-2">
          <div className="job-post-section__heading flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="job-post-section__icon bg-gradient-to-br from-[var(--brand)]/15 to-purple-500/15 text-[var(--brand)] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0">
              <CircleDollarSign size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-foreground truncate">{t('postJobWizard.review.terms')}</h2>
              <p className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">{t('postJobWizard.review.termsHint')}</p>
            </div>
          </div>
          {editButton('terms', t('postJobWizard.edit'))}
        </div>
        <div className="job-post-section__body pt-4 sm:pt-5">
          {editingSection === 'terms' ? (
            <PostJobTermsReviewEditor controller={controller} />
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
              {/* Stat 1: Budget */}
              <div className="rounded-xl sm:rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 to-muted/10 p-3.5 sm:p-4.5 space-y-1.5 hover:border-[var(--brand)]/50 transition-all">
                <span className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Coins size={14} className="text-[var(--brand)] shrink-0" />
                  {t('postJob.expectedBudget')}
                </span>
                <strong className="inline-flex items-center gap-1.5 text-lg sm:text-xl font-black text-[var(--brand)] flex-wrap">
                  <span>{formatGigCoinNumber(Number(form.budget) || milestonePlanTotal)}</span>
                  <GCoinIcon size={16} className="shrink-0" />
                  <span>G-coin</span>
                </strong>
                {(Number(form.budget) > 0 || milestonePlanTotal > 0) && (
                  <span className="block text-[10.5px] sm:text-[11px] font-extrabold text-muted-foreground">
                    ≈ {formatGigCoinToVnd(Number(form.budget) || milestonePlanTotal)}
                  </span>
                )}
              </div>

              {/* Stat 2: Duration */}
              <div className="rounded-xl sm:rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 to-muted/10 p-3.5 sm:p-4.5 space-y-1.5 hover:border-[var(--brand)]/50 transition-all">
                <span className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock3 size={14} className="text-[var(--brand)] shrink-0" />
                  {t('postJob.estimatedDuration')}
                </span>
                <strong className="block text-base sm:text-lg font-black text-foreground">
                  {form.estimatedDurationValue} {t(`postJob.durationUnits.${form.estimatedDurationUnit}`)}
                </strong>
                <span className="block text-[10.5px] sm:text-[11px] font-medium text-muted-foreground">Thời gian hoàn thành</span>
              </div>

              {/* Stat 3: Deadline */}
              <div className="rounded-xl sm:rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 to-muted/10 p-3.5 sm:p-4.5 space-y-1.5 hover:border-[var(--brand)]/50 transition-all">
                <span className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar size={14} className="text-[var(--brand)] shrink-0" />
                  {t('postJob.endDate')}
                </span>
                <strong className="block text-base sm:text-lg font-black text-foreground truncate">
                  {optional(form.deadline)}
                </strong>
                <span className="block text-[10.5px] sm:text-[11px] font-medium text-muted-foreground">Hạn nhận hồ sơ</span>
              </div>

            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: HIRING PLAN & QUESTIONS */}
      <section className="job-post-section !rounded-2xl sm:!rounded-3xl !border-border/80 !bg-card !p-4 sm:!p-7 shadow-sm hover:shadow-md transition-all">
        <div className="job-post-section__header flex items-center justify-between pb-3.5 sm:pb-4 border-b border-border/60 gap-2">
          <div className="job-post-section__heading flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="job-post-section__icon bg-gradient-to-br from-[var(--brand)]/15 to-purple-500/15 text-[var(--brand)] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0">
              <ListChecks size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-foreground truncate">{t('postJobWizard.review.hiringPlan')}</h2>
              <p className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">{t('postJobWizard.review.hiringPlanHint')}</p>
            </div>
          </div>
          {editButton('hiringPlan', t('postJobWizard.edit'))}
        </div>
        <div className="job-post-section__body pt-4 sm:pt-5">
          {editingSection === 'hiringPlan' ? (
            <PostJobHiringPlanReviewEditor controller={controller} />
          ) : (
            <div className="space-y-5 sm:space-y-6">
              {/* Milestones Review */}
              <div className="space-y-2.5 sm:space-y-3">
                <span className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  {t('postJobWizard.plan.milestones')} ({milestonePlans.length})
                </span>
                {milestonePlans.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground italic">{t('postJobWizard.notProvided')}</p>
                ) : (
                  <div className="grid gap-3 sm:gap-4">
                    {milestonePlans.map((milestone, index) => (
                      <article
                        key={milestone.id || index}
                        className="rounded-xl sm:rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-sm space-y-3 sm:space-y-3.5 hover:border-[var(--brand)]/40 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 sm:pb-3 border-b border-border/50">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex h-7 px-3 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white text-[11px] sm:text-xs font-black shadow-xs">
                              {t('postJobWizard.plan.milestoneLabel', 'Mốc {{number}}', { number: index + 1 })}
                            </span>
                            <strong className="text-sm sm:text-base font-extrabold text-foreground truncate">{optional(milestone.title)}</strong>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="inline-flex items-center gap-1 font-black text-xs sm:text-sm text-[var(--brand)] bg-[var(--brand)]/10 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl border border-[var(--brand)]/20">
                              <span>{formatGigCoinNumber(Number(milestone.amount))}</span>
                              <GCoinIcon size={13} className="shrink-0" />
                              <span>G-coin</span>
                              <small className="font-bold text-muted-foreground text-[9.5px] sm:text-[10px] ml-0.5">
                                (≈{formatGigCoinToVnd(Number(milestone.amount))})
                              </small>
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-2.5 sm:gap-4 text-xs grid-cols-1 sm:grid-cols-2 pt-0.5">
                          {milestone.estimatedDuration && (
                            <div>
                              <span className="font-extrabold uppercase text-[9.5px] sm:text-[10px] tracking-wider text-muted-foreground block">
                                {t('postJobWizard.plan.milestoneCopy.duration')}
                              </span>
                              <span className="mt-0.5 sm:mt-1 font-bold text-foreground flex items-center gap-1.5 text-xs">
                                <Clock3 size={12} className="text-[var(--brand)] shrink-0" />
                                {milestone.estimatedDuration}
                              </span>
                            </div>
                          )}
                          {milestone.dueDate && (
                            <div>
                              <span className="font-extrabold uppercase text-[9.5px] sm:text-[10px] tracking-wider text-muted-foreground block">
                                {t('postJobWizard.plan.milestoneCopy.deadline')}
                              </span>
                              <span className="mt-0.5 sm:mt-1 font-bold text-foreground flex items-center gap-1.5 text-xs">
                                <Calendar size={12} className="text-[var(--brand)] shrink-0" />
                                {milestone.dueDate}
                              </span>
                            </div>
                          )}
                          {milestone.deliverables && (
                            <div className="sm:col-span-2 space-y-1">
                              <span className="font-extrabold uppercase text-[9.5px] sm:text-[10px] tracking-wider text-muted-foreground block">
                                {t('postJobWizard.plan.milestoneCopy.deliverables')}
                              </span>
                              <div className="font-medium text-foreground whitespace-pre-wrap leading-relaxed bg-muted/20 p-2.5 sm:p-3 rounded-xl border border-border/50 text-xs break-words [overflow-wrap:anywhere]">
                                {milestone.deliverables}
                              </div>
                            </div>
                          )}
                          {milestone.acceptanceCriteria && (
                            <div className="sm:col-span-2 space-y-1">
                              <span className="font-extrabold uppercase text-[9.5px] sm:text-[10px] tracking-wider text-muted-foreground block">
                                {t('postJobWizard.plan.milestoneCopy.acceptanceCriteria')}
                              </span>
                              <div className="font-medium text-foreground whitespace-pre-wrap leading-relaxed bg-muted/20 p-2.5 sm:p-3 rounded-xl border border-border/50 text-xs break-words [overflow-wrap:anywhere]">
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
              <div className="pt-4 sm:pt-5 border-t border-border/60 space-y-2.5 sm:space-y-3">
                <span className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-[var(--brand)]" />
                  {t('postJob.questionsForInterview')} ({answeredQuestions.length})
                </span>
                {answeredQuestions.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground italic">{t('postJobWizard.notProvided')}</p>
                ) : (
                  <div className="grid gap-2.5 sm:gap-3">
                    {answeredQuestions.map((question, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl sm:rounded-2xl border border-border/70 bg-muted/20 p-3.5 sm:p-4 text-xs sm:text-sm"
                      >
                        <span className="min-w-0 flex-1 font-bold text-foreground whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                          {index + 1}. {question.questionText}
                        </span>
                        <span
                          className={`self-start sm:self-auto shrink-0 rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider ${question.isRequired
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

      {/* SECTION 4: AI INTERVIEWER & JOB VISIBILITY SETTINGS */}
      <section className="job-post-section !rounded-2xl sm:!rounded-3xl !border-border/80 !bg-card !p-4 sm:!p-7 shadow-sm hover:shadow-md transition-all space-y-4 sm:space-y-5">
        <div className="job-post-section__header flex items-center justify-between pb-3.5 sm:pb-4 border-b border-border/60 gap-2">
          <div className="job-post-section__heading flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="job-post-section__icon bg-gradient-to-br from-[var(--brand)]/15 to-purple-500/15 text-[var(--brand)] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0">
              <Sparkles size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-foreground truncate">
                {t('postJobWizard.review.aiAndVisibilityTitle', 'Cấu hình AI Phỏng vấn & Quyền riêng tư')}
              </h2>
              <p className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
                {t('postJobWizard.review.aiAndVisibilityHint', 'Thiết lập công cụ phỏng vấn tự động và phạm vi hiển thị tìm kiếm cho bài đăng.')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 pt-0.5 sm:pt-1">
          <PostJobAiInterviewToggle
            enabled={isAiInterviewEnabled}
            questionCount={answeredQuestions.length}
            title={t('postJobWizard.plan.aiTitleReview', 'AI Phỏng vấn tự động (Gói Premium ✦)')}
            description={t('postJobWizard.plan.aiDesc', 'Khi bật AI Interviewer, bộ câu hỏi sẽ làm cơ sở dữ liệu để AI Agent tự động phỏng vấn 1:1 với ứng viên, phân tích tư duy và tổng hợp báo cáo chấm điểm cho bạn!')}
            disabledReason={t('postJobWizard.plan.aiQuestionRequired')}
            disabledStatusLabel={t('postJobWizard.plan.aiQuestionRequiredBadge')}
            onToggle={handleToggleAiInterview}
            variant="review"
          />

          {/* Card 2: Job Post Visibility */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-3 shadow-2xs hover:border-[var(--brand)]/40 transition-all flex flex-col justify-between">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[var(--brand)]/15 text-[var(--brand)]">
                  <Globe size={15} />
                </span>
                <label className="text-xs sm:text-sm font-black text-foreground">
                  {t('postJob.visibility', 'Phạm vi hiển thị tin')}
                </label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('postJobWizard.review.visibilityHint', 'Quyết định ai có thể tìm thấy và ứng tuyển vào dự án này của bạn trên sàn GigBridge.')}
              </p>
            </div>

            <div className="pt-1 sm:pt-2">
              {/* 3-Option Visibility Segment Toggle Group */}
              <div className="p-1 rounded-xl bg-muted/40 border border-border/60 grid grid-cols-2 gap-1">
                {[
                  { value: String(JobPostVisibility.Public), label: t('postJob.publicShort', 'Công khai'), icon: Globe },
                  { value: String(JobPostVisibility.InviteOnly), label: t('postJob.inviteOnlyShort', 'Lời mời'), icon: Mail },
                ].map((item) => {
                  const isSelected = String(form.visibility) === item.value;
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => controller.setForm({ ...form, visibility: item.value })}
                      className={`py-2 sm:py-2.5 px-2 rounded-lg text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-[var(--brand,#494be7)] text-white border-[var(--brand,#494be7)] shadow-sm shadow-[var(--brand,#494be7)]/25'
                          : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/80'
                      }`}
                    >
                      <IconComponent size={13} className={isSelected ? 'text-white' : 'text-muted-foreground'} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PostJobWizardShell>
  );
}
