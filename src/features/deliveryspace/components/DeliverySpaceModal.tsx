import {
  CheckCircle2,
  Layers,
  Loader2,
  Package,
  X,
  ShieldAlert,
  Clock,
  UploadCloud,
  Sparkles,
  Paperclip,
  CalendarDays,
  FileCheck,
  CheckSquare2,
  Square,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserRole } from '../../../types/models/User';
import {
  MilestoneStatus,
  canSubmitWorkItem,
  isWorkItemAwaitingReview,
  type ContractWorkItem,
} from '../../../types/models/Contract';
import { MILESTONE_FILE_ACCEPT } from '../utils/workItemSubmission';
import { WorkItemStatusPill } from '../../../shared/components/WorkItemStatusPill';
import { MilestoneCompletedModal } from './MilestoneCompletedModal';
import { WorkItemSubmissionHistory } from './WorkItemSubmissionHistory';
import { useDeliverySpace } from '../hooks/useDeliverySpace';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';

export interface DeliverySpaceModalProps {
  isOpen: boolean;
  contractId?: string;
  milestoneId?: string;
  onClose: () => void;
  onActionComplete?: () => void;
}

export function DeliverySpaceModal({
  isOpen,
  contractId,
  milestoneId,
  onClose,
  onActionComplete,
}: DeliverySpaceModalProps) {
  const { role } = useApp();
  const { t } = useTranslation(['contracts', 'workspace', 'common']);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [revisionReason, setRevisionReason] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [activeWorkItemId, setActiveWorkItemId] = useState<string | null>(null);
  const [mobileDetailView, setMobileDetailView] = useState(false);
  const revisionReasonRef = useRef<HTMLTextAreaElement>(null);

  const space = useDeliverySpace(contractId, milestoneId);
  const isClient = role === UserRole.Client;

  // Set default active work item when items load
  useEffect(() => {
    if (space.workItems.length > 0 && !activeWorkItemId) {
      const initial =
        (isClient
          ? space.workItems.find(w => isWorkItemAwaitingReview(w.status))
          : space.workItems.find(w => canSubmitWorkItem(w.status))) ||
        space.workItems[0];
      if (initial) setActiveWorkItemId(initial.workItemId);
    }
  }, [space.workItems, activeWorkItemId, isClient]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const labels: Record<string, string> = {
    todo: t('contracts.workItemStatus.todo', 'Cần làm'),
    inProgress: t('contracts.workItemStatus.inProgress', 'Đang làm'),
    completed: t('contracts.workItemStatus.completed', 'Hoàn thành'),
    revisionRequired: t('contracts.workItemStatus.revisionRequired', 'Cần chỉnh sửa'),
    submitted: t('contracts.workItemStatus.submitted', 'Chờ duyệt'),
    approved: t('contracts.workItemStatus.approved', 'Đã duyệt'),
    awaitingReview: t('contracts.workItemStatus.submitted', 'Chờ duyệt'),
    notePlaceholder: t('contracts.deliverySpace.notePlaceholder', 'Nhập mô tả kết quả, hướng dẫn xem tệp đính kèm...'),
    attachFile: t('contracts.deliverySpace.attachFile', 'Đính kèm tệp sản phẩm'),
    removeFile: t('common.remove', 'Xóa'),
    noSubmissions: t('contracts.deliverySpace.noSubmissions', 'Chưa có bản nộp nào cho hạng mục này.'),
    revision: t('contracts.deliverySpace.revision', 'Lần nộp'),
    reason: t('contracts.deliverySpace.reason', 'Lý do'),
    selectForReview: t('contracts.deliverySpace.selectForReview', 'Chọn'),
  };

  const modalLabels: Record<string, string> = {
    title: t('contracts.deliverySpace.milestoneCompleteTitle', 'Hoàn thành Milestone'),
    completedMovingTo: t('contracts.deliverySpace.milestoneCompleteMovingTo', 'đã hoàn thành. Chuyển tiếp sang'),
    completedFinal: t('contracts.deliverySpace.milestoneCompleteFinal', 'đã hoàn thành tất cả các hạng mục.'),
    dismiss: t('common.close', 'Đóng'),
  };

  const runSubmit = async () => {
    if (space.readyToSubmitIds.length === 0) {
      showValidationToast('Attach a file to at least one work item before submitting.', {
        fallback: 'Prepare at least one work item before submitting.',
      });
      return;
    }
    const failure = await space.submitSelected();
    if (failure) {
      if (failure.response && isValidationResponse(failure.response)) {
        showValidationToast(failure.response, { fallback: failure.message });
      } else setFeedback(failure.message);
    } else {
      setFeedback(t('contracts.deliverySpace.submitSuccess', 'Đã nộp các sản phẩm thành công.'));
      onActionComplete?.();
    }
  };

  const runReview = async (approve: boolean) => {
    const validationMessages: string[] = [];
    if (space.selectedIds.length === 0) validationMessages.push('Select at least one work item.');
    if (!approve && !revisionReason.trim()) validationMessages.push('Enter the requested revision details.');
    if (validationMessages.length > 0) {
      showValidationToast(validationMessages, { fallback: 'Complete the required review details.' });
      if (!approve && !revisionReason.trim()) revisionReasonRef.current?.focus();
      return;
    }
    const failure = await space.reviewSelected(approve, revisionReason);
    if (!failure) {
      setRevisionReason('');
      setIsRevising(false);
      setFeedback(t('contracts.deliverySpace.reviewSuccess', 'Đã lưu kết quả đánh giá.'));
      onActionComplete?.();
    } else {
      if (failure.response && isValidationResponse(failure.response)) {
        showValidationToast(failure.response, { fallback: failure.message });
        if (!approve) revisionReasonRef.current?.focus();
      } else setFeedback(failure.message);
    }
  };

  const milestone = space.activeMilestone;
  const isMilestoneComplete =
    Number(milestone?.status) === MilestoneStatus.Completed ||
    Number(milestone?.status) === MilestoneStatus.Approved ||
    (space.workItems.length > 0 && space.deliveredCount === space.workItems.length);
  const progressPercent =
    space.workItems.length > 0 ? Math.round((space.deliveredCount / space.workItems.length) * 100) : 0;

  const currentActiveItem =
    space.workItems.find(w => w.workItemId === activeWorkItemId) || space.workItems[0] || null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-space-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-6xl h-[92vh] max-h-[880px] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-border bg-surface text-text-primary"
      >
        {/* ═══ TOP THEME ACCENT STRIP ═══ */}
        <div className="h-1.5 w-full bg-gradient-to-r from-brand via-brand-hover to-[#AFDBFF]" />

        {/* ═══ EXECUTIVE HEADER ═══ */}
        <div className="border-b border-border bg-surface p-4 sm:p-5 shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-surface-muted border border-border flex items-center justify-center text-brand shrink-0 mt-0.5 shadow-2xs">
                <Package size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-primary px-2.5 py-0.5 rounded-md bg-surface-muted border border-border">
                    {t('workspace.deliverySpace', { defaultValue: 'Giao Nhận Sản Phẩm' })}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted px-2.5 py-0.5 rounded-md bg-surface-muted border border-border">
                    {t('contracts.deliverySpace.wbsLedger', { defaultValue: 'WBS Ledger' })}
                  </span>
                </div>

                <h2
                  id="delivery-space-modal-title"
                  className="text-base sm:text-xl font-black text-text-primary truncate mt-1 tracking-tight"
                >
                  {milestone?.title || t('workspace.milestoneDetails', { defaultValue: 'Chi Tiết Milestone' })}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close', 'Đóng')}
              className="p-2 rounded-xl border border-border bg-surface-muted text-text-muted hover:text-text-primary hover:bg-surface-hover transition cursor-pointer shrink-0 shadow-2xs active:scale-95"
            >
              <X size={18} />
            </button>
          </div>

          {/* KPI Dashboard Metric Cards */}
          {milestone && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-0.5">
              {/* Tile 1: Progress */}
              <div className="rounded-xl border border-border bg-surface-card p-2.5 sm:p-3 space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-text-muted">
                  <span>{t('contracts.deliverySpace.completionProgress', { defaultValue: 'Tiến độ hoàn thành' })}</span>
                  <span className="text-brand font-black">{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden border border-border/50">
                  <div
                    className="h-full bg-brand transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Tile 2: Approved Work Items */}
              <div className="rounded-xl border border-border bg-surface-card p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
                    {t('contracts.deliverySpace.approvedReviews', { defaultValue: 'Đã duyệt nghiệm thu' })}
                  </span>
                  <div className="text-sm sm:text-base font-black text-text-primary mt-0.5">
                    {space.deliveredCount}{' '}
                    <span className="text-xs text-text-muted font-bold">
                      / {space.workItems.length} {t('contracts.deliverySpace.itemsUnit', { defaultValue: 'mục' })}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 size={16} />
                </div>
              </div>

              {/* Tile 3: Pending / Ready status */}
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-border bg-surface-card p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
                    {isClient
                      ? t('contracts.deliverySpace.awaitingYourReview', { defaultValue: 'Đang chờ bạn duyệt' })
                      : t('contracts.deliverySpace.readyToSubmitItems', { defaultValue: 'Sẵn sàng nộp' })}
                  </span>
                  <div className="text-sm sm:text-base font-black text-text-primary mt-0.5">
                    {isClient ? space.pendingReviewCount : space.readyToSubmitIds.length}{' '}
                    <span className="text-xs text-text-muted font-bold">
                      {t('contracts.deliverySpace.workItemsUnit', { defaultValue: 'hạng mục' })}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-text-primary shrink-0">
                  {isClient ? <Clock size={16} /> : <UploadCloud size={16} />}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ MASTER-DETAIL 2-COLUMN LAYOUT BODY ═══ */}
        <div className="flex-1 min-h-0 bg-background flex flex-col overflow-hidden p-3 sm:p-4">
          {space.isLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 space-y-3">
              <Loader2 className="h-9 w-9 animate-spin text-brand" aria-hidden />
              <p className="text-xs font-black uppercase tracking-wider text-text-muted">
                {t('common.loading', 'Đang tải thông tin giao nhận...')}
              </p>
            </div>
          ) : space.error || !space.activeMilestone ? (
            <div className="m-auto p-6 rounded-2xl border border-rose-500/30 bg-surface-card text-rose-600 dark:text-rose-400 text-sm font-bold text-center shadow-xs">
              {space.error ?? t('contracts.deliverySpace.noMilestone', 'Hợp đồng này chưa có milestone nào sẵn sàng để giao nhận.')}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              {/* Alert Notifications */}
              {space.isDisputed && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-surface-card p-3 text-xs text-text-primary font-medium leading-relaxed shrink-0">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                  <div className="space-y-0.5">
                    <strong className="font-black text-text-primary block">
                      {t('contracts.deliverySpace.disputeActiveTitle', { defaultValue: 'Hợp đồng đang có tranh chấp' })}
                    </strong>
                    <p className="text-text-secondary">
                      {t(
                        'contracts.deliverySpace.disputedNotice',
                        'Việc nộp và duyệt sản phẩm tạm thời bị tạm dừng cho đến khi quản trị viên giải quyết xong tranh chấp.'
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Feedback Success / Error Banner */}
              {feedback && (
                <div className="rounded-xl border border-border bg-surface-card p-3 text-xs font-bold text-text-primary shadow-xs flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-brand shrink-0" />
                    <span>{feedback}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeedback(null)}
                    aria-label={t('common.close', 'Đóng')}
                    className="text-text-muted hover:text-text-primary p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* 2-Column Desktop Grid / Mobile Switcher */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-0 overflow-hidden">
                {/* ═══ COLUMN 1 (LEFT): WORK ITEMS LIST ═══ */}
                <div
                  className={`lg:col-span-5 flex flex-col min-h-0 rounded-2xl border border-border bg-surface p-3 sm:p-3.5 space-y-3 ${
                    mobileDetailView ? 'hidden lg:flex' : 'flex'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1 border-b border-border/60 shrink-0">
                    <h3 className="text-xs font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <Layers size={13} className="text-brand" />
                      <span>
                        {t('contracts.deliverySpace.workItemsList', { defaultValue: 'Danh Sách Đầu Việc' })} ({space.workItems.length})
                      </span>
                    </h3>
                    <span className="text-[10.5px] font-bold text-text-muted">
                      {isMilestoneComplete
                        ? t('contracts.deliverySpace.allReviewedBadge', { defaultValue: 'Đã nghiệm thu toàn bộ' })
                        : isClient
                        ? space.pendingReviewCount > 0
                          ? t('contracts.deliverySpace.selectToReviewHint', { defaultValue: 'Tick chọn để duyệt' })
                          : t('contracts.deliverySpace.noPendingReviewHint', { defaultValue: 'Không có mục chờ duyệt' })
                        : t('contracts.deliverySpace.selectToSubmitHint', { defaultValue: 'Chọn để nộp' })}
                    </span>
                  </div>

                  {/* Scrollable Work Item List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1 min-h-0">
                    {space.workItems.map((item, idx) => {
                      const isSelected = item.workItemId === activeWorkItemId;
                      const isChecked = space.selectedIds.includes(item.workItemId);
                      const reviewable = isWorkItemAwaitingReview(item.status);
                      const submissionCount = item.submissions?.length || 0;

                      return (
                        <div
                          key={item.workItemId}
                          onClick={() => {
                            setActiveWorkItemId(item.workItemId);
                            setMobileDetailView(true);
                          }}
                          className={`group relative rounded-xl border p-3 transition-all cursor-pointer select-none space-y-2 shadow-2xs ${
                            isSelected
                              ? 'border-brand ring-2 ring-brand/20 bg-surface-muted'
                              : 'border-border bg-surface-card hover:bg-surface-hover hover:border-border-strong'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Client Selection Checkbox */}
                            {isClient && (
                              <div className="pt-0.5 shrink-0">
                                {reviewable ? (
                                  <button
                                    type="button"
                                    disabled={space.isBusy || space.isDisputed || !space.usesWorkItems}
                                    onClick={e => {
                                      e.stopPropagation();
                                      space.toggleSelected(item.workItemId);
                                    }}
                                    aria-label={`${t('contracts.deliverySpace.selectForReview', 'Chọn')} ${item.title}`}
                                    className="p-0.5 rounded text-brand hover:scale-110 transition cursor-pointer"
                                  >
                                    {isChecked ? (
                                      <CheckSquare2 size={18} className="text-brand fill-brand/15" />
                                    ) : (
                                      <Square size={18} className="text-text-muted hover:text-brand" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-4 h-4 rounded border border-border bg-surface-muted opacity-40 mt-0.5" />
                                )}
                              </div>
                            )}

                            {/* Item Information */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                                  #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                                </span>
                                <WorkItemStatusPill status={item.status} />
                              </div>

                              <h4 className="text-xs sm:text-sm font-black text-text-primary leading-snug line-clamp-2">
                                {item.title}
                              </h4>

                              <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-text-muted">
                                {item.estimatedDuration ? (
                                  <span className="truncate">{item.estimatedDuration}</span>
                                ) : (
                                  <span />
                                )}

                                {submissionCount > 0 && (
                                  <span className="shrink-0 font-bold text-text-primary bg-surface px-1.5 py-0.5 rounded border border-border text-[10px]">
                                    {t('contracts.deliverySpace.submissionsCount', {
                                      count: submissionCount,
                                      defaultValue: `${submissionCount} lần nộp`,
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>

                            <ChevronRight
                              size={15}
                              className={`shrink-0 transition mt-1 ${
                                isSelected ? 'text-brand translate-x-0.5' : 'text-text-muted/40 group-hover:text-text-muted'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ═══ COLUMN 2 (RIGHT): WORK ITEM DETAIL & HISTORY ═══ */}
                <div
                  className={`lg:col-span-7 flex flex-col min-h-0 rounded-2xl border border-border bg-surface overflow-hidden ${
                    !mobileDetailView ? 'hidden lg:flex' : 'flex'
                  }`}
                >
                  {currentActiveItem ? (
                    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4">
                      {/* Mobile Back to List Button */}
                      <div className="lg:hidden pb-1">
                        <button
                          type="button"
                          onClick={() => setMobileDetailView(false)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                        >
                          <ArrowLeft size={14} />
                          <span>{t('contracts.deliverySpace.backToWorkItems', { defaultValue: 'Quay lại danh sách đầu việc' })}</span>
                        </button>
                      </div>

                      {/* Header info of active item */}
                      <div className="rounded-xl border border-border bg-surface-card p-4 space-y-3 shadow-xs">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-black uppercase tracking-wider text-text-primary px-2.5 py-0.5 rounded-md bg-surface-muted border border-border">
                                {t('contracts.deliverySpace.workItemDetails', { defaultValue: 'Chi Tiết Đầu Việc' })}
                              </span>
                              {currentActiveItem.estimatedDuration && (
                                <span className="inline-flex items-center gap-1 font-bold text-xs bg-surface px-2.5 py-0.5 rounded-md border border-border text-text-secondary">
                                  <Clock size={12} className="shrink-0 text-text-muted" />
                                  <span>{currentActiveItem.estimatedDuration}</span>
                                </span>
                              )}
                              {currentActiveItem.dueDate && (
                                <span className="inline-flex items-center gap-1 font-bold text-xs bg-surface px-2.5 py-0.5 rounded-md border border-border text-text-secondary">
                                  <CalendarDays size={12} className="shrink-0 text-text-muted" />
                                  <span>
                                    {t('contracts.deliverySpace.deadlinePrefix', { defaultValue: 'Hạn chót:' })}{' '}
                                    {currentActiveItem.dueDate}
                                  </span>
                                </span>
                              )}
                            </div>

                            <h3 className="text-base sm:text-lg font-black text-text-primary leading-snug">
                              {currentActiveItem.title}
                            </h3>
                          </div>

                          <WorkItemStatusPill status={currentActiveItem.status} />
                        </div>

                        {currentActiveItem.description && (
                          <div className="rounded-xl border border-border bg-surface-muted p-3 text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line font-medium">
                            {currentActiveItem.description}
                          </div>
                        )}
                      </div>

                      {/* Freelancer Uploader Card */}
                      {!isClient && canSubmitWorkItem(currentActiveItem.status) && (
                        <FreelancerUploaderCard
                          workItem={currentActiveItem}
                          draft={space.getDraft(currentActiveItem.workItemId)}
                          disabled={space.isBusy || space.isDisputed || !space.usesWorkItems}
                          labels={labels}
                          onAttach={file => {
                            const failure = space.attachFile(currentActiveItem.workItemId, file);
                            if (failure) showValidationToast(t(`workspace.${failure}FileError`, 'Tệp tải lên không hợp lệ.'), { fallback: 'Tệp tải lên không hợp lệ.' });
                          }}
                          onDetach={fileName => space.detachFile(currentActiveItem.workItemId, fileName)}
                          onNoteChange={note => space.updateNote(currentActiveItem.workItemId, note)}
                        />
                      )}

                      {/* Work Item Submission History Component */}
                      <div className="rounded-xl border border-border bg-surface-card p-4 space-y-3 shadow-xs">
                        <WorkItemSubmissionHistory
                          submissions={currentActiveItem.submissions ?? []}
                          labels={labels}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-6 text-center text-xs font-bold text-text-muted">
                      {t(
                        'contracts.deliverySpace.selectItemPrompt',
                        'Vui lòng chọn một đầu việc bên trái để xem chi tiết và lịch sử nộp sản phẩm.'
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ STICKY COMMAND TOOLBAR ═══ */}
        {space.usesWorkItems && !space.isDisputed && !space.isLoading && space.activeMilestone && (
          <div className="border-t border-border bg-surface p-4 sm:p-5 shrink-0 shadow-2xl space-y-3">
            {isMilestoneComplete ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-black text-text-primary">
                      {t('contracts.deliverySpace.allDeliverablesApproved', 'Tất cả sản phẩm đã được duyệt nghiệm thu')}
                    </p>
                    <p className="text-[11px] sm:text-xs text-text-muted mt-0.5">
                      {t('contracts.deliverySpace.milestoneFullyCompleted', 'Milestone này đã hoàn thành toàn bộ công việc.')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-border bg-surface-muted hover:bg-surface text-text-primary px-5 py-2.5 text-xs font-black transition cursor-pointer shadow-2xs active:scale-95 ml-auto"
                >
                  {t('common.close', 'Đóng')}
                </button>
              </div>
            ) : isClient ? (
              space.pendingReviewCount === 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shrink-0">
                      <Clock size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-black text-text-primary">
                        {t('contracts.deliverySpace.noItemsAwaitingReview', 'Chưa có sản phẩm nào chờ bạn duyệt')}
                      </p>
                      <p className="text-[11px] sm:text-xs text-text-muted mt-0.5">
                        {t('contracts.deliverySpace.awaitingFreelancerSubmissionHint', 'Freelancer đang thực hiện công việc và sẽ nộp sản phẩm tại đây.')}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-border bg-surface-muted hover:bg-surface text-text-primary px-5 py-2.5 text-xs font-black transition cursor-pointer shadow-2xs active:scale-95 ml-auto"
                  >
                    {t('common.close', 'Đóng')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {isRevising && (
                    <div className="space-y-1.5 animate-in fade-in duration-150">
                      <label className="text-[11px] font-black uppercase tracking-wider text-text-primary block">
                        {t('contracts.deliverySpace.revisionReasonLabel', {
                          defaultValue: 'Lý do & Nội dung yêu cầu chỉnh sửa chi tiết:',
                        })}
                      </label>
                      <textarea
                        ref={revisionReasonRef}
                        value={revisionReason}
                        aria-invalid={!revisionReason.trim()}
                        onChange={event => setRevisionReason(event.target.value)}
                        rows={2}
                        placeholder={t('contracts.deliverySpace.revisionReasonPlaceholder', 'Nhập chi tiết yêu cầu chỉnh sửa cho freelancer...')}
                        className="w-full rounded-xl border border-border bg-background p-3 text-xs sm:text-sm font-medium text-text-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-text-muted"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-black text-text-primary px-3 py-1.5 rounded-xl bg-surface-muted border border-border">
                      {t('contracts.deliverySpace.selectedCount', {
                        count: space.selectedIds.length,
                        total: space.workItems.length,
                        defaultValue: `Đã chọn: ${space.selectedIds.length} / ${space.workItems.length} hạng mục`,
                      })}
                    </span>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={space.isBusy || space.selectedIds.length === 0}
                        onClick={() => (isRevising ? void runReview(false) : setIsRevising(true))}
                        className="rounded-xl border border-border bg-surface-muted hover:bg-surface text-text-primary px-4 py-2.5 text-xs font-black transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs flex items-center gap-1.5 active:scale-95"
                      >
                        {space.isBusy ? <Loader2 size={14} className="animate-spin" /> : null}
                        <span>{t('contracts.deliverySpace.requestRevision', 'Yêu Cầu Chỉnh Sửa')}</span>
                      </button>

                      <button
                        type="button"
                        disabled={space.isBusy || space.selectedIds.length === 0}
                        onClick={() => void runReview(true)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-5 py-2.5 text-xs font-black text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 flex items-center gap-2"
                      >
                        {space.isBusy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        <span>{t('contracts.deliverySpace.approveSelected', 'Duyệt Nghiệm Thu Mục Đã Chọn')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-text-primary px-3 py-1.5 rounded-xl bg-surface-muted border border-border">
                    {t('contracts.deliverySpace.readyToSubmitCount', {
                      count: space.readyToSubmitIds.length,
                      total: space.workItems.length,
                      defaultValue: `${space.readyToSubmitIds.length} / ${space.workItems.length} hạng mục sẵn sàng nộp`,
                    })}
                  </span>
                  {space.uploadProgress !== null && (
                    <span className="text-xs font-black text-brand">
                      {t('contracts.deliverySpace.uploadingProgress', {
                        percent: space.uploadProgress,
                        defaultValue: `Đang tải lên: ${space.uploadProgress}%`,
                      })}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={space.isBusy || space.readyToSubmitIds.length === 0}
                  onClick={() => void runSubmit()}
                  className="rounded-xl bg-brand hover:bg-brand-hover active:scale-95 px-6 py-2.5 text-xs font-black text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-brand/25 flex items-center gap-2"
                >
                  {space.isBusy ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={16} />}
                  <span>{t('contracts.deliverySpace.submitSelected', 'Nộp Các Sản Phẩm Đã Chuẩn Bị')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Milestone Completion Congratulation Modal */}
        {space.completion && (
          <MilestoneCompletedModal
            completion={space.completion}
            labels={modalLabels}
            onDismiss={() => {
              space.dismissCompletion();
              onActionComplete?.();
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Freelancer Uploader Form Subcomponent ────────────────────────────────────
interface FreelancerUploaderCardProps {
  workItem: ContractWorkItem;
  draft: ReturnType<typeof useDeliverySpace> extends { getDraft: (id: string) => infer D } ? D : any;
  disabled: boolean;
  labels: Record<string, string>;
  onAttach: (file: File) => void;
  onDetach: (fileName: string) => void;
  onNoteChange: (note: string) => void;
}

function FreelancerUploaderCard({
  workItem: _workItem,
  draft,
  disabled,
  labels,
  onAttach,
  onDetach,
  onNoteChange,
}: FreelancerUploaderCardProps) {
  const { t } = useTranslation(['contracts', 'common']);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);

  return (
    <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5 space-y-3.5 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <span className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
          <UploadCloud size={16} className="text-brand" />
          <span>{t('contracts.deliverySpace.submitSectionTitle', { defaultValue: 'Nộp Sản Phẩm Cho Đầu Việc Này' })}</span>
        </span>
        <span className="text-[11px] font-bold text-text-primary bg-surface-muted border border-border px-2.5 py-0.5 rounded-full">
          {t('contracts.deliverySpace.readyToSubmitBadge', { defaultValue: 'Sẵn sàng nộp' })}
        </span>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-black uppercase tracking-wider text-text-muted block">
          {t('contracts.deliverySpace.noteForClientLabel', { defaultValue: 'Ghi chú cho khách hàng:' })}
        </label>
        <textarea
          value={draft.note}
          onChange={event => onNoteChange(event.target.value)}
          placeholder={labels.notePlaceholder || t('contracts.deliverySpace.notePlaceholder', 'Nhập mô tả kết quả, hướng dẫn xem tệp đính kèm...')}
          disabled={disabled}
          rows={3}
          className="w-full rounded-xl border border-border bg-background p-3 text-xs sm:text-sm font-medium text-text-primary placeholder:text-text-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-surface-muted transition"
        />
      </div>

      <input
        ref={setFileInputRef}
        type="file"
        accept={MILESTONE_FILE_ACCEPT}
        className="hidden"
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) onAttach(file);
          event.target.value = '';
        }}
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted hover:bg-surface hover:border-brand/40 px-4 py-2.5 text-xs font-black text-text-primary transition cursor-pointer disabled:opacity-50 shadow-2xs active:scale-95"
        >
          <Paperclip size={14} className="text-brand" />
          <span>{labels.attachFile || t('contracts.deliverySpace.attachFile', 'Đính kèm tệp sản phẩm')}</span>
        </button>
        <span className="text-[11px] font-semibold text-text-muted">
          {t('contracts.deliverySpace.supportedFileFormats', { defaultValue: '(Hỗ trợ file zip, pdf, docx, figma, mp4, png...)' })}
        </span>
      </div>

      {/* Attached Files List */}
      {draft.files.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-text-muted block">
            {t('contracts.deliverySpace.selectedFilesCount', {
              count: draft.files.length,
              defaultValue: `Tệp đã chọn (${draft.files.length}):`,
            })}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {draft.files.map((file: File) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface-muted text-xs font-bold text-text-primary shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <FileCheck size={15} className="text-brand shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onDetach(file.name)}
                  disabled={disabled}
                  aria-label={`${labels.removeFile || t('common.remove', 'Xóa')} ${file.name}`}
                  className="shrink-0 p-1 rounded-lg text-text-muted hover:text-rose-500 hover:bg-surface transition cursor-pointer disabled:opacity-50"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
