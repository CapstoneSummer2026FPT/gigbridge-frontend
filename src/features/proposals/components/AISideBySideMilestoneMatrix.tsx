import { Layers, CheckCircle2, XCircle } from 'lucide-react';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import type { ProposalDetailDto } from '../../../types/models/Proposal';

export interface AISideBySideMilestoneMatrixProps {
  detail: ProposalDetailDto | null;
  fullEvaluationJson?: string | null;
}

export function AISideBySideMilestoneMatrix({ detail, fullEvaluationJson }: AISideBySideMilestoneMatrixProps) {
  let requirementFulfillment: any[] = [];
  if (fullEvaluationJson) {
    try {
      const parsed = JSON.parse(fullEvaluationJson);
      requirementFulfillment = parsed?.llm_qualitative_evaluation?.requirement_fulfillment || [];
    } catch {
      requirementFulfillment = [];
    }
  }

  const milestones = detail?.milestonePlans || [];

  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-surface-card/60 p-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
          <Layers size={16} className="text-brand" />
          <span>So sánh Milestone: Client Baseline vs. Freelancer Proposal</span>
        </h4>
        <span className="rounded-full bg-brand/10 border border-brand/20 px-3 py-0.5 text-[11px] font-black text-brand">
          Side-by-Side Audit
        </span>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-surface-muted/60 text-[10px] font-black uppercase text-text-muted tracking-wider">
              <th className="p-3">#</th>
              <th className="p-3">Kế hoạch Freelancer đề xuất (Edited Plan)</th>
              <th className="p-3 text-right">Chi phí GC</th>
              <th className="p-3 text-center">Thời gian</th>
              <th className="p-3">AI Scope Audit & Fulfillment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {milestones.length > 0 ? (
              milestones.map((item, index) => {
                // Find matching requirement audit item
                const reqAudit = requirementFulfillment.find(
                  r => r.matched_milestone?.toLowerCase() === item.title?.toLowerCase() || index === 0
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

      {/* Requirement Fulfillment Map Badges */}
      {requirementFulfillment.length > 0 && (
        <div className="pt-3 border-t border-border/60 space-y-2">
          <span className="block text-[10px] font-black uppercase text-text-muted tracking-wider">
            Yêu cầu tính năng được đối soát bởi AI (Requirement Audit Checklist)
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            {requirementFulfillment.map((req, idx) => (
              <div
                key={idx}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold ${
                  req.is_fulfilled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}
              >
                {req.is_fulfilled ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                <span>{req.requirement}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
