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
  Sparkles,
} from 'lucide-react';
import type { ProposalDto } from '../../../types/models/Proposal';
import '../../../shared/components/styles/conic-border-button.css';

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
        <div className={`absolute ${getPositionClasses()} z-50 w-72 sm:w-80 p-3.5 rounded-2xl bg-surface-card/95 backdrop-blur-xl border border-brand/30 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.3)] text-text-primary text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150 pointer-events-none`}>
          {/* Tooltip Arrow pointing up */}
          <div className={`absolute ${getArrowClasses()}`} />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="font-black text-[11px] text-brand flex items-center gap-1.5">
              <Calculator size={13} className="text-brand" />
              {title}
            </span>
            {weight && (
              <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[9px] font-black text-brand">
                Pillar Weight: {weight}
              </span>
            )}
          </div>

          {/* Formula Box */}
          <div className="rounded-xl bg-brand/10 border border-brand/20 p-2 text-[10px] font-mono font-bold text-brand leading-relaxed">
            <span className="block text-[9px] font-sans font-black uppercase text-brand tracking-wider mb-0.5">
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
        text: `Solution methodology & requirement alignment needs improvement (${pillarScores.technical_solution.toFixed(1)}/100)`,
      });
    } else if (pillarScores.technical_solution >= 80) {
      reasons.push({
        type: 'positive',
        text: `Solid solution methodology & requirement alignment proposed (${pillarScores.technical_solution.toFixed(1)}/100)`,
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

  // Extract AI pillar comment from JSON or generate smart per-subcriteria fallback explanation
  const getPillarComment = (
    pillarKey: 'technical_solution' | 'screening_qa' | 'financial_value' | 'milestone_scope',
    score: number
  ): string => {
    const rawComments = details?.llm_qualitative_evaluation?.pillar_comments;
    if (rawComments && rawComments[pillarKey]) {
      return rawComments[pillarKey];
    }

    // Dynamic smart per-subcriteria fallback generation in English (matching UI headers & candidate English answers)
    switch (pillarKey) {
      case 'technical_solution':
        if (score >= 80) {
          return '• Requirement Alignment (25%): Proposal introduction aligns closely with job description requirements.\n• Problem Analysis (25%): Demonstrates deep domain understanding and accurate technical analysis.\n• Solution Architecture (25%): Proposes a clear, well-structured workflow and system design.\n• Deliverables (15%): Comprehensive breakdown of tangible project outputs.\n• Scope Boundaries (10%): Clearly specifies project assumptions and out-of-scope exclusions.';
        }
        if (score >= 60) {
          return '• Requirement Alignment (25%): Basic alignment with core job requirements.\n• Problem Analysis (25%): Problem breakdown is reasonable but remains high-level.\n• Solution Architecture (25%): Standard execution methodology proposed.\n• Deliverables (15%): Deliverables are described at an average depth.\n• Scope Boundaries (10%): Project scope boundaries require further technical clarification.';
        }
        return '• Requirement Alignment (25%): Generic introduction with weak requirement alignment.\n• Problem Analysis (25%): Lacks detailed domain analysis or technical problem breakdown.\n• Solution Architecture (25%): Superficial solution approach lacking concrete tools/methods.\n• Deliverables (15%): Brief or vague deliverable descriptions.\n• Scope Boundaries (10%): Project assumptions and out-of-scope boundaries were unmentioned.';

      case 'screening_qa':
        const qaList = details?.llm_qualitative_evaluation?.screening_qa || proposal.aiGradedQuestions || [];
        if (qaList.length === 0 || score === 0) {
          return '• Q&A Status: Candidate did not complete any screening questions (0/100).';
        }
        if (score >= 80) {
          return '• Correctness (40%): Factually accurate concepts and core technical knowledge.\n• Technical Reasoning (25%): Strong logical rationale and trade-off justification.\n• Relevance (15%): Direct response addressing the exact question asked.\n• Technical Depth (10%): High technical substance and domain specificity.\n• Practical Examples (10%): Includes relevant real-world project scenario examples.';
        }
        return '• Correctness (40%): Average factual accuracy.\n• Technical Reasoning (25%): Requires further technical interview validation.\n• Relevance (15%): Direct response with standard question relevance.\n• Depth (10%): Content remains at a general overview level.\n• Practical Examples (10%): No concrete scenario examples provided.';

      case 'financial_value':
        const boostVal = (savingsPct * 0.5).toFixed(0);
        const savingsText = savingsPct > 0 
          ? `Provides ${savingsPct.toFixed(1)}% savings below maximum client budget (+${boostVal}%).` 
          : 'Candidate offer remains unchanged from maximum client budget cap, providing 0% cost savings (+0%).';
        const realismText = score >= 50 ? 'Proposed pricing is fair and realistic relative to scope complexity (+50%).' : 'Proposed pricing shows high variance relative to standard market rates.';
        return `• Pricing Realism (50%): ${realismText}\n• Cost Savings (50%): ${savingsText}`;

      case 'milestone_scope':
        return `• Scope Coverage (40%): Fulfills ${scopePct.toFixed(0)}% / 100% of total job requirements.\n• Milestone Structure (30%): Clear phase breakdown across deliverable milestones.\n• Timeline Feasibility (30%): Execution duration aligns with standard professional velocity.`;
    }
  };

  // Format AI explanation text: keep static labels unhighlighted, highlight metrics AFTER colon in pillar theme color
  const renderFormattedExplanation = (rawText: string, pillarKey: string) => {
    if (!rawText) return null;
    const lines = rawText.split('\n');

    // Get pillar theme badge style
    const getPillarBadgeStyle = (key: string) => {
      switch (key) {
        case 'technical_solution':
          return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 font-black';
        case 'screening_qa':
          return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-black';
        case 'financial_value':
          return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-black';
        case 'milestone_scope':
        default:
          return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 font-black';
      }
    };

    const badgeStyle = getPillarBadgeStyle(pillarKey);

    return (
      <div className="space-y-1.5 text-[13px] leading-relaxed font-normal text-text-primary">
        {lines.map((line, lineIdx) => {
          if (!line.trim()) return null;

          // Split by colon to separate label prefix from explanation body
          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) {
            // No colon, scan entire line
            const parts = line.split(/(\+?\d+(?:\.\d+)?%)/g);
            return (
              <div key={lineIdx} className="leading-snug">
                {parts.map((part, partIdx) =>
                  /^(\+?\d+(?:\.\d+)?%)$/.test(part) ? (
                    <span
                      key={partIdx}
                      className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md border text-[12px] align-baseline shadow-2xs font-mono ${badgeStyle}`}
                    >
                      {part}
                    </span>
                  ) : (
                    <span key={partIdx}>{part}</span>
                  )
                )}
              </div>
            );
          }

          const labelPart = line.substring(0, colonIndex + 1); // e.g. "• Scope Boundaries (10%):"
          const bodyPart = line.substring(colonIndex + 1);     // e.g. " Project assumptions and out-of-scope boundaries were unmentioned."

          // Scan ONLY bodyPart for metric percentages e.g. 25.0%, +13%, 74%
          const bodyParts = bodyPart.split(/(\+?\d+(?:\.\d+)?%)/g);

          return (
            <div key={lineIdx} className="leading-snug flex items-start gap-1">
              <span>
                {/* Static label part - clean & unhighlighted */}
                <strong className="font-semibold text-text-primary">{labelPart}</strong>
                {/* Body part - highlight metrics if present */}
                {bodyParts.map((part, partIdx) => {
                  if (/^(\+?\d+(?:\.\d+)?%)$/.test(part)) {
                    return (
                      <span
                        key={partIdx}
                        className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md border text-[12px] align-baseline shadow-2xs font-mono ${badgeStyle}`}
                      >
                        {part}
                      </span>
                    );
                  }
                  return <span key={partIdx}>{part}</span>;
                })}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderBadge = () => {
    switch (badge) {
      case 'top_value':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <Flame size={14} className="text-emerald-500 animate-pulse" />
            🔥 Top Value Candidate
          </span>
        );
      case 'top_technical':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 border border-brand/30 px-3.5 py-1 text-xs font-black text-brand shadow-2xs">
            <Zap size={14} className="text-brand" />
            ⚡ Top Technical Expert
          </span>
        );
      case 'budget_saver':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-black text-amber-600 dark:text-amber-400 shadow-2xs">
            <PiggyBank size={14} className="text-amber-500" />
            💰 Budget Saver Candidate
          </span>
        );
      case 'high_risk':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-3.5 py-1 text-xs font-black text-rose-600 dark:text-rose-400 shadow-2xs">
            <AlertTriangle size={14} className="text-rose-500" />
            ⚠️ High Risk Candidate
          </span>
        );
    }
  };

  return (
    <div className="conic-border-wrap conic-border-card rounded-2xl w-full">
      <div className="conic-border-card-inner rounded-[calc(1rem-1.5px)] bg-surface-card p-4 sm:p-5 space-y-5 shadow-sm w-full">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
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
            title="Solution & Delivery Methodology"
            weight="35%"
            formula="Score = 0.25×Intro + 0.25×Analysis + 0.25×Solution + 0.15×Deliverables + 0.10×Scope"
            items={[
              { label: 'Giới thiệu & Tổng quan (Intro)', weight: '25%', icon: '🎯' },
              { label: 'Phân tích vấn đề (Analysis)', weight: '25%', icon: '⚡' },
              { label: 'Giải pháp & Hướng tiếp cận (Solution)', weight: '25%', icon: '🏗️' },
              { label: 'Sản phẩm bàn giao (Deliverables)', weight: '15%', icon: '🛠️' },
              { label: 'Giả định & Ngoài phạm vi (Scope)', weight: '10%', icon: '🔒' },
            ]}
            note="Scores the 6 core proposal text sections. Excludes proposed milestone plan (scored separately in Pillar 4)."
          >
            <div className="p-3 rounded-xl border border-transparent hover:border-purple-500/30 hover:bg-purple-500/5 transition-all space-y-2">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-text-primary flex items-center gap-1.5">
                  🛠️ Solution & Delivery Methodology (35%)
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
              {/* AI Comment Box */}
              <div className="flex items-start gap-2.5 pt-1.5 border-t border-border/30 text-xs font-normal text-text-primary leading-relaxed bg-purple-500/5 dark:bg-purple-500/10 p-3 rounded-xl border border-purple-500/20">
                <Sparkles size={15} className="text-purple-500 shrink-0 mt-0.5" />
                <div className="w-full">
                  <span className="text-[11px] font-black uppercase text-purple-500 tracking-wider block mb-1">AI Explanation • Sub-Criteria Breakdown</span>
                  {renderFormattedExplanation(getPillarComment('technical_solution', pillarScores.technical_solution), 'technical_solution')}
                </div>
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
            <div className="p-3 rounded-xl border border-transparent hover:border-amber-500/30 hover:bg-amber-500/5 transition-all space-y-2">
              <div className="flex justify-between text-[11px] font-bold">
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
              {/* AI Comment Box */}
              <div className="flex items-start gap-2.5 pt-1.5 border-t border-border/30 text-xs font-normal text-text-primary leading-relaxed bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                <Sparkles size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="w-full">
                  <span className="text-[11px] font-black uppercase text-amber-500 tracking-wider block mb-1">AI Explanation • Sub-Criteria Breakdown</span>
                  {renderFormattedExplanation(getPillarComment('screening_qa', pillarScores.screening_qa), 'screening_qa')}
                </div>
              </div>
            </div>
          </MetricCalculationTooltip>

          {/* Pillar 3 */}
          <MetricCalculationTooltip
            title="Financial & Pricing Value"
            weight="20%"
            formula="Score = 0.50×Budget Savings + 0.50×Pricing Realism"
            items={[
              { label: 'Budget Savings Ratio', weight: '50%', icon: '💵' },
              { label: 'AI Pricing Realism', weight: '50%', icon: '🏷️' },
            ]}
            note="100% pure financial score based on budget savings ratio and AI pricing realism."
          >
            <div className="p-3 rounded-xl border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all space-y-2">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-text-primary flex items-center gap-1.5">
                  💰 Financial & Pricing Value (20%)
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
              {/* AI Comment Box */}
              <div className="flex items-start gap-2.5 pt-1.5 border-t border-border/30 text-xs font-normal text-text-primary leading-relaxed bg-emerald-500/5 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                <Sparkles size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="w-full">
                  <span className="text-[11px] font-black uppercase text-emerald-500 tracking-wider block mb-1">AI Explanation • Sub-Criteria Breakdown</span>
                  {renderFormattedExplanation(getPillarComment('financial_value', pillarScores.financial_value), 'financial_value')}
                </div>
              </div>
            </div>
          </MetricCalculationTooltip>

          {/* Pillar 4 */}
          <MetricCalculationTooltip
            title="Milestone Scope & Timeline Feasibility"
            weight="15%"
            formula="Score = 0.40×Scope Coverage + 0.30×Milestone Structure + 0.30×Timeline Realism"
            items={[
              { label: 'Scope Completeness %', weight: '40%', icon: '📋' },
              { label: 'Milestone Structure & Granularity', weight: '30%', icon: '🧩' },
              { label: 'Timeline Feasibility & Duration Realism', weight: '30%', icon: '⏱️' },
            ]}
            note="Evaluates requirement scope coverage, milestone breakdown granularity, and duration velocity realism."
          >
            <div className="p-3 rounded-xl border border-transparent hover:border-brand/30 hover:bg-brand/5 transition-all space-y-2">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-text-primary flex items-center gap-1.5">
                  📋 Milestone Scope & Timeline Feasibility (15%)
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
              {/* AI Comment Box */}
              <div className="flex items-start gap-2.5 pt-1.5 border-t border-border/30 text-xs font-normal text-text-primary leading-relaxed bg-cyan-500/5 dark:bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20">
                <Sparkles size={15} className="text-cyan-500 shrink-0 mt-0.5" />
                <div className="w-full">
                  <span className="text-[11px] font-black uppercase text-cyan-500 tracking-wider block mb-1">AI Explanation • Sub-Criteria Breakdown</span>
                  {renderFormattedExplanation(getPillarComment('milestone_scope', pillarScores.milestone_scope), 'milestone_scope')}
                </div>
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
    </div>
  );
}
