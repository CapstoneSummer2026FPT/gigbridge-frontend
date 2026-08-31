import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  Award,
  TrendingUp,
  CheckCircle2,
  Percent,
  XCircle,
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
  actualCalculation?: string;
  items: { label: string; weight: string; icon?: string; actualValue?: string }[];
  note?: string;
  align?: 'left' | 'right' | 'center';
  children: React.ReactNode;
}

function MetricCalculationTooltip({
  title,
  weight,
  formula,
  actualCalculation,
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
        <div className={`absolute ${getPositionClasses()} z-50 w-72 sm:w-84 p-4 rounded-2xl bg-surface-card/95 backdrop-blur-xl border border-brand/30 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.3)] text-text-primary text-xs sm:text-sm space-y-2.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-none`}>
          {/* Tooltip Arrow pointing up */}
          <div className={`absolute ${getArrowClasses()}`} />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="font-black text-xs sm:text-sm text-brand flex items-center gap-1.5">
              <Calculator size={14} className="text-brand" />
              {title}
            </span>
            {weight && (
              <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-black text-brand">
                Pillar Weight: {weight}
              </span>
            )}
          </div>

          {/* Abstract Formula Box */}
          <div className="rounded-xl bg-brand/10 border border-brand/20 p-2.5 text-xs font-mono font-bold text-brand leading-relaxed">
            <span className="block text-[10px] sm:text-xs font-sans font-black uppercase text-brand tracking-wider mb-0.5">
              📐 Calculation Formula
            </span>
            {formula}
          </div>

          {/* Live Real-Number Calculation Box */}
          {actualCalculation && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 leading-relaxed shadow-2xs">
              <span className="block text-[10px] sm:text-xs font-sans font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider mb-0.5">
                🧮 Live Real-Number Calculation
              </span>
              {actualCalculation}
            </div>
          )}

          {/* Subcriteria Breakdown List */}
          {items.length > 0 && (
            <div className="space-y-1 pt-0.5">
              <span className="block text-[10px] sm:text-xs font-black uppercase text-text-muted tracking-wider">
                Sub-criteria Weights & Values
              </span>
              <ul className="space-y-1 text-xs font-medium text-text-primary">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between bg-surface-muted/50 px-2.5 py-1 rounded-lg border border-border/40 gap-2">
                    <span className="flex items-center gap-1.5 truncate">
                      {item.icon && <span>{item.icon}</span>}
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.actualValue && (
                        <span className="text-[11px] font-mono font-bold text-text-primary bg-surface-card px-1.5 py-0.5 rounded border border-border/50">
                          {item.actualValue}
                        </span>
                      )}
                      <strong className="text-brand font-bold text-xs">{item.weight}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Note / Rationale */}
          {note && (
            <p className="text-xs text-text-muted italic pt-1 border-t border-border/40 leading-snug">
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
    technical_solution: Math.round(tq),
    screening_qa: Math.round(tq),
    financial_value: Math.round(vs),
    milestone_scope: Math.round(scopePct),
    authenticity_fluff: 50,
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
      case 'qualified_match':
      case 'top_technical':
      case 'budget_saver':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 border border-brand/30 px-3.5 py-1 text-xs font-black text-brand shadow-2xs">
            <CheckCircle2 size={14} className="text-brand" />
            🤝 Qualified Match
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

  // AI Generator Detection flags
  const aiGeneratedQA = React.useMemo(() => {
    const qaList = details?.llm_qualitative_evaluation?.screening_qa || [];
    return qaList.find((q: any) => q.is_ai_generated);
  }, [details]);

  const summaryComment = React.useMemo(() => {
    const customSummary = details?.llm_qualitative_evaluation?.answer_quality_summary_comment;
    if (customSummary) return customSummary;

    if (pillarScores.authenticity_fluff >= 70) {
      return 'Candidate responses demonstrate high technical substance, concrete domain methodology, and clear practical examples tailored to this job post.';
    }
    return 'Candidate responses exhibit lower technical substance density and rely on generic, high-level phrasing. Further technical screening is recommended to verify hands-on execution experience and specific tools.';
  }, [details, pillarScores.authenticity_fluff]);

  // Extract probing questions or generate smart per-problem fallback list
  const probingQuestionsList: string[] = React.useMemo(() => {
    const rawProbing = details?.llm_qualitative_evaluation?.probing_questions;
    if (Array.isArray(rawProbing) && rawProbing.length > 0) {
      return rawProbing;
    }

    if (pillarScores.authenticity_fluff < 70) {
      return [
        'Proposal lacks specific architecture framework specs and concrete technical workflow artifacts for this job post.',
        'Screening Q&A answers provide high-level theoretical concepts without naming specific component tokens or technical trade-off logic.',
        'Project scope boundaries and explicit out-of-scope exclusions were unmentioned in the proposal text.',
      ];
    }
    return [
      'Verify specific hands-on workflow steps and team handoff processes during the technical interview.',
    ];
  }, [details, pillarScores.authenticity_fluff]);

  // Extract ground-truth AI sub-criteria scores (strict matching from AI server evaluation JSON)
  const techSub = details?.llm_qualitative_evaluation?.technical_solution;
  const hasP1Details = techSub?.requirement_alignment?.score !== undefined;
  const p1Align = hasP1Details ? techSub.requirement_alignment.score : null;
  const p1Anal = hasP1Details ? techSub.technical_correctness.score : null;
  const p1Arch = hasP1Details ? techSub.architecture_quality.score : null;
  const p1Deliv = hasP1Details ? techSub.implementation_feasibility.score : null;
  const p1Scope = hasP1Details ? techSub.edge_cases_security.score : null;

  const qaList = details?.llm_qualitative_evaluation?.screening_qa || [];
  const hasQaDetails = qaList.length > 0 && qaList[0]?.answer_correctness?.score !== undefined;
  const p2Correct = hasQaDetails ? (qaList.reduce((acc: number, q: any) => acc + (q.answer_correctness?.score ?? 0), 0) / qaList.length) : null;
  const p2Reasoning = hasQaDetails ? (qaList.reduce((acc: number, q: any) => acc + (q.technical_reasoning?.score ?? 0), 0) / qaList.length) : null;
  const p2Relevance = hasQaDetails ? (qaList.reduce((acc: number, q: any) => acc + (q.relevance?.score ?? 0), 0) / qaList.length) : null;
  const p2Depth = hasQaDetails ? (qaList.reduce((acc: number, q: any) => acc + (q.depth?.score ?? 0), 0) / qaList.length) : null;
  const p2Examples = hasQaDetails ? (qaList.reduce((acc: number, q: any) => acc + (q.practical_examples?.score ?? 0), 0) / qaList.length) : null;

  const proposedBudget = proposal.proposedBudget || details?.deterministic_calculations?.proposed_budget || 0;
  const maxBudget = details?.job_post_baseline?.budget_max || (savingsPct > 0 && proposedBudget > 0 ? proposedBudget / (1 - savingsPct / 100) : proposedBudget);
  
  const hasP3Details = details?.deterministic_calculations?.savings_ratio_percent !== undefined && details?.llm_qualitative_evaluation?.pricing_realism?.score !== undefined;
  const p3SavingsScore = hasP3Details ? Math.min(100, 70 + details.deterministic_calculations.savings_ratio_percent) : null;
  const p3RealismScore = hasP3Details ? details.llm_qualitative_evaluation.pricing_realism.score : null;

  const hasP4Details = details?.llm_qualitative_evaluation?.milestone_structure?.score !== undefined && details?.llm_qualitative_evaluation?.timeline_feasibility?.score !== undefined;
  const p4ScopeScore = scopePct;
  const p4StructScore = hasP4Details ? details.llm_qualitative_evaluation.milestone_structure.score : null;
  const p4TimeScore = hasP4Details ? details.llm_qualitative_evaluation.timeline_feasibility.score : null;

  const reqFulfillment = details?.llm_qualitative_evaluation?.requirement_fulfillment || [];
  const fulfilledReqs = reqFulfillment.filter((r: any) => r.is_fulfilled).length;
  const totalReqs = reqFulfillment.length;

  const formatMoney = (val: number) => `$${Math.round(val).toLocaleString()}`;

  const calcSavingsString = maxBudget > 0 
    ? `max(0, (${formatMoney(maxBudget)} - ${formatMoney(proposedBudget)}) / ${formatMoney(maxBudget)}) = ${savingsPct.toFixed(1)}%`
    : `Savings = ${savingsPct.toFixed(1)}%`;

  const calcTqString = `0.35×(${pillarScores.technical_solution.toFixed(1)}) + 0.30×(${pillarScores.screening_qa.toFixed(1)}) + 0.20×(${pillarScores.financial_value.toFixed(1)}) + 0.15×(${pillarScores.milestone_scope.toFixed(1)}) = ${tq.toFixed(1)} / 100`;

  const calcVsString = `min(100.0, ${tq.toFixed(1)} × (1 + 0.5 × ${(savingsPct / 100).toFixed(2)})) = ${vs.toFixed(1)} / 100`;

  const calcCoverageString = totalReqs > 0
    ? `(${fulfilledReqs} / ${totalReqs} fulfilled) × 100% = ${scopePct.toFixed(0)}%`
    : p1Align === 0.0
    ? `0% (Forced 0% due to 0.0 Technical Alignment Score)`
    : `${scopePct.toFixed(0)}% Scope Fulfilled`;

  const calcP1String = hasP1Details
    ? `0.25×(${p1Align!.toFixed(0)}) + 0.25×(${p1Anal!.toFixed(0)}) + 0.25×(${p1Arch!.toFixed(0)}) + 0.15×(${p1Deliv!.toFixed(0)}) + 0.10×(${p1Scope!.toFixed(0)}) = ${pillarScores.technical_solution.toFixed(1)} / 100`
    : undefined;

  const calcP2String = qaList.length === 0 || pillarScores.screening_qa === 0
    ? `No screening Q&A completed by candidate = 0.0 / 100`
    : hasQaDetails
    ? `0.40×(${p2Correct!.toFixed(0)}) + 0.25×(${p2Reasoning!.toFixed(0)}) + 0.15×(${p2Relevance!.toFixed(0)}) + 0.10×(${p2Depth!.toFixed(0)}) + 0.10×(${p2Examples!.toFixed(0)}) = ${pillarScores.screening_qa.toFixed(1)} / 100`
    : undefined;

  const calcP3String = hasP3Details
    ? `0.50×(${p3SavingsScore!.toFixed(0)}) + 0.50×(${p3RealismScore!.toFixed(0)}) = ${pillarScores.financial_value.toFixed(1)} / 100`
    : undefined;

  const calcP4String = hasP4Details
    ? `0.40×(${p4ScopeScore.toFixed(0)}) + 0.30×(${p4StructScore!.toFixed(0)}) + 0.30×(${p4TimeScore!.toFixed(0)}) = ${pillarScores.milestone_scope.toFixed(1)} / 100`
    : undefined;

  return (
    <div className="conic-border-wrap conic-border-card rounded-2xl w-full">
      <div className="conic-border-card-inner rounded-[calc(1rem-1.5px)] bg-surface-card p-4 sm:p-6 space-y-5.5 shadow-sm w-full">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <MetricCalculationTooltip
            title="Technical Quality Score (TQ)"
            formula="TQ = 0.35×Tech + 0.30×Q&A + 0.20×Financial + 0.15×Scope"
            actualCalculation={calcTqString}
            items={[
              { label: 'Technical Solution', weight: '35%', actualValue: `${pillarScores.technical_solution.toFixed(1)}`, icon: '🛠️' },
              { label: 'Screening Q&A', weight: '30%', actualValue: `${pillarScores.screening_qa.toFixed(1)}`, icon: '❓' },
              { label: 'Financial & Timeline', weight: '20%', actualValue: `${pillarScores.financial_value.toFixed(1)}`, icon: '💰' },
              { label: 'Milestone Scope', weight: '15%', actualValue: `${pillarScores.milestone_scope.toFixed(1)}`, icon: '📋' },
            ]}
            note="Deterministic 4-pillar weighted sum computed in Python."
          >
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl border shrink-0 font-black text-2xl shadow-xs transition-transform hover:scale-105 ${
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
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-muted">Technical Quality</span>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-black ${
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
              actualCalculation={calcVsString}
              items={[
                { label: 'Base Quality Score (TQ)', weight: '100%', actualValue: `${tq.toFixed(1)}`, icon: '🏆' },
                { label: 'Savings Boost Factor', weight: '+0.5 × Savings%', actualValue: `+${(savingsPct * 0.5).toFixed(1)}%`, icon: '📈' },
              ]}
              note="Capped at a maximum of 100.0."
            >
              <p className="text-xs sm:text-sm font-bold text-text-primary mt-1 flex items-center gap-1.5">
                Value Score (VS): <strong className="text-brand font-black text-sm sm:text-base">{vs.toFixed(1)} / 100</strong>
                <HelpCircle size={13} className="text-text-muted hover:text-brand" />
              </p>
            </MetricCalculationTooltip>
          </div>
        </div>

        {/* Verdict Badge */}
        <div>{renderBadge()}</div>
      </div>

      {/* Recruiter Top Decision KPI Cards with Tooltips */}
      <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
        <MetricCalculationTooltip
          title="Requirement Coverage %"
          align="left"
          formula="Coverage % = (Fulfilled Reqs / Total Reqs) × 100%"
          actualCalculation={calcCoverageString}
          items={[
            { label: 'Requirements Fulfilled', weight: `${scopePct.toFixed(0)}%`, actualValue: totalReqs > 0 ? `${fulfilledReqs}/${totalReqs}` : `${scopePct.toFixed(0)}%`, icon: '✅' },
          ]}
          note="Evaluates how completely candidate proposal covers client job description."
        >
          <div className="rounded-xl border border-border/50 bg-surface-muted/60 p-3.5 sm:p-4 text-center transition-all hover:border-brand/50 hover:bg-brand/5">
            <span className="block text-xs sm:text-sm font-black uppercase text-text-muted flex items-center justify-center gap-1.5">
              <CheckCircle2 size={14} className="text-brand shrink-0" /> Requirement Coverage
            </span>
            <strong className="text-brand font-black text-xl sm:text-2xl block mt-1">
              {scopePct.toFixed(0)}%
            </strong>
            <span className="block text-xs font-semibold text-text-muted mt-1">Req. Scope Fulfilled</span>
          </div>
        </MetricCalculationTooltip>

        <MetricCalculationTooltip
          title="Budget Savings %"
          align="center"
          formula="Savings % = max(0, (Max Budget - Proposed) / Max Budget)"
          actualCalculation={calcSavingsString}
          items={[
            { label: 'Client Max Budget', weight: 'Baseline', actualValue: maxBudget > 0 ? formatMoney(maxBudget) : 'N/A', icon: '💰' },
            { label: 'Candidate Offer', weight: 'Proposed', actualValue: formatMoney(proposedBudget), icon: '🏷️' },
          ]}
          note="Measures budget savings percentage relative to job budget cap."
        >
          <div className="rounded-xl border border-border/50 bg-surface-muted/60 p-3.5 sm:p-4 text-center transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5">
            <span className="block text-xs sm:text-sm font-black uppercase text-text-muted flex items-center justify-center gap-1.5">
              <Percent size={14} className="text-emerald-500 shrink-0" /> Budget Savings
            </span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-black text-xl sm:text-2xl block mt-1">
              {savingsPct > 0 ? `${savingsPct.toFixed(1)}%` : '0%'}
            </strong>
            <span className="block text-xs font-semibold text-text-muted mt-1">Vs. Client Budget</span>
          </div>
        </MetricCalculationTooltip>

        <MetricCalculationTooltip
          title="Overall Quality Score"
          align="right"
          formula="TQ = 35% Tech + 30% Q&A + 20% Financial + 15% Scope"
          actualCalculation={calcTqString}
          items={[
            { label: 'Technical Solution', weight: '35%', actualValue: `${pillarScores.technical_solution.toFixed(1)}`, icon: '🛠️' },
            { label: 'Screening Q&A', weight: '30%', actualValue: `${pillarScores.screening_qa.toFixed(1)}`, icon: '❓' },
            { label: 'Financial Value', weight: '20%', actualValue: `${pillarScores.financial_value.toFixed(1)}`, icon: '💰' },
            { label: 'Scope & Deliverables', weight: '15%', actualValue: `${pillarScores.milestone_scope.toFixed(1)}`, icon: '📋' },
          ]}
          note="Main technical quality assessment score."
        >
          <div className="rounded-xl border border-border/50 bg-surface-muted/60 p-3.5 sm:p-4 text-center transition-all hover:border-purple-500/50 hover:bg-purple-500/5">
            <span className="block text-xs sm:text-sm font-black uppercase text-text-muted flex items-center justify-center gap-1.5">
              <Award size={14} className="text-purple-500 shrink-0" /> Quality Score
            </span>
            <strong className="text-purple-600 dark:text-purple-400 font-black text-xl sm:text-2xl block mt-1">
              {tq.toFixed(1)}
            </strong>
            <span className="block text-xs font-semibold text-text-muted mt-1">Weighted 4-Pillar Score</span>
          </div>
        </MetricCalculationTooltip>
      </div>

      {/* Executive Decision Rationale / Key Concerns Summary Box */}
      {keyReasons.length > 0 && (
        <div
          className={`rounded-xl border p-4 space-y-2.5 text-xs sm:text-sm ${
            tq < 60
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-200'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-black uppercase tracking-wider text-xs sm:text-sm flex items-center gap-2">
              {tq < 60 ? (
                <>
                  <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                  🔴 WHY THIS CANDIDATE IS HIGH RISK
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  🟢 EXECUTIVE DECISION SUMMARY
                </>
              )}
            </span>
            <span className="text-xs font-extrabold opacity-80 uppercase tracking-widest">
              Recruiter Insight
            </span>
          </div>

          <ul className="space-y-2 font-medium pl-1 text-xs sm:text-sm">
            {keyReasons.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                {item.type === 'negative' ? (
                  <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                )}
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4-Pillar Score Visual Breakdown with Interactive Calculation Tooltips */}
      <div className="space-y-3.5 pt-1">
        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-muted flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp size={15} className="text-purple-500 shrink-0" />
            4-Pillar Candidate Evaluation Breakdown
          </span>
          <span className="text-xs font-extrabold text-text-muted bg-surface-muted px-2.5 py-1 rounded-full flex items-center gap-1">
            <HelpCircle size={12} className="text-purple-500 shrink-0" /> Hover metric to view formula
          </span>
        </h4>

        <div className="space-y-3.5 text-xs sm:text-sm">
          {/* Pillar 1 */}
          <MetricCalculationTooltip
            title="Solution & Delivery Methodology"
            weight="35%"
            formula="Score = 0.25×Intro + 0.25×Analysis + 0.25×Solution + 0.15×Deliverables + 0.10×Scope"
            actualCalculation={calcP1String}
            items={[
              { label: 'Giới thiệu & Tổng quan (Intro)', weight: '25%', actualValue: hasP1Details ? `${p1Align!.toFixed(0)}` : '--', icon: '🎯' },
              { label: 'Phân tích vấn đề (Analysis)', weight: '25%', actualValue: hasP1Details ? `${p1Anal!.toFixed(0)}` : '--', icon: '⚡' },
              { label: 'Giải pháp & Hướng tiếp cận (Solution)', weight: '25%', actualValue: hasP1Details ? `${p1Arch!.toFixed(0)}` : '--', icon: '🏗️' },
              { label: 'Sản phẩm bàn giao (Deliverables)', weight: '15%', actualValue: hasP1Details ? `${p1Deliv!.toFixed(0)}` : '--', icon: '🛠️' },
              { label: 'Giả định & Ngoài phạm vi (Scope)', weight: '10%', actualValue: hasP1Details ? `${p1Scope!.toFixed(0)}` : '--', icon: '🔒' },
            ]}
            note="Scores the 6 core proposal text sections. Excludes proposed milestone plan (scored separately in Pillar 4)."
          >
            <div className="p-3.5 sm:p-4 rounded-xl border border-transparent hover:border-purple-500/30 hover:bg-purple-500/5 transition-all space-y-2.5">
              <div className="flex justify-between text-xs sm:text-sm font-bold">
                <span className="text-text-primary flex items-center gap-2 font-black">
                  🛠️ Solution & Delivery Methodology (35%)
                  <HelpCircle size={13} className="text-text-muted" />
                </span>
                <span className="font-black text-sm sm:text-base text-purple-600 dark:text-purple-400">
                  {pillarScores.technical_solution.toFixed(1)} / 100
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pillarScores.technical_solution))}%` }}
                />
              </div>
              {/* AI Comment Box */}
              <div className="flex items-start gap-3 pt-2 text-xs sm:text-sm font-normal text-text-primary leading-relaxed bg-purple-500/5 dark:bg-purple-500/10 p-3.5 rounded-xl border border-purple-500/20">
                <Sparkles size={17} className="text-purple-500 shrink-0 mt-0.5" />
                <div className="w-full">
                  <span className="text-xs font-black uppercase text-purple-500 tracking-wider block mb-1.5">AI Explanation • Sub-Criteria Breakdown</span>
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
            actualCalculation={calcP2String}
            items={[
              { label: 'Answer Correctness', weight: '40%', actualValue: hasQaDetails ? `${p2Correct!.toFixed(0)}` : (qaList.length === 0 ? '0' : '--'), icon: '✅' },
              { label: 'Technical Reasoning', weight: '25%', actualValue: hasQaDetails ? `${p2Reasoning!.toFixed(0)}` : (qaList.length === 0 ? '0' : '--'), icon: '🧠' },
              { label: 'Question Relevance', weight: '15%', actualValue: hasQaDetails ? `${p2Relevance!.toFixed(0)}` : (qaList.length === 0 ? '0' : '--'), icon: '🎯' },
              { label: 'Technical Depth', weight: '10%', actualValue: hasQaDetails ? `${p2Depth!.toFixed(0)}` : (qaList.length === 0 ? '0' : '--'), icon: '🔍' },
              { label: 'Practical Examples', weight: '10%', actualValue: hasQaDetails ? `${p2Examples!.toFixed(0)}` : (qaList.length === 0 ? '0' : '--'), icon: '💡' },
            ]}
            note="Averages candidate screening answer quality across all questions."
          >
            <div className="p-3.5 sm:p-4 rounded-xl border border-transparent hover:border-amber-500/30 hover:bg-amber-500/5 transition-all space-y-2.5">
              <div className="flex justify-between text-xs sm:text-sm font-bold">
                <span className="text-text-primary flex items-center gap-2 font-black">
                  ❓ Screening Q&A Accuracy & Reasoning (30%)
                  <HelpCircle size={13} className="text-text-muted" />
                </span>
                <span className="font-black text-sm sm:text-base text-amber-600 dark:text-amber-400">
                  {pillarScores.screening_qa.toFixed(1)} / 100
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pillarScores.screening_qa))}%` }}
                />
              </div>
              {/* AI Comment Box */}
              <div className="flex items-start gap-3 pt-2 text-xs sm:text-sm font-normal text-text-primary leading-relaxed bg-amber-500/5 dark:bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20">
                <Sparkles size={17} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="w-full">
                  <span className="text-xs font-black uppercase text-amber-500 tracking-wider block mb-1.5">AI Explanation • Sub-Criteria Breakdown</span>
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
            actualCalculation={calcP3String}
            items={[
              { label: 'Budget Savings Ratio', weight: '50%', actualValue: hasP3Details ? `${p3SavingsScore!.toFixed(0)}` : '--', icon: '💵' },
              { label: 'AI Pricing Realism', weight: '50%', actualValue: hasP3Details ? `${p3RealismScore!.toFixed(0)}` : '--', icon: '🏷️' },
            ]}
            note="100% pure financial score based on budget savings ratio and AI pricing realism."
          >
            <div className="p-3.5 sm:p-4 rounded-xl border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all space-y-2.5">
              <div className="flex justify-between text-xs sm:text-sm font-bold">
                <span className="text-text-primary flex items-center gap-2 font-black">
                  💰 Financial & Pricing Value (20%)
                  <HelpCircle size={13} className="text-text-muted" />
                </span>
                <span className="font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                  {pillarScores.financial_value.toFixed(1)} / 100
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pillarScores.financial_value))}%` }}
                />
              </div>
              {/* AI Comment Box */}
              <div className="flex items-start gap-3 pt-2 text-xs sm:text-sm font-normal text-text-primary leading-relaxed bg-emerald-500/5 dark:bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/20">
                <Sparkles size={17} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="w-full">
                  <span className="text-xs font-black uppercase text-emerald-500 tracking-wider block mb-1.5">AI Explanation • Sub-Criteria Breakdown</span>
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
            actualCalculation={calcP4String}
            items={[
              { label: 'Scope Completeness %', weight: '40%', actualValue: `${p4ScopeScore.toFixed(0)}%`, icon: '📋' },
              { label: 'Milestone Structure & Granularity', weight: '30%', actualValue: hasP4Details ? `${p4StructScore!.toFixed(0)}` : '--', icon: '🧩' },
              { label: 'Timeline Feasibility & Duration Realism', weight: '30%', actualValue: hasP4Details ? `${p4TimeScore!.toFixed(0)}` : '--', icon: '⏱️' },
            ]}
            note="Evaluates requirement scope coverage, milestone breakdown granularity, and duration velocity realism."
          >
            <div className="p-3.5 sm:p-4 rounded-xl border border-transparent hover:border-brand/30 hover:bg-brand/5 transition-all space-y-2.5">
              <div className="flex justify-between text-xs sm:text-sm font-bold">
                <span className="text-text-primary flex items-center gap-2 font-black">
                  📋 Milestone Scope & Timeline Feasibility (15%)
                  <HelpCircle size={13} className="text-text-muted" />
                </span>
                <span className="font-black text-sm sm:text-base text-brand">
                  {pillarScores.milestone_scope.toFixed(1)} / 100
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pillarScores.milestone_scope))}%` }}
                />
              </div>
              {/* AI Comment Box */}
              <div className="flex items-start gap-3 pt-2 text-xs sm:text-sm font-normal text-text-primary leading-relaxed bg-cyan-500/5 dark:bg-cyan-500/10 p-3.5 rounded-xl border border-cyan-500/20">
                <Sparkles size={17} className="text-cyan-500 shrink-0 mt-0.5" />
                <div className="w-full">
                  <span className="text-xs font-black uppercase text-cyan-500 tracking-wider block mb-1.5">AI Explanation • Sub-Criteria Breakdown</span>
                  {renderFormattedExplanation(getPillarComment('milestone_scope', pillarScores.milestone_scope), 'milestone_scope')}
                </div>
              </div>
            </div>
          </MetricCalculationTooltip>
        </div>
      </div>

      {/* 🤖 AI Recruiter Insight & Answer Quality (Diagnostic Feedback) */}
      <MetricCalculationTooltip
        title="AI Recruiter Insight & Answer Quality"
        formula="Diagnostic feedback — Does not alter overall VS score math"
        items={[
          { label: 'Project Specificity', weight: 'Evaluated', icon: '🎯' },
          { label: 'Substance Density', weight: 'Evaluated', icon: '🔬' },
        ]}
        note="Measures technical specificity vs. generic copy-paste text to assist recruiter screening."
      >
        <div className="rounded-xl border border-border/70 bg-surface-muted/40 p-4 space-y-3.5 text-xs sm:text-sm transition-all hover:border-pink-500/40 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black uppercase tracking-wider text-xs sm:text-sm text-text-primary flex items-center gap-1.5">
                <Fingerprint size={16} className="text-pink-500 shrink-0" />
                🤖 AI Recruiter Insight & Answer Quality
              </span>
              <span className="text-[11px] font-bold text-text-muted bg-surface-card px-2.5 py-0.5 rounded-full border border-border/40">
                (Diagnostic Feedback — Does not alter overall VS score)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {aiGeneratedQA && (
                <span className="rounded-full px-3 py-1 text-xs font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-2xs flex items-center gap-1">
                  <AlertTriangle size={12} className="text-amber-500 shrink-0" /> 🤖 AI-Generated Text Flagged
                </span>
              )}
              <span
                className={`rounded-full px-3 py-1 text-xs font-black border shadow-2xs ${
                  pillarScores.authenticity_fluff >= 70
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                }`}
              >
                {pillarScores.authenticity_fluff >= 70
                  ? '🟢 Candidate Response Status: Clear & Detailed'
                  : '🔴 Candidate Response Status: Vague / Needs Technical Clarification'}
              </span>
            </div>
          </div>

          {/* AI Generator Detection Warning Notice Box */}
          {aiGeneratedQA && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl space-y-1">
              <span className="block text-xs font-black uppercase text-amber-700 dark:text-amber-300 tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                ⚠️ AI Generator Detection Notice (ChatGPT / Boilerplate Signature Flagged)
              </span>
              <p className="text-xs sm:text-sm text-text-primary leading-relaxed">
                {aiGeneratedQA.ai_detection_reason || 'AI-generated response patterns detected (stereotypical ChatGPT intro phrases, uniform bold lead-in lists, and lack of personal project experience).'}
              </p>
            </div>
          )}

          {/* Single Cohesive AI Summary Narrative Comment (Compliment or Complaint) */}
          <div className="bg-surface-card p-3.5 rounded-xl border border-border/50 space-y-1.5">
            <span className="block text-xs font-black uppercase text-pink-500 tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-pink-500 shrink-0" />
              AI Recruiter Summary Comment
            </span>
            <p className="text-xs sm:text-sm text-text-primary leading-relaxed font-normal">
              {summaryComment}
            </p>
          </div>

          {/* Formatted Numbered List of Points/Problems Candidate Must Clarify */}
          {probingQuestionsList.length > 0 && (
            <div className="bg-pink-500/5 dark:bg-pink-500/10 p-3.5 rounded-xl border border-pink-500/20 space-y-2">
              <span className="block text-xs font-black uppercase text-pink-600 dark:text-pink-400 tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-pink-500 shrink-0" />
                💡 Key Points Candidate Must Clarify in Interview
              </span>
              <ol className="space-y-1.5 text-xs sm:text-sm font-medium text-text-primary pl-1">
                {probingQuestionsList.map((probItem, pIdx) => {
                  const cleanedText = probItem.replace(/^Problem\s*#?\d*:\s*/i, '').replace(/^\d+\.\s*/, '');
                  return (
                    <li key={pIdx} className="flex items-start gap-2 leading-relaxed">
                      <strong className="text-pink-600 dark:text-pink-400 font-bold shrink-0">
                        {pIdx + 1}. Problem #{pIdx + 1}:
                      </strong>
                      <span>{cleanedText}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </MetricCalculationTooltip>
      </div>
    </div>
  );
}
