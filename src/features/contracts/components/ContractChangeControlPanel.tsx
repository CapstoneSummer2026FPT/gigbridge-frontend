import { useEffect, useMemo, useState } from 'react';
import { Check, FilePenLine, Plus, RefreshCw, Send, X } from 'lucide-react';
import { contractAmendmentAPI } from '../../../api/contractAPI/amendments';
import type { ContractAmendmentDetailDto, ContractAmendmentMilestoneDto, ContractChangeRequestDto, Milestone } from '../../../types/models/Contract';
import { ContractAmendmentStatus, ContractChangeRequestStatus, ContractStatus, MilestoneStatus } from '../../../types/models/Contract';
import { NestedMilestonePlanEditor, type EditableMilestonePlan } from '../../../shared/components/NestedMilestonePlanEditor';
import { formatGigCoin } from '../../../shared/utils/gigcoin';

interface Props {
  contractId: string;
  contractStatus: number;
  role: 'client' | 'freelancer';
  milestones: Milestone[];
  onApplied: () => void;
}

const amendmentLabels: Record<number, string> = {
  [ContractAmendmentStatus.PendingFreelancerReview]: 'Awaiting freelancer review',
  [ContractAmendmentStatus.ChangeRequested]: 'Changes requested',
  [ContractAmendmentStatus.PendingSignatures]: 'Awaiting both signatures',
  [ContractAmendmentStatus.PendingFunding]: 'Awaiting additional escrow funding',
  [ContractAmendmentStatus.Applied]: 'Applied',
  [ContractAmendmentStatus.Rejected]: 'Rejected',
  [ContractAmendmentStatus.Cancelled]: 'Cancelled',
};

const toEditablePlan = (milestones: Milestone[]): EditableMilestonePlan[] => milestones
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

