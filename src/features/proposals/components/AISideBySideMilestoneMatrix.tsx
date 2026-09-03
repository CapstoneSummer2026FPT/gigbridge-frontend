import {
  Layers,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  ShieldCheck,
  Edit3,
  PlusCircle,
  Trash2,
  Scale,
  FileText,
} from 'lucide-react';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import type { ProposalDetailDto, ProposalDto } from '../../../types/models/Proposal';
import { useTranslation } from '../../../hooks/useTranslation';

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

function sumMilestoneDurations(
  milestones: any[],
  t: (k: string, f: string, opt?: any) => string
): string | null {
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
  return rounded === 1
    ? t('milestoneMatrix.oneWeek', '1 tuần')
    : t('milestoneMatrix.weeksCount', '{{count}} tuần', { count: rounded });
}

export function AISideBySideMilestoneMatrix({
  detail,
  proposal,
  fullEvaluationJson,
  originalMilestones,
  jobPostBudgetMax,
  jobPostDuration,
}: AISideBySideMilestoneMatrixProps) {
  const { t } = useTranslation();

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
  const milestoneSumDuration = sumMilestoneDurations(milestones, t);

  const origMilestoneList: any[] = originalMilestones || jobBaseline?.original_milestones || [];
  const origMilestoneSumCost = origMilestoneList.reduce(
    (sum, m) => sum + (Number(m.amount) || 0),
    0
  );
  const origMilestoneSumDuration = sumMilestoneDurations(origMilestoneList, t);

  // Metrics for Financial & Timeline Comparison - Canonical Client Baseline
  const baselineBudgetMax =
    (jobPostBudgetMax && jobPostBudgetMax > 0 ? jobPostBudgetMax : 0) ||
    (jobBaseline?.budget_max && jobBaseline.budget_max > 0 ? jobBaseline.budget_max : 0) ||
    (jobBaseline?.budget_min && jobBaseline.budget_min > 0 ? jobBaseline.budget_min : 0) ||
    origMilestoneSumCost;

  const proposedBudget =
    proposal?.proposedBudget || proposalOffer?.proposed_budget || detail?.proposedBudget || 0;
  const savingsRatioPercent =
    proposal?.aiSavingsRatioPercent ?? deterministic?.savings_ratio_percent ?? 0;

  // Determine Client Original Budget string
  let clientBudgetDisplay = t('milestoneMatrix.budgetFlexible', 'Linh hoạt / Chưa chỉ định');

  if (baselineBudgetMax > 0) {
    clientBudgetDisplay = formatGigCoin(baselineBudgetMax);
  } else if (savingsRatioPercent > 0 && proposedBudget > 0) {
    const calculatedMax = Math.round(proposedBudget / (1 - savingsRatioPercent / 100));
    clientBudgetDisplay = formatGigCoin(calculatedMax);
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

  const isBaselineDurationSpecified =
    rawBaselineDuration &&
    rawBaselineDuration !== '—' &&
    rawBaselineDuration !== 'null' &&
    rawBaselineDuration.toLowerCase() !== 'flexible / unspecified';

  const baselineDuration = isBaselineDurationSpecified
    ? rawBaselineDuration
    : t('milestoneMatrix.durationFlexible', 'Linh hoạt / Chưa chỉ định');

  const rawProposedDuration =
    proposal?.proposedDuration || proposalOffer?.proposed_duration || detail?.proposedDuration;
  const proposedDuration =
    rawProposedDuration && rawProposedDuration !== '—'
      ? rawProposedDuration
      : milestoneSumDuration || '—';

  const baselineWeeks = isBaselineDurationSpecified ? parseDurationToWeeks(baselineDuration) : 0;
  const proposedWeeks = parseDurationToWeeks(proposedDuration);

  // Metrics for Requirement Scope Fulfillment
  const totalReqs = requirementFulfillment.length;
  const fulfilledCount = requirementFulfillment.filter((r) => r.is_fulfilled).length;
  const scopeCoveragePct =
    proposal?.aiScopeCompletenessPercent ??
    (totalReqs > 0 ? Math.round((fulfilledCount / totalReqs) * 100) : 100);

  // ── Construct Side-by-Side Milestone Compare Pairs ─────────────────────────
  interface ComparisonRow {
    id: string;
    index: number;
    status: 'Preserved' | 'Edited' | 'Added' | 'Deleted';
    changeSummary: string;
    client: {
      title: string;
      description?: string;
      amount: number | null;
      duration: string | null;
    } | null;
    freelancer: {
      title: string;
      description?: string;
      amount: number | null;
      duration: string | null;
    } | null;
    costDelta: number | null;
    costDeltaPct: number | null;
    durationDeltaText: string | null;
    durationFaster: boolean | null;
  }

  const comparisonRows: ComparisonRow[] = [];
  const usedFreelancerIndices = new Set<number>();

  // 1. Process Client Baseline Milestones
  origMilestoneList.forEach((orig, oIdx) => {
    const origTitle = (orig.title || orig.milestone_title || '').trim();
    const origAmount = orig.amount != null ? Number(orig.amount) : null;
    const origDur = orig.estimatedDuration || orig.estimated_duration || null;
    const origDesc = orig.description || orig.deliverables || '';

    let matchIdx = -1;
    for (let fIdx = 0; fIdx < milestones.length; fIdx++) {
      if (usedFreelancerIndices.has(fIdx)) continue;
      const f = milestones[fIdx];
      if ((orig.id && f.id && orig.id === f.id) || isTitleMatch(origTitle, f.title)) {
        matchIdx = fIdx;
        break;
      }
    }

    if (matchIdx !== -1) {
      usedFreelancerIndices.add(matchIdx);
      const f = milestones[matchIdx];
      const fAmount = f.amount != null ? Number(f.amount) : null;
      const fDur = f.estimatedDuration || (f as any).estimated_duration || null;
      const fDesc = f.description || (f as any).deliverables || '';

      const isPriceDiff = origAmount != null && fAmount != null && origAmount !== fAmount;
      const isDurDiff = Boolean(origDur && fDur && origDur.trim() !== fDur.trim());
      const isTitleDiff = origTitle.toLowerCase() !== (f.title || '').trim().toLowerCase();
      const isDescDiff = Boolean(origDesc || fDesc) && origDesc.trim() !== fDesc.trim();

      const changedFields: string[] = [];
      if (isTitleDiff) {
        changedFields.push(
          t('milestoneMatrix.diffTitle', `Tiêu đề ('{{from}}' → '{{to}}')`, {
            from: origTitle,
            to: f.title,
          })
        );
      }
      if (isPriceDiff && origAmount != null && fAmount != null) {
        changedFields.push(
          t('milestoneMatrix.diffPrice', `Chi phí ({{from}} → {{to}})`, {
            from: formatGigCoin(origAmount),
            to: formatGigCoin(fAmount),
          })
        );
      }
      if (isDurDiff) {
        changedFields.push(
          t('milestoneMatrix.diffDuration', `Thời gian ('{{from}}' → '{{to}}')`, {
            from: origDur,
            to: fDur,
          })
        );
      }
      if (isDescDiff) {
        changedFields.push(t('milestoneMatrix.diffDesc', 'Nội dung bàn giao'));
      }

      const auditItem = milestoneAudit.find(
        (a: any) =>
          isTitleMatch(a.milestone_title || a.title, f.title) ||
          isTitleMatch(a.milestone_title || a.title, origTitle)
      );

      const status: 'Preserved' | 'Edited' =
        changedFields.length > 0 ? 'Edited' : auditItem?.status || 'Preserved';
      const changeSummary =
        auditItem?.change_summary ||
        (changedFields.length > 0
          ? `${t('milestoneMatrix.editedLabel', 'Điều chỉnh')}: ${changedFields.join(', ')}`
          : t('milestoneMatrix.preservedSummary', 'Baseline milestone được giữ nguyên chuẩn xác'));

      let costDelta: number | null = null;
      let costDeltaPct: number | null = null;
      if (origAmount != null && fAmount != null) {
        costDelta = fAmount - origAmount;
        if (origAmount > 0) {
          costDeltaPct = ((fAmount - origAmount) / origAmount) * 100;
        }
      }

      let durationDeltaText: string | null = null;
      let durationFaster: boolean | null = null;
      const origW = parseDurationToWeeks(origDur);
      const fW = parseDurationToWeeks(fDur);
      if (origW > 0 && fW > 0) {
        const diff = fW - origW;
        if (diff < 0) {
          durationFaster = true;
          durationDeltaText = t('milestoneMatrix.fasterBy', 'Nhanh hơn {{weeks}} tuần', {
            weeks: Math.abs(Math.round(diff * 10) / 10),
          });
        } else if (diff > 0) {
          durationFaster = false;
          durationDeltaText = t('milestoneMatrix.slowerBy', 'Thêm {{weeks}} tuần', {
            weeks: Math.round(diff * 10) / 10,
          });
        } else {
          durationDeltaText = t('milestoneMatrix.onTime', 'Bằng chuẩn');
        }
      }

      comparisonRows.push({
        id: f.id || `paired-${oIdx}`,
        index: comparisonRows.length + 1,
        status,
        changeSummary,
        client: {
          title: origTitle || `${t('milestoneMatrix.milestonePrefix', 'Mốc')} ${oIdx + 1}`,
          description: origDesc,
          amount: origAmount,
          duration: origDur,
        },
        freelancer: {
          title: f.title || `${t('milestoneMatrix.milestonePrefix', 'Mốc')} ${matchIdx + 1}`,
          description: fDesc,
          amount: fAmount,
          duration: fDur,
        },
        costDelta,
        costDeltaPct,
        durationDeltaText,
        durationFaster,
      });
    } else {
      // Client milestone was omitted / deleted
      const auditItem = milestoneAudit.find(
        (a: any) => a.status === 'Deleted' && isTitleMatch(a.milestone_title || a.title, origTitle)
      );

      comparisonRows.push({
        id: `deleted-${oIdx}`,
        index: comparisonRows.length + 1,
        status: 'Deleted',
        changeSummary:
          auditItem?.change_summary ||
          t(
            'milestoneMatrix.omittedSummary',
            `Mốc '{{title}}' bị lược bỏ khỏi đề xuất của Freelancer`,
            { title: origTitle }
          ),
        client: {
          title: origTitle || `${t('milestoneMatrix.milestonePrefix', 'Mốc')} ${oIdx + 1}`,
          description: origDesc,
          amount: origAmount,
          duration: origDur,
        },
        freelancer: null,
        costDelta: origAmount != null ? -origAmount : null,
        costDeltaPct: -100,
        durationDeltaText: null,
        durationFaster: null,
      });
    }
  });

  // 2. Remaining freelancer milestones that were not matched (Added by freelancer)
  milestones.forEach((f, fIdx) => {
    if (usedFreelancerIndices.has(fIdx)) return;
    const fAmount = f.amount != null ? Number(f.amount) : null;
    const fDur = f.estimatedDuration || (f as any).estimated_duration || null;
    const fDesc = f.description || (f as any).deliverables || '';

    const auditItem = milestoneAudit.find(
      (a: any) => a.status === 'Added' && isTitleMatch(a.milestone_title || a.title, f.title)
    );

    comparisonRows.push({
      id: f.id || `added-${fIdx}`,
      index: comparisonRows.length + 1,
      status: 'Added',
      changeSummary:
        auditItem?.change_summary ||
        t(
          'milestoneMatrix.addedSummary',
          'Mốc công việc mới do freelancer bổ sung nhằm tối ưu giải pháp'
        ),
      client: null,
      freelancer: {
        title: f.title || `${t('milestoneMatrix.milestonePrefix', 'Mốc')} ${fIdx + 1}`,
        description: fDesc,
        amount: fAmount,
        duration: fDur,
      },
      costDelta: fAmount,
      costDeltaPct: null,
      durationDeltaText: null,
      durationFaster: null,
    });
  });

  // Count milestone mutation metrics
  const preservedCount = comparisonRows.filter((r) => r.status === 'Preserved').length;
  const editedCount = comparisonRows.filter((r) => r.status === 'Edited').length;
  const addedCount = comparisonRows.filter((r) => r.status === 'Added').length;
  const deletedCount = comparisonRows.filter((r) => r.status === 'Deleted').length;

  const totalClientCost = origMilestoneSumCost || baselineBudgetMax;
  const totalFreelancerCost = milestones.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalCostDiff = totalFreelancerCost - totalClientCost;

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-xs">
      {/* ── Table Section Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h4 className="text-sm sm:text-base font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
            <Scale size={18} className="text-brand shrink-0" />
            <span>
              {t(
                'milestoneMatrix.title',
                'So sánh Milestone: Client Baseline vs. Freelancer Proposal'
              )}
            </span>
          </h4>
          <p className="text-xs text-text-muted mt-1 font-normal">
            {t(
              'milestoneMatrix.subtitle',
              'Bảng đối soát Side-by-Side so sánh từng mốc công việc giữa yêu cầu gốc và kế hoạch thực thi đề xuất'
            )}
          </p>
        </div>

        {/* Mutation Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-black">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted border border-border px-2.5 py-1 text-text-primary">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span>
              {t('milestoneMatrix.preservedCount', '{{count}} Giữ nguyên', {
                count: preservedCount,
              })}
            </span>
          </span>
          {editedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted border border-border px-2.5 py-1 text-text-primary">
              <Edit3 size={12} className="text-amber-500" />
              <span>
                {t('milestoneMatrix.editedCount', '{{count}} Điều chỉnh', { count: editedCount })}
              </span>
            </span>
          )}
          {addedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted border border-border px-2.5 py-1 text-text-primary">
              <PlusCircle size={12} className="text-brand" />
              <span>
                {t('milestoneMatrix.addedCount', '{{count}} Bổ sung', { count: addedCount })}
              </span>
            </span>
          )}
          {deletedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted border border-border px-2.5 py-1 text-text-primary">
              <Trash2 size={12} className="text-rose-500" />
              <span>
                {t('milestoneMatrix.deletedCount', '{{count}} Lược bỏ', { count: deletedCount })}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* ── Side-by-Side Summary KPI Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs sm:text-sm">
        {/* Card 1: Budget Comparison */}
        <div className="rounded-2xl border border-border bg-surface-muted/50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-black text-xs uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <DollarSign size={14} className="text-brand shrink-0" />
              {t('milestoneMatrix.budgetCompare', 'So sánh Ngân sách (GC)')}
            </span>
            {baselineBudgetMax > 0 && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-black border ${
                  savingsRatioPercent > 0
                    ? 'bg-surface border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'bg-surface border-border text-text-primary'
                }`}
              >
                {savingsRatioPercent > 0
                  ? t('milestoneMatrix.budgetSavings', 'Tiết kiệm {{pct}}%', {
                      pct: savingsRatioPercent.toFixed(1),
                    })
                  : t('milestoneMatrix.budgetOnTarget', 'Theo ngân sách chuẩn')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-surface border border-border space-y-1">
              <span className="block text-[11px] font-bold text-text-muted uppercase">
                {t('milestoneMatrix.clientBaseline', 'Client Baseline')}
              </span>
              <strong className="text-text-primary font-black text-sm sm:text-base block truncate">
                {clientBudgetDisplay}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-surface border border-border space-y-1">
              <span className="block text-[11px] font-bold text-text-muted uppercase">
                {t('milestoneMatrix.freelancerOffer', 'Freelancer Offer')}
              </span>
              <strong className="text-text-primary font-black text-sm sm:text-base block truncate">
                {formatGigCoin(proposedBudget)}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 2: Timeline Comparison */}
        <div className="rounded-2xl border border-border bg-surface-muted/50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-black text-xs uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Clock size={14} className="text-brand shrink-0" />
              {t('milestoneMatrix.timelineCompare', 'So sánh Thời hạn (Timeline)')}
            </span>
            {baselineWeeks > 0 && proposedWeeks > 0 && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-black border ${
                  baselineWeeks > proposedWeeks
                    ? 'bg-surface border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : baselineWeeks < proposedWeeks
                    ? 'bg-surface border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'bg-surface border-border text-text-primary'
                }`}
              >
                {baselineWeeks > proposedWeeks
                  ? t('milestoneMatrix.timelineFaster', 'Nhanh hơn {{weeks}} tuần', {
                      weeks: (baselineWeeks - proposedWeeks).toFixed(1),
                    })
                  : baselineWeeks < proposedWeeks
                  ? t('milestoneMatrix.timelineSlower', 'Thêm {{weeks}} tuần', {
                      weeks: (proposedWeeks - baselineWeeks).toFixed(1),
                    })
                  : t('milestoneMatrix.timelineOnTarget', 'Đúng tiến độ')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-surface border border-border space-y-1">
              <span className="block text-[11px] font-bold text-text-muted uppercase">
                {t('milestoneMatrix.clientTarget', 'Client Target')}
              </span>
              <strong className="text-text-primary font-black text-sm sm:text-base block truncate">
                {baselineDuration}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-surface border border-border space-y-1">
              <span className="block text-[11px] font-bold text-text-muted uppercase">
                {t('milestoneMatrix.freelancerTarget', 'Freelancer Target')}
              </span>
              <strong className="text-text-primary font-black text-sm sm:text-base block truncate">
                {proposedDuration}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 3: Scope Fulfillment */}
        <div className="rounded-2xl border border-border bg-surface-muted/50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-black text-xs uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-brand shrink-0" />
              {t('milestoneMatrix.scopeFulfillment', 'Độ bao phủ tính năng')}
            </span>
            <span className="rounded-full bg-surface border border-brand px-2.5 py-0.5 text-xs font-black text-text-primary">
              {t('milestoneMatrix.scopeCompleted', '{{pct}}% Hoàn thành', {
                pct: scopeCoveragePct.toFixed(0),
              })}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface border border-border flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="block text-[11px] font-bold text-text-muted uppercase">
                {t('milestoneMatrix.criteriaQualified', 'Tiêu chí đạt chuẩn')}
              </span>
              <strong className="text-text-primary font-black text-sm sm:text-base">
                {fulfilledCount} / {totalReqs || milestones.length}{' '}
                {t('milestoneMatrix.itemsLabel', 'Hạng mục')}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-text-muted block">
                {t('milestoneMatrix.aiVerdictLabel', 'Đánh giá AI:')}
              </span>
              <span className="text-xs font-black text-text-primary">
                {scopeCoveragePct >= 80
                  ? t('milestoneMatrix.aiVerdictFull', 'Bao phủ đầy đủ')
                  : t('milestoneMatrix.aiVerdictReview', 'Cần rà soát bổ sung')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── True Side-by-Side Milestone Table Compare ────────────────────────── */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[860px] text-left text-xs sm:text-sm border-collapse">
          {/* Column Group Header */}
          <thead>
            <tr className="border-b border-border bg-surface-muted text-xs font-black uppercase text-text-primary">
              <th className="p-3.5 w-12 text-center text-text-muted">#</th>
              <th className="p-3.5 w-5/12 border-r border-border">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-text-primary">
                    <FileText size={14} className="text-brand shrink-0" />
                    {t('milestoneMatrix.thClient', 'MỐC BAN ĐẦU (CLIENT BASELINE)')}
                  </span>
                  <span className="text-[10px] font-extrabold text-text-muted bg-surface px-2 py-0.5 rounded border border-border">
                    {t('milestoneMatrix.thOriginalReq', 'Yêu cầu gốc')}
                  </span>
                </div>
              </th>
              <th className="p-3.5 w-5/12 border-r border-border">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-text-primary">
                    <Layers size={14} className="text-brand shrink-0" />
                    {t('milestoneMatrix.thFreelancer', 'ĐỀ XUẤT FREELANCER (PROPOSAL)')}
                  </span>
                  <span className="text-[10px] font-extrabold text-text-muted bg-surface px-2 py-0.5 rounded border border-border">
                    {t('milestoneMatrix.thPlan', 'Kế hoạch thực thi')}
                  </span>
                </div>
              </th>
              <th className="p-3.5 w-2/12 text-center">
                <span>{t('milestoneMatrix.thAudit', 'ĐỐI SOÁT AI (VERDICT)')}</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {comparisonRows.length > 0 ? (
              comparisonRows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-muted/30 transition-colors">
                  {/* # Index */}
                  <td className="p-3.5 text-center font-bold text-text-muted align-top">
                    {row.index}
                  </td>

                  {/* ── Client Baseline Side ── */}
                  <td className="p-3.5 border-r border-border align-top space-y-2">
                    {row.client ? (
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <strong className="text-text-primary font-black text-sm block leading-snug">
                            {row.client.title}
                          </strong>
                          {row.client.amount != null && (
                            <span className="shrink-0 font-mono font-black text-xs text-text-primary bg-surface-muted border border-border px-2 py-0.5 rounded">
                              {formatGigCoin(row.client.amount)}
                            </span>
                          )}
                        </div>

                        {row.client.description && (
                          <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                            {row.client.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[11px] font-bold text-text-muted pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            <span>
                              {row.client.duration ||
                                t('milestoneMatrix.noDuration', 'Chưa định thời hạn')}
                            </span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl border border-dashed border-border bg-surface-muted/40 text-center space-y-1">
                        <span className="text-xs italic text-text-muted flex items-center justify-center gap-1">
                          <PlusCircle size={13} className="text-brand" />
                          <span>
                            {t('milestoneMatrix.newMilestoneAdded', 'Mốc mới do Freelancer bổ sung')}
                          </span>
                        </span>
                        <p className="text-[11px] text-text-muted">
                          {t(
                            'milestoneMatrix.noBaselineMatch',
                            '(Không có mốc tương ứng trong yêu cầu gốc của khách hàng)'
                          )}
                        </p>
                      </div>
                    )}
                  </td>

                  {/* ── Freelancer Proposal Side ── */}
                  <td className="p-3.5 border-r border-border align-top space-y-2">
                    {row.freelancer ? (
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <strong className="text-text-primary font-black text-sm block leading-snug">
                            {row.freelancer.title}
                          </strong>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {row.freelancer.amount != null && (
                              <span className="font-mono font-black text-xs text-text-primary bg-surface-muted border border-border px-2 py-0.5 rounded">
                                {formatGigCoin(row.freelancer.amount)}
                              </span>
                            )}
                            {/* Cost Delta Tag */}
                            {row.costDelta !== null && row.costDelta !== 0 && (
                              <span
                                className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded border ${
                                  row.costDelta < 0
                                    ? 'bg-surface border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-surface border-rose-500 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {row.costDelta < 0
                                  ? `-${formatGigCoin(Math.abs(row.costDelta))}`
                                  : `+${formatGigCoin(row.costDelta)}`}
                              </span>
                            )}
                          </div>
                        </div>

                        {row.freelancer.description && (
                          <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                            {row.freelancer.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-text-muted pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            <span>
                              {row.freelancer.duration ||
                                t('milestoneMatrix.noDuration', 'Chưa định thời hạn')}
                            </span>
                          </span>
                          {row.durationDeltaText && (
                            <span
                              className={`rounded px-1.5 py-0.2 border ${
                                row.durationFaster === true
                                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                  : row.durationFaster === false
                                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                  : 'border-border text-text-muted'
                              }`}
                            >
                              {row.durationDeltaText}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl border border-dashed border-rose-500/30 bg-rose-500/5 text-center space-y-1">
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1">
                          <Trash2 size={13} />
                          <span>
                            {t('milestoneMatrix.milestoneOmitted', 'Mốc bị lược bỏ trong đề xuất')}
                          </span>
                        </span>
                        <p className="text-[11px] text-text-muted">
                          {t(
                            'milestoneMatrix.noPlanInProposal',
                            '(Ứng viên không lên kế hoạch thực thi cho mốc ban đầu này)'
                          )}
                        </p>
                      </div>
                    )}
                  </td>

                  {/* ── AI Audit & Status Verdict ── */}
                  <td className="p-3.5 text-center align-top space-y-2">
                    {row.status === 'Preserved' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted border border-border px-3 py-1 text-xs font-black text-text-primary">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        <span>{t('milestoneMatrix.preserved', 'Giữ nguyên')}</span>
                      </span>
                    ) : row.status === 'Added' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted border border-border px-3 py-1 text-xs font-black text-text-primary">
                        <PlusCircle size={13} className="text-brand" />
                        <span>{t('milestoneMatrix.added', 'Bổ sung mới')}</span>
                      </span>
                    ) : row.status === 'Deleted' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted border border-border px-3 py-1 text-xs font-black text-text-primary">
                        <Trash2 size={13} className="text-rose-500" />
                        <span>{t('milestoneMatrix.deleted', 'Đã lược bỏ')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted border border-border px-3 py-1 text-xs font-black text-text-primary">
                        <Edit3 size={13} className="text-amber-500" />
                        <span>{t('milestoneMatrix.edited', 'Điều chỉnh')}</span>
                      </span>
                    )}

                    {row.changeSummary && (
                      <p className="text-[11px] text-text-muted font-medium text-left leading-relaxed bg-surface-muted/60 p-2 rounded-lg border border-border/60">
                        {row.changeSummary}
                      </p>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-sm text-text-muted italic">
                  {t(
                    'milestoneMatrix.noMilestones',
                    'Chưa có thông tin milestone chi tiết từ đề xuất của ứng viên.'
                  )}
                </td>
              </tr>
            )}
          </tbody>

          {/* ── Comparison Table Footer Summary ── */}
          {comparisonRows.length > 0 && (
            <tfoot className="border-t-2 border-border bg-surface-muted/70 font-black text-xs sm:text-sm">
              <tr>
                <td className="p-3.5 text-center text-text-muted">∑</td>
                {/* Client Total */}
                <td className="p-3.5 border-r border-border">
                  <div className="flex items-center justify-between">
                    <span className="uppercase text-text-muted font-black text-xs">
                      {t('milestoneMatrix.totalBaseline', 'Tổng Baseline:')}
                    </span>
                    <div className="text-right">
                      <span className="font-mono font-black text-text-primary text-sm block">
                        {totalClientCost > 0 ? formatGigCoin(totalClientCost) : clientBudgetDisplay}
                      </span>
                      <span className="text-[10px] text-text-muted font-bold block">
                        {baselineDuration}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Freelancer Total */}
                <td className="p-3.5 border-r border-border">
                  <div className="flex items-center justify-between">
                    <span className="uppercase text-text-muted font-black text-xs">
                      {t('milestoneMatrix.totalProposal', 'Tổng Đề xuất:')}
                    </span>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="font-mono font-black text-text-primary text-sm">
                          {formatGigCoin(totalFreelancerCost || proposedBudget)}
                        </span>
                        {totalCostDiff !== 0 && totalClientCost > 0 && (
                          <span
                            className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded border ${
                              totalCostDiff < 0
                                ? 'bg-surface border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                : 'bg-surface border-rose-500 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {totalCostDiff < 0
                              ? t('milestoneMatrix.totalSavings', 'Tiết kiệm {{amount}}', {
                                  amount: formatGigCoin(Math.abs(totalCostDiff)),
                                })
                              : t('milestoneMatrix.totalOver', 'Vượt {{amount}}', {
                                  amount: formatGigCoin(totalCostDiff),
                                })}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-text-muted font-bold block">
                        {proposedDuration}
                      </span>
                    </div>
                  </div>
                </td>

                {/* AI Scope Coverage Summary */}
                <td className="p-3.5 text-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface border border-brand px-2.5 py-0.5 text-xs font-black text-text-primary">
                    <CheckCircle2 size={12} className="text-brand" />
                    <span>
                      {t('milestoneMatrix.scopeCovered', '{{covered}}/{{total}} Scope', {
                        covered: fulfilledCount,
                        total: totalReqs || milestones.length,
                      })}
                    </span>
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Requirement Scope Fulfillment Section (Checklist) ───────────────── */}
      {requirementFulfillment.length > 0 && (
        <div className="pt-4 border-t border-border space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-muted/60 border border-border p-3.5 rounded-2xl">
            <div>
              <span className="block text-xs sm:text-sm font-black uppercase text-text-primary tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand shrink-0" />
                <span>
                  {t(
                    'milestoneMatrix.checklistTitle',
                    'Kiểm định phạm vi tính năng (Requirement Audit Checklist)'
                  )}
                </span>
              </span>
              <span className="text-xs font-medium text-text-muted mt-0.5 block">
                {t(
                  'milestoneMatrix.checklistSubtitle',
                  'Bảng rà soát chi tiết từng yêu cầu kỹ thuật của dự án so với nội dung đề xuất và milestone'
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-surface border border-border px-3.5 py-1 text-xs font-black text-text-primary shadow-2xs">
                {t(
                  'milestoneMatrix.checklistFulfilled',
                  '{{count}} / {{total}} Yêu cầu đạt chuẩn ({{pct}}%)',
                  {
                    count: fulfilledCount,
                    total: totalReqs,
                    pct: scopeCoveragePct.toFixed(0),
                  }
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs sm:text-sm">
            {requirementFulfillment.map((req, idx) => {
              const evidence = req.evidence_quote || req.note;
              const matchedMs = req.matched_milestone;

              return (
                <div
                  key={idx}
                  className="flex flex-col gap-2 p-3.5 rounded-2xl border border-border bg-surface text-xs sm:text-sm font-bold transition-all shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {req.is_fulfilled ? (
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle size={18} className="text-rose-500 shrink-0" />
                      )}
                      <span className="font-black text-xs sm:text-sm text-text-primary">
                        {req.requirement}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {matchedMs && (
                        <span className="rounded-full bg-surface-muted border border-border text-text-primary px-3 py-0.5 text-xs font-black shrink-0">
                          {t('milestoneMatrix.matchedMilestone', 'Mốc liên kết: {{ms}}', {
                            ms: matchedMs,
                          })}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-black border ${
                          req.is_fulfilled
                            ? 'bg-surface border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'bg-surface border-rose-500 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {req.is_fulfilled
                          ? t('milestoneMatrix.statusQualified', 'Đạt chuẩn')
                          : t('milestoneMatrix.statusNotMet', 'Chưa đáp ứng')}
                      </span>
                    </div>
                  </div>

                  {/* Evidence Quote Box */}
                  {evidence && (
                    <div className="mt-1 p-3 rounded-xl text-xs font-normal leading-relaxed border border-border bg-surface-muted/50 text-text-primary">
                      <span className="font-black uppercase text-[11px] tracking-wider block mb-1 text-text-muted flex items-center gap-1.5">
                        <FileText size={12} className="text-brand shrink-0" />
                        <span>
                          {req.is_fulfilled
                            ? t(
                                'milestoneMatrix.evidenceQuote',
                                'Bằng chứng trích dẫn từ đề xuất'
                              )
                            : t(
                                'milestoneMatrix.missingScopeGap',
                                'Lý do chưa đáp ứng yêu cầu'
                              )}
                        </span>
                      </span>
                      <p className="italic text-xs font-medium">
                        "{evidence.replace(/^"|"$/g, '')}"
                      </p>
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
