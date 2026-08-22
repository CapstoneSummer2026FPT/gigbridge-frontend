import { Layers, CheckCircle2, XCircle, DollarSign, Clock, ShieldCheck, Percent } from 'lucide-react';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import type { ProposalDetailDto, ProposalDto } from '../../../types/models/Proposal';

export interface AISideBySideMilestoneMatrixProps {
  detail: ProposalDetailDto | null;
  proposal?: ProposalDto | null;
  fullEvaluationJson?: string | null;
}

function parseDurationToWeeks(durationStr?: string | null): number {
  if (!durationStr) return 0;
  const lower = durationStr.toLowerCase().trim();
  const numMatch = lower.match(/(\d+(\.\d+)?)/);
  if (!numMatch) return 0;
  const val = parseFloat(numMatch[1]);
  if (lower.includes('month')) return val * 4;
  if (lower.includes('day')) return val / 7;
  if (lower.includes('week')) return val;
  return val;
}

function sumMilestoneDurations(milestones: any[]): string | null {
  if (!milestones || milestones.length === 0) return null;
  let totalWeeks = 0;
  let hasValid = false;
  for (const m of milestones) {
    const dur = m.estimatedDuration || m.estimated_duration;
    if (dur) {
      const w = parseDurationToWeeks(dur);
      if (w > 0) {
        totalWeeks += w;
        hasValid = true;
      }
    }
  }
  if (!hasValid) return null;
  const rounded = Math.round(totalWeeks * 10) / 10;
  return rounded === 1 ? '1 week' : `${rounded} weeks`;
}

