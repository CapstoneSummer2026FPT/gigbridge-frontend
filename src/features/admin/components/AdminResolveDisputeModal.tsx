import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Scale, X } from 'lucide-react';
import { UserViolationType, type AdminDisputeDetail } from '../../../types/models/AdminDispute';
import { DisputeMilestoneOutcome, DisputeResolution } from '../../../types/models/Dispute';
import { MilestoneStatus } from '../../../types/models/Contract';

export interface ViolationState {
  isViolation: boolean;
  violationType: UserViolationType | null;
  reason: string;
  description: string;
}

const resolutionLabels: Record<DisputeResolution, string> = {
  [DisputeResolution.ClientFavored]: 'Client Favored',
  [DisputeResolution.FreelancerFavored]: 'Freelancer Favored',
  [DisputeResolution.Split]: 'Split',
  [DisputeResolution.Dismissed]: 'Dismissed',
};

interface AdminResolveDisputeModalProps {
  selectedDispute: AdminDisputeDetail;
  showResolveDialog: boolean;
  actionLoading: boolean;
  resolution: DisputeResolution;
  setResolution: (val: DisputeResolution) => void;
  resolutionNote: string;
  setResolutionNote: (val: string) => void;
  internalNotes: string;
  setInternalNotes: (val: string) => void;
  contractAction: number;
  setContractAction: (val: number) => void;
  milestoneDecisions: Record<string, { outcome: DisputeMilestoneOutcome; release: string; refund: string; penalty: string; reason: string }>;
  setMilestoneDecisions: React.Dispatch<React.SetStateAction<Record<string, { outcome: DisputeMilestoneOutcome; release: string; refund: string; penalty: string; reason: string }>>>;
  clientViolation: ViolationState;
  setClientViolation: React.Dispatch<React.SetStateAction<ViolationState>>;
  freelancerViolation: ViolationState;
  setFreelancerViolation: React.Dispatch<React.SetStateAction<ViolationState>>;
  allocationTotals: { release: number; refund: number; penalty: number };
  allocationHasError: (milestoneId: string) => boolean;
  violationHasError: (violation: ViolationState) => boolean;
  resolveCase: () => Promise<void>;
  resetResolveDialog: () => void;
}

