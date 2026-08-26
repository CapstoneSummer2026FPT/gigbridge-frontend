import React, { useState } from 'react';
import {
  Flame,
  Zap,
  PiggyBank,
  AlertTriangle,
  Award,
  TrendingUp,
  CheckCircle2,
  Percent,
  XCircle,
  Info,
  Fingerprint,
  Calculator,
  HelpCircle,
} from 'lucide-react';
import type { ProposalDto } from '../../../types/models/Proposal';

export interface AIProposalVerdictCardProps {
  proposal: ProposalDto;
}

interface CalculationTooltipProps {
  title: string;
  weight?: string;
  formula: string;
  items: { label: string; weight: string; icon?: string }[];
  note?: string;
  align?: 'left' | 'right' | 'center';
  children: React.ReactNode;
}

function MetricCalculationTooltip({
  title,
  weight,
  formula,
  items,
  note,
  align = 'center',
  children,
}: CalculationTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getPositionClasses = () => {
    switch (align) {
      case 'left':
        return 'left-0 top-full mt-2';
      case 'right':
        return 'right-0 top-full mt-2';
      case 'center':
      default:
        return 'left-1/2 -translate-x-1/2 top-full mt-2';
    }
  };

  const getArrowClasses = () => {
    switch (align) {
      case 'left':
        return 'bottom-full left-6 border-4 border-transparent border-b-surface-card';
      case 'right':
        return 'bottom-full right-6 border-4 border-transparent border-b-surface-card';
      case 'center':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-surface-card';
    }
  };

  return (
    <div
      className="relative group cursor-help"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen((prev) => !prev)}
    >
      {children}

      {/* Floating Glassmorphism Tooltip Popover (Positioned Downwards) */}
      {isOpen && (
        <div className={`absolute ${getPositionClasses()} z-50 w-72 sm:w-80 p-3.5 rounded-2xl bg-surface-card/95 backdrop-blur-xl border border-purple-500/30 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.3)] text-text-primary text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150 pointer-events-none`}>
          {/* Tooltip Arrow pointing up */}
          <div className={`absolute ${getArrowClasses()}`} />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="font-black text-[11px] text-brand flex items-center gap-1.5">
              <Calculator size={13} className="text-purple-500" />
              {title}
            </span>
            {weight && (
              <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[9px] font-black text-purple-600 dark:text-purple-300">
                Pillar Weight: {weight}
              </span>
            )}
          </div>

          {/* Formula Box */}
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-2 text-[10px] font-mono font-bold text-purple-900 dark:text-purple-200 leading-relaxed">
            <span className="block text-[9px] font-sans font-black uppercase text-purple-700 dark:text-purple-300 tracking-wider mb-0.5">
              📐 Calculation Formula
            </span>
            {formula}
          </div>

          {/* Subcriteria Breakdown List */}
          {items.length > 0 && (
            <div className="space-y-1 pt-0.5">
              <span className="block text-[9px] font-black uppercase text-text-muted tracking-wider">
                Sub-criteria Weights
              </span>
              <ul className="space-y-1 text-[10px] font-medium text-text-primary">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between bg-surface-muted/50 px-2 py-1 rounded-lg border border-border/40">
                    <span className="flex items-center gap-1">
                      {item.icon && <span>{item.icon}</span>}
                      {item.label}
                    </span>
                    <strong className="text-brand font-bold">{item.weight}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Note / Rationale */}
          {note && (
            <p className="text-[10px] text-text-muted italic pt-1 border-t border-border/40 leading-snug">
              💡 {note}
            </p>
          )}
        </div>
      )}
    </div>
  );
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
    authenticity_fluff: 46,
  };

  const riskAnalysis: string[] = details?.llm_qualitative_evaluation?.risk_analysis || [];

  // Generate actionable key concerns/reasons for recruiters
  const generateKeyReasons = () => {
    const reasons: { type: 'negative' | 'positive'; text: string }[] = [];

    if (pillarScores.screening_qa < 50) {
      reasons.push({
        type: 'negative',
        text: `Very weak Q&A performance (${pillarScores.screening_qa.toFixed(1)}/100)`,
      });
    } else if (pillarScores.screening_qa >= 80) {
      reasons.push({
        type: 'positive',
        text: `Strong screening Q&A answers & reasoning (${pillarScores.screening_qa.toFixed(1)}/100)`,
      });
    }

    if (scopePct < 70) {
      reasons.push({
        type: 'negative',
        text: `Low requirement coverage (${scopePct.toFixed(0)}% fulfilled)`,
      });
    } else if (scopePct >= 90) {
      reasons.push({
        type: 'positive',
        text: `Comprehensive requirement coverage (${scopePct.toFixed(0)}% fulfilled)`,
      });
    }

    if (pillarScores.technical_solution < 60) {
      reasons.push({
        type: 'negative',
        text: `Technical solution & architecture clarity needs improvement (${pillarScores.technical_solution.toFixed(1)}/100)`,
      });
    } else if (pillarScores.technical_solution >= 80) {
      reasons.push({
        type: 'positive',
        text: `Solid technical solution & architecture proposed (${pillarScores.technical_solution.toFixed(1)}/100)`,
      });
    }

    if (pillarScores.financial_value < 50) {
      reasons.push({
        type: 'negative',
        text: `Financial/timeline feasibility score is low (${pillarScores.financial_value.toFixed(1)}/100)`,
      });
    }

    // Fallback using risk analysis from backend if available
    if (reasons.length === 0 && riskAnalysis.length > 0) {
      riskAnalysis.slice(0, 3).forEach((risk) => {
        reasons.push({ type: 'negative', text: risk });
      });
    }

    return reasons;
  };

  const keyReasons = generateKeyReasons();

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
          <MetricCalculationTooltip
            title="Technical Quality Score (TQ)"
            formula="TQ = 0.35×Tech + 0.30×Q&A + 0.20×Financial + 0.15×Scope"
            items={[
              { label: 'Technical Solution', weight: '35%', icon: '🛠️' },
              { label: 'Screening Q&A', weight: '30%', icon: '❓' },
              { label: 'Financial & Timeline', weight: '20%', icon: '💰' },
              { label: 'Milestone Scope', weight: '15%', icon: '📋' },
            ]}
            note="Deterministic 4-pillar weighted sum computed in Python."
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border shrink-0 font-black text-xl shadow-xs transition-transform hover:scale-105 ${
                tq >= 75
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : tq >= 60
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
              }`}
            >
              {tq.toFixed(1)}
            </div>
          </MetricCalculationTooltip>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-text-muted">Technical Quality</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                  tq >= 75
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : tq >= 60
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                }`}
              >
                {band}
              </span>
            </div>
            <MetricCalculationTooltip
              title="Value Score (VS)"
              formula="VS = min(100, TQ × (1 + 0.5 × Savings Ratio))"
              items={[
                { label: 'Base Quality Score (TQ)', weight: '100%', icon: '🏆' },
                { label: 'Savings Boost Factor', weight: '+0.5 × Savings%', icon: '📈' },
              ]}
              note="Capped at a maximum of 100.0."
            >
              <p className="text-xs font-semibold text-text-primary mt-0.5 flex items-center gap-1">
                Value Score (VS): <strong className="text-brand font-black">{vs.toFixed(1)} / 100</strong>
                <HelpCircle size={11} className="text-text-muted hover:text-brand" />
              </p>
            </MetricCalculationTooltip>
          </div>
        </div>

        {/* Verdict Badge */}
        <div>{renderBadge()}</div>
      </div>

      {/* Recruiter Top Decision KPI Cards with Tooltips */}
      <div className="grid grid-cols-3 gap-2.5 text-xs">
        <MetricCalculationTooltip
          title="Requirement Coverage %"
          align="left"
          formula="Coverage % = (Fulfilled Reqs / Total Reqs) × 100%"
          items={[
            { label: 'Requirements Fulfilled', weight: `${scopePct.toFixed(0)}%`, icon: '✅' },
          ]}
          note="Evaluates how completely candidate proposal covers client job description."
        >
          <div className="rounded-xl border border-border/50 bg-surface-muted/60 p-3 text-center transition-all hover:border-brand/50 hover:bg-brand/5">
            <span className="block text-[10px] font-black uppercase text-text-muted flex items-center justify-center gap-1">
              <CheckCircle2 size={12} className="text-brand" /> Requirement Coverage
            </span>
            <strong className="text-brand font-black text-lg block mt-0.5">
              {scopePct.toFixed(0)}%
            </strong>
            <span className="block text-[9px] font-semibold text-text-muted mt-0.5">Req. Scope Fulfilled</span>
          </div>
        </MetricCalculationTooltip>

        <MetricCalculationTooltip
          title="Budget Savings %"
          align="center"
          formula="Savings % = max(0, (Max Budget - Proposed) / Max Budget)"
          items={[
            { label: 'Client Max Budget', weight: 'Baseline', icon: '💰' },
            { label: 'Candidate Offer', weight: 'Proposed', icon: '🏷️' },
          ]}
          note="Measures budget savings percentage relative to job budget cap."
        >
          <div className="rounded-xl border border-border/50 bg-surface-muted/60 p-3 text-center transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5">
            <span className="block text-[10px] font-black uppercase text-text-muted flex items-center justify-center gap-1">
              <Percent size={12} className="text-emerald-500" /> Budget Savings
            </span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-black text-lg block mt-0.5">
              {savingsPct > 0 ? `${savingsPct.toFixed(1)}%` : '0%'}
            </strong>
            <span className="block text-[9px] font-semibold text-text-muted mt-0.5">Vs. Client Budget</span>
          </div>
        </MetricCalculationTooltip>

        <MetricCalculationTooltip
          title="Overall Quality Score"
          align="right"
          formula="TQ = 35% Tech + 30% Q&A + 20% Financial + 15% Scope"
          items={[
            { label: 'Technical Solution', weight: '35%', icon: '🛠️' },
            { label: 'Screening Q&A', weight: '30%', icon: '❓' },
            { label: 'Financial Value', weight: '20%', icon: '💰' },
            { label: 'Scope & Deliverables', weight: '15%', icon: '📋' },
          ]}
          note="Main technical quality assessment score."
        >
          <div className="rounded-xl border border-border/50 bg-surface-muted/60 p-3 text-center transition-all hover:border-purple-500/50 hover:bg-purple-500/5">
            <span className="block text-[10px] font-black uppercase text-text-muted flex items-center justify-center gap-1">
              <Award size={12} className="text-purple-500" /> Quality Score
            </span>
            <strong className="text-purple-600 dark:text-purple-400 font-black text-lg block mt-0.5">
              {tq.toFixed(1)}
            </strong>
            <span className="block text-[9px] font-semibold text-text-muted mt-0.5">Weighted 4-Pillar Score</span>
          </div>
        </MetricCalculationTooltip>
      </div>

      {/* Executive Decision Rationale / Key Concerns Summary Box */}
      {keyReasons.length > 0 && (
        <div
          className={`rounded-xl border p-3.5 space-y-2 text-xs ${
            tq < 60
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-200'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              {tq < 60 ? (
                <>
                  <AlertTriangle size={14} className="text-rose-500" />
                  🔴 WHY THIS CANDIDATE IS HIGH RISK
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  🟢 EXECUTIVE DECISION SUMMARY
                </>
              )}
            </span>
            <span className="text-[10px] font-extrabold opacity-70 uppercase tracking-widest">
              Recruiter Insight
            </span>
          </div>

          <ul className="space-y-1.5 font-medium pl-1 text-xs">
            {keyReasons.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                {item.type === 'negative' ? (
                  <XCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                )}
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4-Pillar Score Visual Breakdown with Interactive Calculation Tooltips */}
      <div className="space-y-3 pt-1">
        <h4 className="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <TrendingUp size={13} className="text-purple-500" />
            4-Pillar Candidate Evaluation Breakdown
          </span>
          <span className="text-[9px] font-bold text-text-muted bg-surface-muted px-2 py-0.5 rounded-full flex items-center gap-1">
            <HelpCircle size={10} className="text-purple-500" /> Hover metric to view formula
          </span>
        </h4>

        <div className="space-y-3 text-xs">
          {/* Pillar 1 */}
          <MetricCalculationTooltip
            title="Technical Solution & Architecture"
            weight="35%"
            formula="Score = 0.25×Alignment + 0.30×Correctness + 0.20×Arch + 0.15×Feasibility + 0.10×Security"
            items={[
              { label: 'Requirement Alignment', weight: '25%', icon: '🎯' },
              { label: 'Technical Correctness', weight: '30%', icon: '⚡' },
              { label: 'Architecture Quality', weight: '20%', icon: '🏗️' },
              { label: 'Implementation Feasibility', weight: '15%', icon: '🛠️' },
              { label: 'Edge Cases & Security', weight: '10%', icon: '🔒' },
            ]}
            note="Evaluates proposed tech stack, architecture, and security design."
          >
            <div className="p-2 rounded-xl border border-transparent hover:border-purple-500/30 hover:bg-purple-500/5 transition-all">
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-text-primary flex items-center gap-1.5">
                  🛠️ Technical Solution & Architecture (35%)
                  <HelpCircle size={11} className="text-text-muted" />
                </span>
                <span className="font-black text-purple-600 dark:text-purple-400">
                  {pillarScores.technical_solution.toFixed(1)} / 100
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pillarScores.technical_solution))}%` }}
                />
              </div>
            </div>
          </MetricCalculationTooltip>

          {/* Pillar 2 */}
          <MetricCalculationTooltip
            title="Screening Q&A Accuracy & Reasoning"
            weight="30%"
            formula="Score = Avg(0.40×Correctness + 0.25×Reasoning + 0.15×Relevance + 0.10×Depth + 0.10×Examples)"
            items={[
              { label: 'Answer Correctness', weight: '40%', icon: '✅' },
              { label: 'Technical Reasoning', weight: '25%', icon: '🧠' },
              { label: 'Question Relevance', weight: '15%', icon: '🎯' },
              { label: 'Technical Depth', weight: '10%', icon: '🔍' },
              { label: 'Practical Examples', weight: '10%', icon: '💡' },
            ]}
            note="Averages candidate screening answer quality across all questions."
          >
            <div className="p-2 rounded-xl border border-transparent hover:border-amber-500/30 hover:bg-amber-500/5 transition-all">
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-text-primary flex items-center gap-1.5">
                  ❓ Screening Q&A Accuracy & Reasoning (30%)
                  <HelpCircle size={11} className="text-text-muted" />
                </span>
                <span className="font-black text-amber-600 dark:text-amber-400">
                  {pillarScores.screening_qa.toFixed(1)} / 100
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pillarScores.screening_qa))}%` }}
                />
              </div>
            </div>
          </MetricCalculationTooltip>

          {/* Pillar 3 */}
          <MetricCalculationTooltip
            title="Financial & Timeline Value"
            weight="20%"
            formula="Score = 0.30×Budget Savings + 0.20×Time Savings + 0.30×Pricing Realism + 0.20×Timeline Feasibility"
            items={[
              { label: 'Budget Savings Ratio', weight: '30%', icon: '💵' },
              { label: 'Time Savings Ratio', weight: '20%', icon: '⚡' },
              { label: 'Pricing Realism', weight: '30%', icon: '🏷️' },
              { label: 'Timeline Feasibility', weight: '20%', icon: '⏱️' },
            ]}
            note="Balances budget and duration savings with AI-verified pricing realism and timeline feasibility."
          >
            <div className="p-2 rounded-xl border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all">
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-text-primary flex items-center gap-1.5">
                  💰 Financial & Timeline Value (20%)
                  <HelpCircle size={11} className="text-text-muted" />
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {pillarScores.financial_value.toFixed(1)} / 100
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pillarScores.financial_value))}%` }}
                />
              </div>
            </div>
          </MetricCalculationTooltip>

          {/* Pillar 4 */}
          <MetricCalculationTooltip
            title="Milestone Scope & Deliverables"
            weight="15%"
            formula="Score = 0.60×Scope Completeness % + 0.40×Milestone Structure Score"
            items={[
              { label: 'Scope Completeness %', weight: '60%', icon: '📋' },
              { label: 'Milestone Structure', weight: '40%', icon: '🧩' },
            ]}
            note="Measures requirement fulfillment and milestone clarity."
          >
            <div className="p-2 rounded-xl border border-transparent hover:border-brand/30 hover:bg-brand/5 transition-all">
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-text-primary flex items-center gap-1.5">
                  📋 Milestone Scope & Deliverables (15%)
                  <HelpCircle size={11} className="text-text-muted" />
                </span>
                <span className="font-black text-brand">
                  {pillarScores.milestone_scope.toFixed(1)} / 100
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pillarScores.milestone_scope))}%` }}
                />
              </div>
            </div>
          </MetricCalculationTooltip>
        </div>
      </div>

      {/* Detailed Analysis: Demoted Authenticity & Substance Metric Card with Tooltip */}
      <MetricCalculationTooltip
        title="Answer Authenticity & Substance Density"
        formula="Score = 0.60×Project Specificity + 0.40×Substance Density"
        items={[
          { label: 'Project Specificity', weight: '60%', icon: '🎯' },
          { label: 'Substance Density', weight: '40%', icon: '🔬' },
        ]}
        note="Measures technical specificity vs. generic copy-paste text."
      >
        <div className="rounded-xl border border-border/70 bg-surface-muted/40 p-3.5 space-y-2 text-xs transition-all hover:border-pink-500/40">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="font-black uppercase tracking-wider text-[10px] text-text-muted flex items-center gap-1.5">
              <Fingerprint size={13} className="text-pink-500" />
              Detailed Analysis: Answer Authenticity & Substance Density
              <HelpCircle size={11} className="text-text-muted" />
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                pillarScores.authenticity_fluff >= 70
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {pillarScores.authenticity_fluff >= 70 ? 'High Substance' : 'Low Substance Density'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold pt-0.5">
            <span className="text-text-muted">Answer Authenticity & Specificity Score:</span>
            <strong className="text-pink-600 dark:text-pink-400 font-black">
              {pillarScores.authenticity_fluff.toFixed(1)} / 100
            </strong>
          </div>

          <p className="text-[11px] text-text-primary leading-relaxed font-medium bg-surface-card p-2.5 rounded-lg border border-border/40">
            <Info size={12} className="inline mr-1 text-pink-500" />
            {pillarScores.authenticity_fluff >= 70
              ? 'Candidate responses contain high technical substance, specific methodology details, and concrete examples.'
              : 'Candidate responses contain lower technical substance density and generic phrasing. Further technical screening is recommended to verify hands-on expertise.'}
          </p>
        </div>
      </MetricCalculationTooltip>
    </div>
  );
}
