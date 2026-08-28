import {
  Award,
  Briefcase,
  CreditCard,
  CheckCircle,
  PanelLeftOpen,
  PanelRightOpen,
  PlusCircle,
  Sparkles,
  Star,
  Wallet,
  Clock,
  Unlock,
  Upload,
  Play,
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { ContractStatus, ContractWorkItemStatus } from '../../../types/models/Contract';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import { getEarlyWithdrawalEligibility } from '../../../shared/utils/earlyWithdrawal';
import { ProjectReceiptCard } from '../../receipts/components/ProjectReceiptCard';
import '../styles/manage-milestone.css';

export interface MilestoneItem {
  id: string;
  title: string;
  amount: number;
  releasedAmount: number;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'completed' | 'disputed';
  workItems?: Array<{
    id: string;
    title: string;
    status: ContractWorkItemStatus;
  }>;
}

export interface ManageMilestoneProps {
  project: {
    milestones: MilestoneItem[];
    progress: number;
    paidAmount?: number;
  };
  activeContract: any;
  activeProjectId: string;
  isClient: boolean;
  isFreelancer: boolean;
  isLeftPanelCollapsed: boolean;
  toggleLeftPanel: () => void;
  showInfo: boolean;
  setShowInfo: (val: boolean) => void;
  mobileTab: string;
  showEndProjectButton: boolean;
  allMilestonesApproved: boolean;
  openEndProjectDialog: () => void;
  setReviewDialogOpen: (val: boolean) => void;
  showFreelancerPayoutCard: boolean;
  earlyStartRequests: any[];
  milestoneActionPendingId: string | null;
  milestoneActionError: { milestoneId: string; message: string } | null;
  handleWorkItemTransition: (milestoneId: string, workItemId: string, status: ContractWorkItemStatus) => void;
  handleRequestPendingMilestoneUnlock: (milestoneId: string) => void;
  openWithdrawDialog: (milestoneId: string, title: string, availableAmount: number) => void;
  handleRespondEarlyStart: (requestId: string, approve: boolean, note?: string) => Promise<{ success: boolean; message?: string }>;
  openPromptModal: (config: any) => void;
  setSubmitModal: (val: { milestoneId: string; title: string } | null) => void;
  setMilestoneActionPendingId: (val: string | null) => void;
  isWorkspaceLocked: boolean;
  navigate: (path: string) => void;
}

export function ManageMilestone({
  project,
  activeContract,
  activeProjectId,
  isClient,
  isFreelancer,
  isLeftPanelCollapsed,
  toggleLeftPanel,
  showInfo,
  setShowInfo,
  mobileTab,
  showEndProjectButton,
  allMilestonesApproved,
  openEndProjectDialog,
  setReviewDialogOpen,
  showFreelancerPayoutCard,
  earlyStartRequests,
  milestoneActionPendingId,
  milestoneActionError,
  handleWorkItemTransition,
  handleRequestPendingMilestoneUnlock,
  openWithdrawDialog,
  handleRespondEarlyStart,
  openPromptModal,
  setSubmitModal,
  setMilestoneActionPendingId,
  isWorkspaceLocked,
  navigate,
}: ManageMilestoneProps) {
  const { t } = useTranslation();

  return (
    <section
      className={`flex-1 flex flex-col bg-card/40 rounded-2xl border border-border overflow-hidden relative shadow-2xs min-w-0 transition-all duration-300 manage-milestone-panel ${
        mobileTab === 'milestones' ? 'flex' : 'hidden lg:flex'
      }`}
    >
      {/* Professional Milestone Management Header */}
      <div className="glass-header px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-3 sm:gap-4 shrink-0">
        {/* Left Title & Status */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {isLeftPanelCollapsed && (
            <button
              type="button"
              onClick={toggleLeftPanel}
              className="p-2 rounded-xl border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer hidden lg:flex items-center justify-center shrink-0 shadow-2xs"
              title={t('workspace.recentWorkspace')}
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0 shadow-2xs">
            <CreditCard size={17} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-black text-text-primary tracking-tight truncate">{t('workspace.milestoneManagement')}</h2>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] sm:text-[11px] text-text-muted font-medium flex-wrap">
              <span>{t('workspace.totalMilestones')}: <strong className="text-text-primary">{project.milestones.length}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span>{t('workspace.projectProgress')}:</span>
                <span className="w-12 sm:w-16 bg-surface-muted h-1.5 rounded-full overflow-hidden inline-block align-middle">
                  <span className="bg-brand h-full rounded-full block transition-all duration-300" style={{ width: `${project.progress}%` }} />
                </span>
                <strong className="text-text-primary">{project.progress}%</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right Stats & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-black shadow-2xs">
            <span className="text-[10px] uppercase tracking-wider text-white/90">{t('workspace.paidAmount')}:</span>
            <GigCoinAmount amount={project.paidAmount || 0} />
          </div>

          {showEndProjectButton && (
            <button
              type="button"
              onClick={openEndProjectDialog}
              disabled={!allMilestonesApproved}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title={allMilestonesApproved ? t('workspace.releaseEscrowTooltip') : t('workspace.approveAllTooltip')}
            >
              <CheckCircle size={14} />
              <span>{t('workspace.endProject')}</span>
            </button>
          )}

          {activeContract?.canReview && (
            <button
              type="button"
              onClick={() => setReviewDialogOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer border border-amber-600/20"
            >
              <Star size={14} className="fill-white text-white" />
              <span>{t(isClient ? 'reviews.leaveForFreelancer' : 'reviews.leaveForClient')}</span>
            </button>
          )}

          {activeContract?.hasReviewedByCurrentUser && activeContract.status === ContractStatus.Completed && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600">
              <CheckCircle size={13} /> {t('reviews.reviewed')}
            </span>
          )}

          {!showInfo && (
            <button
              type="button"
              onClick={() => setShowInfo(true)}
              className="p-2 rounded-xl border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer hidden lg:flex items-center justify-center shrink-0 shadow-2xs"
              title={t('workspace.toggleChatInfo', { defaultValue: 'Mở bảng Trò chuyện & Thông tin' })}
            >
              <PanelRightOpen size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Milestones timeline & completion cards scrollable area */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 custom-scrollbar relative space-y-4 sm:space-y-6">
        {/* ALL MILESTONES COMPLETED BANNER (CLIENT) */}
        {allMilestonesApproved && activeContract?.status !== ContractStatus.Completed && isClient && (
          <div className="mms-completion-banner">
            <div className="mms-completion-accent" />
            <div className="mms-completion-header">
              <div className="mms-completion-icon-wrap">
                <Sparkles size={18} />
              </div>
              <div className="mms-completion-title-group">
                <div className="mms-completion-top-row">
                  <span className="mms-completion-badge">
                    <CheckCircle size={11} />
                    <span>{t('workspace.milestonesAllApprovedBadgeClient')}</span>
                  </span>
                </div>
                <h3 className="mms-completion-title">
                  {t('workspace.milestonesAllApprovedClientTitle')}
                </h3>
              </div>
            </div>
            <p className="mms-completion-desc">
              {t('workspace.milestonesAllApprovedClientDesc')}
            </p>
            <div className="mms-completion-cta-wrap">
              <button
                type="button"
                onClick={openEndProjectDialog}
                className="mms-btn-end-project-cta"
              >
                <CheckCircle size={16} className="mms-btn-icon" />
                <span>{t('workspace.endProjectNow')}</span>
              </button>
            </div>
          </div>
        )}

        {/* ALL MILESTONES COMPLETED BANNER (FREELANCER) */}
        {allMilestonesApproved && activeContract?.status !== ContractStatus.Completed && !isClient && (
          <div className="mms-completion-banner">
            <div className="mms-completion-accent" />
            <div className="mms-completion-header">
              <div className="mms-completion-icon-wrap">
                <Award size={18} />
              </div>
              <div className="mms-completion-title-group">
                <div className="mms-completion-top-row">
                  <span className="mms-completion-badge">
                    <Clock size={11} />
                    <span>{t('workspace.milestonesAllApprovedBadgeFreelancer')}</span>
                  </span>
                </div>
                <h3 className="mms-completion-title">
                  {t('workspace.milestonesAllApprovedFreelancerTitle')}
                </h3>
              </div>
            </div>
            <p className="mms-completion-desc">
              {t('workspace.milestonesAllApprovedFreelancerDesc')}
            </p>
          </div>
        )}

        {showFreelancerPayoutCard && (
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/30 text-white shadow-lg relative overflow-hidden flex flex-col gap-3.5">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top Section: Icon + Eyebrow/Status + Title */}
            <div className="flex items-start gap-3 sm:gap-3.5 relative z-10 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner mt-0.5">
                <CreditCard size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                    {t('workspace.finalPayout', { defaultValue: 'Ví GigCoin Payout' })}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-2xs">
                    {t('workspace.payoutStatusPaid', { defaultValue: 'ĐÃ THANH TOÁN' })}
                  </span>
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight leading-snug">
                  {t('workspace.finalPayoutReconciliation', { defaultValue: 'Đối soát & Giải ngân dự án hoàn tất' })}
                </h3>
              </div>
            </div>

            {/* Middle Section: Full-width description text */}
            <p className="text-xs text-slate-300 leading-relaxed relative z-10">
              {t('workspace.finalPayoutNotice', { defaultValue: 'Tiền thù lao đã được chuyển trực tiếp vào ví GigCoin của bạn.' })}
            </p>

            {/* Bottom Toolbar: Action Button */}
            <div className="flex items-center justify-end pt-1 relative z-10 border-t border-emerald-500/15">
              <button
                type="button"
                onClick={() => navigate('/wallet/history')}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95 border-none"
              >
                <Wallet size={14} />
                <span>{t('workspace.viewWalletHistory', { defaultValue: 'Xem lịch sử ví' })}</span>
              </button>
            </div>
          </div>
        )}

        {isClient && activeContract?.status === ContractStatus.Completed && (
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/30 text-white shadow-lg relative overflow-hidden flex flex-col gap-3.5">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top Section: Icon + Eyebrow/Status + Title */}
            <div className="flex items-start gap-3 sm:gap-3.5 relative z-10 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner mt-0.5">
                <Briefcase size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                    {t('workspace.clientProjectCompletedEyebrow')}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-2xs">
                    {t('workspace.clientProjectCompletedStatus')}
                  </span>
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight leading-snug">
                  {t('workspace.clientProjectCompletedTitle')}
                </h3>
              </div>
            </div>

            {/* Middle Section: Full-width description text */}
            <p className="text-xs text-slate-300 leading-relaxed relative z-10">
              {t('workspace.clientProjectCompletedDesc')}
            </p>

            {/* Bottom Toolbar: Action Button */}
            <div className="flex items-center justify-end pt-1 relative z-10 border-t border-emerald-500/15">
              <button
                type="button"
                onClick={() => navigate('/jobs/post')}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95 border-none"
              >
                <PlusCircle size={15} />
                <span>{t('workspace.postNewJobNow')}</span>
              </button>
            </div>
          </div>
        )}

        {activeContract?.status === ContractStatus.Completed && activeProjectId && (
          <ProjectReceiptCard contractId={activeProjectId} />
        )}

        {project.milestones.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-16">
            <p className="text-sm font-bold">{t('workspace.noMilestones')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {project.milestones.map((milestone, idx) => {
              const isCompleted = milestone.status === 'approved' || milestone.status === 'completed';
              const isInProgress = milestone.status === 'in_progress';
              const isSubmitted = milestone.status === 'submitted';
              const isPending = milestone.status === 'pending';
              const isLast = idx === project.milestones.length - 1;
              const previousMilestone = idx > 0 ? project.milestones[idx - 1] : null;
              const isPreviousMilestoneStarted = idx === 0 || (previousMilestone && previousMilestone.status !== 'pending');
              const isPreviousMilestoneApproved = idx === 0 || (previousMilestone && (previousMilestone.status === 'approved' || previousMilestone.status === 'completed'));
              const hasApprovedEarlyStart = (earlyStartRequests || []).some(request => request.milestoneId === milestone.id && Number(request.status) === 1);
              const isConsecutiveEarlyStart = isPending && (isPreviousMilestoneApproved || hasApprovedEarlyStart);
              const canUnlockOrStartMilestone = isInProgress || isConsecutiveEarlyStart;

              const isLineFilled = isCompleted || isInProgress || isSubmitted;

              const isReleasedInFull = milestone.amount > 0 && milestone.releasedAmount >= milestone.amount;
              const withdrawalEligibility = getEarlyWithdrawalEligibility(
                project.milestones,
                milestone,
                activeContract?.status,
                isFreelancer,
              );
              const showFreelancerWithdraw = isFreelancer &&
                withdrawalEligibility.isContractActive &&
                withdrawalEligibility.isApproved &&
                !withdrawalEligibility.isAtCap;
              const showEarlyWithdrawalCap = isFreelancer &&
                withdrawalEligibility.isApproved &&
                withdrawalEligibility.isAtCap &&
                !isReleasedInFull;
              const workItems = milestone.workItems || [];
              const allWorkItemsCompleted = workItems.length > 0 && workItems.every(item => Number(item.status) === ContractWorkItemStatus.Completed);
              const canFreelancerSubmit = !isWorkspaceLocked && !isClient && canUnlockOrStartMilestone && allWorkItemsCompleted;
              const canClientReview = !isWorkspaceLocked && isClient && isSubmitted;
              const canFreelancerRequestUnlock = !isWorkspaceLocked && !isClient && isPending && isPreviousMilestoneStarted;
              const isMilestoneActionPending = milestoneActionPendingId === milestone.id;
              const earlyStartRequest = (earlyStartRequests || []).find(request => request.milestoneId === milestone.id && Number(request.status) === 0);

              return (
                <div key={milestone.id || idx} className="flex items-stretch gap-2.5 sm:gap-6 group">
                  {/* Left Timeline Column */}
                  <div className="flex flex-col items-center shrink-0 w-7 sm:w-10 relative">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 z-10 shrink-0 ${
                        isCompleted || isInProgress || isSubmitted
                          ? 'bg-brand text-brand-foreground shadow-md ring-4 ring-brand/20'
                          : isConsecutiveEarlyStart
                            ? 'bg-surface-card border-2 border-brand text-brand ring-4 ring-brand/10'
                            : 'bg-surface-card border-2 border-border text-text-muted ring-4 ring-background'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle size={15} />
                      ) : isInProgress || isSubmitted ? (
                        <span className="text-[11px] sm:text-xs">{idx + 1}</span>
                      ) : (
                        <Clock size={13} />
                      )}
                    </div>

                    {!isLast && (
                      <div
                        className={`w-0.5 flex-1 transition-all duration-300 my-1 ${
                          isLineFilled ? 'bg-brand' : 'bg-border'
                        }`}
                      />
                    )}
                  </div>

                  {/* Right Content Card */}
                  <div className="flex-1 min-w-0 bg-surface-card/60 hover:bg-surface-card border border-border rounded-2xl p-3.5 sm:p-5 transition-all duration-200 shadow-2xs hover:shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2.5 sm:gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider text-brand">
                            {t('workspace.milestoneLabel', { number: idx + 1, defaultValue: `Milestone ${idx + 1}` })}
                          </span>
                          <span
                            className={`text-[8.5px] sm:text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : isSubmitted
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : (isInProgress && allWorkItemsCompleted)
                                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                                    : isInProgress
                                      ? 'bg-brand/10 text-brand border border-brand/20'
                                      : 'bg-surface-muted text-text-muted border border-border'
                            }`}
                          >
                            {isCompleted
                              ? t('workspace.milestoneApproved', { defaultValue: 'Approved' })
                              : isSubmitted
                                ? t('workspace.milestoneSubmitted', { defaultValue: 'In Review' })
                                : (isInProgress && allWorkItemsCompleted)
                                  ? t('workspace.milestoneReadyToSubmit', { defaultValue: 'Ready to Submit' })
                                  : isInProgress
                                    ? t('workspace.milestoneInProgress', { defaultValue: 'In Progress' })
                                    : t('workspace.milestonePending', { defaultValue: 'Pending' })}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-xs sm:text-base text-text-primary mt-1 break-words">{milestone.title}</h3>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs sm:text-base font-black text-text-primary flex items-center justify-end gap-1">
                          <GigCoinAmount amount={milestone.amount} />
                        </div>
                        {milestone.releasedAmount > 0 && (
                          <div className="text-[9.5px] sm:text-[10px] text-emerald-600 font-bold mt-0.5">
                            {t('workspace.releasedAmount', { defaultValue: 'Released' })}: <GigCoinAmount amount={milestone.releasedAmount} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Work items list */}
                    {workItems.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                          {t('workspace.deliverableTasks', { defaultValue: 'Work Items' })} ({workItems.filter(i => Number(i.status) === ContractWorkItemStatus.Completed).length}/{workItems.length})
                        </span>
                        <div className="space-y-1.5 mt-1.5">
                          {workItems.map(item => {
                            const targetWorkItemId = (item as any).workItemId || item.id || (item as any).WorkItemId || '';
                            const itemStatus = Number(item.status);
                            const isTodo = itemStatus === ContractWorkItemStatus.Todo;
                            const isItemInProgress = itemStatus === ContractWorkItemStatus.InProgress;
                            const isDone = itemStatus === ContractWorkItemStatus.Completed;
                            const isRevisionRequired = itemStatus === ContractWorkItemStatus.RevisionRequired;
                            const canToggleWorkItem = !isWorkspaceLocked && !isClient && canUnlockOrStartMilestone && !isCompleted && !isSubmitted;

                            return (
                              <div
                                key={targetWorkItemId || item.title}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-2.5 rounded-xl border text-xs transition-all ${
                                  isDone
                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-text-primary'
                                    : isItemInProgress
                                      ? 'bg-amber-500/5 border-amber-500/20 text-text-primary'
                                      : 'bg-surface-muted/40 border-border/60 text-text-muted'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`font-semibold ${isDone ? 'line-through text-text-muted' : ''}`}>
                                    {item.title}
                                  </span>
                                  {isItemInProgress && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0 uppercase tracking-wider">
                                      {t('workspace.workItemInProgress', { defaultValue: 'Đang làm' })}
                                    </span>
                                  )}
                                </div>

                                {canToggleWorkItem && (
                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                    {(isTodo || isRevisionRequired) && (
                                      <button
                                        type="button"
                                        disabled={isMilestoneActionPending}
                                        onClick={() => handleWorkItemTransition(
                                          milestone.id,
                                          targetWorkItemId,
                                          ContractWorkItemStatus.InProgress
                                        )}
                                        className="px-2.5 py-1 rounded-lg font-extrabold text-[10px] bg-brand hover:bg-brand-hover text-brand-foreground transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                      >
                                        <Play size={11} />
                                        <span>
                                          {isRevisionRequired
                                            ? t('workspace.startRevision', { defaultValue: 'Start Revision' })
                                            : t('workspace.startWorkItem', { defaultValue: 'Start Work Item' })}
                                        </span>
                                      </button>
                                    )}

                                    {isItemInProgress && (
                                      <button
                                        type="button"
                                        disabled={isMilestoneActionPending}
                                        onClick={() => handleWorkItemTransition(
                                          milestone.id,
                                          targetWorkItemId,
                                          ContractWorkItemStatus.Completed
                                        )}
                                        className="px-2.5 py-1 rounded-lg font-extrabold text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                      >
                                        <CheckCircle size={11} />
                                        <span>{t('workspace.markCompleted', { defaultValue: 'Mark Completed' })}</span>
                                      </button>
                                    )}

                                    {isDone && (
                                      <button
                                        type="button"
                                        disabled={isMilestoneActionPending}
                                        onClick={() => handleWorkItemTransition(
                                          milestone.id,
                                          targetWorkItemId,
                                          ContractWorkItemStatus.InProgress
                                        )}
                                        className="px-2 py-1 rounded-lg font-bold text-[10px] bg-surface-muted text-text-muted hover:bg-surface-muted/80 transition cursor-pointer"
                                      >
                                        {t('common.undo', { defaultValue: 'Hoàn tác' })}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Freelancer Submit Banner */}
                    {canFreelancerSubmit && (
                      <div className="mt-3.5 p-3 rounded-xl bg-brand/5 border border-brand/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle size={16} className="text-brand shrink-0" />
                          <span className="text-xs font-bold text-text-primary">
                            {t('workspace.allWorkItemsCompletedNotice', { defaultValue: 'Tất cả công việc đã hoàn thành! Sẵn sàng nộp sản phẩm.' })}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSubmitModal({ milestoneId: milestone.id, title: milestone.title })}
                          className="w-full sm:w-auto bg-brand hover:bg-brand-hover text-brand-foreground font-extrabold text-xs py-2 px-4 rounded-xl shadow-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
                        >
                          <Upload size={14} />
                          <span>{t('workspace.submitDeliverables', { defaultValue: 'Nộp sản phẩm' })}</span>
                        </button>
                      </div>
                    )}

                    {/* Client Review Banner */}
                    {canClientReview && (
                      <div className="mt-3.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-xs font-bold text-text-primary">
                            {t('workspace.deliverablesSubmittedNotice', { defaultValue: 'Freelancer đã nộp sản phẩm. Vui lòng kiểm tra và duyệt giải ngân.' })}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/contracts/${activeProjectId}/milestones/${milestone.id}/approve`)}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
                        >
                          <CheckCircle size={14} />
                          <span>{t('workspace.approveMilestone', { defaultValue: 'Duyệt & Giải ngân' })}</span>
                        </button>
                      </div>
                    )}

                    {/* Secondary action buttons footer */}
                    {(canFreelancerRequestUnlock || showFreelancerWithdraw || showEarlyWithdrawalCap) && (
                      <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {canFreelancerRequestUnlock && !earlyStartRequest && (
                            <button
                              type="button"
                              onClick={() => handleRequestPendingMilestoneUnlock(milestone.id)}
                              className="bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand font-bold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Unlock size={13} />
                              <span>{t('workspace.requestEarlyStart', { defaultValue: 'Request Early Start' })}</span>
                            </button>
                          )}

                          {showFreelancerWithdraw && (
                            <button
                              type="button"
                              onClick={() => openWithdrawDialog(milestone.id, milestone.title, milestone.releasedAmount || milestone.amount)}
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Wallet size={13} />
                              <span>{t('earlyWithdrawal.withdrawButton', { defaultValue: 'Rút tiền sớm' })}</span>
                            </button>
                          )}

                          {showEarlyWithdrawalCap && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                              {t('earlyWithdrawal.capReachedNotice', { defaultValue: 'Đã đạt hạn mức rút tiền sớm' })}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {milestoneActionError?.milestoneId === milestone.id && (
                      <div className="mt-3 text-[11px] font-bold text-destructive">
                        {milestoneActionError.message}
                      </div>
                    )}

                    {!isClient && isInProgress && !allWorkItemsCompleted && (
                      <p className="mt-3 text-[11px] font-bold text-text-muted">
                        {t('workspace.completeWorkItemsNotice', { defaultValue: 'Hoàn thành tất cả các việc cần làm trước khi nộp sản phẩm.' })}
                      </p>
                    )}

                    {!isWorkspaceLocked && isClient && earlyStartRequest && (
                      <div className="mt-3 rounded-xl border border-brand/30 bg-brand/10 p-3 text-xs">
                        <strong className="text-text-primary">{t('workspace.earlyStartRequested', { defaultValue: 'Early start requested' })}</strong>
                        <p className="mt-1 text-text-muted">{earlyStartRequest.reason}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={isMilestoneActionPending}
                            onClick={async () => {
                              setMilestoneActionPendingId(milestone.id);
                              await handleRespondEarlyStart(earlyStartRequest.requestId, true);
                              setMilestoneActionPendingId(null);
                            }}
                            className="rounded-lg bg-brand hover:bg-brand-hover text-brand-foreground px-3 py-1.5 font-black text-xs cursor-pointer transition"
                          >
                            {t('common.approve', { defaultValue: 'Approve' })}
                          </button>
                          <button
                            type="button"
                            disabled={isMilestoneActionPending}
                            onClick={() => {
                              openPromptModal({
                                title: t('workspace.rejectEarlyStartTitle', { defaultValue: 'Reject Early Start Request' }),
                                description: t('workspace.rejectEarlyStartDesc', { defaultValue: 'Provide an optional rejection note for the freelancer.' }),
                                placeholder: t('workspace.rejectEarlyStartPlaceholder', { defaultValue: 'Enter rejection note (optional)...' }),
                                required: false,
                                confirmText: t('workspace.rejectRequest', { defaultValue: 'Reject Request' }),
                                confirmVariant: 'danger',
                                onConfirm: async (note: string) => {
                                  setMilestoneActionPendingId(milestone.id);
                                  await handleRespondEarlyStart(earlyStartRequest.requestId, false, note || undefined);
                                  setMilestoneActionPendingId(null);
                                },
                              });
                            }}
                            className="rounded-lg border border-destructive/40 px-3 py-1.5 font-black text-destructive cursor-pointer hover:bg-destructive/10 transition"
                          >
                            {t('common.reject', { defaultValue: 'Reject' })}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