export function AdminResolveDisputeModal({
  selectedDispute,
  showResolveDialog,
  actionLoading,
  resolution,
  setResolution,
  resolutionNote,
  setResolutionNote,
  internalNotes,
  setInternalNotes,
  contractAction,
  setContractAction,
  milestoneDecisions,
  setMilestoneDecisions,
  clientViolation,
  setClientViolation,
  freelancerViolation,
  setFreelancerViolation,
  allocationTotals,
  allocationHasError,
  violationHasError,
  resolveCase,
  resetResolveDialog,
}: AdminResolveDisputeModalProps): JSX.Element | null {
  const { t } = useTranslation();

  if (!showResolveDialog || !selectedDispute) return null;

  const relevantMilestones = selectedDispute.milestones.filter(
    (m) =>
      m.lockedAmount > 0 &&
      (contractAction === 1 || m.status === MilestoneStatus.Disputed || m.milestoneId === selectedDispute.milestoneId)
  );

  const hasAnyAllocationError = relevantMilestones.some((m) => allocationHasError(m.milestoneId));
  const hasViolationError = violationHasError(clientViolation) || violationHasError(freelancerViolation);
  const canSubmit = !actionLoading && resolutionNote.trim() && !hasAnyAllocationError && !hasViolationError;

  return (
    <div className="modal-backdrop z-50">
      <div className="modal-card max-w-4xl space-y-5 max-h-[90vh] overflow-y-auto p-6 bg-background border border-border rounded-2xl shadow-2xl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-brand">
              <Scale size={16} />
              {t('admin.disputes.dialog.eyebrow', 'Official Dispute Verdict')}
            </div>
            <h3 className="text-xl font-black text-text-primary tracking-tight mt-0.5">
              {t('admin.disputes.dialog.resolveTitle', 'Issue Binding Resolution Verdict')}
            </h3>
            <p className="text-xs font-semibold text-text-muted mt-0.5">Case ID: {selectedDispute.id} · {String(selectedDispute.contractTitle)}</p>
          </div>
          <button
            type="button"
            onClick={resetResolveDialog}
            disabled={actionLoading}
            className="rounded-xl border border-border p-2 text-text-muted hover:border-brand/40 hover:text-text-primary transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Resolution Verdict & Contract Action Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1.5">
                {t('admin.disputes.dialog.outcome', 'Resolution Outcome')}
              </label>
              <select
                className="input-gb w-full py-2.5 px-3 text-xs font-bold"
                value={resolution}
                onChange={(e) => setResolution(Number(e.target.value) as DisputeResolution)}
              >
                {Object.entries(resolutionLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1.5">
                {t('admin.disputes.dialog.contractAction', 'Contract Execution Action')}
              </label>
              <select
                className="input-gb w-full py-2.5 px-3 text-xs font-bold"
                value={contractAction}
                onChange={(e) => setContractAction(Number(e.target.value))}
              >
                <option value={0}>Keep Active / Default</option>
                <option value={1}>Cancel Contract Immediately (Refund Unreleased Escrow)</option>
                <option value={2}>Complete Contract (Release Approved Funds)</option>
              </select>
            </div>
          </div>

          {/* Milestone Financial Allocations Table */}
          {relevantMilestones.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-text-primary">
                  {t('admin.disputes.dialog.milestoneAllocations', 'Milestone Financial Allocations')}
                </h4>
                <div className="text-[11px] font-bold text-text-muted space-x-3">
                  <span>Release: <strong className="text-emerald-600 dark:text-emerald-400">{allocationTotals.release.toFixed(2)}</strong></span>
                  <span>Refund: <strong className="text-cyan-600 dark:text-cyan-400">{allocationTotals.refund.toFixed(2)}</strong></span>
                  <span>Penalty: <strong className="text-rose-600 dark:text-rose-400">{allocationTotals.penalty.toFixed(2)}</strong></span>
                </div>
              </div>

              <div className="space-y-3 divide-y divide-border/60">
                {relevantMilestones.map((milestone) => {
                  const decision = milestoneDecisions[milestone.milestoneId] ?? {
                    outcome: DisputeMilestoneOutcome.Accepted,
                    release: milestone.lockedAmount.toFixed(2),
                    refund: '0.00',
                    penalty: '0.00',
                    reason: '',
                  };
                  const isErr = allocationHasError(milestone.milestoneId);

                  return (
                    <div key={milestone.milestoneId} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <strong className="font-extrabold text-text-primary">{milestone.title}</strong>
                        <span className="font-mono text-text-muted font-bold">Locked: {milestone.lockedAmount.toLocaleString()} GCoin</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Outcome</label>
                          <select
                            className="input-gb w-full py-1.5 px-2 text-xs font-semibold"
                            value={decision.outcome}
                            onChange={(e) => {
                              const outcome = Number(e.target.value) as DisputeMilestoneOutcome;
                              setMilestoneDecisions((prev) => ({
                                ...prev,
                                [milestone.milestoneId]: { ...decision, outcome },
                              }));
                            }}
                          >
                            <option value={DisputeMilestoneOutcome.Accepted}>Accepted (Release All)</option>
                            <option value={DisputeMilestoneOutcome.Rejected}>Rejected (Refund All)</option>
                            <option value={DisputeMilestoneOutcome.PartiallyAccepted}>Partial Split</option>
                            <option value={DisputeMilestoneOutcome.Cancelled}>Cancelled</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Release to Freelancer</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="input-gb w-full py-1.5 px-2 text-xs font-bold"
                            value={decision.release}
                            onChange={(e) => {
                              const release = e.target.value;
                              setMilestoneDecisions((prev) => ({
                                ...prev,
                                [milestone.milestoneId]: { ...decision, release },
                              }));
                            }}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Refund to Client</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="input-gb w-full py-1.5 px-2 text-xs font-bold"
                            value={decision.refund}
                            onChange={(e) => {
                              const refund = e.target.value;
                              setMilestoneDecisions((prev) => ({
                                ...prev,
                                [milestone.milestoneId]: { ...decision, refund },
                              }));
                            }}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Penalty Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="input-gb w-full py-1.5 px-2 text-xs font-bold text-rose-600"
                            value={decision.penalty}
                            onChange={(e) => {
                              const penalty = e.target.value;
                              setMilestoneDecisions((prev) => ({
                                ...prev,
                                [milestone.milestoneId]: { ...decision, penalty },
                              }));
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          className="input-gb w-full py-1.5 px-3 text-xs font-semibold"
                          placeholder="Allocation / Penalty reason (Required if custom split or penalty > 0)..."
                          value={decision.reason}
                          onChange={(e) => {
                            const reason = e.target.value;
                            setMilestoneDecisions((prev) => ({
                              ...prev,
                              [milestone.milestoneId]: { ...decision, reason },
                            }));
                          }}
                        />
                      </div>

                      {isErr && (
                        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <AlertTriangle size={13} />
                          Sum of Release + Refund + Penalty must equal locked amount ({milestone.lockedAmount.toFixed(2)} GCoin) and reason is required for penalties/custom overrides.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Participant Violation Penalties & Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Violation Box */}
            <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-border text-brand focus:ring-brand"
                  checked={clientViolation.isViolation}
                  onChange={(e) => setClientViolation((prev: ViolationState) => ({ ...prev, isViolation: e.target.checked }))}
                />
                <span className="text-xs font-extrabold text-text-primary">Record Violation against Client ({selectedDispute.client.fullName})</span>
              </label>

              {clientViolation.isViolation && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <select
                    className="input-gb w-full py-2 px-3 text-xs font-semibold"
                    value={clientViolation.violationType ?? ''}
                    onChange={(e) => setClientViolation((prev: ViolationState) => ({ ...prev, violationType: e.target.value === '' ? null : Number(e.target.value) as UserViolationType }))}
                  >
                    <option value="">Select Violation Type...</option>
                    <option value={UserViolationType.ContractBreach}>Contract Breach</option>
                    <option value={UserViolationType.FraudOrMisrepresentation}>Fraud / Misrepresentation</option>
                    <option value={UserViolationType.HarassmentOrAbuse}>Harassment or Abuse</option>
                    <option value={UserViolationType.PaymentMisconduct}>Payment Misconduct</option>
                    <option value={UserViolationType.PlatformPolicyViolation}>Platform Policy Violation</option>
                    <option value={UserViolationType.Other}>Other</option>
                  </select>

                  <input
                    type="text"
                    className="input-gb w-full py-2 px-3 text-xs font-semibold"
                    placeholder="Violation Reason (Required)..."
                    value={clientViolation.reason}
                    onChange={(e) => setClientViolation((prev: ViolationState) => ({ ...prev, reason: e.target.value }))}
                  />

                  <textarea
                    rows={2}
                    className="input-gb w-full py-2 px-3 text-xs font-semibold"
                    placeholder="Violation description & evidence reference..."
                    value={clientViolation.description}
                    onChange={(e) => setClientViolation((prev: ViolationState) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Freelancer Violation Box */}
            <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-border text-brand focus:ring-brand"
                  checked={freelancerViolation.isViolation}
                  onChange={(e) => setFreelancerViolation((prev: ViolationState) => ({ ...prev, isViolation: e.target.checked }))}
                />
                <span className="text-xs font-extrabold text-text-primary">
                  Record Violation against Freelancer ({selectedDispute.freelancer?.fullName ?? 'Freelancer'})
                </span>
              </label>

              {freelancerViolation.isViolation && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <select
                    className="input-gb w-full py-2 px-3 text-xs font-semibold"
                    value={freelancerViolation.violationType ?? ''}
                    onChange={(e) => setFreelancerViolation((prev: ViolationState) => ({ ...prev, violationType: e.target.value === '' ? null : Number(e.target.value) as UserViolationType }))}
                  >
                    <option value="">Select Violation Type...</option>
                    <option value={UserViolationType.ContractBreach}>Contract Breach</option>
                    <option value={UserViolationType.FraudOrMisrepresentation}>Fraud / Misrepresentation</option>
                    <option value={UserViolationType.HarassmentOrAbuse}>Harassment or Abuse</option>
                    <option value={UserViolationType.PaymentMisconduct}>Payment Misconduct</option>
                    <option value={UserViolationType.PlatformPolicyViolation}>Platform Policy Violation</option>
                    <option value={UserViolationType.Other}>Other</option>
                  </select>

                  <input
                    type="text"
                    className="input-gb w-full py-2 px-3 text-xs font-semibold"
                    placeholder="Violation Reason (Required)..."
                    value={freelancerViolation.reason}
                    onChange={(e) => setFreelancerViolation((prev: ViolationState) => ({ ...prev, reason: e.target.value }))}
                  />

                  <textarea
                    rows={2}
                    className="input-gb w-full py-2 px-3 text-xs font-semibold"
                    placeholder="Violation description & evidence reference..."
                    value={freelancerViolation.description}
                    onChange={(e) => setFreelancerViolation((prev: ViolationState) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1">
                {t('admin.disputes.dialog.publicNote', 'Resolution Verdict Note (Public to Parties)')} *
              </label>
              <textarea
                className="input-gb w-full py-2.5 px-3 text-xs font-semibold"
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Enter official administrative resolution verdict reason visible to both Client and Freelancer..."
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1">
                {t('admin.disputes.dialog.internalNotes', 'Internal Admin Notes (Private Log)')}
              </label>
              <textarea
                className="input-gb w-full py-2.5 px-3 text-xs font-semibold"
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Optional confidential notes for administrative audit log..."
              />
            </div>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <button
            type="button"
            onClick={resetResolveDialog}
            disabled={actionLoading}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-extrabold text-text-primary hover:border-brand/40 transition cursor-pointer"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={() => void resolveCase()}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-extrabold text-white hover:opacity-90 transition cursor-pointer shadow-md disabled:opacity-50"
          >
            <Scale size={16} />
            {t('admin.disputes.dialog.confirmResolution', 'Confirm & Execute Resolution')}
          </button>
        </div>
      </div>
    </div>
  );
}

