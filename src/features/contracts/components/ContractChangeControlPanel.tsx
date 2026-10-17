import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  FilePenLine,
  History,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { contractAmendmentAPI } from '../../../api/contractAPI/amendments';
import type {
  ContractAmendmentDetailDto,
  ContractAmendmentMilestoneDto,
  ContractChangeRequestDto,
  Milestone,
} from '../../../types/models/Contract';
import {
  ContractAmendmentStatus,
  ContractChangeRequestStatus,
  ContractStatus,
  MilestoneStatus,
} from '../../../types/models/Contract';
import {
  NestedMilestonePlanEditor,
  type EditableMilestonePlan,
} from '../../../shared/components/NestedMilestonePlanEditor';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { useTranslation } from '../../../hooks/useTranslation';
import { useUndoableDeleteScope } from '../../../shared/hooks/useUndoableDeleteScope';
import type { ApiResponse } from '../../../types/common';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';

interface Props {
  contractId: string;
  contractStatus: number;
  role: 'client' | 'freelancer';
  milestones: Milestone[];
  onApplied: () => void;
}

const amendmentStatusKeyMap: Record<number, string> = {
  [ContractAmendmentStatus.PendingFreelancerReview]: 'Awaiting freelancer review',
  [ContractAmendmentStatus.ChangeRequested]: 'Changes requested',
  [ContractAmendmentStatus.PendingSignatures]: 'Awaiting both signatures',
  [ContractAmendmentStatus.PendingFunding]: 'Awaiting additional escrow funding',
  [ContractAmendmentStatus.Applied]: 'Applied',
  [ContractAmendmentStatus.Rejected]: 'Rejected',
  [ContractAmendmentStatus.Cancelled]: 'Cancelled',
};

const toEditablePlan = (milestones: Milestone[]): EditableMilestonePlan[] =>
  milestones
    .filter(item => Number(item.status) === MilestoneStatus.Pending)
    .map((item, orderIndex) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      amount: item.amount,
      estimatedDuration: item.estimatedDuration,
      dueDate: item.due_date || null,
      deliverables: item.deliverables,
      acceptanceCriteria: item.acceptanceCriteria,
      orderIndex,
      workItems: (item.workItems || []).map((workItem, workIndex) => ({
        id: workItem.workItemId,
        title: workItem.title,
        description: workItem.description,
        deliverables: workItem.deliverables,
        estimatedDuration: workItem.estimatedDuration,
        orderIndex: workIndex,
      })),
    }));

const toAmendmentPlan = (plans: EditableMilestonePlan[]): ContractAmendmentMilestoneDto[] =>
  plans.map((item, orderIndex) => ({
    sourceMilestoneId: item.id,
    title: item.title?.trim() || '',
    description: item.description,
    amount: Number(item.amount) || 0,
    estimatedDuration: item.estimatedDuration,
    dueDate: item.dueDate,
    deliverables: item.deliverables,
    acceptanceCriteria: item.acceptanceCriteria,
    orderIndex,
    workItems: item.workItems.map((workItem, workIndex) => ({
      sourceWorkItemId: workItem.id,
      title: workItem.title?.trim() || '',
      description: workItem.description,
      deliverables: workItem.deliverables,
      estimatedDuration: workItem.estimatedDuration,
      orderIndex: workIndex,
    })),
  }));

