import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, ChevronDown, GripVertical, HelpCircle, ListChecks, Plus, Save, Sparkles, Trash2, Zap } from 'lucide-react';
import { useApp } from '../../../app/providers/AppProvider';
import { usePremiumStatus } from '../../premium/hooks';
import {
  NestedMilestonePlanEditor,
  type EditableMilestonePlan,
} from '../../../shared/components/NestedMilestonePlanEditor';
import { PostJobBudgetExceededPrompt } from '../components/PostJobBudgetExceededPrompt';
import { PostJobLeavePrompt } from '../components/PostJobLeavePrompt';
import { PostJobWizardShell } from '../components/PostJobWizardShell';
import { BrandSweepBackButton } from '../components/BrandSweepBackButton';
import { QuestionRequiredToggle } from '../components/QuestionRequiredToggle';
import { usePostJob, type PostJobRouteState } from '../hooks/usePostJob';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { JOB_DURATION_UNITS } from '../utils/jobDuration';
import '../../../shared/components/styles/conic-border-button.css';

export default function PostJobMilestonesScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');
  const { role } = useApp();
  const { isPremium } = usePremiumStatus(role);
  const routeState = location.state as PostJobRouteState | null;
  const [isAiInterviewEnabled, setIsAiInterviewEnabled] = useState<boolean>(
    Boolean(routeState?.jobData?.hasAiInterview)
  );

  const handleToggleAiInterview = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isPremium) {
      toast.info(
        t('postJobWizard.plan.aiPremiumRequired', {
          defaultValue: 'Tính năng AI Phỏng vấn tự động yêu cầu tài khoản Client Premium. Đang chuyển hướng đến trang nâng cấp...',
        })
      );
      navigate('/premium/client/pricing');
      return;
    }

    setIsAiInterviewEnabled(prev => {
      const next = !prev;
      toast.success(
        next
          ? t('postJobWizard.plan.aiEnabledToast', { defaultValue: 'Đã bật AI Phỏng vấn tự động cho bài đăng này!' })
          : t('postJobWizard.plan.aiDisabledToast', { defaultValue: 'Đã tắt AI Phỏng vấn tự động.' })
      );
      return next;
    });
  };

  const {
    form, previewTitle, errorMessage, isDraftInitializing, draftError,
    milestonePlans, milestonePlansWithDeadlines, setMilestonePlans, milestoneErrors, setMilestoneErrors,
    expandedMilestones, setExpandedMilestones, questions, setQuestions,
    draggedIndex, updateQuestion, handleDragStart, handleDragOver, handleDragEnd,
    MAX_QUESTION_LENGTH, milestonePlanTotal, milestoneTotalWeeks, expectedDurationWeeks,
    isBudgetExceeded, isDurationExceeded, isActionDisabled,
    isLeavePromptOpen, leaveAction, autosaveStatus, autosaveError,
    handleLeaveSaveDraft, handleLeaveDiscardDraft, cancelBlockedNavigation,
    submitDraftFlow, renderSubmitLabel, retryAutosave, navigateWizard,
    isBudgetExceededPromptOpen, handleBudgetExceededConfirm, handleBudgetExceededCancel,
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
    questions.every(question => question.questionText.length <= MAX_QUESTION_LENGTH),
  ];

  const expectedBudget = form.budget && Number(form.budget) > 0 ? Number(form.budget) : null;
  const estimatedDuration = form.estimatedDurationValue
    ? `${form.estimatedDurationValue} ${t(`postJob.durationUnits.${form.estimatedDurationUnit}`)}`
    : null;

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
      expectedBudget={expectedBudget}
      estimatedDuration={estimatedDuration}
      milestoneTotal={milestonePlanTotal}
      milestoneTotalWeeks={milestoneTotalWeeks}
      expectedDurationWeeks={expectedDurationWeeks}
      backAction={(
        <BrandSweepBackButton onClick={() => navigateWizard('/jobs/post')}>
          <ArrowLeft size={15} />{t('postJobWizard.backDetails')}
        </BrandSweepBackButton>
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
            durationExpected={estimatedDuration || ''}
            onConfirm={handleBudgetExceededConfirm}
            onCancel={handleBudgetExceededCancel}
          />
        </>
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
              value={milestonePlansWithDeadlines as EditableMilestonePlan[]}
              onChange={plans => {
                setMilestonePlans(plans);
                setMilestoneErrors({});
              }}
              targetBudget={expectedBudget}
              optional
              showDueDate
              dueDateReadOnly
              showWorkItems={false}
              title={t('postJob.baselineMilestoneTitle')}
              description={t('postJob.baselineMilestoneDescription')}
              expandedIndexes={expandedMilestones}
              onExpandedIndexesChange={setExpandedMilestones}
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
                milestoneLabel: t('postJobWizard.plan.milestoneLabel', 'Mốc {{number}}'),
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
                autoBalanceOn: t('postJobWizard.plan.milestoneCopy.autoBalanceOn', 'Auto-balance: ON'),
                autoBalanceOff: t('postJobWizard.plan.milestoneCopy.autoBalanceOff', 'Auto-balance: OFF'),
                autoBalanceOnDesc: t('postJobWizard.plan.milestoneCopy.autoBalanceOnDesc', 'Editing any milestone automatically rebalances the remaining budget across all unlocked milestones.'),
                autoBalanceOffDesc: t('postJobWizard.plan.milestoneCopy.autoBalanceOffDesc', 'Auto-balance is OFF. Every milestone will keep the exact value you enter.'),
                resetBalance: t('postJobWizard.plan.milestoneCopy.resetBalance', '↺ Reset & Split Budget'),
                resetBalanceTooltip: t('postJobWizard.plan.milestoneCopy.resetBalanceTooltip', 'Clear all user locks and split budget equally across milestones'),
                userLocked: t('postJobWizard.plan.milestoneCopy.userLocked', 'Fixed'),
                userLockedTitle: t('postJobWizard.plan.milestoneCopy.userLockedTitle', 'Fixed milestone (User-locked). Click to unlock auto-balancing.'),
                autoBalanced: t('postJobWizard.plan.milestoneCopy.autoBalanced', 'Auto'),
                autoBalancedTitle: t('postJobWizard.plan.milestoneCopy.autoBalancedTitle', 'Dynamically calculated. Click to lock amount.'),
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

      {/* SECTION: INTERVIEW QUESTIONS */}
      <section className="job-post-section">
        <button type="button" className="job-post-section__header job-post-accordion__trigger" onClick={() => setQuestionsOpen(current => !current)} aria-expanded={questionsOpen}>
          <span className="job-post-section__heading">
            <span className="job-post-section__icon bg-gradient-to-br from-[var(--brand)]/15 to-purple-500/15 text-[var(--brand)]">
              <HelpCircle size={18} />
            </span>
            <span>
              <h2>{t('postJob.questionsForInterview', 'Câu hỏi sàng lọc ứng viên (Vetting Questions)')}</h2>
              <p>{t('postJob.questionsGuideDesc', 'Tùy chọn. Đặt câu hỏi để sàng lọc ứng viên nhanh chóng và hỗ trợ AI Phỏng vấn.')}</p>
            </span>
          </span>
          <span className="flex items-center gap-3">
            <span className="rounded-full bg-[var(--brand)]/10 px-3 py-1 text-xs font-extrabold text-[var(--brand)] border border-[var(--brand)]/20">
              {questionCount} {t('postJobWizard.plan.questionsAdded', 'câu hỏi')}
            </span>
            <ChevronDown size={18} className={`text-muted-foreground transition-transform duration-200 ${questionsOpen ? 'rotate-180 text-[var(--brand)]' : ''}`} />
          </span>
        </button>
        {questionsOpen && (
          <div className="job-post-section__body space-y-4 p-5">
            {/* GUIDE & BENEFIT CARD (AI & STANDARD INTERVIEW) */}
            <div className="rounded-2xl border border-[var(--brand)]/25 bg-gradient-to-br from-[var(--brand)]/10 via-purple-500/5 to-muted/30 p-4 sm:p-5 space-y-3.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[var(--brand)]/15 text-[var(--brand)]">
                    <Sparkles size={16} />
                  </span>
                  <strong className="text-xs font-black text-foreground uppercase tracking-wider">
                    {t('postJobWizard.plan.guideTitle', 'Tác dụng & Lợi ích của Câu hỏi sàng lọc')}
                  </strong>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--brand)]/15 text-[10px] font-black text-[var(--brand)] border border-[var(--brand)]/30 uppercase tracking-wider">
                  <Zap size={12} /> {t('postJobWizard.plan.guideReady', 'AI Interview Ready')}
                </span>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2 text-xs">
                {/* Standard Interview Benefit */}
                <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1.5 shadow-2xs">
                  <strong className="font-black text-foreground flex items-center gap-1.5 text-xs">
                    <HelpCircle size={15} className="text-[var(--brand)] shrink-0" />
                    {t('postJobWizard.plan.standardTitle', '1. Phỏng vấn Tiêu chuẩn')}
                  </strong>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t('postJobWizard.plan.standardDesc', 'Freelancer sẽ trả lời các câu hỏi này ngay khi gửi Proposal. Giúp bạn đánh giá tư duy, thái độ và kinh nghiệm thực tế của ứng viên mà không cần chat qua lại nhiều lần.')}
                  </p>
                </div>

                {/* AI Interview Benefit (Premium with Conic Running Border & Brand/Mint Theme) */}
                <div className="conic-border-wrap conic-border-card rounded-xl cursor-pointer">
                  <div
                    onClick={handleToggleAiInterview}
                    className={`conic-border-card-inner rounded-[calc(0.75rem-1.5px)] justify-between items-stretch p-3.5 space-y-1.5 text-left transition-all duration-300 ${
                      isAiInterviewEnabled
                        ? 'bg-[var(--brand,#494be7)]/10 dark:bg-[var(--brand,#494be7)]/20'
                        : 'bg-card'
                    }`}
                  >
                    <style>{`
                      @keyframes cp-nudge-thumb {
                        0%, 100% {
                          transform: translateX(0);
                          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                        }
                        30% {
                          transform: translateX(7px);
                          box-shadow: 0 0 10px rgba(73, 75, 231, 0.6);
                        }
                        50% {
                          transform: translateX(2px);
                        }
                        70% {
                          transform: translateX(9px);
                          box-shadow: 0 0 12px rgba(73, 75, 231, 0.7);
                        }
                      }
                    `}</style>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="font-black text-[var(--brand,#494be7)] flex items-center gap-1.5 text-xs">
                            <Sparkles size={15} className="shrink-0 animate-pulse text-[var(--brand,#494be7)]" />
                            {t('postJobWizard.plan.aiTitle', '2. AI Phỏng vấn tự động (Gói Premium ✦)')}
                          </strong>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider transition-all ${
                              isAiInterviewEnabled
                                ? 'bg-[var(--brand,#494be7)] text-white shadow-xs'
                                : 'bg-[var(--brand,#494be7)]/15 text-[var(--brand,#494be7)] border border-[var(--brand,#494be7)]/30'
                            }`}
                          >
                            {isAiInterviewEnabled ? '✓ ACTIVE ✦' : 'RECOMMENDED'}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {t('postJobWizard.plan.aiDesc', 'Khi bật AI Interviewer, bộ câu hỏi này sẽ làm cơ sở dữ liệu để AI Agent tự động phỏng vấn 1:1 với ứng viên, phân tích tư duy và tổng hợp báo cáo chấm điểm cho bạn!')}
                        </p>
                      </div>

                      {/* Toggle Switch (iOS / Bento Style with Magnetic Nudge Animation) */}
                      <div className="pt-0.5 shrink-0">
                        <div
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-all duration-300 ease-in-out focus:outline-none ${
                            isAiInterviewEnabled
                              ? 'bg-gradient-to-r from-[var(--brand,#494be7)] to-[#6366f1] border-[var(--brand,#494be7)] shadow-md shadow-[var(--brand,#494be7)]/30 ring-2 ring-[var(--brand,#494be7)]/20'
                              : 'bg-muted border-border'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                              isAiInterviewEnabled
                                ? 'translate-x-5'
                                : 'translate-x-0'
                            }`}
                            style={
                              !isAiInterviewEnabled
                                ? { animation: 'cp-nudge-thumb 2.8s infinite ease-in-out' }
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preset Questions Suggestion Bar */}
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles size={13} className="text-[var(--brand)]" />
                {t('postJobWizard.plan.presetTitle', 'Gợi ý câu hỏi phổ biến (Click để thêm):')}
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  t('postJobWizard.plan.presetSimilar', 'Bạn đã từng thực hiện dự án nào có quy mô tương tự chưa?'),
                  t('postJobWizard.plan.presetPortfolio', 'Hãy gửi link sản phẩm hoặc portfolio tiêu biểu nhất của bạn.'),
                  t('postJobWizard.plan.presetAvailability', 'Bạn có thể dành bao nhiêu giờ mỗi tuần cho dự án này?'),
                ].map((preset, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setQuestions(current => [...current, { questionText: preset, isRequired: true }])}
                    className="text-left text-xs font-bold rounded-xl border border-border/80 bg-card px-3.5 py-2 text-foreground hover:border-[var(--brand)] hover:text-[var(--brand)] hover:shadow-xs transition-all cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            {questions.map((question, index) => (
              <article
                key={index}
                draggable
                onDragStart={event => handleDragStart(event, index)}
                onDragOver={event => handleDragOver(event, index)}
                onDragEnd={handleDragEnd}
                className={`rounded-2xl border p-4.5 transition-all shadow-sm ${draggedIndex === index
                    ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/20 opacity-60 bg-[var(--brand)]/5'
                    : 'border-border/80 bg-card hover:border-[var(--brand)]/60'
                  }`}
              >
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs font-black text-foreground">
                    <GripVertical size={16} className="text-muted-foreground cursor-grab active:cursor-grabbing" />
                    <span className="rounded-full bg-[var(--brand)] text-white px-3 py-0.5 text-[11px] font-black">
                      {t('postJobWizard.plan.questionLabel', 'Câu hỏi {{number}}', { number: index + 1 })}
                    </span>
                  </span>
                  <div className="flex items-center gap-3">
                    <QuestionRequiredToggle
                      isRequired={question.isRequired}
                      questionNumber={index + 1}
                      onChange={isRequired => updateQuestion(index, { isRequired })}
                    />
                    <button
                      type="button"
                      onClick={() => setQuestions(current => current.filter((_, itemIndex) => itemIndex !== index))}
                      aria-label={t('postJob.deleteQuestion', 'Xóa câu hỏi')}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <textarea
                  data-question-index={index}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 focus:bg-background p-3.5 text-sm font-medium text-foreground outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15 transition-all"
                  rows={3}
                  maxLength={MAX_QUESTION_LENGTH}
                  value={question.questionText}
                  onChange={event => updateQuestion(index, { questionText: event.target.value })}
                  placeholder={t('postJob.questionPlaceholder', 'Nhập câu hỏi bạn muốn ứng viên trả lời khi nộp hồ sơ...')}
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                  <span className="italic">{t('postJobWizard.plan.questionHint', 'Freelancers sẽ trả lời câu hỏi này khi gửi proposal.')}</span>
                  <span>{question.questionText.length}/{MAX_QUESTION_LENGTH}</span>
                </div>
              </article>
            ))}

            {questions.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-border/80 p-8 text-center bg-card/40 space-y-2">
                <HelpCircle size={28} className="mx-auto text-muted-foreground opacity-60" />
                <p className="text-sm font-bold text-foreground">{t('postJob.noQuestions', 'Chưa tạo câu hỏi sàng lọc')}</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">{t('postJobWizard.plan.noQuestionsDesc', 'Thêm câu hỏi giúp bạn đánh giá năng lực và thái độ làm việc của ứng viên nhanh hơn.')}</p>
              </div>
            )}

            <button
              type="button"
              className="w-full rounded-2xl border-2 border-dashed border-[var(--brand)]/40 bg-[var(--brand)]/5 py-3.5 font-extrabold text-xs text-[var(--brand)] hover:border-[var(--brand)] hover:bg-[var(--brand)]/10 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              onClick={() => setQuestions(current => [...current, { questionText: '', isRequired: true }])}
            >
              <Plus size={16} />{t('postJob.addQuestion', 'Thêm câu hỏi mới')}
            </button>
          </div>
        )}
      </section>
    </PostJobWizardShell>
  );
}
