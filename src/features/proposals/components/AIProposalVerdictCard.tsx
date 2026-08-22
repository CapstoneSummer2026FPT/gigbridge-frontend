import {
  Flame,
  Zap,
  PiggyBank,
  AlertTriangle,
  Award,
  TrendingUp,
  CheckCircle2,
  HelpCircle,
  Percent,
} from 'lucide-react';
import type { ProposalDto } from '../../../types/models/Proposal';

export interface AIProposalVerdictCardProps {
  proposal: ProposalDto;
}

export function AIProposalVerdictCard({ proposal }: AIProposalVerdictCardProps) {
  const tq = proposal.aiTechnicalQualityScore ?? proposal.aiScore ?? 0;
  const vs = proposal.aiValueScore ?? tq;
  const badge = proposal.aiVerdictBadge || 'top_value';
  const band = proposal.aiQualityBand || (tq >= 90 ? 'Exceptional' : tq >= 75 ? 'Strong' : tq >= 60 ? 'Acceptable' : 'High Risk');
  const savingsPct = proposal.aiSavingsRatioPercent ?? 0;
  const scopePct = proposal.aiScopeCompletenessPercent ?? 100;

  // Try to parse detailed JSON if available
  let details: any = null;
  if (proposal.aiFullEvaluationJson) {
    try {
      details = JSON.parse(proposal.aiFullEvaluationJson);
    } catch {
      details = null;
    }
  }

  const pillarScores = details?.deterministic_calculations?.pillar_scores || {
    technical_solution: Math.round(tq * 0.95),
    screening_qa: Math.round(tq),
    financial_value: Math.round(Math.min(100, tq + savingsPct)),
    milestone_scope: Math.round(scopePct),
    authenticity_fluff: 90,
  };

  const probingQuestions: string[] = details?.llm_qualitative_evaluation?.probing_questions || [];

  const renderBadge = () => {
    switch (badge) {
      case 'top_value':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 px-3.5 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <Flame size={14} className="text-emerald-500 animate-pulse" />
            🔥 Top Value Candidate
          </span>
        );
      case 'top_technical':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/40 px-3.5 py-1 text-xs font-black text-purple-600 dark:text-purple-400 shadow-2xs">
            <Zap size={14} className="text-purple-500" />
            ⚡ Top Technical Expert
          </span>
        );
      case 'budget_saver':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 px-3.5 py-1 text-xs font-black text-amber-600 dark:text-amber-400 shadow-2xs">
            <PiggyBank size={14} className="text-amber-500" />
            💰 Budget Saver Candidate
          </span>
        );
      case 'high_risk':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/40 px-3.5 py-1 text-xs font-black text-rose-600 dark:text-rose-400 shadow-2xs">
            <AlertTriangle size={14} className="text-rose-500" />
            ⚠️ High Risk Candidate
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/5 via-surface-card/60 to-surface-card p-5 space-y-5 shadow-sm">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/15 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 shrink-0 font-black text-xl shadow-xs">
            {tq.toFixed(1)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-text-muted">Technical Quality</span>
              <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-black text-purple-700 dark:text-purple-300">
                {band}
              </span>
            </div>
            <p className="text-xs font-semibold text-text-primary mt-0.5">
              Value Score (VS): <strong className="text-brand font-black">{vs.toFixed(1)} / 100</strong>
            </p>
          </div>
        </div>

        {/* Verdict Badge */}
        <div>{renderBadge()}</div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl border border-border/50 bg-surface-muted/60 p-3 text-center">
          <span className="block text-[10px] font-black uppercase text-text-muted flex items-center justify-center gap-1">
            <Percent size={11} className="text-emerald-500" /> Savings
          </span>
          <strong className="text-emerald-600 dark:text-emerald-400 font-black text-base block mt-0.5">
            {savingsPct > 0 ? `${savingsPct.toFixed(1)}%` : '0%'}
          </strong>
        </div>

        <div className="rounded-xl border border-border/50 bg-surface-muted/60 p-3 text-center">
          <span className="block text-[10px] font-black uppercase text-text-muted flex items-center justify-center gap-1">
            <CheckCircle2 size={11} className="text-brand" /> Scope
          </span>
          <strong className="text-brand font-black text-base block mt-0.5">
            {scopePct.toFixed(0)}%
          </strong>
        </div>

        <div className="rounded-xl border border-border/50 bg-surface-muted/60 p-3 text-center">
          <span className="block text-[10px] font-black uppercase text-text-muted flex items-center justify-center gap-1">
            <Award size={11} className="text-purple-500" /> TQ Score
          </span>
          <strong className="text-purple-600 dark:text-purple-400 font-black text-base block mt-0.5">
            {tq.toFixed(1)}
          </strong>
        </div>
      </div>

      {/* 5-Pillar Score Visual Breakdown */}
      <div className="space-y-2.5 pt-1">
        <h4 className="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <TrendingUp size={13} className="text-purple-500" />
          5-Pillar Candidate Evaluation Breakdown
        </h4>

        <div className="space-y-2 text-xs">
          {/* Pillar 1 */}
          <div>
            <div className="flex justify-between text-[11px] font-bold mb-1">
              <span className="text-text-primary">🛠️ Technical Solution & Architecture (35%)</span>
              <span className="font-black text-purple-600 dark:text-purple-400">{pillarScores.technical_solution.toFixed(1)} / 100</span>
            </div>
            <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, pillarScores.technical_solution))}%` }}
              />
            </div>
          </div>

          {/* Pillar 2 */}
          <div>
            <div className="flex justify-between text-[11px] font-bold mb-1">
              <span className="text-text-primary">❓ Screening Q&A Accuracy & Reasoning (30%)</span>
              <span className="font-black text-amber-600 dark:text-amber-400">{pillarScores.screening_qa.toFixed(1)} / 100</span>
            </div>
            <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, pillarScores.screening_qa))}%` }}
              />
            </div>
          </div>

          {/* Pillar 3 */}
          <div>
            <div className="flex justify-between text-[11px] font-bold mb-1">
              <span className="text-text-primary">💰 Financial & Timeline Value (20%)</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">{pillarScores.financial_value.toFixed(1)} / 100</span>
            </div>
            <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, pillarScores.financial_value))}%` }}
              />
            </div>
          </div>

          {/* Pillar 4 */}
          <div>
            <div className="flex justify-between text-[11px] font-bold mb-1">
              <span className="text-text-primary">📋 Milestone Scope & Deliverables (10%)</span>
              <span className="font-black text-brand">{pillarScores.milestone_scope.toFixed(1)} / 100</span>
            </div>
            <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, pillarScores.milestone_scope))}%` }}
              />
            </div>
          </div>

          {/* Pillar 5 */}
          <div>
            <div className="flex justify-between text-[11px] font-bold mb-1">
              <span className="text-text-primary">🧠 Authenticity & Substance Density (5%)</span>
              <span className="font-black text-pink-600 dark:text-pink-400">{pillarScores.authenticity_fluff.toFixed(1)} / 100</span>
            </div>
            <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, pillarScores.authenticity_fluff))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Probing Questions for Client Interview */}
      {probingQuestions.length > 0 && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3.5 space-y-2 text-xs">
          <span className="font-black uppercase tracking-wider text-[10px] text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
            <HelpCircle size={13} /> Gợi ý câu hỏi khi đàm phán / phỏng vấn (AI Recommended Probing Questions)
          </span>
          <ul className="space-y-1.5 pl-4 list-disc text-text-primary font-medium">
            {probingQuestions.map((q, idx) => (
              <li key={idx} className="leading-relaxed">{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