export function AISideBySideMilestoneMatrix({
  detail,
  proposal,
  fullEvaluationJson,
}: AISideBySideMilestoneMatrixProps) {
  let requirementFulfillment: any[] = [];
  let jobBaseline: any = null;
  let proposalOffer: any = null;
  let deterministic: any = null;

  const rawJson = fullEvaluationJson || proposal?.aiFullEvaluationJson;
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      requirementFulfillment = parsed?.llm_qualitative_evaluation?.requirement_fulfillment || [];
      jobBaseline = parsed?.job_post_baseline || null;
      proposalOffer = parsed?.proposal_offer || null;
      deterministic = parsed?.deterministic_calculations || null;
    } catch {
      requirementFulfillment = [];
    }
  }

  const milestones = detail?.milestonePlans || [];
  const milestoneSumDuration = sumMilestoneDurations(milestones);

  // Metrics for Financial & Timeline Comparison
  const baselineBudgetMax = jobBaseline?.budget_max || 0;
  const proposedBudget =
    proposal?.proposedBudget || proposalOffer?.proposed_budget || detail?.proposedBudget || 0;
  const savingsRatioPercent =
    proposal?.aiSavingsRatioPercent ?? deterministic?.savings_ratio_percent ?? 0;

  const rawBaselineDuration = jobBaseline?.estimated_duration;
  const baselineDuration =
    rawBaselineDuration && rawBaselineDuration !== '—' && rawBaselineDuration !== 'null'
      ? rawBaselineDuration
      : milestoneSumDuration || 'Flexible / Unspecified';

  const rawProposedDuration =
    proposal?.proposedDuration || proposalOffer?.proposed_duration || detail?.proposedDuration;
  const proposedDuration =
    rawProposedDuration && rawProposedDuration !== '—'
      ? rawProposedDuration
      : milestoneSumDuration || '—';

  // Metrics for Requirement Scope Fulfillment
  const totalReqs = requirementFulfillment.length;
  const fulfilledCount = requirementFulfillment.filter((r) => r.is_fulfilled).length;
  const scopeCoveragePct =
    proposal?.aiScopeCompletenessPercent ??
    (totalReqs > 0 ? Math.round((fulfilledCount / totalReqs) * 100) : 100);

  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-surface-card/60 p-5 shadow-2xs">
      {/* Table Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
          <Layers size={16} className="text-brand" />
          <span>So sánh Milestone: Client Baseline vs. Freelancer Proposal</span>
        </h4>
        <span className="rounded-full bg-brand/10 border border-brand/20 px-3 py-0.5 text-[11px] font-black text-brand">
          Side-by-Side Audit
        </span>
      </div>

      {/* Metric Ownership & Evidence Banner: Financial Value & Timeline Feasibility */}
      <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-surface-card p-3.5 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-black text-[11px] text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign size={14} className="text-emerald-500" />
            💰 Financial Value (20%) & ⏱️ Timeline Feasibility (20%) Audit
          </span>
          <span className="text-[10px] font-extrabold text-text-muted bg-surface-card px-2.5 py-0.5 rounded-full border border-border/40">
            Supports Top Metric Evidence
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          {/* Budget Comparison Card (Original vs Freelancer Propose) */}
          <div className="rounded-xl bg-surface-card border border-border/60 p-3 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-[10px] font-black uppercase text-text-muted flex items-center gap-1">
                <Percent size={12} className="text-emerald-500" /> Budget Savings Comparison
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                  savingsRatioPercent > 0
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-surface-muted text-text-muted'
                }`}
              >
                {savingsRatioPercent > 0 ? `🟢 ${savingsRatioPercent.toFixed(1)}% Savings` : '0% Savings'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-surface-muted/50 p-2.5 rounded-xl border border-border/40 text-center space-y-0.5">
                <span className="block text-[9px] font-bold text-text-muted uppercase">Original Client Budget</span>
                <strong className="text-text-primary font-black text-xs block">
                  {baselineBudgetMax > 0
                    ? formatGigCoin(baselineBudgetMax)
                    : savingsRatioPercent > 0 && proposedBudget > 0
                    ? formatGigCoin(Math.round(proposedBudget / (1 - savingsRatioPercent / 100)))
                    : formatGigCoin(proposedBudget)}
                </strong>
              </div>

              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30 text-center space-y-0.5">
                <span className="block text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Freelancer Proposed</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-black text-xs block">
                  {formatGigCoin(proposedBudget)}
                </strong>
              </div>
            </div>
          </div>

          {/* Timeline Comparison Card (Original vs Freelancer Propose) */}
          <div className="rounded-xl bg-surface-card border border-border/60 p-3 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-[10px] font-black uppercase text-text-muted flex items-center gap-1">
                <Clock size={12} className="text-blue-500" /> Duration Comparison
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-700 dark:text-blue-300">
                ⏱️ Timeline Audit
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-surface-muted/50 p-2.5 rounded-xl border border-border/40 text-center space-y-0.5">
                <span className="block text-[9px] font-bold text-text-muted uppercase">Original Client Target</span>
                <strong className="text-text-primary font-black text-xs block">
                  {baselineDuration}
                </strong>
              </div>

              <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/30 text-center space-y-0.5">
                <span className="block text-[9px] font-bold text-blue-700 dark:text-blue-300 uppercase">Freelancer Proposed</span>
                <strong className="text-blue-600 dark:text-blue-400 font-black text-xs block">
                  {proposedDuration}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Milestone Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-surface-muted/60 text-[10px] font-black uppercase text-text-muted tracking-wider">
              <th className="p-3">#</th>
              <th className="p-3">Kế hoạch Freelancer đề xuất (Edited Plan)</th>
              <th className="p-3 text-right">
                <span className="flex items-center justify-end gap-1">
                  💰 Chi phí GC
                </span>
              </th>
              <th className="p-3 text-center">
                <span className="flex items-center justify-center gap-1">
                  ⏱️ Thời gian
                </span>
              </th>
              <th className="p-3">
                <span className="flex items-center gap-1">
                  📋 AI Scope Audit & Fulfillment
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {milestones.length > 0 ? (
              milestones.map((item, index) => {
                // Find matching requirement audit item
                const reqAudit =
                  requirementFulfillment.find(
                    (r) =>
                      r.matched_milestone?.toLowerCase() === item.title?.toLowerCase() || index === 0
                  ) || requirementFulfillment[index];

                const isFulfilled = reqAudit ? reqAudit.is_fulfilled : true;

                return (
                  <tr key={item.id || index} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="p-3 font-bold text-text-muted">{index + 1}</td>
                    <td className="p-3 space-y-1">
                      <strong className="block text-xs font-bold text-text-primary">
                        {item.title || 'Milestone chưa đặt tên'}
                      </strong>
                      {item.description && (
                        <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {formatGigCoin(item.amount)}
                    </td>
                    <td className="p-3 text-center font-semibold text-text-muted">
                      {item.estimatedDuration || '—'}
                    </td>
                    <td className="p-3">
                      {isFulfilled ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={12} /> Covered & Preserved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-black text-rose-500">
                          <XCircle size={12} /> Missing / Altered Scope
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-6 text-center text-xs text-text-muted italic">
                  Chưa có thông tin milestone chi tiết.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Requirement Scope Fulfillment Section: Belongs to Scope (15%) & Requirement Coverage (30%) */}
      {requirementFulfillment.length > 0 && (
        <div className="pt-4 border-t border-border/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-brand/5 border border-brand/20 p-3 rounded-xl">
            <div>
              <span className="block text-[11px] font-black uppercase text-brand tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-brand" />
                📋 Requirement Coverage (30%) & Milestone Scope (15%) Metric
              </span>
              <span className="text-[10px] font-semibold text-text-primary mt-0.5 block">
                Yêu cầu tính năng được đối soát bởi AI (Requirement Audit Checklist)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand/15 border border-brand/30 px-3 py-1 text-xs font-black text-brand shadow-2xs">
                Fulfillment: {fulfilledCount} / {totalReqs} Covered ({scopeCoveragePct.toFixed(0)}% Scope Coverage)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {requirementFulfillment.map((req, idx) => (
              <div
                key={idx}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                  req.is_fulfilled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}
              >
                {req.is_fulfilled ? (
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                ) : (
                  <XCircle size={14} className="text-rose-500 shrink-0" />
                )}
                <span>{req.requirement}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
