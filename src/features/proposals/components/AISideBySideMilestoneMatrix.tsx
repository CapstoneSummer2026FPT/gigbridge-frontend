import { Layers, CheckCircle2, XCircle, DollarSign, Clock, ShieldCheck, Percent, Info, Edit3, PlusCircle, Trash2 } from 'lucide-react';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import type { ProposalDetailDto, ProposalDto } from '../../../types/models/Proposal';
import { getCriteriaColorTheme } from '../utils/criteriaColors';

export interface AISideBySideMilestoneMatrixProps {
  detail: ProposalDetailDto | null;
  proposal?: ProposalDto | null;
  fullEvaluationJson?: string | null;
  originalMilestones?: any[] | null;
  jobPostBudgetMax?: number | null;
  jobPostDuration?: string | null;
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

function isTitleMatch(titleA?: string | null, titleB?: string | null): boolean {
  if (!titleA || !titleB) return false;
  const a = titleA.trim().toLowerCase();
  const b = titleB.trim().toLowerCase();
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4) {
    if (a.includes(b) || b.includes(a)) return true;
  }
  return false;
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
  originalMilestones,
  jobPostBudgetMax,
  jobPostDuration,
}: AISideBySideMilestoneMatrixProps) {
  let requirementFulfillment: any[] = [];
  let milestoneAudit: any[] = [];
  let jobBaseline: any = null;
  let proposalOffer: any = null;
  let deterministic: any = null;

  const rawJson = fullEvaluationJson || proposal?.aiFullEvaluationJson;
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      requirementFulfillment = parsed?.llm_qualitative_evaluation?.requirement_fulfillment || [];
      milestoneAudit = parsed?.llm_qualitative_evaluation?.milestone_audit || [];
      jobBaseline = parsed?.job_post_baseline || null;
      proposalOffer = parsed?.proposal_offer || null;
      deterministic = parsed?.deterministic_calculations || null;
    } catch {
      requirementFulfillment = [];
      milestoneAudit = [];
    }
  }

  const milestones = detail?.milestonePlans || [];
  const milestoneSumDuration = sumMilestoneDurations(milestones);

  const origMilestoneList: any[] = originalMilestones || jobBaseline?.original_milestones || [];
  const origMilestoneSumCost = origMilestoneList.reduce(
    (sum, m) => sum + (Number(m.amount) || 0),
    0
  );
  const origMilestoneSumDuration = sumMilestoneDurations(origMilestoneList);

  // Metrics for Financial & Timeline Comparison - CANONICAL CLIENT BASELINE RESOLUTION
  const baselineBudgetMax =
    (jobPostBudgetMax && jobPostBudgetMax > 0 ? jobPostBudgetMax : 0) ||
    (jobBaseline?.budget_max && jobBaseline.budget_max > 0 ? jobBaseline.budget_max : 0) ||
    (jobBaseline?.budget_min && jobBaseline.budget_min > 0 ? jobBaseline.budget_min : 0) ||
    origMilestoneSumCost;

  const proposedBudget =
    proposal?.proposedBudget || proposalOffer?.proposed_budget || detail?.proposedBudget || 0;
  const savingsRatioPercent =
    proposal?.aiSavingsRatioPercent ?? deterministic?.savings_ratio_percent ?? 0;

  // Determine Client Original Budget string strictly without defaulting to proposedBudget
  let clientBudgetDisplay = 'Flexible / Unspecified';
  let budgetBadgeLabel = '🎯 Baseline Unspecified';
  let budgetBadgeStyle = 'bg-surface-muted text-text-muted border-border/60';

  if (baselineBudgetMax > 0) {
    clientBudgetDisplay = formatGigCoin(baselineBudgetMax);
    if (savingsRatioPercent > 0) {
      budgetBadgeLabel = `🟢 ${savingsRatioPercent.toFixed(1)}% Savings`;
      budgetBadgeStyle = 'bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border-emerald-500/60';
    } else {
      budgetBadgeLabel = '🎯 0% Savings (On Budget)';
      budgetBadgeStyle = 'bg-blue-500/25 text-blue-900 dark:text-blue-200 border-blue-500/60';
    }
  } else if (savingsRatioPercent > 0 && proposedBudget > 0) {
    const calculatedMax = Math.round(proposedBudget / (1 - savingsRatioPercent / 100));
    clientBudgetDisplay = formatGigCoin(calculatedMax);
    budgetBadgeLabel = `🟢 ${savingsRatioPercent.toFixed(1)}% Savings`;
    budgetBadgeStyle = 'bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border-emerald-500/60';
  } else {
    // Client did not set explicit budget max or milestone amounts
    clientBudgetDisplay = 'Flexible / Unspecified';
    budgetBadgeLabel = '🎯 Baseline Unspecified';
    budgetBadgeStyle = 'bg-surface-muted text-text-muted border-border/60';
  }

  const rawBaselineDuration =
    (jobPostDuration && jobPostDuration !== '—' && jobPostDuration !== 'null'
      ? jobPostDuration
      : null) ||
    (jobBaseline?.estimated_duration &&
    jobBaseline.estimated_duration !== '—' &&
    jobBaseline.estimated_duration !== 'null'
      ? jobBaseline.estimated_duration
      : null) ||
    origMilestoneSumDuration;

  // Strictly assign baselineDuration without falling back to milestoneSumDuration (which is freelancer data)
  const isBaselineDurationSpecified =
    rawBaselineDuration &&
    rawBaselineDuration !== '—' &&
    rawBaselineDuration !== 'null' &&
    rawBaselineDuration.toLowerCase() !== 'flexible / unspecified';

  const baselineDuration = isBaselineDurationSpecified
    ? rawBaselineDuration
    : 'Flexible / Unspecified';

  const rawProposedDuration =
    proposal?.proposedDuration || proposalOffer?.proposed_duration || detail?.proposedDuration;
  const proposedDuration =
    rawProposedDuration && rawProposedDuration !== '—'
      ? rawProposedDuration
      : milestoneSumDuration || '—';

  const baselineWeeks = isBaselineDurationSpecified ? parseDurationToWeeks(baselineDuration) : 0;
  const proposedWeeks = parseDurationToWeeks(proposedDuration);

  let timelineBadgeLabel = '⏱️ Baseline Unspecified';
  let timelineBadgeStyle = 'bg-surface-muted text-text-muted border-border/60 text-xs font-black shadow-xs px-3 py-1';

  if (baselineWeeks > 0 && proposedWeeks > 0) {
    const diffPct = ((baselineWeeks - proposedWeeks) / baselineWeeks) * 100;
    const roundedPct = Math.abs(Math.round(diffPct * 10) / 10);
    const weekDiff = Math.abs(Math.round((baselineWeeks - proposedWeeks) * 10) / 10);

    if (diffPct > 0) {
      timelineBadgeLabel = `⚡ ${roundedPct}% Faster (Saved ${weekDiff} wks)`;
      timelineBadgeStyle = 'bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border border-emerald-500/60 text-xs font-black shadow-xs px-3 py-1';
    } else if (diffPct < 0) {
      timelineBadgeLabel = `⏳ Exceeds Target (+${weekDiff} wks)`;
      timelineBadgeStyle = 'bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/60 text-xs font-black shadow-xs px-3 py-1';
    } else {
      timelineBadgeLabel = `⏱️ On Target (Exact ${baselineWeeks} wks)`;
      timelineBadgeStyle = 'bg-blue-500/25 text-blue-900 dark:text-blue-200 border border-blue-500/60 text-xs font-black shadow-xs px-3 py-1';
    }
  }

  // Metrics for Requirement Scope Fulfillment
  const totalReqs = requirementFulfillment.length;
  const fulfilledCount = requirementFulfillment.filter((r) => r.is_fulfilled).length;
  const scopeCoveragePct =
    proposal?.aiScopeCompletenessPercent ??
    (totalReqs > 0 ? Math.round((fulfilledCount / totalReqs) * 100) : 100);

  // Calculate Milestone Table Footer Sums
  const totalMilestoneCost = milestones.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  let totalMilestoneWeeks = 0;
  for (const m of milestones) {
    totalMilestoneWeeks += parseDurationToWeeks(m.estimatedDuration || (m as any).estimated_duration);
  }
  const roundedWeeks = Math.round(totalMilestoneWeeks * 10) / 10;
  const totalMilestoneDurationStr = roundedWeeks > 0 ? (roundedWeeks === 1 ? '1 week' : `${roundedWeeks} weeks`) : proposedDuration;

  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-surface-card/60 p-4 sm:p-6 shadow-2xs">
      {/* Table Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3.5">
        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
          <Layers size={18} className="text-brand shrink-0" />
          <span>So sánh Milestone: Client Baseline vs. Freelancer Proposal</span>
        </h4>
        <span className="rounded-full bg-brand/10 border border-brand/20 px-3.5 py-0.5 text-xs font-black text-brand">
          Side-by-Side Audit
        </span>
      </div>

      {/* Metric Ownership & Evidence Banner: Financial Value & Timeline Feasibility */}
      <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-surface-card p-3.5 sm:p-4 space-y-2.5 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-black text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-500 shrink-0" />
            💰 Financial Value (20%) & ⏱️ Timeline Feasibility (20%) Audit
          </span>
          <span className="text-xs font-extrabold text-text-muted bg-surface-card px-3 py-0.5 rounded-full border border-border/40">
            Supports Top Metric Evidence
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm pt-1">
          {/* Budget Comparison Card (Original vs Freelancer Propose) */}
          <div className="rounded-xl bg-surface-card border border-border/60 p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-xs sm:text-sm font-black uppercase text-text-muted flex items-center gap-1.5">
                <Percent size={15} className="text-emerald-500 shrink-0" /> Budget Savings Comparison
              </span>
              <span
                className={`px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-black shadow-xs border ${budgetBadgeStyle}`}
              >
                {budgetBadgeLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
              <div className="bg-surface-muted/50 p-2.5 sm:p-3 rounded-xl border border-border/40 text-center space-y-0.5">
                <span className="block text-[10px] sm:text-xs font-bold text-text-muted uppercase">Original Client Budget</span>
                <strong className="text-text-primary font-black text-sm sm:text-lg block">
                  {clientBudgetDisplay}
                </strong>
              </div>

              <div className="bg-emerald-500/10 p-2.5 sm:p-3 rounded-xl border border-emerald-500/30 text-center space-y-0.5">
                <span className="block text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">Freelancer Proposed</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm sm:text-lg block">
                  {formatGigCoin(proposedBudget)}
                </strong>
              </div>
            </div>
          </div>

          {/* Duration & Time Savings Comparison Card */}
          <div className="rounded-xl bg-surface-card border border-border/60 p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-xs sm:text-sm font-black uppercase text-text-muted flex items-center gap-1.5">
                <Clock size={15} className="text-blue-500 shrink-0" /> Duration & Time Savings
              </span>
              <span className={`rounded-full text-xs sm:text-sm ${timelineBadgeStyle}`}>
                {timelineBadgeLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
              <div className="bg-surface-muted/50 p-2.5 sm:p-3 rounded-xl border border-border/40 text-center space-y-0.5">
                <span className="block text-[10px] sm:text-xs font-bold text-text-muted uppercase">Original Client Target</span>
                <strong className="text-text-primary font-black text-sm sm:text-base block">
                  {baselineDuration}
                </strong>
              </div>

              <div className="bg-blue-500/10 p-2.5 sm:p-3 rounded-xl border border-blue-500/30 text-center space-y-0.5">
                <span className="block text-[10px] sm:text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">Freelancer Proposed</span>
                <strong className="text-blue-600 dark:text-blue-400 font-black text-sm sm:text-base block">
                  {proposedDuration}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Milestone Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-surface-muted/60 text-xs font-black uppercase text-text-muted tracking-wider">
              <th className="p-3.5">#</th>
              <th className="p-3.5">Kế hoạch Freelancer đề xuất (Edited Plan)</th>
              <th className="p-3.5 text-right">
                <span className="flex items-center justify-end gap-1">
                  💰 Chi phí GC
                </span>
              </th>
              <th className="p-3.5 text-center">
                <span className="flex items-center justify-center gap-1">
                  ⏱️ Thời gian
                </span>
              </th>
              <th className="p-3.5">
                <span className="flex items-center gap-1">
                  📋 AI Scope Audit & Fulfillment
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {milestones.length > 0 ? (
              milestones.map((item, index) => {
                const itemTitle = (item.title || '').trim();
                const itemTitleLower = itemTitle.toLowerCase();
                const origMilestones: any[] = originalMilestones || jobBaseline?.original_milestones || [];

                // Find matching baseline milestone strictly by title similarity (NO positional index fallback!)
                const matchedOrig = origMilestones.find(
                  (o: any) => isTitleMatch(o.title || o.milestone_title, itemTitle)
                );

                // Find matching milestone audit item strictly by title similarity
                const auditItem = milestoneAudit.find(
                  (a: any) => isTitleMatch(a.milestone_title || a.title, itemTitle)
                );

                let status: string = 'Preserved';
                let changeSummary: string = '';

                if (matchedOrig) {
                  const isPriceChanged = Number(matchedOrig.amount) !== Number(item.amount);
                  const isDurChanged =
                    (matchedOrig.estimated_duration || matchedOrig.estimatedDuration || '').trim() !==
                    (item.estimatedDuration || (item as any).estimated_duration || '').trim();
                  const isTitleChanged = (matchedOrig.title || '').trim().toLowerCase() !== itemTitleLower;

                  const origDesc = (matchedOrig.description || matchedOrig.deliverables || '').trim();
                  const itemDesc = (item.description || (item as any).deliverables || '').trim();
                  const isDescChanged = Boolean(origDesc || itemDesc) && origDesc !== itemDesc;

                  const changedFields: string[] = [];
                  if (isTitleChanged) changedFields.push(`Tiêu đề ('${matchedOrig.title}' → '${itemTitle}')`);
                  if (isPriceChanged) changedFields.push(`Chi phí (${formatGigCoin(matchedOrig.amount)} → ${formatGigCoin(item.amount)})`);
                  if (isDurChanged) changedFields.push(`Thời gian ('${matchedOrig.estimated_duration || matchedOrig.estimatedDuration || '—'}' → '${item.estimatedDuration || (item as any).estimated_duration || '—'}')`);
                  if (isDescChanged) changedFields.push('Mô tả / sản phẩm bàn giao');

                  if (changedFields.length > 0) {
                    status = 'Edited';
                    changeSummary = auditItem?.change_summary || `Điều chỉnh: ${changedFields.join(', ')}`;
                  } else {
                    status = auditItem?.status || 'Preserved';
                    changeSummary = auditItem?.change_summary || 'Baseline milestone preserved';
                  }
                } else if (auditItem && auditItem.status && isTitleMatch(auditItem.milestone_title || auditItem.title, itemTitle)) {
                  status = auditItem.status;
                  changeSummary = auditItem.change_summary || '';
                } else if (origMilestones.length > 0) {
                  status = 'Added';
                  changeSummary = 'Hạng mục milestone mới do freelancer đề xuất bổ sung';
                } else {
                  status = 'Preserved';
                }

                return (
                  <tr key={item.id || index} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="p-3.5 font-bold text-text-muted">{index + 1}</td>
                    <td className="p-3.5 space-y-1">
                      <strong className="block text-sm sm:text-base font-bold text-text-primary">
                        {item.title || 'Milestone chưa đặt tên'}
                      </strong>
                      {item.description && (
                        <p className="text-xs sm:text-sm text-text-muted leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {changeSummary && status !== 'Preserved' && (
                        <p className={`text-xs font-medium px-2.5 py-0.5 rounded-md inline-block mt-1 border ${
                          status === 'Added'
                            ? 'text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 border-cyan-500/20'
                            : status === 'Deleted'
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
                            : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
                        }`}>
                          💡 {changeSummary}
                        </p>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                      {formatGigCoin(item.amount)}
                    </td>
                    <td className="p-3.5 text-center font-semibold text-xs sm:text-sm text-text-muted">
                      {item.estimatedDuration || '—'}
                    </td>
                    <td className="p-3.5">
                      {status === 'Preserved' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={13} /> Covered & Preserved
                        </span>
                      ) : status === 'Added' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-0.5 text-xs font-black text-cyan-700 dark:text-cyan-300">
                          <PlusCircle size={13} /> Freelancer Added
                        </span>
                      ) : status === 'Deleted' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-0.5 text-xs font-black text-rose-500">
                          <Trash2 size={13} /> Freelancer Deleted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-xs font-black text-amber-700 dark:text-amber-300">
                          <Edit3 size={13} /> Freelancer Edited
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-text-muted italic">
                  Chưa có thông tin milestone chi tiết.
                </td>
              </tr>
            )}

            {/* Deleted Baseline Milestones */}
            {(() => {
              const origMilestones: any[] = originalMilestones || jobBaseline?.original_milestones || [];
              const list: Array<{ milestone_title: string; change_summary: string }> = [];
              const processedTitles = new Set<string>();

              milestoneAudit
                .filter((a: any) => a.status === 'Deleted')
                .forEach((a: any) => {
                  const title = a.milestone_title || a.title || '';
                  if (title) {
                    list.push({
                      milestone_title: title,
                      change_summary: a.change_summary || 'Hạng mục milestone bị bỏ qua so với kế hoạch ban đầu',
                    });
                    processedTitles.add(title.toLowerCase().trim());
                  }
                });

              if (origMilestones.length > 0) {
                origMilestones.forEach((orig: any) => {
                  const origTitle = (orig.title || orig.milestone_title || '').trim();
                  if (!origTitle) return;

                  const isMatchedInProposed = milestones.some((m: any) =>
                    isTitleMatch(m.title, origTitle)
                  );

                  if (!isMatchedInProposed && !processedTitles.has(origTitle.toLowerCase())) {
                    list.push({
                      milestone_title: origTitle,
                      change_summary: `Hạng mục baseline '${origTitle}' đã bị bỏ qua / xóa bởi freelancer`,
                    });
                    processedTitles.add(origTitle.toLowerCase());
                  }
                });
              }

              if (list.length === 0) return null;
              return list.map((del: any, dIdx: number) => (
                <tr key={`del-${dIdx}`} className="bg-rose-500/5 hover:bg-rose-500/10 transition-colors">
                  <td className="p-3.5 font-bold text-rose-400">❌</td>
                  <td className="p-3.5 space-y-1">
                    <strong className="block text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 line-through">
                      {del.milestone_title}
                    </strong>
                    <p className="text-xs italic text-rose-500">
                      💡 {del.change_summary || 'Hạng mục milestone bị bỏ qua so với kế hoạch ban đầu'}
                    </p>
                  </td>
                  <td className="p-3.5 text-right font-black text-text-muted italic">—</td>
                  <td className="p-3.5 text-center font-semibold text-text-muted italic">—</td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-0.5 text-xs font-black text-rose-500">
                      <Trash2 size={13} /> Freelancer Deleted
                    </span>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
          {/* Recruiter Summary Footer: Sum of Milestone Cost and Duration */}
          {milestones.length > 0 && (
            <tfoot className="border-t-2 border-border/80 bg-surface-muted/80 font-black text-xs sm:text-sm">
              <tr>
                <td className="p-3.5 text-text-muted">∑</td>
                <td className="p-3.5 text-text-primary uppercase tracking-wider font-black">
                  <span>TỔNG CỘNG MILESTONES (TOTAL PROPOSAL)</span>
                </td>
                <td className="p-3.5 text-right">
                  <span className="inline-block rounded-lg bg-emerald-500/15 px-3 py-1 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black text-xs sm:text-sm">
                    {formatGigCoin(totalMilestoneCost || proposedBudget)}
                  </span>
                  <span className="block text-[10px] sm:text-xs font-extrabold text-text-muted mt-0.5">
                    = Proposed Budget
                  </span>
                </td>
                <td className="p-3.5 text-center">
                  <span className="inline-block rounded-lg bg-blue-500/15 px-3 py-1 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-black text-xs sm:text-sm">
                    {totalMilestoneDurationStr}
                  </span>
                  <span className="block text-[10px] sm:text-xs font-extrabold text-text-muted mt-0.5">
                    = Proposed Duration
                  </span>
                </td>
                <td className="p-3.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 border border-brand/20 px-3 py-0.5 text-xs font-extrabold text-brand">
                    <CheckCircle2 size={12} /> {fulfilledCount}/{totalReqs || milestones.length} Scope Covered
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Recruiter Total Milestone Guidance Box */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs sm:text-sm font-medium text-text-primary flex items-start gap-2.5">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <span>
          <strong>Recruiter Guidance:</strong> Individual milestone items sum up directly to{' '}
          <strong className="text-emerald-600 dark:text-emerald-400 font-black">{formatGigCoin(totalMilestoneCost || proposedBudget)}</strong>{' '}
          and <strong className="text-blue-600 dark:text-blue-400 font-black">{totalMilestoneDurationStr}</strong> total duration, matching the overall proposal totals evaluated in the Financial & Timeline Audit above.
        </span>
      </div>

      {/* Requirement Scope Fulfillment Section: Belongs to Scope (15%) & Requirement Coverage (30%) */}
      {requirementFulfillment.length > 0 && (
        <div className="pt-4 border-t border-border/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-brand/5 border border-brand/20 p-3.5 rounded-xl">
            <div>
              <span className="block text-xs sm:text-sm font-black uppercase text-brand tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand shrink-0" />
                📋 Requirement Coverage (30%) & Milestone Scope (15%) Metric
              </span>
              <span className="text-xs font-semibold text-text-primary mt-0.5 block">
                Yêu cầu tính năng được đối soát bởi AI (Requirement Audit Checklist)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand/15 border border-brand/30 px-3.5 py-1 text-xs sm:text-sm font-black text-brand shadow-2xs">
                Fulfillment: {fulfilledCount} / {totalReqs} Covered ({scopeCoveragePct.toFixed(0)}% Scope Coverage)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs sm:text-sm">
            {requirementFulfillment.map((req, idx) => {
              const evidence = req.evidence_quote || req.note;
              const matchedMs = req.matched_milestone;
              const theme = getCriteriaColorTheme(idx);

              return (
                <div
                  key={idx}
                  className={`flex flex-col gap-2 p-3.5 rounded-xl border text-xs sm:text-sm font-bold transition-all shadow-2xs ${
                    req.is_fulfilled
                      ? `${theme.cardBg} ${theme.cardBorder} text-text-primary`
                      : 'bg-rose-500/10 border-rose-500/30 text-text-primary'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {req.is_fulfilled ? (
                        <CheckCircle2 size={18} className={`${theme.cardText} shrink-0`} />
                      ) : (
                        <XCircle size={18} className="text-rose-500 shrink-0" />
                      )}
                      <span className="font-black text-xs sm:text-sm text-text-primary">{req.requirement}</span>
                    </div>

                    {matchedMs && (
                      <span className={`rounded-full ${theme.pillBg} text-white px-3 py-0.5 text-xs font-black shadow-2xs shrink-0`}>
                        📍 Matched: {matchedMs}
                      </span>
                    )}
                  </div>

                  {/* Highlighted Evidence Quote Box */}
                  {evidence && (
                    <div className={`mt-1 p-3 rounded-lg text-xs sm:text-sm font-normal leading-relaxed border ${
                      req.is_fulfilled
                        ? `bg-surface-card ${theme.cardBorder} ${theme.cardText}`
                        : 'bg-surface-card border-rose-500/30 text-rose-800 dark:text-rose-300'
                    }`}>
                      <span className="font-sans font-black uppercase text-xs tracking-wider block mb-1 opacity-90 flex items-center gap-1">
                        💬 {req.is_fulfilled ? 'Evidence Proof Quote (From Proposal/Milestones)' : 'Missing Scope Gap Explanation'}
                      </span>
                      <p className="italic font-sans text-xs sm:text-sm">"{evidence.replace(/^"|"$/g, '')}"</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