const toAmendmentPlan = (plans: EditableMilestonePlan[]): ContractAmendmentMilestoneDto[] => plans.map((item, orderIndex) => ({
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

export function ContractChangeControlPanel({ contractId, contractStatus, role, milestones, onApplied }: Props) {
  const [requests, setRequests] = useState<ContractChangeRequestDto[]>([]);
  const [amendments, setAmendments] = useState<ContractAmendmentDetailDto[]>([]);
  const [reason, setReason] = useState('');
  const [requestedChanges, setRequestedChanges] = useState('');
  const [editingChangeId, setEditingChangeId] = useState<string | null>(null);
  const [editingAmendmentId, setEditingAmendmentId] = useState<string | null>(null);
  const [plan, setPlan] = useState<EditableMilestonePlan[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const [requestResponse, amendmentResponse] = await Promise.all([
      contractAmendmentAPI.getChangeRequests(contractId),
      contractAmendmentAPI.getAmendments(contractId),
    ]);
    setRequests(requestResponse.data || []);
    setAmendments(amendmentResponse.data || []);
  };

  useEffect(() => { if (contractStatus === ContractStatus.Active) void load(); }, [contractId, contractStatus]);
  const amendmentByRequest = useMemo(() => new Map(amendments.map(item => [item.changeRequestId, item])), [amendments]);

  if (contractStatus !== ContractStatus.Active) return null;

  const run = async (action: () => Promise<{ success: boolean; message?: string }>, refreshContract = false) => {
    setBusy(true); setError('');
    const response = await action();
    setBusy(false);
    if (!response.success) return setError(response.message || 'The contract change could not be saved.');
    setReason(''); setRequestedChanges(''); setEditingChangeId(null); setEditingAmendmentId(null); setPlan([]);
    await load();
    if (refreshContract) onApplied();
  };

  const beginAmendment = (request: ContractChangeRequestDto, amendment?: ContractAmendmentDetailDto) => {
    setEditingChangeId(request.changeRequestId);
    setEditingAmendmentId(amendment?.amendmentId || null);
    setReason(amendment?.reason || request.reason);
    setPlan(amendment ? amendment.milestones.map(item => ({
      id: item.sourceMilestoneId,
      title: item.title,
      description: item.description,
      amount: item.amount,
      estimatedDuration: item.estimatedDuration,
      dueDate: item.dueDate,
      deliverables: item.deliverables,
      acceptanceCriteria: item.acceptanceCriteria,
      orderIndex: item.orderIndex,
      workItems: item.workItems.map(workItem => ({ id: workItem.sourceWorkItemId, ...workItem })),
    })) : toEditablePlan(milestones));
  };

  return <section className="mx-auto my-6 max-w-7xl rounded-xl border border-border bg-card p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div><h2 className="flex items-center gap-2 text-lg font-bold"><FilePenLine size={18} /> Change Requests and Contract Amendments</h2><p className="mt-1 text-xs text-muted-foreground">Signed scope is immutable. Future work changes follow review, signatures and escrow adjustment.</p></div>
      <button type="button" onClick={() => void load()} className="rounded border border-border p-2" title="Refresh"><RefreshCw size={15} /></button>
    </div>
    {error && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}

    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-sm font-bold">Request a future scope change</h3>
        <input value={reason} onChange={event => setReason(event.target.value)} placeholder="Reason" className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
        <textarea value={requestedChanges} onChange={event => setRequestedChanges(event.target.value)} placeholder="Describe the requested milestone or work-item changes" rows={3} className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
        <button type="button" disabled={busy || !reason.trim() || !requestedChanges.trim()} onClick={() => void run(() => contractAmendmentAPI.createChangeRequest(contractId, {
          reason: reason.trim(), requestedChanges: requestedChanges.trim(),
          affectedMilestoneIds: milestones.filter(item => Number(item.status) === MilestoneStatus.Pending).map(item => item.id),
          affectedWorkItemIds: milestones.filter(item => Number(item.status) === MilestoneStatus.Pending).flatMap(item => item.workItems.map(workItem => workItem.workItemId)),
        }))} className="inline-flex items-center gap-2 rounded-lg bg-[var(--gb-cyan)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Send size={14} /> Send change request</button>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold">Change request history</h3>
        {requests.length === 0 ? <p className="text-sm text-muted-foreground">No change requests.</p> : requests.map(request => {
          const amendment = amendmentByRequest.get(request.changeRequestId);
          return <article key={request.changeRequestId} className="rounded-lg border border-border p-3 text-xs">
            <div className="flex justify-between gap-2"><strong>{request.reason}</strong><span className="rounded bg-muted px-2 py-1">{ContractChangeRequestStatus[Number(request.status)]}</span></div>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{request.requestedChanges}</p>
            {request.clarificationRequestNote && <p className="mt-2 rounded bg-amber-500/10 p-2"><strong>Clarification requested:</strong> {request.clarificationRequestNote}</p>}
            {request.clarificationResponseNote && <p className="mt-2 rounded bg-muted p-2"><strong>Clarification:</strong> {request.clarificationResponseNote}</p>}
            {request.responseNote && <p className="mt-2 rounded bg-muted p-2"><strong>Response note:</strong> {request.responseNote}</p>}
            {request.canRespond && <div className="mt-3 flex gap-2"><button title="Accept change request" disabled={busy} onClick={() => void run(() => contractAmendmentAPI.respondChangeRequest(contractId, request.changeRequestId, { accept: true, needsClarification: false }))} className="rounded border border-emerald-500/30 px-2 py-1 text-emerald-600"><Check size={13} /></button><button title="Request clarification" disabled={busy} onClick={() => { const note = window.prompt('What needs clarification?')?.trim(); if (note) void run(() => contractAmendmentAPI.respondChangeRequest(contractId, request.changeRequestId, { accept: false, needsClarification: true, note })); }} className="rounded border border-amber-500/30 px-2 py-1 text-amber-600"><FilePenLine size={13} /></button><button title="Reject change request" disabled={busy} onClick={() => { const note = window.prompt('Optional rejection note')?.trim(); void run(() => contractAmendmentAPI.respondChangeRequest(contractId, request.changeRequestId, { accept: false, needsClarification: false, note })); }} className="rounded border border-red-500/30 px-2 py-1 text-red-500"><X size={13} /></button></div>}
            {request.canClarify && <button type="button" disabled={busy} onClick={() => { const note = window.prompt('Provide clarification')?.trim(); if (note) void run(() => contractAmendmentAPI.respondChangeRequest(contractId, request.changeRequestId, { accept: false, needsClarification: false, note })); }} className="mt-3 rounded border border-amber-500/40 px-2 py-1 font-semibold text-amber-600">Provide clarification</button>}
            {role === 'client' && Number(request.status) === ContractChangeRequestStatus.Accepted && (!amendment || Number(amendment.status) === ContractAmendmentStatus.ChangeRequested) && <button type="button" onClick={() => beginAmendment(request, amendment)} className="mt-3 inline-flex items-center gap-1 rounded border border-border px-2 py-1 font-semibold"><Plus size={13} /> {amendment ? 'Revise amendment' : 'Create amendment'}</button>}
          </article>;
        })}
      </div>
    </div>

    {editingChangeId && <div className="mt-6 border-t border-border pt-5">
      <NestedMilestonePlanEditor value={plan} onChange={setPlan} showDueDate title="Amendment snapshot for future milestones" description="Only pending milestones and their work items will be replaced when this signed amendment is applied." />
      <button type="button" disabled={busy || plan.length === 0} onClick={() => void run(() => {
        const payload = { changeRequestId: editingChangeId, reason, milestones: toAmendmentPlan(plan) };
        return editingAmendmentId ? contractAmendmentAPI.updateAmendment(contractId, editingAmendmentId, payload) : contractAmendmentAPI.createAmendment(contractId, payload);
      })} className="mt-4 rounded-lg bg-[var(--gb-cyan)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Submit amendment for freelancer review</button>
    </div>}

    {amendments.length > 0 && <div className="mt-6 space-y-3 border-t border-border pt-5">
      <h3 className="text-sm font-bold">Amendments</h3>
      {amendments.map(amendment => <article key={amendment.amendmentId} className="rounded-lg border border-border p-4 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><div><strong>Revision {amendment.revisionNumber}: {amendment.reason}</strong><p className="mt-1 text-xs text-muted-foreground">{formatGigCoin(amendment.originalTotalBudget)} → {formatGigCoin(amendment.proposedTotalBudget)} ({amendment.budgetDelta >= 0 ? '+' : ''}{formatGigCoin(amendment.budgetDelta)})</p></div><span className="rounded bg-muted px-2 py-1 text-xs font-bold">{amendmentLabels[Number(amendment.status)]}</span></div>
        <p className="mt-2 text-xs text-muted-foreground">{amendment.milestones.length} future milestone(s), {amendment.signatureCount}/2 signatures.</p>
        {amendment.reviewNote && <p className="mt-2 rounded bg-muted p-2 text-xs"><strong>Review note:</strong> {amendment.reviewNote}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {role === 'freelancer' && Number(amendment.status) === ContractAmendmentStatus.PendingFreelancerReview && <><button disabled={busy} onClick={() => void run(() => contractAmendmentAPI.respondAmendment(contractId, amendment.amendmentId, { accept: true, requestChanges: false }))} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Accept plan</button><button disabled={busy} onClick={() => void run(() => contractAmendmentAPI.respondAmendment(contractId, amendment.amendmentId, { accept: false, requestChanges: true, note: window.prompt('Requested changes') || 'Please revise the plan.' }))} className="rounded border border-amber-500/40 px-3 py-1.5 text-xs font-bold text-amber-600">Request changes</button><button disabled={busy} onClick={() => void run(() => contractAmendmentAPI.respondAmendment(contractId, amendment.amendmentId, { accept: false, requestChanges: false }))} className="rounded border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-500">Reject</button></>}
          {Number(amendment.status) === ContractAmendmentStatus.PendingSignatures && <button disabled={busy} onClick={() => { const signature = window.prompt('Type your legal name to sign this amendment')?.trim(); if (signature) void run(() => contractAmendmentAPI.signAmendment(contractId, amendment.amendmentId, signature), true); }} className="rounded bg-[var(--gb-cyan)] px-3 py-1.5 text-xs font-bold text-white">E-sign amendment</button>}
          {role === 'client' && Number(amendment.status) === ContractAmendmentStatus.PendingFunding && <button disabled={busy} onClick={() => void run(() => contractAmendmentAPI.fundAmendment(contractId, amendment.amendmentId), true)} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Fund {formatGigCoin(amendment.budgetDelta)} and apply</button>}
        </div>
      </article>)}
    </div>}
  </section>;
}