export function ContractChangeControlPanel({
  contractId,
  contractStatus,
  role,
  milestones,
  onApplied,
}: Props) {
  const { t } = useTranslation();
  const undoDeleteController = useUndoableDeleteScope();
  const [requests, setRequests] = useState<ContractChangeRequestDto[]>([]);
  const [amendments, setAmendments] = useState<ContractAmendmentDetailDto[]>([]);
  const [reason, setReason] = useState('');
  const [requestedChanges, setRequestedChanges] = useState('');
  const [editingChangeId, setEditingChangeId] = useState<string | null>(null);
  const [editingAmendmentId, setEditingAmendmentId] = useState<string | null>(null);
  const [plan, setPlan] = useState<EditableMilestonePlan[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reasonRef = useRef<HTMLInputElement>(null);
  const requestedChangesRef = useRef<HTMLTextAreaElement>(null);

  const load = async () => {
    const [requestResponse, amendmentResponse] = await Promise.all([
      contractAmendmentAPI.getChangeRequests(contractId),
      contractAmendmentAPI.getAmendments(contractId),
    ]);
    setRequests(requestResponse.data || []);
    setAmendments(amendmentResponse.data || []);
  };

  useEffect(() => {
    if (contractStatus === ContractStatus.Active) void load();
  }, [contractId, contractStatus]);

  const amendmentByRequest = useMemo(
    () => new Map(amendments.map(item => [item.changeRequestId, item])),
    [amendments]
  );

  if (contractStatus !== ContractStatus.Active) return null;

  const run = async (
    action: () => Promise<ApiResponse<unknown>>,
    refreshContract = false
  ) => {
    setBusy(true);
    setError('');
    const response = await action();
    setBusy(false);
    if (!response.success) {
      if (isValidationResponse(response)) {
        showValidationToast(response, { fallback: response.message || 'Unable to save this change request.' });
        if (!reason.trim()) reasonRef.current?.focus();
        else requestedChangesRef.current?.focus();
        return;
      }
      return setError(response.message || 'Yêu cầu thay đổi không thể lưu.');
    }
    setReason('');
    setRequestedChanges('');
    setEditingChangeId(null);
    setEditingAmendmentId(null);
    setPlan([]);
    await load();
    if (refreshContract) onApplied();
  };

  const beginAmendment = (
    request: ContractChangeRequestDto,
    amendment?: ContractAmendmentDetailDto
  ) => {
    setEditingChangeId(request.changeRequestId);
    setEditingAmendmentId(amendment?.amendmentId || null);
    setReason(amendment?.reason || request.reason);
    setPlan(
      amendment
        ? amendment.milestones.map(item => ({
            id: item.sourceMilestoneId,
            title: item.title,
            description: item.description,
            amount: item.amount,
            estimatedDuration: item.estimatedDuration,
            dueDate: item.dueDate,
            deliverables: item.deliverables,
            acceptanceCriteria: item.acceptanceCriteria,
            orderIndex: item.orderIndex,
            workItems: item.workItems.map(workItem => ({
              id: workItem.sourceWorkItemId,
              ...workItem,
            })),
          }))
        : toEditablePlan(milestones)
    );
  };

  const submitAmendment = async (): Promise<void> => {
    if (!editingChangeId) return;
    if (plan.length === 0) {
      showValidationToast('Add at least one milestone to the amendment.', {
        fallback: 'Add at least one milestone to the amendment.',
      });
      return;
    }
    await undoDeleteController.finalizeAll();
    await run(() => {
      const payload = {
        changeRequestId: editingChangeId,
        reason,
        milestones: toAmendmentPlan(plan),
      };
      return editingAmendmentId
        ? contractAmendmentAPI.updateAmendment(contractId, editingAmendmentId, payload)
        : contractAmendmentAPI.createAmendment(contractId, payload);
    });
  };

  const submitChangeRequest = async (): Promise<void> => {
    const validationMessages: string[] = [];
    if (!reason.trim()) validationMessages.push('Enter a reason for the requested change.');
    if (!requestedChanges.trim()) validationMessages.push('Describe the requested changes.');
    if (validationMessages.length > 0) {
      showValidationToast(validationMessages, { fallback: 'Complete the required fields.' });
      if (!reason.trim()) reasonRef.current?.focus();
      else requestedChangesRef.current?.focus();
      return;
    }
    await run(() =>
      contractAmendmentAPI.createChangeRequest(contractId, {
        reason: reason.trim(),
        requestedChanges: requestedChanges.trim(),
        affectedMilestoneIds: milestones
          .filter(item => Number(item.status) === MilestoneStatus.Pending)
          .map(item => item.id),
        affectedWorkItemIds: milestones
          .filter(item => Number(item.status) === MilestoneStatus.Pending)
          .flatMap(item => item.workItems.map(workItem => workItem.workItemId)),
      }),
    );
  };

  return (
    <section className="mx-auto my-8 max-w-7xl rounded-3xl border border-border/80 bg-surface-card p-6 md:p-8 space-y-6 shadow-md">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0 shadow-xs">
            <FilePenLine size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-text-primary tracking-tight">
                {t('contracts.changeControlTitle', {
                  defaultValue: 'Yêu Cầu Thay Đổi & Phụ Lục Hợp Đồng',
                })}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-black uppercase tracking-wider">
                Scope Control
              </span>
            </div>
            <p className="text-xs font-semibold text-text-muted mt-0.5">
              {t('contracts.changeControlSubtitle', {
                defaultValue:
                  'Phạm vi hợp đồng đã ký là cố định. Mọi thay đổi trong tương lai sẽ trải qua quy trình xem xét, ký xác nhận & điều chỉnh ký quỹ.',
              })}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface-muted/60 text-text-muted hover:text-text-primary transition-all text-xs font-extrabold cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
          title="Tải lại danh sách"
        >
          <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
          <span>Tải lại</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-extrabold flex items-center gap-2.5 shadow-xs">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Request Form (Left) & Change History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Scope Change Request Form */}
        <div className="rounded-2xl border border-border/70 bg-surface-muted/20 p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Sparkles size={16} className="text-brand" />
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
              {t('contracts.requestScopeChange', {
                defaultValue: 'Gửi Yêu Cầu Thay Đổi Phạm Vi Dự Án',
              })}
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1">
                Lý do thay đổi
              </label>
              <input
                ref={reasonRef}
                value={reason}
                aria-invalid={!reason.trim()}
                onChange={event => setReason(event.target.value)}
                placeholder={t('contracts.changeReasonPlaceholder', {
                  defaultValue:
                    'Lý do thay đổi (ví dụ: Bổ sung tính năng mới, thay đổi thời gian...)',
                })}
                className="w-full h-11 rounded-xl border border-border/80 bg-background px-3.5 text-xs font-bold text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1">
                Chi tiết thay đổi đề xuất
              </label>
              <textarea
                ref={requestedChangesRef}
                value={requestedChanges}
                aria-invalid={!requestedChanges.trim()}
                onChange={event => setRequestedChanges(event.target.value)}
                placeholder={t('contracts.changeDescPlaceholder', {
                  defaultValue: 'Mô tả chi tiết các cột mốc hoặc công việc cần thay đổi...',
                })}
                rows={4}
                className="w-full rounded-xl border border-border/80 bg-background p-3.5 text-xs font-bold text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs resize-none"
              />
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void submitChangeRequest()}
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-brand text-white font-black text-xs hover:bg-brand-hover transition-all cursor-pointer shadow-md disabled:opacity-40"
            >
              <Send size={15} />
              {t('contracts.sendChangeRequest', { defaultValue: 'Gửi Yêu Cầu Thay Đổi' })}
            </button>
          </div>
        </div>

        {/* Right Column: History Timeline */}
        <div className="rounded-2xl border border-border/70 bg-surface-muted/20 p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <History size={16} className="text-brand" />
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
              {t('contracts.changeRequestHistory', {
                defaultValue: 'Lịch Sử Yêu Cầu Thay Đổi',
              })}
            </h3>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-text-muted space-y-1">
                <Clock size={28} className="mx-auto text-text-muted/40" />
                <p>
                  {t('contracts.noChangeRequests', {
                    defaultValue: 'Chưa có yêu cầu thay đổi nào.',
                  })}
                </p>
              </div>
            ) : (
              requests.map(request => {
                const amendment = amendmentByRequest.get(request.changeRequestId);
                const statusCode = Number(request.status);
                const statusLabel = ContractChangeRequestStatus[statusCode] || 'Unknown';

                return (
                  <article
                    key={request.changeRequestId}
                    className="rounded-xl border border-border/80 bg-surface-card p-4 space-y-2 text-xs shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <strong className="font-black text-text-primary text-xs leading-snug">
                        {request.reason}
                      </strong>
                      <span className="shrink-0 rounded-lg bg-brand/10 border border-brand/20 px-2 py-0.5 text-[10px] font-black text-brand uppercase">
                        {statusLabel}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap font-medium text-text-muted leading-relaxed">
                      {request.requestedChanges}
                    </p>

                    {request.clarificationRequestNote && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400 font-bold space-y-0.5">
                        <span className="block text-[10px] uppercase tracking-wider font-black">
                          Yêu cầu làm rõ:
                        </span>
                        <p>{request.clarificationRequestNote}</p>
                      </div>
                    )}

                    {request.clarificationResponseNote && (
                      <div className="rounded-xl border border-border/60 bg-surface-muted/40 p-2.5 text-text-muted font-semibold">
                        <span className="font-extrabold text-text-primary">Giải thích: </span>
                        {request.clarificationResponseNote}
                      </div>
                    )}

                    {request.responseNote && (
                      <div className="rounded-xl border border-border/60 bg-surface-muted/40 p-2.5 text-text-muted font-semibold">
                        <span className="font-extrabold text-text-primary">Phản hồi: </span>
                        {request.responseNote}
                      </div>
                    )}

                    {request.canRespond && (
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          title="Chấp nhận yêu cầu"
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              contractAmendmentAPI.respondChangeRequest(
                                contractId,
                                request.changeRequestId,
                                { accept: true, needsClarification: false }
                              )
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[11px] hover:bg-emerald-500/20 transition cursor-pointer"
                        >
                          <Check size={13} /> Đồng ý
                        </button>

                        <button
                          type="button"
                          title="Yêu cầu làm rõ"
                          disabled={busy}
                          onClick={() => {
                            const note = window
                              .prompt('Nội dung cần làm rõ thêm?')
                              ?.trim();
                            if (note)
                              void run(() =>
                                contractAmendmentAPI.respondChangeRequest(
                                  contractId,
                                  request.changeRequestId,
                                  { accept: false, needsClarification: true, note }
                                )
                              );
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 font-black text-[11px] hover:bg-amber-500/20 transition cursor-pointer"
                        >
                          <FilePenLine size={13} /> Cần làm rõ
                        </button>

                        <button
                          type="button"
                          title="Từ chối yêu cầu"
                          disabled={busy}
                          onClick={() => {
                            const note = window.prompt('Lý do từ chối (không bắt buộc)')?.trim();
                            void run(() =>
                              contractAmendmentAPI.respondChangeRequest(
                                contractId,
                                request.changeRequestId,
                                { accept: false, needsClarification: false, note }
                              )
                            );
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 font-black text-[11px] hover:bg-rose-500/20 transition cursor-pointer"
                        >
                          <X size={13} /> Từ chối
                        </button>
                      </div>
                    )}

                    {request.canClarify && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const note = window.prompt('Cung cấp thêm làm rõ')?.trim();
                          if (note)
                            void run(() =>
                              contractAmendmentAPI.respondChangeRequest(
                                contractId,
                                request.changeRequestId,
                                { accept: false, needsClarification: false, note }
                              )
                            );
                        }}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs cursor-pointer"
                      >
                        Gửi lời làm rõ
                      </button>
                    )}

                    {role === 'client' &&
                      statusCode === ContractChangeRequestStatus.Accepted &&
                      (!amendment ||
                        Number(amendment.status) ===
                          ContractAmendmentStatus.ChangeRequested) && (
                        <button
                          type="button"
                          onClick={() => beginAmendment(request, amendment)}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand/30 bg-brand/10 text-brand font-black text-xs hover:bg-brand/20 transition cursor-pointer"
                        >
                          <Plus size={14} />{' '}
                          {amendment
                            ? t('contracts.reviseAmendment', { defaultValue: 'Chỉnh Sửa Phụ Lục' })
                            : t('contracts.createAmendment', { defaultValue: 'Tạo Phụ Lục Hợp Đồng' })}
                        </button>
                      )}
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Editor Section when creating/revising amendment */}
      {editingChangeId && (
        <div className="mt-6 border-t border-border/60 pt-6 space-y-4">
          <NestedMilestonePlanEditor
            value={plan}
            onChange={setPlan}
            undoDeleteController={undoDeleteController}
            showDueDate
            title="Bản Thảo Phụ Lục Hợp Đồng Mới"
            description="Chỉ các milestone chưa thực hiện và công việc của chúng sẽ được cập nhật khi phụ lục ký kết hoàn tất."
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitAmendment()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand text-white font-black text-xs hover:bg-brand-hover transition-all cursor-pointer shadow-md disabled:opacity-40"
          >
            <Send size={15} /> Gửi Phụ Lục Cho Freelancer Xem Xét
          </button>
        </div>
      )}

      {/* Amendments List */}
      {amendments.length > 0 && (
        <div className="mt-6 space-y-4 border-t border-border/60 pt-6">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-brand" />
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
              {t('contracts.amendmentsTitle', { defaultValue: 'Danh Sách Phụ Lục Hợp Đồng' })}
            </h3>
          </div>

          <div className="space-y-3">
            {amendments.map(amendment => {
              const statusKey = Number(amendment.status);
              const label = amendmentStatusKeyMap[statusKey] || 'Unknown';

              return (
                <article
                  key={amendment.amendmentId}
                  className="rounded-2xl border border-border/80 bg-surface-card p-5 space-y-3 text-xs shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <strong className="text-sm font-black text-text-primary">
                        Phụ lục v{amendment.revisionNumber}: {amendment.reason}
                      </strong>
                      <p className="mt-1 text-xs font-bold text-brand">
                        {formatGigCoin(amendment.originalTotalBudget)} →{' '}
                        {formatGigCoin(amendment.proposedTotalBudget)} (
                        {amendment.budgetDelta >= 0 ? '+' : ''}
                        {formatGigCoin(amendment.budgetDelta)})
                      </p>
                    </div>
                    <span className="rounded-xl bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-black text-brand">
                      {label}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-text-muted">
                    {amendment.milestones.length} cột mốc thay đổi, {amendment.signatureCount}/2 chữ
                    ký số.
                  </p>

                  {amendment.reviewNote && (
                    <div className="rounded-xl border border-border/60 bg-surface-muted/40 p-3 text-xs font-medium text-text-muted">
                      <strong className="text-text-primary font-bold">Ghi chú xem xét: </strong>
                      {amendment.reviewNote}
                    </div>
                  )}

                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    {role === 'freelancer' &&
                      statusKey === ContractAmendmentStatus.PendingFreelancerReview && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                contractAmendmentAPI.respondAmendment(
                                  contractId,
                                  amendment.amendmentId,
                                  { accept: true, requestChanges: false }
                                )
                              )
                            }
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer shadow-xs"
                          >
                            Chấp nhận kế hoạch
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                contractAmendmentAPI.respondAmendment(
                                  contractId,
                                  amendment.amendmentId,
                                  {
                                    accept: false,
                                    requestChanges: true,
                                    note:
                                      window.prompt('Nội dung cần yêu cầu chỉnh sửa?') ||
                                      'Vui lòng điều chỉnh lại kế hoạch.',
                                  }
                                )
                              )
                            }
                            className="px-4 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs transition cursor-pointer"
                          >
                            Yêu cầu chỉnh sửa
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                contractAmendmentAPI.respondAmendment(
                                  contractId,
                                  amendment.amendmentId,
                                  { accept: false, requestChanges: false }
                                )
                              )
                            }
                            className="px-4 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-500 font-black text-xs transition cursor-pointer"
                          >
                            Từ chối
                          </button>
                        </>
                      )}

                    {statusKey === ContractAmendmentStatus.PendingSignatures && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const signature = window
                            .prompt('Nhập họ tên hợp pháp của bạn để ký phụ lục này')
                            ?.trim();
                          if (signature)
                            void run(
                              () =>
                                contractAmendmentAPI.signAmendment(
                                  contractId,
                                  amendment.amendmentId,
                                  signature
                                ),
                              true
                            );
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white font-black text-xs hover:bg-brand-hover transition cursor-pointer shadow-xs"
                      >
                        <FilePenLine size={14} /> Ký Điện Tử Phụ Lục
                      </button>
                    )}

                    {role === 'client' &&
                      statusKey === ContractAmendmentStatus.PendingFunding && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () =>
                                contractAmendmentAPI.fundAmendment(
                                  contractId,
                                  amendment.amendmentId
                                ),
                              true
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer shadow-xs"
                        >
                          <Lock size={14} /> Nạp Ký Quỹ Đổ Sung {formatGigCoin(amendment.budgetDelta)} &
                          Áp Dụng
                        </button>
                      )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
