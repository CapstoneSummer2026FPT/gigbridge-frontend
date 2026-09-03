import React, { useState, useRef, useEffect } from 'react';
import {
  Flame,
  AlertTriangle,
  Award,
  TrendingUp,
  CheckCircle2,
  Percent,
  XCircle,
  Calculator,
  HelpCircle,
  Sparkles,
  X,
  Maximize2,
  Minimize2,
  Wrench,
  DollarSign,
  ClipboardList,
  Target,
  Zap,
  Layers,
  ShieldCheck,
  Brain,
  Search,
  Lightbulb,
  Tag,
  Clock,
  Bot,
  Milestone,
} from 'lucide-react';
import type { ProposalDto } from '../../../types/models/Proposal';
import '../../../shared/components/styles/conic-border-button.css';
import { useTranslation } from '../../../hooks/useTranslation';

export interface AIProposalVerdictCardProps {
  proposal: ProposalDto;
}

interface CalculationTooltipProps {
  title: string;
  weight?: string;
  formula: string;
  actualCalculation?: string;
  items: { label: string; weight: string; icon?: React.ReactNode; actualValue?: string }[];
  note?: string;
  align?: 'left' | 'right' | 'center';
  placement?: 'top' | 'bottom' | 'auto';
  className?: string;
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
  placement = 'auto',
  className,
  children,
}: CalculationTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolvedPlacement, setResolvedPlacement] = useState<'top' | 'bottom'>(
    placement === 'auto' ? 'bottom' : placement
  );

  useEffect(() => {
    if (!isOpen || placement !== 'auto' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < 280 && spaceAbove > spaceBelow) {
      setResolvedPlacement('top');
    } else {
      setResolvedPlacement('bottom');
    }
  }, [isOpen, placement]);

  const alignClasses =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  return (
    <div
      ref={containerRef}
      className={className ? `relative ${className}` : "relative inline-flex items-center"}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen((prev) => !prev)}
    >
      {children}

      {isOpen && (
        <div
          className={`absolute ${
            resolvedPlacement === 'top' ? 'bottom-full mb-3' : 'top-full mt-2'
          } ${alignClasses} z-50 w-72 sm:w-84 rounded-2xl bg-surface border border-brand p-4 shadow-2xl space-y-2.5 text-text-primary text-xs pointer-events-auto transition-all animate-in fade-in duration-150`}
        >
          {/* Arrow */}
          <div
            className={`absolute ${
              resolvedPlacement === 'top'
                ? 'top-full -mt-1 border-t-brand border-x-transparent border-b-transparent'
                : 'bottom-full -mb-1 border-b-brand border-x-transparent border-t-transparent'
            } ${
              align === 'left'
                ? 'left-6'
                : align === 'right'
                ? 'right-6'
                : 'left-1/2 -translate-x-1/2'
            } w-0 h-0 border-solid border-4`}
          />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/70 pb-2">
            <span className="font-black text-xs uppercase tracking-wider text-text-primary">
              {title}
            </span>
            {weight && (
              <span className="rounded-full bg-surface-muted border border-border px-2 py-0.5 text-[11px] font-bold text-text-primary">
                Pillar Weight: {weight}
              </span>
            )}
          </div>

          {/* Abstract Formula Box */}
          <div className="rounded-xl bg-surface-muted border border-border p-2.5 text-xs font-mono font-bold text-text-primary leading-relaxed">
            <span className="flex items-center gap-1 text-[10px] sm:text-xs font-sans font-black uppercase text-text-muted tracking-wider mb-0.5">
              <Calculator size={12} className="shrink-0" /> Calculation Formula
            </span>
            {formula}
          </div>

          {/* Live Real-Number Calculation Box */}
          {actualCalculation && (
            <div className="rounded-xl bg-surface-muted border border-border p-2.5 text-xs font-mono font-bold text-text-primary leading-relaxed shadow-2xs">
              <span className="flex items-center gap-1 text-[10px] sm:text-xs font-sans font-black uppercase text-text-muted tracking-wider mb-0.5">
                <Calculator size={12} className="shrink-0" /> Live Real-Number Calculation
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
                  <li key={idx} className="flex items-center justify-between bg-surface-muted/60 px-2.5 py-1.5 rounded-lg border border-border gap-2">
                    <span className="flex items-center gap-1.5 truncate">
                      {item.icon && <span className="text-text-muted shrink-0">{item.icon}</span>}
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.actualValue && (
                        <span className="text-[11px] font-mono font-bold text-text-primary bg-surface px-1.5 py-0.5 rounded border border-border">
                          {item.actualValue}
                        </span>
                      )}
                      <strong className="text-text-primary font-bold text-xs">{item.weight}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Note / Rationale */}
          {note && (
            <p className="text-[11px] text-text-muted italic pt-1 border-t border-border/40 leading-snug flex items-start gap-1">
              <Lightbulb size={12} className="shrink-0 mt-0.5 text-text-muted" />
              <span>{note}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Semi-circular ELO-Style Arc Gauge Component ─────────────────────────────
function PillarArcGauge({
  score,
  gradientId,
  gradientFrom,
  gradientTo,
  glowColor,
  scoreColorClass,
}: {
  score: number;
  gradientId: string;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
  scoreColorClass: string;
}) {
  const ARC_TOTAL_LENGTH = 404.92;
  const safeScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = ARC_TOTAL_LENGTH * (1 - safeScore / 100);

  return (
    <div className="relative w-full max-w-[150px] sm:max-w-[160px] mx-auto flex items-center justify-center py-1">
      {/* Soft radial glow centered behind arc circle */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 68%)`,
        }}
      />

      <svg viewBox="0 0 200 200" className="w-full h-auto overflow-visible relative z-10">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>

        {/* Track (Elo speedometer path from Profile) */}
        <path
          d="M 54.11 165.54 A 80 80 0 1 1 145.89 165.54"
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* Active Progress */}
        <path
          d="M 54.11 165.54 A 80 80 0 1 1 145.89 165.54"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={ARC_TOTAL_LENGTH}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 pointer-events-none text-center">
        <span className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${scoreColorClass}`}>
          {score.toFixed(1)}
        </span>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">
          / 100
        </span>
      </div>
    </div>
  );
}

// ── Explanation Popover Triggered by '?' Button ─────────────────────────────
export function PillarExplanationButton({
  title,
  iconColor,
  content,
  placement = 'top',
}: {
  title: string;
  iconColor: string;
  content: React.ReactNode;
  placement?: 'top' | 'bottom';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title="Xem giải thích AI"
        aria-label={`Xem giải thích AI cho ${title}`}
        className={`w-6 h-6 rounded-full flex items-center justify-center transition cursor-pointer ${
          isOpen
            ? 'bg-brand text-brand-foreground shadow-xs'
            : 'bg-surface-muted text-text-muted hover:text-brand hover:bg-surface-hover border border-border'
        }`}
      >
        <HelpCircle size={14} />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 ${
            placement === 'top' ? 'bottom-full mb-2.5' : 'top-full mt-2'
          } z-50 w-72 sm:w-84 max-w-[90vw] p-4 rounded-2xl bg-surface border border-brand shadow-2xl space-y-2.5 text-xs text-text-primary animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Arrow */}
          <div
            className={`absolute ${
              placement === 'top'
                ? 'top-full right-2.5 border-4 border-transparent border-t-brand'
                : 'bottom-full right-2.5 border-4 border-transparent border-b-brand'
            }`}
          />

          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className={`font-black text-xs uppercase tracking-wider flex items-center gap-1.5 ${iconColor}`}>
              <Sparkles size={14} />
              AI Explanation • {title}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-muted transition cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
          <div className="leading-relaxed font-normal text-text-secondary">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

export function AIProposalVerdictCard({ proposal }: AIProposalVerdictCardProps) {
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || 'vi').startsWith('en');
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
        text: isEn
          ? `Very weak Q&A performance (${pillarScores.screening_qa.toFixed(1)}/100)`
          : `Kết quả trả lời phỏng vấn sàng lọc rất yếu (${pillarScores.screening_qa.toFixed(1)}/100)`,
      });
    } else if (pillarScores.screening_qa >= 80) {
      reasons.push({
        type: 'positive',
        text: isEn
          ? `Strong screening Q&A answers & reasoning (${pillarScores.screening_qa.toFixed(1)}/100)`
          : `Câu trả lời phỏng vấn sàng lọc & lập luận kỹ thuật tốt (${pillarScores.screening_qa.toFixed(1)}/100)`,
      });
    }

    if (scopePct < 70) {
      reasons.push({
        type: 'negative',
        text: isEn
          ? `Low requirement coverage (${scopePct.toFixed(0)}% fulfilled)`
          : `Độ bao phủ yêu cầu công việc thấp (${scopePct.toFixed(0)}% hoàn thành)`,
      });
    } else if (scopePct >= 90) {
      reasons.push({
        type: 'positive',
        text: isEn
          ? `Comprehensive requirement coverage (${scopePct.toFixed(0)}% fulfilled)`
          : `Bao phủ đầy đủ các yêu cầu công việc (${scopePct.toFixed(0)}% hoàn thành)`,
      });
    }

    if (pillarScores.technical_solution < 60) {
      reasons.push({
        type: 'negative',
        text: isEn
          ? `Solution methodology & requirement alignment needs improvement (${pillarScores.technical_solution.toFixed(1)}/100)`
          : `Phương pháp giải pháp & độ bám sát yêu cầu cần cải thiện (${pillarScores.technical_solution.toFixed(1)}/100)`,
      });
    } else if (pillarScores.technical_solution >= 80) {
      reasons.push({
        type: 'positive',
        text: isEn
          ? `Solid solution methodology & requirement alignment proposed (${pillarScores.technical_solution.toFixed(1)}/100)`
          : `Đề xuất phương pháp giải pháp & độ bám sát yêu cầu vững chắc (${pillarScores.technical_solution.toFixed(1)}/100)`,
      });
    }

    if (pillarScores.financial_value < 50) {
      reasons.push({
        type: 'negative',
        text: isEn
          ? `Financial/timeline feasibility score is low (${pillarScores.financial_value.toFixed(1)}/100)`
          : `Điểm tính khả thi về chi phí/thời gian thấp (${pillarScores.financial_value.toFixed(1)}/100)`,
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

    if (!isEn) {
      switch (pillarKey) {
        case 'technical_solution':
          if (score >= 80) {
            return '• Mức độ phù hợp yêu cầu (25%): Phần giới thiệu đề xuất bám sát các yêu cầu trong mô tả công việc.\n• Phân tích vấn đề (25%): Đã phân tích đúng bản chất kỹ thuật và yêu cầu chuyên môn.\n• Kiến trúc giải pháp (25%): Quy trình làm việc và phương pháp triển khai rõ ràng.\n• Sản phẩm bàn giao (15%): Liệt kê chi tiết các đầu ra sản phẩm cụ thể.\n• Ranh giới phạm vi (10%): Xác định rõ các giả định và hạng mục ngoài phạm vi.';
          }
          if (score >= 60) {
            return '• Mức độ phù hợp yêu cầu (25%): Đáp ứng mức cơ bản với các yêu cầu chính.\n• Phân tích vấn đề (25%): Phân tích hợp lý ở mức tổng quan.\n• Kiến trúc giải pháp (25%): Quy trình thực hiện tiêu chuẩn.\n• Sản phẩm bàn giao (15%): Mô tả sản phẩm bàn giao ở mức trung bình.\n• Ranh giới phạm vi (10%): Cần làm rõ thêm ranh giới phạm vi dự án.';
          }
          return '• Mức độ phù hợp yêu cầu (25%): Đề xuất chung chung, chưa bám sát yêu cầu công việc.\n• Phân tích vấn đề (25%): Thiếu phân tích chuyên sâu về vấn đề nghiệp vụ.\n• Kiến trúc giải pháp (25%): Phương pháp tiếp cận còn sơ sài.\n• Sản phẩm bàn giao (15%): Mô tả sản phẩm bàn giao chưa cụ thể.\n• Ranh giới phạm vi (10%): Chưa đề cập giả định và các hạng mục ngoài phạm vi.';

        case 'screening_qa':
          const qaList = details?.llm_qualitative_evaluation?.screening_qa || proposal.aiGradedQuestions || [];
          if (qaList.length === 0 || score === 0) {
            return '• Trạng thái Phỏng vấn: Ứng viên chưa thực hiện câu hỏi sàng lọc (0/100).';
          }
          if (score >= 80) {
            return '• Độ chính xác (40%): Nắm vững kiến thức chuyên môn và khái niệm cốt lõi.\n• Lập luận kỹ thuật (25%): Lập luận logic tốt và giải thích rõ lựa chọn.\n• Độ bám sát câu hỏi (15%): Trả lời đúng trọng tâm câu hỏi.\n• Độ sâu chuyên môn (10%): Thể hiện chiều sâu chuyên môn cao.\n• Ví dụ thực tế (10%): Có ví dụ thực tiễn minh họa phù hợp.';
          }
          return '• Độ chính xác (40%): Độ chính xác ở mức trung bình.\n• Lập luận kỹ thuật (25%): Cần phỏng vấn thêm để xác minh kỹ năng.\n• Độ bám sát câu hỏi (15%): Trả lời bám sát câu hỏi ở mức cơ bản.\n• Độ sâu chuyên môn (10%): Nội dung ở mức tổng quan.\n• Ví dụ thực tế (10%): Chưa cung cấp ví dụ kịch bản thực tế cụ thể.';

        case 'financial_value':
          const boostVal = (savingsPct * 0.5).toFixed(0);
          const savingsText = savingsPct > 0 
            ? `Tạo ra mức tiết kiệm ${savingsPct.toFixed(1)}% so với ngân sách tối đa của khách hàng (+${boostVal}%).` 
            : 'Mức giá đề xuất bằng ngân sách tối đa, không tạo thêm mức tiết kiệm (+0%).';
          const realismText = score >= 50 ? 'Mức giá đề xuất hợp lý so với khối lượng công việc (+50%).' : 'Mức giá đề xuất có độ chênh lệch cao so với mặt bằng thị trường.';
          return `• Tính thực tế về giá (50%): ${realismText}\n• Mức tiết kiệm ngân sách (50%): ${savingsText}`;

        case 'milestone_scope':
          return `• Phạm vi yêu cầu (40%): Đáp ứng ${scopePct.toFixed(0)}% / 100% tổng số yêu cầu công việc.\n• Cấu trúc Milestone (30%): Phân chia giai đoạn và sản phẩm bàn giao rõ ràng.\n• Tính khả thi thời gian (30%): Thời lượng triển khai phù hợp với tiến độ thực tế.`;
      }
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
  const renderFormattedExplanation = (rawText: string, _pillarKey?: string) => {
    if (!rawText) return null;
    const lines = rawText.split('\n');

    // Get pillar theme badge style
    const getPillarBadgeStyle = () => {
      return 'bg-surface-muted text-text-primary border-border font-bold';
    };

    const badgeStyle = getPillarBadgeStyle();

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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted border border-border px-3.5 py-1 text-xs font-black text-text-primary shadow-2xs">
            <Flame size={14} className="text-emerald-500" />
            {t('aiVerdict.topValue', 'Top Value Candidate')}
          </span>
        );
      case 'qualified_match':
      case 'top_technical':
      case 'budget_saver':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted border border-border px-3.5 py-1 text-xs font-black text-text-primary shadow-2xs">
            <CheckCircle2 size={14} className="text-brand" />
            {t('aiVerdict.qualifiedMatch', 'Qualified Match')}
          </span>
        );
      case 'high_risk':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted border border-border px-3.5 py-1 text-xs font-black text-text-primary shadow-2xs">
            <AlertTriangle size={14} className="text-rose-500" />
            {t('aiVerdict.highRisk', 'High Risk Candidate')}
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

    if (!isEn) {
      if (pillarScores.authenticity_fluff >= 70) {
        return 'Câu trả lời của ứng viên thể hiện chiều sâu chuyên môn tốt, phương pháp triển khai cụ thể và các ví dụ thực tiễn phù hợp với mô tả công việc.';
      }
      return 'Câu trả lời của ứng viên có mật độ chuyên môn chưa cao, còn sử dụng nhiều diễn đạt chung chung. Khuyên dùng phỏng vấn kỹ thuật để xác minh thêm kinh nghiệm thực tế.';
    }

    if (pillarScores.authenticity_fluff >= 70) {
      return 'Candidate responses demonstrate high technical substance, concrete domain methodology, and clear practical examples tailored to this job post.';
    }
    return 'Candidate responses exhibit lower technical substance density and rely on generic, high-level phrasing. Further technical screening is recommended to verify hands-on execution experience and specific tools.';
  }, [details, pillarScores.authenticity_fluff, isEn]);

  // Extract probing questions or generate smart per-problem fallback list
  const probingQuestionsList: string[] = React.useMemo(() => {
    const rawProbing = details?.llm_qualitative_evaluation?.probing_questions;
    if (Array.isArray(rawProbing) && rawProbing.length > 0) {
      return rawProbing;
    }

    if (!isEn) {
      if (pillarScores.authenticity_fluff < 70) {
        return [
          'Đề xuất còn thiếu các thông số quy trình và công cụ triển khai cụ thể cho công việc này.',
          'Câu trả lời sàng lọc đưa ra khái niệm lý thuyết chung chung, thiếu lập luận kỹ thuật và thực tiễn.',
          'Chưa xác định rõ ranh giới phạm vi dự án và các hạng mục ngoài phạm vi.',
        ];
      }
      return [
        'Xác minh quy trình triển khai thực tế và phương pháp phối hợp làm việc trong buổi phỏng vấn.',
      ];
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
  }, [details, pillarScores.authenticity_fluff, isEn]);

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

  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);

  const pillarsData = [
    {
      key: 'technical_solution',
      title: t('aiVerdict.pillar1Title', 'Solution & Delivery Methodology'),
      shortTitle: t('aiVerdict.pillar1Short', 'Solution & Delivery'),
      weight: '35%',
      icon: <Wrench size={14} className="shrink-0 text-text-primary" />,
      score: pillarScores.technical_solution,
      gradientId: 'p1ArcGrad',
      gradientFrom: '#a855f7',
      gradientTo: '#6366f1',
      glowColor: 'rgba(168, 85, 247, 0.2)',
      scoreColorClass: 'text-text-primary',
      borderHoverClass: 'hover:border-border',
      accentBorderClass: 'border-border',
      badgeBgClass: 'bg-surface-muted text-text-primary border-border font-black',
      formula: 'Score = 0.25×Intro + 0.25×Analysis + 0.25×Solution + 0.15×Deliverables + 0.10×Scope',
      actualCalculation: calcP1String,
      items: [
        { label: t('aiVerdict.sub1_intro', 'Giới thiệu & Tổng quan (Intro)'), weight: '25%', actualValue: hasP1Details ? `${p1Align!.toFixed(0)}` : '--', icon: <Target size={13} className="shrink-0 text-text-muted" /> },
        { label: t('aiVerdict.sub1_analysis', 'Phân tích vấn đề (Analysis)'), weight: '25%', actualValue: hasP1Details ? `${p1Anal!.toFixed(0)}` : '--', icon: <Zap size={13} className="shrink-0 text-text-muted" /> },
        { label: t('aiVerdict.sub1_solution', 'Giải pháp & Hướng tiếp cận (Solution)'), weight: '25%', actualValue: hasP1Details ? `${p1Arch!.toFixed(0)}` : '--', icon: <Layers size={13} className="shrink-0 text-text-muted" /> },
        { label: t('aiVerdict.sub1_deliverables', 'Sản phẩm bàn giao (Deliverables)'), weight: '15%', actualValue: hasP1Details ? `${p1Deliv!.toFixed(0)}` : '--', icon: <Wrench size={13} className="shrink-0 text-text-muted" /> },
        { label: t('aiVerdict.sub1_scope', 'Giả định & Ngoài phạm vi (Scope)'), weight: '10%', actualValue: hasP1Details ? `${p1Scope!.toFixed(0)}` : '--', icon: <ShieldCheck size={13} className="shrink-0 text-text-muted" /> },
      ],
      note: t('aiVerdict.pillar1Note', 'Scores the 6 core proposal text sections. Excludes proposed milestone plan (scored separately in Pillar 4).'),
      explanation: renderFormattedExplanation(getPillarComment('technical_solution', pillarScores.technical_solution), 'technical_solution'),
    },
    {
      key: 'screening_qa',
      title: t('aiVerdict.pillar2Title', 'Screening Q&A Accuracy & Reasoning'),
      shortTitle: t('aiVerdict.pillar2Short', 'Screening Q&A'),
      weight: '30%',
      icon: <HelpCircle size={14} className="shrink-0 text-text-primary" />,
      score: pillarScores.screening_qa,
      gradientId: 'p2ArcGrad',
      gradientFrom: '#f59e0b',
      gradientTo: '#eab308',
      glowColor: 'rgba(245, 158, 11, 0.2)',
      scoreColorClass: 'text-text-primary',
      borderHoverClass: 'hover:border-border',
      accentBorderClass: 'border-border',
      badgeBgClass: 'bg-surface-muted text-text-primary border-border font-black',
      formula: 'Score = Avg(0.40×Correctness + 0.25×Reasoning + 0.15×Relevance + 0.10×Depth + 0.10×Examples)',
      actualCalculation: calcP2String,
      items: [
        { label: t('aiVerdict.sub2_correctness', 'Answer Correctness'), weight: '40%', actualValue: hasQaDetails ? `${p2Correct!.toFixed(0)}` : (qaList.length === 0 ? '0' : '--'), icon: <CheckCircle2 size={13} className="shrink-0 text-text-muted" /> },
        { label: t('aiVerdict.sub2_reasoning', 'Technical Reasoning'), weight: '25%', actualValue: hasQaDetails ? `${p2Reasoning!.toFixed(0)}` : (qaList.length === 0 ? '0' : '--'), icon: <Brain size={13} className="shrink-0 text-text-muted" /> },
        { label: t('aiVerdict.sub2_relevance', 'Question Relevance'), weight: '15%', actualValue: hasQaDetails ? `${p2Relevance!.toFixed(0)}` : (qaList.length === 0 ? '0' : '--'), icon: <Target size={13} className="shrink-0 text-text-muted" /> },
        { label: t('aiVerdict.sub2_depth', 'Technical Depth'), weight: '10%', actualValue: hasQaDetails ? `${p2Depth!.toFixed(0)}` : (qaList.length === 0 ? '0' : '--'), icon: <Search size={13} className="shrink-0 text-text-muted" /> },
        { label: t('aiVerdict.sub2_examples', 'Practical Examples'), weight: '10%', actualValue: hasQaDetails ? `${p2Examples!.toFixed(0)}` : (qaList.length === 0 ? '0' : '--'), icon: <Lightbulb size={13} className="shrink-0 text-text-muted" /> },
      ],
      note: t('aiVerdict.pillar2Note', 'Averages candidate screening answer quality across all questions.'),
      explanation: renderFormattedExplanation(getPillarComment('screening_qa', pillarScores.screening_qa), 'screening_qa'),
    },
    {
      key: 'financial_value',
      title: t('aiVerdict.pillar3Title', 'Financial & Pricing Value'),
      shortTitle: t('aiVerdict.pillar3Short', 'Financial & Pricing'),
      weight: '20%',
      icon: <DollarSign size={14} className="shrink-0 text-text-primary" />,
      score: pillarScores.financial_value,
      gradientId: 'p3ArcGrad',
      gradientFrom: '#10b981',
      gradientTo: '#06b6d4',
      glowColor: 'rgba(16, 185, 129, 0.2)',
      scoreColorClass: 'text-text-primary',
      borderHoverClass: 'hover:border-border',
      accentBorderClass: 'border-border',
      badgeBgClass: 'bg-surface-muted text-text-primary border-border font-black',
      formula: 'Score = 0.50×Budget Savings + 0.50×Pricing Realism',
      actualCalculation: calcP3String,
      items: [
        { label: t('aiVerdict.sub3_savings', 'Budget Savings Ratio'), weight: '50%', actualValue: hasP3Details ? `${p3SavingsScore!.toFixed(0)}` : '--', icon: <DollarSign size={13} className="shrink-0 text-text-muted" /> },
        { label: t('aiVerdict.sub3_realism', 'AI Pricing Realism'), weight: '50%', actualValue: hasP3Details ? `${p3RealismScore!.toFixed(0)}` : '--', icon: <Tag size={13} className="shrink-0 text-text-muted" /> },
      ],
      note: t('aiVerdict.pillar3Note', '100% pure financial score based on budget savings ratio and AI pricing realism.'),
      explanation: renderFormattedExplanation(getPillarComment('financial_value', pillarScores.financial_value), 'financial_value'),
    },
    {
      key: 'milestone_scope',
      title: t('aiVerdict.pillar4Title', 'Milestone Scope & Timeline Feasibility'),
      shortTitle: t('aiVerdict.pillar4Short', 'Scope & Timeline'),
      weight: '15%',
      icon: <ClipboardList size={14} className="shrink-0 text-text-primary" />,
      score: pillarScores.milestone_scope,
      gradientId: 'p4ArcGrad',
      gradientFrom: '#494be7',
      gradientTo: '#38bdf8',
      glowColor: 'rgba(73, 75, 231, 0.2)',
      scoreColorClass: 'text-text-primary',
      borderHoverClass: 'hover:border-border',
      accentBorderClass: 'border-border',
      badgeBgClass: 'bg-surface-muted text-text-primary border-border font-black',
      formula: 'Score = 0.40×Scope Coverage + 0.30×Milestone Structure + 0.30×Timeline Realism',
      actualCalculation: calcP4String,
      items: [
        { label: t('aiVerdict.sub4_scope', 'Scope Completeness %'), weight: '40%', actualValue: `${p4ScopeScore.toFixed(0)}%`, icon: <ClipboardList size={13} className="shrink-0 text-text-muted" /> },
        { label: t('aiVerdict.sub4_structure', 'Milestone Structure & Granularity'), weight: '30%', actualValue: hasP4Details ? `${p4StructScore!.toFixed(0)}` : '--', icon: <Milestone size={13} className="shrink-0 text-text-muted" /> },
        { label: t('aiVerdict.sub4_timeline', 'Timeline Feasibility & Velocity'), weight: '30%', actualValue: hasP4Details ? `${p4TimeScore!.toFixed(0)}` : '--', icon: <Clock size={13} className="shrink-0 text-text-muted" /> },
      ],
      note: t('aiVerdict.pillar4Note', 'Evaluates requirement scope coverage, milestone breakdown granularity, and duration velocity realism.'),
      explanation: renderFormattedExplanation(getPillarComment('milestone_scope', pillarScores.milestone_scope), 'milestone_scope'),
    },
  ];

  return (
    <div className="conic-border-wrap conic-border-card rounded-2xl w-full">
      <div className="conic-border-card-inner rounded-[calc(1rem-1.5px)] bg-surface-card p-4 sm:p-6 space-y-5.5 shadow-sm w-full">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <MetricCalculationTooltip
            title={t('aiVerdict.technicalQualityScore', 'Technical Quality Score (TQ)')}
            formula="TQ = 0.35×Tech + 0.30×Q&A + 0.20×Financial + 0.15×Scope"
            actualCalculation={calcTqString}
            items={[
              { label: t('aiVerdict.pillar1Short', 'Technical Solution'), weight: '35%', actualValue: `${pillarScores.technical_solution.toFixed(1)}`, icon: <Wrench size={13} className="shrink-0 text-text-muted" /> },
              { label: t('aiVerdict.pillar2Short', 'Screening Q&A'), weight: '30%', actualValue: `${pillarScores.screening_qa.toFixed(1)}`, icon: <HelpCircle size={13} className="shrink-0 text-text-muted" /> },
              { label: t('aiVerdict.pillar3Short', 'Financial Value'), weight: '20%', actualValue: `${pillarScores.financial_value.toFixed(1)}`, icon: <DollarSign size={13} className="shrink-0 text-text-muted" /> },
              { label: t('aiVerdict.pillar4Short', 'Milestone Scope'), weight: '15%', actualValue: `${pillarScores.milestone_scope.toFixed(1)}`, icon: <ClipboardList size={13} className="shrink-0 text-text-muted" /> },
            ]}
            note="Deterministic 4-pillar weighted sum computed in Python."
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-muted shrink-0 font-black text-2xl text-text-primary shadow-xs transition-transform hover:scale-105"
            >
              {tq.toFixed(1)}
            </div>
          </MetricCalculationTooltip>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-muted">
                {t('aiVerdict.technicalQuality', 'Technical Quality')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-black bg-surface-muted border border-border text-text-primary">
                <span className={`w-2 h-2 rounded-full ${tq >= 75 ? 'bg-emerald-500' : tq >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                {band}
              </span>
            </div>
            <MetricCalculationTooltip
              title={t('aiVerdict.valueScore', 'Value Score (VS)')}
              formula="VS = min(100, TQ × (1 + 0.5 × Savings Ratio))"
              actualCalculation={calcVsString}
              items={[
                { label: 'Base Quality Score (TQ)', weight: '100%', actualValue: `${tq.toFixed(1)}`, icon: <Award size={13} className="shrink-0 text-text-muted" /> },
                { label: 'Savings Boost Factor', weight: '+0.5 × Savings%', actualValue: `+${(savingsPct * 0.5).toFixed(1)}%`, icon: <TrendingUp size={13} className="shrink-0 text-text-muted" /> },
              ]}
              note="Capped at a maximum of 100.0."
            >
              <p className="text-xs sm:text-sm font-bold text-text-primary mt-1 flex items-center gap-1.5">
                {t('aiVerdict.valueScoreLabel', 'Value Score (VS):')} <strong className="text-text-primary font-black text-sm sm:text-base">{vs.toFixed(1)} / 100</strong>
                <HelpCircle size={13} className="text-text-muted hover:text-brand" />
              </p>
            </MetricCalculationTooltip>
          </div>
        </div>

        {/* Verdict Badge */}
        <div>{renderBadge()}</div>
      </div>

      {/* Recruiter Top Decision KPI Cards with Tooltips (Equal width & height) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm w-full items-stretch">
        <MetricCalculationTooltip
          title={t('aiVerdict.reqCoverageTooltipTitle', 'Requirement Coverage %')}
          align="left"
          className="w-full h-full flex flex-col"
          formula="Coverage % = (Fulfilled Reqs / Total Reqs) × 100%"
          actualCalculation={calcCoverageString}
          items={[
            { label: t('aiVerdict.reqsFulfilled', 'Requirements Fulfilled'), weight: `${scopePct.toFixed(0)}%`, actualValue: totalReqs > 0 ? `${fulfilledReqs}/${totalReqs}` : `${scopePct.toFixed(0)}%`, icon: <CheckCircle2 size={13} className="shrink-0 text-text-muted" /> },
          ]}
          note={t('aiVerdict.reqCoverageNote', 'Evaluates how completely candidate proposal covers client job description.')}
        >
          <div className="w-full h-full flex flex-col justify-between rounded-xl border border-border/60 bg-surface-muted/60 p-3.5 sm:p-4 text-center transition-all hover:border-border">
            <span className="text-xs sm:text-sm font-black uppercase text-text-muted flex items-center justify-center gap-1.5 min-h-[22px] truncate">
              <CheckCircle2 size={14} className="text-brand shrink-0" /> {t('aiVerdict.reqCoverage', 'Requirement Coverage')}
            </span>
            <strong className="text-text-primary font-black text-xl sm:text-2xl block my-auto py-1">
              {scopePct.toFixed(0)}%
            </strong>
            <span className="block text-xs font-semibold text-text-muted mt-auto">{t('aiVerdict.reqScopeFulfilled', 'Req. Scope Fulfilled')}</span>
          </div>
        </MetricCalculationTooltip>

        <MetricCalculationTooltip
          title={t('aiVerdict.budgetSavingsTooltipTitle', 'Budget Savings %')}
          align="center"
          className="w-full h-full flex flex-col"
          formula="Savings % = max(0, (Max Budget - Proposed) / Max Budget)"
          actualCalculation={calcSavingsString}
          items={[
            { label: t('aiVerdict.clientMaxBudget', 'Client Max Budget'), weight: 'Baseline', actualValue: maxBudget > 0 ? formatMoney(maxBudget) : 'N/A', icon: <DollarSign size={13} className="shrink-0 text-text-muted" /> },
            { label: t('aiVerdict.candidateOffer', 'Candidate Offer'), weight: 'Proposed', actualValue: formatMoney(proposedBudget), icon: <Tag size={13} className="shrink-0 text-text-muted" /> },
          ]}
          note={t('aiVerdict.budgetSavingsNote', 'Measures budget savings percentage relative to job budget cap.')}
        >
          <div className="w-full h-full flex flex-col justify-between rounded-xl border border-border/60 bg-surface-muted/60 p-3.5 sm:p-4 text-center transition-all hover:border-border">
            <span className="text-xs sm:text-sm font-black uppercase text-text-muted flex items-center justify-center gap-1.5 min-h-[22px] truncate">
              <Percent size={14} className="text-emerald-500 shrink-0" /> {t('aiVerdict.budgetSavings', 'Budget Savings')}
            </span>
            <strong className="text-text-primary font-black text-xl sm:text-2xl block my-auto py-1">
              {savingsPct > 0 ? `${savingsPct.toFixed(1)}%` : '0%'}
            </strong>
            <span className="block text-xs font-semibold text-text-muted mt-auto">{t('aiVerdict.vsClientBudget', 'Vs. Client Budget')}</span>
          </div>
        </MetricCalculationTooltip>

        <MetricCalculationTooltip
          title={t('aiVerdict.overallQualityScoreTooltipTitle', 'Overall Quality Score')}
          align="right"
          className="w-full h-full flex flex-col"
          formula="TQ = 35% Tech + 30% Q&A + 20% Financial + 15% Scope"
          actualCalculation={calcTqString}
          items={[
            { label: t('aiVerdict.pillar1Short', 'Technical Solution'), weight: '35%', actualValue: `${pillarScores.technical_solution.toFixed(1)}`, icon: <Wrench size={13} className="shrink-0 text-text-muted" /> },
            { label: t('aiVerdict.pillar2Short', 'Screening Q&A'), weight: '30%', actualValue: `${pillarScores.screening_qa.toFixed(1)}`, icon: <HelpCircle size={13} className="shrink-0 text-text-muted" /> },
            { label: t('aiVerdict.pillar3Short', 'Financial Value'), weight: '20%', actualValue: `${pillarScores.financial_value.toFixed(1)}`, icon: <DollarSign size={13} className="shrink-0 text-text-muted" /> },
            { label: t('aiVerdict.pillar4Short', 'Scope & Deliverables'), weight: '15%', actualValue: `${pillarScores.milestone_scope.toFixed(1)}`, icon: <ClipboardList size={13} className="shrink-0 text-text-muted" /> },
          ]}
          note={t('aiVerdict.overallQualityScoreNote', 'Main technical quality assessment score.')}
        >
          <div className="w-full h-full flex flex-col justify-between rounded-xl border border-border/60 bg-surface-muted/60 p-3.5 sm:p-4 text-center transition-all hover:border-border">
            <span className="text-xs sm:text-sm font-black uppercase text-text-muted flex items-center justify-center gap-1.5 min-h-[22px] truncate">
              <Award size={14} className="text-purple-500 shrink-0" /> {t('aiVerdict.qualityScore', 'Quality Score')}
            </span>
            <strong className="text-text-primary font-black text-xl sm:text-2xl block my-auto py-1">
              {tq.toFixed(1)}
            </strong>
            <span className="block text-xs font-semibold text-text-muted mt-auto">{t('aiVerdict.weighted4Pillar', 'Weighted 4-Pillar Score')}</span>
          </div>
        </MetricCalculationTooltip>
      </div>

      {/* Executive Decision Rationale / Key Concerns Summary Box */}
      {keyReasons.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface-muted p-4 space-y-2.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="font-black uppercase tracking-wider text-xs sm:text-sm flex items-center gap-2 text-text-primary">
              {tq < 60 ? (
                <>
                  <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                  {t('aiVerdict.whyHighRisk', 'WHY THIS CANDIDATE IS HIGH RISK')}
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  {t('aiVerdict.executiveSummary', 'EXECUTIVE DECISION SUMMARY')}
                </>
              )}
            </span>
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
              {t('aiVerdict.recruiterInsightBadge', 'Recruiter Insight')}
            </span>
          </div>

          <ul className="space-y-2 font-medium pl-1 text-xs sm:text-sm">
            {keyReasons.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 leading-relaxed text-text-primary">
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

      {/* 4-Pillar Score Visual Breakdown with Interactive Expandable Spotlight Feature */}
      <div className="space-y-3.5 pt-1">
        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-muted flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <TrendingUp size={15} className="text-purple-500 shrink-0" />
            {t('aiVerdict.4pillarTitle', '4-Pillar Candidate Evaluation Breakdown')}
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-text-muted bg-surface-muted px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-border/50">
            <Maximize2 size={12} className="text-purple-500 shrink-0" /> {t('aiVerdict.expandHint', 'Bấm biểu tượng mở rộng để xem công thức & giải thích AI')}
          </span>
        </h4>

        {/* ── EXPANDED VIEW: Spotlight active card on top, 3 others pushed below ── */}
        {expandedPillar ? (() => {
          const activePillar = pillarsData.find((p) => p.key === expandedPillar) || pillarsData[0];
          const otherPillars = pillarsData.filter((p) => p.key !== expandedPillar);

          return (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Active Expanded Card */}
              <div className={`rounded-2xl border-2 ${activePillar.accentBorderClass} bg-surface-card p-4 sm:p-5 shadow-lg space-y-4 transition-all`}>
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base sm:text-lg font-black text-text-primary flex items-center gap-2">
                      <span>{activePillar.icon}</span>
                      <span>{activePillar.title}</span>
                    </span>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${activePillar.badgeBgClass}`}>
                      {t('aiVerdict.weightLabel', 'Trọng số:')} {activePillar.weight}
                    </span>
                    <span className="text-[11px] font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles size={11} /> {t('aiVerdict.expandingDetails', 'Đang mở rộng chi tiết')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedPillar(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-muted hover:bg-surface-hover text-text-primary text-xs font-black transition cursor-pointer shadow-2xs hover:border-brand/40"
                    title={t('aiVerdict.collapse', 'Thu gọn')}
                  >
                    <Minimize2 size={13} className="text-text-muted" />
                    <span>{t('aiVerdict.collapse', 'Thu gọn')}</span>
                  </button>
                </div>

                {/* Expanded Details Body */}
                <div className="flex flex-col lg:flex-row items-stretch gap-4">
                  {/* Left Column: Arc Gauge & Score Tile */}
                  <div className="lg:w-56 shrink-0 flex flex-col items-center justify-center p-4 rounded-2xl bg-surface-muted/30 border border-border/50 text-center">
                    <PillarArcGauge
                      score={activePillar.score}
                      gradientId={`${activePillar.gradientId}_exp`}
                      gradientFrom={activePillar.gradientFrom}
                      gradientTo={activePillar.gradientTo}
                      glowColor={activePillar.glowColor}
                      scoreColorClass={activePillar.scoreColorClass}
                    />
                    <div className="mt-2 text-center space-y-0.5">
                      <span className="text-xs font-extrabold text-text-muted block">
                        {t('aiVerdict.standardScore', 'Điểm số tiêu chuẩn')}
                      </span>
                      <strong className={`text-sm font-black ${activePillar.scoreColorClass}`}>
                        {activePillar.score >= 80
                          ? t('aiVerdict.excellent', 'Xuất sắc')
                          : activePillar.score >= 60
                          ? t('aiVerdict.satisfactory', 'Đạt chuẩn')
                          : t('aiVerdict.attentionNeeded', 'Cần lưu ý')}
                      </strong>
                    </div>
                  </div>

                  {/* Right Column: 2 Panels (Hover Calculation & ? AI Explanation) */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Panel 1: Công thức & Dữ liệu tính toán (Nội dung hover trước đây) */}
                    <div className="rounded-2xl bg-surface-card border border-border p-3.5 sm:p-4 space-y-3 text-xs flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                          <span className="font-black text-xs sm:text-sm text-text-primary flex items-center gap-1.5">
                            <Calculator size={14} className="text-brand shrink-0" />
                            {t('aiVerdict.formulaAndData', 'Công thức & Tính toán số thực')}
                          </span>
                          <span className="text-[11px] font-black text-text-primary bg-surface-muted border border-border px-2 py-0.5 rounded-full">
                            {t('aiVerdict.weightShare', 'Tỷ trọng {{weight}}', { weight: activePillar.weight })}
                          </span>
                        </div>

                        {/* Formula Box */}
                        <div className="rounded-xl bg-surface-muted border border-border p-2.5 text-xs font-mono font-bold text-text-primary leading-relaxed">
                          <span className="flex items-center gap-1 text-[10px] font-sans font-black uppercase text-text-muted tracking-wider mb-0.5">
                            <Calculator size={12} className="shrink-0" /> Calculation Formula
                          </span>
                          {activePillar.formula}
                        </div>

                        {/* Live Calculation Box */}
                        {activePillar.actualCalculation && (
                          <div className="rounded-xl bg-surface-muted border border-border p-2.5 text-xs font-mono font-bold text-text-primary leading-relaxed shadow-2xs">
                            <span className="flex items-center gap-1 text-[10px] font-sans font-black uppercase text-text-muted tracking-wider mb-0.5">
                              <Calculator size={12} className="shrink-0" /> Live Real-Number Calculation
                            </span>
                            {activePillar.actualCalculation}
                          </div>
                        )}

                        {/* Subcriteria Breakdown */}
                        {activePillar.items.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="block text-[10px] sm:text-xs font-black uppercase text-text-muted tracking-wider">
                              {t('aiVerdict.subcriteriaCount', 'Tiêu chí con cấu thành ({{count}})', { count: activePillar.items.length })}
                            </span>
                            <ul className="space-y-1 text-xs font-medium text-text-primary max-h-48 overflow-y-auto pr-0.5 custom-scrollbar">
                              {activePillar.items.map((item, idx) => (
                                <li key={idx} className="flex items-center justify-between bg-surface-muted/50 px-2.5 py-1.5 rounded-lg border border-border gap-2 text-text-primary">
                                  <span className="flex items-center gap-1.5 truncate">
                                    {item.icon && <span className="text-text-muted shrink-0">{item.icon}</span>}
                                    <span className="truncate">{item.label}</span>
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {item.actualValue && (
                                      <span className="text-[11px] font-mono font-bold text-text-primary bg-surface-card px-1.5 py-0.5 rounded border border-border">
                                        {item.actualValue}
                                      </span>
                                    )}
                                    <strong className="text-text-primary font-bold text-xs">{item.weight}</strong>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {activePillar.note && (
                        <p className="text-[11px] text-text-muted italic pt-2 border-t border-border/40 leading-snug flex items-start gap-1">
                          <Lightbulb size={12} className="shrink-0 mt-0.5 text-text-muted" />
                          <span>{activePillar.note}</span>
                        </p>
                      )}
                    </div>

                    {/* Panel 2: Nhận xét & Đánh giá từ AI (Nội dung ? trước đây) */}
                    <div className="rounded-2xl bg-surface-card border border-border p-3.5 sm:p-4 space-y-3 text-xs flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                          <span className="font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5 text-text-primary">
                            <Sparkles size={14} className="text-brand shrink-0" />
                            {t('aiVerdict.aiExplanationTitle', 'AI Explanation • Nhận xét chi tiết')}
                          </span>
                          <span className="text-[10px] font-bold text-text-muted bg-surface-muted px-2 py-0.5 rounded-full border border-border">
                            {t('aiVerdict.llmQualitative', 'Phân tích định tính LLM')}
                          </span>
                        </div>

                        <div className="leading-relaxed text-text-primary pt-1 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                          {activePillar.explanation}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-text-muted">
                        <span>{t('aiVerdict.autoEvaluated', 'Đánh giá tự động bởi hệ thống GigBridge AI')}</span>
                        <button
                          type="button"
                          onClick={() => setExpandedPillar(null)}
                          className="text-brand hover:underline font-bold"
                        >
                          {t('aiVerdict.collapseArrow', 'Thu gọn ↑')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Thẻ còn lại được đẩy xuống bên dưới */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <span>{t('aiVerdict.other3Pillars', '3 Trụ đánh giá còn lại (Bấm để xem chi tiết):')}</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                  {otherPillars.map((pillar) => (
                    <div
                      key={pillar.key}
                      onClick={() => setExpandedPillar(pillar.key)}
                      className={`relative rounded-2xl border border-border bg-surface-card p-3.5 sm:p-4 flex flex-col justify-between transition-all ${pillar.borderHoverClass} hover:shadow-md cursor-pointer group`}
                    >
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/60">
                        <span className="text-xs font-black text-text-primary flex items-center gap-1.5 leading-snug truncate">
                          <span>{pillar.icon}</span>
                          <span className="truncate">{pillar.shortTitle}</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${pillar.badgeBgClass}`}>
                            {pillar.weight}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedPillar(pillar.key);
                            }}
                            title={t('aiVerdict.clickToExpand', 'Bấm mở rộng chi tiết')}
                            className="w-6 h-6 rounded-full flex items-center justify-center bg-surface-muted text-text-muted hover:text-brand hover:bg-surface-hover border border-border transition cursor-pointer"
                          >
                            <Maximize2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 pb-1 flex flex-col items-center">
                        <PillarArcGauge
                          score={pillar.score}
                          gradientId={`${pillar.gradientId}_other`}
                          gradientFrom={pillar.gradientFrom}
                          gradientTo={pillar.gradientTo}
                          glowColor={pillar.glowColor}
                          scoreColorClass={pillar.scoreColorClass}
                        />
                        <span className="text-[11px] font-bold text-text-muted mt-1 flex items-center gap-1 opacity-80 group-hover:opacity-100 group-hover:text-brand transition">
                          <Maximize2 size={12} />
                          <span>{t('aiVerdict.clickToExpand', 'Bấm mở rộng chi tiết')}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })() : (
          /* ── COLLAPSED 4-CARD OVERVIEW ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {pillarsData.map((pillar) => (
              <div
                key={pillar.key}
                onClick={() => setExpandedPillar(pillar.key)}
                className={`relative rounded-2xl border border-border bg-surface-card p-3.5 sm:p-4 flex flex-col justify-between transition-all ${pillar.borderHoverClass} hover:shadow-md cursor-pointer group`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/60">
                  <span className="text-xs font-black text-text-primary flex items-center gap-1.5 leading-snug truncate">
                    <span>{pillar.icon}</span>
                    <span className="truncate">{pillar.shortTitle}</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${pillar.badgeBgClass}`}>
                      {pillar.weight}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedPillar(pillar.key);
                      }}
                      title={t('aiVerdict.clickToExpand', 'Bấm mở rộng chi tiết')}
                      className="w-6 h-6 rounded-full flex items-center justify-center bg-surface-muted text-text-muted hover:text-brand hover:bg-surface-hover border border-border transition cursor-pointer"
                    >
                      <Maximize2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Arc Gauge & Expand Button */}
                <div className="pt-2 pb-1 flex flex-col items-center">
                  <PillarArcGauge
                    score={pillar.score}
                    gradientId={pillar.gradientId}
                    gradientFrom={pillar.gradientFrom}
                    gradientTo={pillar.gradientTo}
                    glowColor={pillar.glowColor}
                    scoreColorClass={pillar.scoreColorClass}
                  />
                  <span className="text-[11px] font-bold text-text-muted mt-1 flex items-center gap-1 opacity-80 group-hover:opacity-100 group-hover:text-brand transition">
                    <Maximize2 size={12} />
                    <span>{t('aiVerdict.clickToExpand', 'Bấm mở rộng chi tiết')}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Recruiter Insight & Answer Quality (Diagnostic Feedback) */}
      <div className="rounded-2xl border border-border bg-surface-muted/40 p-4 space-y-3.5 text-xs sm:text-sm shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <MetricCalculationTooltip
              title="AI Recruiter Insight & Answer Quality"
              formula="Diagnostic feedback — Does not alter overall VS score math"
              items={[
                { label: 'Project Specificity', weight: 'Evaluated', icon: <Target size={13} className="shrink-0 text-text-muted" /> },
                { label: 'Substance Density', weight: 'Evaluated', icon: <Search size={13} className="shrink-0 text-text-muted" /> },
              ]}
              note="Measures technical specificity vs. generic copy-paste text to assist recruiter screening."
              align="left"
              placement="top"
            >
              <span className="font-black uppercase tracking-wider text-xs sm:text-sm text-text-primary flex items-center gap-1.5 cursor-pointer hover:text-brand transition">
                <Bot size={16} className="text-text-primary shrink-0" />
                {t('aiVerdict.recruiterInsightTitle', 'AI Recruiter Insight & Answer Quality')}
                <HelpCircle size={13} className="text-text-muted" />
              </span>
            </MetricCalculationTooltip>
            <span className="text-[11px] font-bold text-text-muted bg-surface-card px-2.5 py-0.5 rounded-full border border-border/40">
              {t('aiVerdict.diagnosticFeedback', '(Diagnostic Feedback — Does not alter overall VS score)')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {aiGeneratedQA && (
              <span className="rounded-full px-3 py-1 text-xs font-black bg-surface-card text-text-primary border border-border shadow-2xs flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber-500 shrink-0" /> {t('aiVerdict.aiTextFlagged', 'AI-Generated Text Flagged')}
              </span>
            )}
            <span className="rounded-full px-3 py-1 text-xs font-black bg-surface-card text-text-primary border border-border shadow-2xs flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${pillarScores.authenticity_fluff >= 70 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {pillarScores.authenticity_fluff >= 70
                ? t('aiVerdict.statusClear', 'Candidate Response Status: Clear & Detailed')
                : t('aiVerdict.statusVague', 'Candidate Response Status: Vague / Needs Technical Clarification')}
            </span>
          </div>
        </div>

        {/* AI Generator Detection Warning Notice Box */}
        {aiGeneratedQA && (
          <div className="bg-surface-card border border-border p-3.5 rounded-xl space-y-1">
            <span className="block text-xs font-black uppercase text-text-primary tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-amber-500 shrink-0" />
              {t('aiVerdict.aiGeneratorNotice', 'AI Generator Detection Notice (ChatGPT / Boilerplate Signature Flagged)')}
            </span>
            <p className="text-xs sm:text-sm text-text-primary leading-relaxed">
              {aiGeneratedQA.ai_detection_reason || t('aiVerdict.aiDetectionDefault', 'AI-generated response patterns detected (stereotypical ChatGPT intro phrases, uniform bold lead-in lists, and lack of personal project experience).')}
            </p>
          </div>
        )}

        {/* Single Cohesive AI Summary Narrative Comment (Compliment or Complaint) */}
        <div className="bg-surface-card p-3.5 rounded-xl border border-border space-y-1.5">
          <span className="block text-xs font-black uppercase text-text-primary tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-brand shrink-0" />
            {t('aiVerdict.recruiterSummaryComment', 'AI Recruiter Summary Comment')}
          </span>
          <p className="text-xs sm:text-sm text-text-primary leading-relaxed font-normal">
            {summaryComment}
          </p>
        </div>

        {/* Formatted Numbered List of Points/Problems Candidate Must Clarify */}
        {probingQuestionsList.length > 0 && (
          <div className="bg-surface-card p-3.5 rounded-xl border border-border space-y-2">
            <MetricCalculationTooltip
              title="Interview Clarification Points"
              formula="AI highlights specific weak or vague answers that need recruiter validation"
              items={[
                { label: 'Identified Clarifications', weight: `${probingQuestionsList.length} items`, icon: <AlertTriangle size={13} className="text-rose-500 shrink-0" /> },
              ]}
              note="Ask candidate to explain these items in technical interview to verify hands-on expertise."
              placement="top"
              align="left"
            >
              <span className="inline-flex items-center gap-1.5 font-black text-xs uppercase text-text-primary tracking-wider cursor-pointer hover:text-brand transition">
                <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                {t('aiVerdict.keyPointsClarify', 'Key Points Candidate Must Clarify in Interview')}
                <HelpCircle size={13} className="text-text-muted" />
              </span>
            </MetricCalculationTooltip>
            <ol className="space-y-1.5 text-xs sm:text-sm font-medium text-text-primary pl-1">
              {probingQuestionsList.map((probItem, pIdx) => {
                const cleanedText = probItem.replace(/^Problem\s*#?\d*:\s*/i, '').replace(/^\d+\.\s*/, '');
                return (
                  <li key={pIdx} className="flex items-start gap-2 leading-relaxed text-text-primary">
                    <strong className="text-text-primary font-black shrink-0">
                      {pIdx + 1}. {t('aiVerdict.problemPrefix', 'Problem')} #{pIdx + 1}:
                    </strong>
                    <span>{cleanedText}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
