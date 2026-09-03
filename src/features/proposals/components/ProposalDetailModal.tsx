import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  BriefcaseBusiness,
  Check,
  FileQuestion,
  FileText,
  Layers,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  X,
  Clock3,
  Calendar,
  Package,
  CheckCircle2,
  ChevronDown,
  Target,
  ClipboardList,
  HelpCircle,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { formatGigCoin, formatGigCoinToVnd, formatGigCoinNumber } from '../../../shared/utils/gigcoin';
import {
  ProposalStatus,
  type ProposalAnswerDto,
  type ProposalDetailDto,
  type ProposalDto,
  type ProposalMilestonePlanDto,
} from '../../../types/models/Proposal';
import { AIProposalVerdictCard } from './AIProposalVerdictCard';
import { AISideBySideMilestoneMatrix } from './AISideBySideMilestoneMatrix';
import { MilestonePlanComparison } from '../../../shared/components/MilestonePlanComparison';
import type { EditableMilestonePlan } from '../../../shared/components/NestedMilestonePlanEditor';
import { getCriteriaColorTheme } from '../utils/criteriaColors';
import '../../../shared/components/styles/conic-border-button.css';
import type { BusyAction } from '../hooks/useClientProposals';
import { getStatusLabel } from '../utils/statusHelpers';
import { useTranslation } from '../../../hooks/useTranslation';

export interface ProposalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeId: string | null;
  detail: ProposalDetailDto | null;
  detailLoading: boolean;
  detailError: string | null;
  proposals: ProposalDto[];
  detailMilestoneTotal: number;
  modalTab: 'userAnswers' | 'proposalDetails' | 'aiReport';
  setModalTab: (tab: 'userAnswers' | 'proposalDetails' | 'aiReport') => void;
  evalLoading: boolean;
  evalError: string | null;
  rawAnswers: ProposalAnswerDto[];
  originalMilestones?: any[] | null;
  jobPostBudgetMax?: number | null;
  jobPostDuration?: string | null;
  rejectProposalId: string | null;
  setRejectProposalId: (id: string | null) => void;
  selectedJobCanNegotiate: boolean;
  canClientAct: (status?: number) => boolean;
  isBusy: (id: string, action: BusyAction) => boolean;
  updateStatus: (id: string, status: ProposalStatus, actionKey: BusyAction) => void;
  acceptForNegotiation: (id: string) => void;
  openNegotiation: (id: string) => void;
  badgeClass: (status: number) => string;
  t: any;
  showAiReportTab?: boolean;
}

const getScoreColorClass = (score?: number | null) => {
  if (typeof score !== 'number') return 'border-border text-text-muted bg-surface-muted';
  if (score >= 80) return 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 font-black';
  if (score >= 60) return 'border-amber-500/40 text-amber-600 bg-amber-500/10 dark:text-amber-400 font-black';
  return 'border-rose-500/40 text-rose-600 bg-rose-500/10 dark:text-rose-400 font-black';
};

const getScoreTextColor = (score?: number | null) => {
  if (typeof score !== 'number') return 'text-text-muted';
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
};

function SubcriteriaDefinitionTooltip({
  title,
  titleEn: _titleEn,
  weight,
  score,
  definition,
  definitionEn: _definitionEn,
  align = 'auto',
  className = '',
  children,
}: {
  title: string;
  titleEn?: string;
  weight: string;
  score: number;
  definition: string;
  definitionEn?: string;
  align?: 'left' | 'center' | 'right' | 'auto';
  className?: string;
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = React.useState<'top' | 'bottom'>('top');
  const [computedAlign, setComputedAlign] = React.useState<'left' | 'center' | 'right'>(
    align === 'auto' ? 'center' : align
  );
  const { t } = useTranslation();

  const getScoreBadgeClass = (val: number) => {
    if (val >= 80) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    if (val >= 60) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
  };

  React.useLayoutEffect(() => {
    if (!isVisible || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    // Check vertical space (needs ~220px above)
    if (rect.top < 230) {
      setPlacement('bottom');
    } else {
      setPlacement('top');
    }

    if (align !== 'auto') {
      setComputedAlign(align);
      return;
    }

    // Dynamic horizontal collision detection
    const tooltipWidth = 300;
    const center = rect.left + rect.width / 2;
    if (center - tooltipWidth / 2 < 24) {
      setComputedAlign('left');
    } else if (center + tooltipWidth / 2 > window.innerWidth - 24) {
      setComputedAlign('right');
    } else {
      setComputedAlign('center');
    }
  }, [isVisible, align]);

  return (
    <div
      ref={containerRef}
      className={`relative group w-full h-full flex flex-col ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div
          className={`absolute ${
            placement === 'top' ? 'bottom-full mb-2.5' : 'top-full mt-2.5'
          } ${
            computedAlign === 'left'
              ? 'left-0'
              : computedAlign === 'right'
              ? 'right-0'
              : 'left-1/2 -translate-x-1/2'
          } w-72 sm:w-80 z-50 p-4 rounded-2xl border border-brand bg-surface shadow-2xl text-left pointer-events-none transition-all animate-in fade-in duration-150`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 mb-2">
            <span className="font-black text-xs text-text-primary flex items-center gap-1.5">
              <Target size={13} className="text-text-primary shrink-0" /> {title}
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted bg-surface-muted px-2 py-0.5 rounded-full border border-border/40">
              {t('proposalModal.weight', 'Weight:')} {weight}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-text-muted">
              {t('proposalModal.candidateScore', 'Candidate Score:')}
            </span>
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${getScoreBadgeClass(score)}`}>
              {score} / 100
            </span>
          </div>

          <div className="space-y-1">
            <span className="block text-[10px] font-black uppercase text-brand tracking-wider">
              {t('proposalModal.criteriaDesc', 'Criteria Description & AI Scoring:')}
            </span>
            <p className="text-xs text-text-primary font-normal leading-relaxed">
              {definition}
            </p>
          </div>

          {/* Dynamic Arrow */}
          <div
            className={`absolute ${
              placement === 'top'
                ? 'top-full -mt-[1px] border-t-brand border-x-transparent border-b-transparent'
                : 'bottom-full -mb-[1px] border-b-brand border-x-transparent border-t-transparent'
            } ${
              computedAlign === 'left'
                ? 'left-8'
                : computedAlign === 'right'
                ? 'right-8'
                : 'left-1/2 -translate-x-1/2'
            } w-0 h-0 border-solid border-4`}
          />
        </div>
      )}
    </div>
  );
}

const normalizeTextForMatching = (str: string) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractKeyWordsForMatching = (str: string) => {
  const stopWords = new Set([
    'with', 'that', 'this', 'from', 'have', 'your', 'will', 'then', 'into', 'each', 'such', 'their', 'them', 'both', 'only', 'also', 'and', 'for', 'the', 'project', 'system', 'more',
    'toi', 'se', 'bang', 'viec', 'cac', 'va', 'nhung', 'voi', 'cho', 'duoc', 'trong', 'theo', 'nhu', 'da', 'dang', 'cua', 'tai', 've', 'nay', 'do', 'thi', 'la', 'mot', 'cach'
  ]);
  const normalized = normalizeTextForMatching(str);
  return normalized
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w));
};

const renderAnnotatedDetailSection = (
  title: string,
  text?: string | null,
  highlights: Array<{ quote: string; requirement: string; criteriaIndex?: number }> = []
) => {
  if (!text || !text.trim()) return null;
  const trimmed = text.trim();

  if (!highlights || highlights.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-surface-card/60 p-4 sm:p-5 space-y-2.5 shadow-2xs">
        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-muted flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
          {title}
        </h4>
        <p className="text-sm sm:text-base text-text-primary leading-relaxed font-normal whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere]">{trimmed}</p>
      </div>
    );
  }

  // Split text into paragraphs/sentences for sentence/line-level matching
  const sentences = trimmed.split(/(?<=[.!?\n])\s+/);
  const matchedSentences: Array<{ sentence: string; requirement: string; criteriaIndex: number }> = [];

  sentences.forEach(sentence => {
    const cleanSentence = sentence.trim();
    if (cleanSentence.length < 4) return;

    const normSentence = normalizeTextForMatching(cleanSentence);
    const sentenceWords = extractKeyWordsForMatching(cleanSentence);

    for (const h of highlights) {
      const rawQuote = (h.quote || '').replace(/^["'\s]+|["'\s]+$/g, '').trim();
      const rawReq = (h.requirement || '').trim();

      const normQuote = normalizeTextForMatching(rawQuote);
      const normReq = normalizeTextForMatching(rawReq);

      // 1. Direct or normalized substring match (sentence contains quote/req OR quote/req contains sentence)
      const isDirectMatch =
        (normQuote.length >= 5 && (normSentence.includes(normQuote) || normQuote.includes(normSentence))) ||
        (normReq.length >= 6 && (normSentence.includes(normReq) || normReq.includes(normSentence)));

      // 2. Multi-token / Keyword Overlap Match (Unicode & Vietnamese / English safe)
      let isKeywordMatch = false;
      if (!isDirectMatch) {
        const reqWords = extractKeyWordsForMatching(rawReq + ' ' + rawQuote);
        if (reqWords.length >= 2 && sentenceWords.length >= 2) {
          const sentenceWordSet = new Set(sentenceWords);
          const matchCount = reqWords.filter(w => sentenceWordSet.has(w) || normSentence.includes(w)).length;
          if (matchCount >= Math.min(2, reqWords.length)) {
            isKeywordMatch = true;
          }
        }
      }

      if (isDirectMatch || isKeywordMatch) {
        matchedSentences.push({
          sentence: cleanSentence,
          requirement: h.requirement,
          criteriaIndex: h.criteriaIndex ?? 0,
        });
        break;
      }
    }
  });

  if (matchedSentences.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-surface-card/60 p-4 sm:p-5 space-y-2.5 shadow-2xs">
        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-muted flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
          {title}
        </h4>
        <p className="text-sm sm:text-base text-text-primary leading-relaxed font-normal whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere]">{trimmed}</p>
      </div>
    );
  }

  // Locate character positions for matched sentences in trimmed text
  const matchPositions: Array<{ start: number; end: number; requirement: string; criteriaIndex: number }> = [];
  let searchCursor = 0;

  matchedSentences.forEach(ms => {
    let pos = trimmed.indexOf(ms.sentence, searchCursor);
    if (pos === -1) {
      pos = trimmed.indexOf(ms.sentence);
    }
    if (pos !== -1) {
      matchPositions.push({
        start: pos,
        end: pos + ms.sentence.length,
        requirement: ms.requirement,
        criteriaIndex: ms.criteriaIndex,
      });
      searchCursor = Math.max(searchCursor, pos + ms.sentence.length);
    }
  });

  if (matchPositions.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-surface-card/60 p-4 sm:p-5 space-y-2.5 shadow-2xs">
        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-muted flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
          {title}
        </h4>
        <p className="text-sm sm:text-base text-text-primary leading-relaxed font-normal whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere]">{trimmed}</p>
      </div>
    );
  }

  // Sort match positions by start index
  matchPositions.sort((a, b) => a.start - b.start);

  // Group contiguous/adjacent sentence matches of the SAME requirement
  const groupedBlocks: Array<{ start: number; end: number; requirement: string; criteriaIndex: number }> = [];

  matchPositions.forEach(m => {
    if (groupedBlocks.length === 0) {
      groupedBlocks.push({ ...m });
      return;
    }

    const last = groupedBlocks[groupedBlocks.length - 1];
    const textBetween = trimmed.substring(last.end, m.start);
    const isAdjacent = textBetween.trim().length <= 2;

    if (last.requirement.toLowerCase() === m.requirement.toLowerCase() && isAdjacent) {
      // Merge contiguous sentences of the same requirement
      last.end = Math.max(last.end, m.end);
    } else if (m.start >= last.end) {
      groupedBlocks.push({ ...m });
    }
  });

  // Build annotated React elements with grouped contiguous <mark> blocks using criteria color themes
  let lastPos = 0;
  const elements: React.ReactNode[] = [];

  groupedBlocks.forEach((gb, idx) => {
    if (gb.start > lastPos) {
      elements.push(trimmed.substring(lastPos, gb.start));
    }
    const combinedText = trimmed.substring(gb.start, gb.end);
    const theme = getCriteriaColorTheme(gb.criteriaIndex);

    elements.push(
      <mark
        key={`mark-group-${idx}`}
        className={`${theme.bgMark} text-text-primary border-b-2 ${theme.borderMark} px-1.5 py-0.5 rounded-md font-medium transition-all inline shadow-2xs my-0.5`}
      >
        {combinedText}
        <span
          className={`inline-flex items-center gap-1 ml-1.5 px-2 py-0.5 rounded-md ${theme.pillBg} text-white text-[10px] font-black uppercase tracking-wider shadow-2xs align-baseline select-none`}
          title={`Khớp tiêu chí #${gb.criteriaIndex + 1}: ${gb.requirement}`}
        >
          <span>✓ #{gb.criteriaIndex + 1}</span>
          <span className="hidden sm:inline font-bold opacity-90 max-w-[140px] truncate">
            {gb.requirement}
          </span>
        </span>
      </mark>
    );
    lastPos = gb.end;
  });

  if (lastPos < trimmed.length) {
    elements.push(trimmed.substring(lastPos));
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-surface-card/60 p-4 sm:p-5 space-y-2.5 shadow-2xs">
      <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-muted flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
        {title}
      </h4>
      <div className="text-sm sm:text-base text-text-primary leading-relaxed font-normal whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere] space-y-1.5">
        {elements}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// PROPOSED MILESTONES COLLAPSIBLE SECTION COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const ProposedMilestonesSection: React.FC<{
  milestonePlans: ProposalMilestonePlanDto[];
}> = ({ milestonePlans }) => {
  const [isSectionOpen, setIsSectionOpen] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    milestonePlans.forEach((_, idx) => {
      initial[idx] = true;
    });
    return initial;
  });

  const toggleCard = (index: number) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allExpanded = milestonePlans.every((_, idx) => expandedCards[idx]);
    const next: Record<number, boolean> = {};
    milestonePlans.forEach((_, idx) => {
      next[idx] = !allExpanded;
    });
    setExpandedCards(next);
  };

  if (!milestonePlans || milestonePlans.length === 0) {
    return (
      <section className="space-y-3 pt-2">
        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Layers size={16} className="text-brand shrink-0" />
          Kế hoạch Milestone đề xuất
        </h4>
        <p className="text-sm text-text-muted italic bg-surface-muted/40 p-4 rounded-xl border border-dashed border-border text-center">
          Proposal không kèm kế hoạch milestone cụ thể.
        </p>
      </section>
    );
  }

  const totalAmount = milestonePlans.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
  const totalWorkItems = milestonePlans.reduce((acc, m) => acc + (m.workItems?.length || 0), 0);
  const allCardsExpanded = milestonePlans.every((_, idx) => expandedCards[idx]);

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-2xs overflow-hidden transition-all">
      {/* ─── 1. SECTION HEADER (CLICKABLE COLLAPSIBLE) ─── */}
      <div
        onClick={() => setIsSectionOpen(!isSectionOpen)}
        className="p-3.5 sm:p-4 bg-surface-muted/50 border-b border-border flex flex-wrap items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-surface-muted/80 transition-colors group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
            <Layers size={15} />
          </span>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary group-hover:text-brand transition-colors flex items-center gap-1.5 truncate">
              <span>Kế hoạch Milestone đề xuất</span>
              <ChevronDown
                size={16}
                className={`text-text-muted transition-transform duration-200 shrink-0 ${isSectionOpen ? 'rotate-180 text-brand' : ''}`}
              />
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <span className="font-semibold">{milestonePlans.length} mốc</span>
              {totalWorkItems > 0 && (
                <>
                  <span>•</span>
                  <span>{totalWorkItems} đầu việc WBS</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Action: Total Budget Badge + Expand/Collapse Toggle */}
        <div className="flex items-center gap-2 ml-auto" onClick={e => e.stopPropagation()}>
          <span className="inline-flex items-center gap-1.5 font-bold text-brand bg-brand/10 px-2.5 py-1 rounded-lg border border-brand/20 text-xs sm:text-sm shadow-2xs">
            <GCoinIcon size={13} />
            <span>{formatGigCoinNumber(totalAmount)} G-coin</span>
            <span className="text-[10px] font-normal text-text-muted hidden sm:inline">
              (≈ {formatGigCoinToVnd(totalAmount)})
            </span>
          </span>

          {isSectionOpen && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-[10.5px] font-bold text-text-muted hover:text-brand bg-surface border border-border px-2.5 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              {allCardsExpanded ? 'Thu gọn' : 'Mở rộng'}
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. SECTION CONTENT ─── */}
      {isSectionOpen && (
        <div className="p-3 sm:p-4 space-y-3 bg-surface/50">
          {milestonePlans.map((item, index) => {
            const milestoneAmount = Number(item.amount) || 0;
            const isExpanded = Boolean(expandedCards[index]);
            const workItemsCount = item.workItems?.length || 0;

            return (
              <div
                key={item.id || index}
                className={`rounded-xl border transition-all shadow-2xs overflow-hidden ${
                  isExpanded ? 'border-border bg-surface' : 'border-border/70 bg-surface-muted/20 hover:border-brand/40'
                }`}
              >
                {/* Milestone Row Header (Click to toggle) */}
                <div
                  onClick={() => toggleCard(index)}
                  className="p-3 flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none hover:bg-surface-hover/60 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 px-2 shrink-0 items-center justify-center rounded-md bg-gradient-to-r from-[var(--brand)] to-[#6366f1] text-white text-[10px] font-black shadow-2xs">
                      Mốc {index + 1}
                    </span>
                    <h5 className="text-xs sm:text-sm font-bold text-text-primary truncate">
                      {item.title || `Milestone ${index + 1}`}
                    </h5>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    {!isExpanded && item.estimatedDuration && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] text-text-muted font-semibold bg-surface px-2 py-0.5 rounded border border-border">
                        <Clock3 size={11} />
                        <span>{item.estimatedDuration}</span>
                      </span>
                    )}
                    {!isExpanded && workItemsCount > 0 && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] text-brand font-semibold bg-brand/5 px-2 py-0.5 rounded border border-brand/20">
                        <Layers size={11} />
                        <span>{workItemsCount} WBS</span>
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 font-bold text-brand bg-surface px-2 py-0.5 rounded-md border border-border text-xs">
                      <GCoinIcon size={12} />
                      <span>{formatGigCoinNumber(milestoneAmount)} G</span>
                    </span>

                    <ChevronDown
                      size={15}
                      className={`text-text-muted transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180 text-brand' : ''}`}
                    />
                  </div>
                </div>

                {/* Milestone Expanded Details */}
                {isExpanded && (
                  <div className="p-3.5 pt-0 space-y-3 border-t border-border/50 text-xs">
                    {/* Meta Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2.5 text-xs">
                      {item.estimatedDuration && (
                        <span className="inline-flex items-center gap-1 font-semibold bg-surface-muted px-2 py-1 rounded-md border border-border text-text-primary text-[11px]">
                          <Clock3 size={11} className="text-text-muted shrink-0" />
                          <span>Thời lượng: {item.estimatedDuration}</span>
                        </span>
                      )}
                      {item.dueDate && (
                        <span className="inline-flex items-center gap-1 font-semibold bg-surface-muted px-2 py-1 rounded-md border border-border text-text-primary text-[11px]">
                          <Calendar size={11} className="text-text-muted shrink-0" />
                          <span>Hạn chót: {item.dueDate}</span>
                        </span>
                      )}
                      {workItemsCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold bg-brand/5 px-2 py-1 rounded-md border border-brand/20 text-brand text-[11px]">
                          <Layers size={11} className="shrink-0" />
                          <span>{workItemsCount} đầu việc (WBS)</span>
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {item.description && (
                      <div className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap bg-surface-muted/30 p-2.5 rounded-lg border border-border/60">
                        {item.description}
                      </div>
                    )}

                    {/* Deliverables & Acceptance Criteria in 2 columns */}
                    {(item.deliverables || item.acceptanceCriteria) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.deliverables && (
                          <div className="rounded-lg bg-surface-muted/40 border border-border p-2.5 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                              <Package size={11} className="text-brand" />
                              Sản phẩm bàn giao
                            </span>
                            <p className="text-xs text-text-primary font-medium">{item.deliverables}</p>
                          </div>
                        )}

                        {item.acceptanceCriteria && (
                          <div className="rounded-lg bg-surface-muted/40 border border-border p-2.5 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-emerald-500" />
                              Tiêu chí nghiệm thu
                            </span>
                            <p className="text-xs text-text-primary font-medium">{item.acceptanceCriteria}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nested Work Items (WBS) */}
                    {workItemsCount > 0 && (
                      <div className="pt-2 border-t border-border/60 space-y-1.5">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                          <Layers size={11} className="text-brand" />
                          Chi tiết hạng mục công việc (WBS)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.workItems?.map((w, wIdx) => (
                            <div key={w.id || wIdx} className="rounded-lg border border-border bg-surface-muted/20 p-2 text-xs space-y-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <strong className="font-bold text-text-primary truncate">{w.title || `Hạng mục ${wIdx + 1}`}</strong>
                                {w.estimatedDuration && (
                                  <span className="text-[9.5px] text-text-muted font-semibold bg-surface px-1.5 py-0.5 rounded border border-border shrink-0">
                                    {w.estimatedDuration}
                                  </span>
                                )}
                              </div>
                              {w.description && <p className="text-[11px] text-text-muted line-clamp-2">{w.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export function ProposalDetailModal({
  isOpen,
  onClose,
  activeId,
  detail,
  detailLoading,
  detailError,
  proposals,
  detailMilestoneTotal: _detailMilestoneTotal,
  modalTab,
  setModalTab,
  evalLoading,
  evalError,
  rawAnswers,
  originalMilestones,
  jobPostBudgetMax,
  jobPostDuration,
  rejectProposalId,
  setRejectProposalId,
  selectedJobCanNegotiate,
  canClientAct,
  isBusy,
  updateStatus,
  acceptForNegotiation,
  openNegotiation,
  badgeClass,
  t,
  showAiReportTab = true,
}: ProposalDetailModalProps) {
  const activeProposal = proposals.find(p => p.proposalsId === activeId);

  const aiAuditData = useMemo(() => {
    if (!activeProposal?.aiFullEvaluationJson) return null;
    try {
      const parsed = JSON.parse(activeProposal.aiFullEvaluationJson);
      const reqFulfillment: any[] = parsed?.llm_qualitative_evaluation?.requirement_fulfillment || [];
      if (!reqFulfillment.length) return null;

      const totalReqs = reqFulfillment.length;
      const fulfilledCount = reqFulfillment.filter((r: any) => r.is_fulfilled).length;
      const scopeCoveragePct = totalReqs > 0 ? (fulfilledCount / totalReqs) * 100 : 0;

      const highlights = reqFulfillment
        .filter((r: any) => r.is_fulfilled)
        .map((r: any, idx: number) => ({
          quote: (r.evidence_quote || '').replace(/^"|"$/g, '').trim(),
          requirement: r.requirement,
          criteriaIndex: idx,
        }));

      return {
        totalReqs,
        fulfilledCount,
        scopeCoveragePct,
        highlights,
      };
    } catch {
      return null;
    }
  }, [activeProposal?.aiFullEvaluationJson]);

  const displayQuestions = useMemo(() => {
    if (activeProposal?.aiFullEvaluationJson) {
      try {
        const parsed = JSON.parse(activeProposal.aiFullEvaluationJson);
        const screeningQa = parsed?.llm_qualitative_evaluation?.screening_qa || [];
        if (screeningQa.length > 0) {
          return screeningQa.map((qa: any, idx: number) => {
            const correctness = qa.answer_correctness?.score ?? 0;
            const reasoning = qa.technical_reasoning?.score ?? 0;
            const relevance = qa.relevance?.score ?? 0;
            const depth = qa.depth?.score ?? 0;
            const examples = qa.practical_examples?.score ?? 0;

            const weightedScore = Math.round(
              correctness * 0.40 +
              reasoning * 0.25 +
              relevance * 0.15 +
              depth * 0.10 +
              examples * 0.10
            );

            const evidenceAssessment =
              qa.answer_correctness?.evidence?.[0]?.assessment ||
              qa.technical_reasoning?.evidence?.[0]?.assessment ||
              qa.relevance?.evidence?.[0]?.assessment ||
              'Technical quality assessment based on candidate response.';

            const claims = [
              ...(qa.answer_correctness?.evidence || []),
              ...(qa.technical_reasoning?.evidence || []),
            ].map((e: any) => e.claim).filter(Boolean);

            const displayNumber = idx + 1;
            const qIdx = idx + 1;

            const qualitativeFeedback =
              qa.qualitative_feedback ||
              (evidenceAssessment && evidenceAssessment !== 'Correct' && evidenceAssessment !== 'Incorrect'
                ? evidenceAssessment
                : 'Đánh giá kỹ thuật chi tiết dựa trên mức độ chính xác, tính thực tiễn và lập luận của ứng viên.');

            const isAiGenerated = Boolean(qa.is_ai_generated);
            const aiDetectionReason = qa.ai_detection_reason || null;

            return {
              questionIndex: qIdx,
              displayNumber,
              questionText: (qa.question_text || '').replace(/^\d+[\.\s\-]+/, '').trim() || qa.question_text || `Question #${displayNumber}`,
              candidateAnswer: qa.candidate_answer || 'No answer provided',
              overallScore: weightedScore,
              subcriteria: {
                correctness: Math.round(correctness),
                reasoning: Math.round(reasoning),
                relevance: Math.round(relevance),
                depth: Math.round(depth),
                examples: Math.round(examples),
              },
              evidenceAssessment,
              qualitativeFeedback,
              isAiGenerated,
              aiDetectionReason,
              claims,
            };
          });
        }
      } catch (e) {
        console.error('Failed to parse aiFullEvaluationJson screening_qa', e);
      }
    }

    // Fallback: If candidate submitted screening answers (rawAnswers), display them with AI Technical Quality score
    if (rawAnswers && rawAnswers.length > 0) {
      const answersWithText = rawAnswers.filter(a => a.answerText?.trim());
      if (answersWithText.length > 0) {
        const defaultScore = activeProposal?.aiTechnicalQualityScore ? Math.round(activeProposal.aiTechnicalQualityScore) : 75;
        return answersWithText.slice().sort((a, b) => a.orderIndex - b.orderIndex).map((ans, idx) => {
          const displayNumber = ans.orderIndex || (idx + 1);
          return {
            questionIndex: displayNumber,
            displayNumber,
            questionText: (ans.questionText || '').replace(/^\d+[\.\s\-]+/, '').trim() || ans.questionText || `Question #${displayNumber}`,
            candidateAnswer: ans.answerText || 'No answer provided',
            overallScore: defaultScore,
            subcriteria: {
              correctness: defaultScore,
              reasoning: defaultScore,
              relevance: defaultScore,
              depth: defaultScore,
              examples: defaultScore,
            },
            evidenceAssessment: 'Detailed technical score computed from candidate screening answer.',
            claims: [],
          };
        });
      }
    }

    return [];
  }, [activeProposal, rawAnswers]);

  const pillar2Score = useMemo(() => {
    if (!activeProposal?.aiFullEvaluationJson) {
      return activeProposal?.aiTechnicalQualityScore ? activeProposal.aiTechnicalQualityScore * 0.9 : 13.9;
    }
    try {
      const parsed = JSON.parse(activeProposal.aiFullEvaluationJson);
      const score = parsed?.deterministic_calculations?.pillar_scores?.screening_qa;
      if (score != null) return Number(score);
      if (displayQuestions.length > 0) {
        const avg = displayQuestions.reduce((acc: number, q: any) => acc + q.overallScore, 0) / displayQuestions.length;
        return avg;
      }
      return activeProposal?.aiTechnicalQualityScore ? activeProposal.aiTechnicalQualityScore * 0.9 : 13.9;
    } catch {
      return 13.9;
    }
  }, [activeProposal, displayQuestions]);

  if (!isOpen) return null;

  const currentStatus = Number(detail?.status ?? activeProposal?.status);
  const freelancerName = detail?.freelancerName || activeProposal?.freelancerName || 'Freelancer';
  const freelancerUserId = detail?.freelancerUserId || activeProposal?.freelancerUserId;
  const proposedBudget = detail?.proposedBudget || activeProposal?.proposedBudget || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-review-title"
      onClick={e => {
        if (e.target === e.currentTarget && !rejectProposalId) onClose();
      }}
    >
      {/* Decorative ambient background blobs */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full blur-[120px] opacity-20 pointer-events-none bg-brand/30" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full blur-[150px] opacity-15 pointer-events-none bg-text-muted/20" />

      {/* Main Dialog Container matching Review Dialog style */}
      <div
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-[98vw] max-w-[1780px] h-[94dvh] lg:h-[95vh] max-h-[94dvh] lg:max-h-[1050px] rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden flex flex-col lg:flex-row shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-border/50 bg-background/95 backdrop-blur-xl transition-all my-auto min-h-0"
      >
        {/* ═══ LEFT COLUMN: Candidate Hero & Proposal Context ═══════════ */}
        <div className="w-full lg:w-[340px] xl:w-[390px] p-3.5 sm:p-5 lg:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border/40 bg-surface-muted/40 relative overflow-y-auto lg:overflow-hidden shrink-0 max-h-[32vh] lg:max-h-none min-h-0">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none" />

          {/* Top Header Eyebrow */}
          <div className="relative z-10 pr-8 lg:pr-0">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-1.5 sm:mb-3">
              <Sparkles size={13} />
              Proposal Review
            </div>
            <h1 id="proposal-review-title" className="text-base sm:text-xl font-black text-text-primary tracking-tight">
              Candidate Evaluation
            </h1>
            <p className="text-[11px] sm:text-xs text-text-muted mt-0.5 leading-relaxed line-clamp-1 sm:line-clamp-none">
              Review candidate offer details, screening answers & AI assessment.
            </p>
          </div>

          {/* Candidate Avatar Hero Section - Responsive horizontal on mobile, vertical on desktop */}
          <div className="relative z-10 flex flex-row sm:flex-col items-center gap-3 sm:gap-0 my-2 sm:my-6 text-left sm:text-center">
            <div className="relative mb-0 sm:mb-4 flex-shrink-0 flex items-center justify-center">
              <div className="absolute -inset-2 sm:-inset-4 rounded-full bg-brand/25 blur-xl animate-pulse pointer-events-none" />
              <UserAvatar
                name={freelancerName}
                userId={freelancerUserId}
                size="lg"
                className="!w-12 !h-12 sm:!w-24 sm:!h-24 lg:!w-32 lg:!h-32 text-base sm:text-2xl lg:text-4xl shadow-xl relative z-10 ring-2 sm:ring-4 ring-brand/20"
              />
            </div>

            <div className="min-w-0 flex-1 sm:flex-initial">
              <h2 className="text-sm sm:text-xl font-black text-text-primary tracking-tight truncate">{freelancerName}</h2>
              <span className={`inline-flex rounded-full px-2 sm:px-3.5 py-0.5 text-[9.5px] sm:text-xs font-black mt-0.5 sm:mt-2 ${badgeClass(currentStatus)}`}>
                {getStatusLabel(currentStatus)}
              </span>
            </div>
          </div>

          {/* Offer Summary Details Card */}
          <div className="relative z-10 rounded-xl sm:rounded-2xl border border-border/60 bg-surface-card p-3 sm:p-4.5 space-y-2 sm:space-y-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand">
              <BriefcaseBusiness size={15} />
              Offer Breakdown
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
              <div className="bg-surface-muted/60 p-2 sm:p-3.5 rounded-xl border border-border/40 text-center">
                <span className="block text-[10px] sm:text-xs font-black uppercase text-text-muted">Giá đề xuất</span>
                <strong className="text-brand font-black text-sm sm:text-lg block mt-0.5">{formatGigCoin(proposedBudget)}</strong>
                <span className="block text-xs sm:text-sm font-bold text-text-primary mt-0.5">≈ {formatGigCoinToVnd(proposedBudget)}</span>
              </div>
              <div className="bg-surface-muted/60 p-2 sm:p-3.5 rounded-xl border border-border/40 text-center flex flex-col justify-center">
                <span className="block text-[10px] sm:text-xs font-black uppercase text-text-muted">Thời gian</span>
                <strong className="text-text-primary font-black text-xs sm:text-base block mt-0.5 truncate">{detail?.proposedDuration || activeProposal?.proposedDuration || '—'}</strong>
              </div>
            </div>

            <p className="text-[10px] sm:text-xs font-semibold text-text-muted text-center pt-1.5 border-t border-border/40">
              (1 G-coin = 1.000 VNĐ)
            </p>
          </div>

          {/* Close button (mobile) */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close modal"
            className="absolute top-3.5 right-3.5 lg:hidden p-2 rounded-xl border border-border bg-background text-text-muted hover:text-text-primary hover:bg-surface-muted transition cursor-pointer z-50 shadow-xs"
          >
            <X size={18} />
          </button>
        </div>

        {/* ═══ RIGHT COLUMN: Tabbed Content & Decision Toolbar ════════════════════════ */}
        <div className="flex-1 min-w-0 min-h-0 p-3.5 sm:p-5 lg:p-8 bg-background flex flex-col relative overflow-hidden">
          {/* Desktop Close Button */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close modal"
            className="hidden lg:flex absolute top-5 right-5 p-2 rounded-xl border border-border bg-background/90 hover:bg-surface-muted text-text-muted hover:text-text-primary transition cursor-pointer z-50 shadow-xs"
          >
            <X size={18} />
          </button>

          {/* Top Segmented Tab Switcher Navigation (1. Proposal | 2. Q&A | 3. AI Report) */}
          <div className="flex items-center gap-1.5 rounded-xl sm:rounded-2xl border border-border/80 bg-surface-muted/60 p-1.5 text-sm sm:text-base font-bold shadow-xs shrink-0 w-full sm:max-w-lg">
            <button
              type="button"
              onClick={() => setModalTab('proposalDetails')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 font-black transition-all cursor-pointer ${
                modalTab === 'proposalDetails'
                  ? 'bg-brand text-white shadow-md'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <FileText size={16} /> {t('proposalModal.tabProposal', 'Proposal')}
            </button>
            <button
              type="button"
              onClick={() => setModalTab('userAnswers')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 font-black transition-all cursor-pointer ${
                modalTab === 'userAnswers'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <FileQuestion size={16} /> {t('proposalModal.tabQA', 'Q&A')}
            </button>
            {showAiReportTab && (
              modalTab === 'aiReport' ? (
                <div className="conic-border-wrap rounded-xl flex-1">
                  <button
                    type="button"
                    onClick={() => setModalTab('aiReport')}
                    className="conic-border-btn !py-2.5 !text-sm sm:!text-base !bg-brand !text-white flex items-center justify-center gap-2 font-black w-full"
                  >
                    <Brain size={16} className="text-white" /> {t('proposalModal.tabAIReport', 'AI Report')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalTab('aiReport')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 font-black transition-all cursor-pointer text-brand hover:text-text-primary"
                >
                  <Brain size={16} className="text-brand" /> {t('proposalModal.tabAIReport', 'AI Report')}
                </button>
              )
            )}
          </div>

          {/* Tab Content Box (Fixed Height Scrollable Content Area) */}
          <div className="flex-1 overflow-y-auto my-3 sm:my-4 pr-1 space-y-4 custom-scrollbar min-h-0 overscroll-contain">
            {/* TAB 1: PROPOSAL DETAILS */}
            {modalTab === 'proposalDetails' && (
              <div className="space-y-4">
                {detailLoading ? (
                  <div className="py-20 text-center text-sm text-text-muted">
                    <LemniscateBloomLoader label="Đang tải chi tiết proposal..." size={48} />
                  </div>
                ) : detailError ? (
                  <div role="alert" className="py-12 text-center text-sm font-bold text-rose-600 dark:text-rose-400">{detailError}</div>
                ) : !detail ? (
                  <div className="py-12 text-center text-sm font-semibold text-text-muted">Không có thông tin proposal.</div>
                ) : (
                  <>
                    {/* Top Criteria Match Banner (Renders strictly when AI evaluation exists and totalReqs > 0) */}
                    {aiAuditData && aiAuditData.totalReqs > 0 && (
                      <div className="rounded-2xl border border-border bg-surface-muted/60 p-4 flex flex-wrap items-center justify-between gap-2.5 text-sm shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
                          <span className="font-black text-text-primary text-sm sm:text-base flex items-center gap-1.5">
                            <ClipboardList size={16} className="shrink-0 text-brand" />
                            <span>
                              {t('proposalModal.criteriaMatchedBanner', '{{count}} / {{total}} Tiêu chí khớp chuẩn ({{pct}}% Phạm vi)', {
                                count: aiAuditData.fulfilledCount,
                                total: aiAuditData.totalReqs,
                                pct: aiAuditData.scopeCoveragePct.toFixed(0),
                              })}
                            </span>
                          </span>
                        </div>
                        <span className="rounded-full bg-surface px-3.5 py-1 text-xs font-black text-text-primary border border-border shadow-2xs flex items-center gap-1.5">
                          <Sparkles size={12} className="shrink-0 text-brand" />
                          <span>
                            {t('proposalModal.aiHighlightedNotice', 'Các câu bằng chứng AI được đánh dấu màu bên dưới')}
                          </span>
                        </span>
                      </div>
                    )}

                    {renderAnnotatedDetailSection('Giới thiệu & Tổng quan', detail.coverLetter, aiAuditData?.highlights)}
                    {renderAnnotatedDetailSection('Giải pháp & Hướng tiếp cận kỹ thuật', detail.solutionApproach || detail.analysisSummary, aiAuditData?.highlights)}
                    {renderAnnotatedDetailSection('Sản phẩm bàn giao', detail.deliverables, aiAuditData?.highlights)}
                    {renderAnnotatedDetailSection('Giả định dự án', detail.assumptions, aiAuditData?.highlights)}
                    {renderAnnotatedDetailSection('Các hạng mục ngoài phạm vi', detail.outOfScope, aiAuditData?.highlights)}

                    {/* ═══ 1. FREELANCER PROPOSED MILESTONES (COLLAPSIBLE) ═══════ */}
                    <ProposedMilestonesSection milestonePlans={detail.milestonePlans || []} />

                    {/* ═══ 2. SIDE-BY-SIDE MILESTONE PLAN COMPARISON ═══════════════ */}
                    {originalMilestones && originalMilestones.length > 0 && (
                      <section className="space-y-3.5 pt-2">
                        <MilestonePlanComparison
                          clientMilestones={originalMilestones as EditableMilestonePlan[]}
                          freelancerMilestones={(detail.milestonePlans || []) as EditableMilestonePlan[]}
                          clientLabel="Khách hàng"
                          freelancerLabel="Freelancer"
                          addedLabel="Freelancer thêm mới"
                          removedLabel="Freelancer đã xoá"
                          emptyLabel="Không có dữ liệu để so sánh"
                          workItemsLabel="Hạng mục công việc"
                        />
                      </section>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB 2: INTERVIEW ANSWERS (Q&A) */}
            {modalTab === 'userAnswers' && (
              <>
                {evalLoading && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <LemniscateBloomLoader label="Đang tải câu trả lời phỏng vấn..." size={48} />
                  </div>
                )}

                {!evalLoading && (
                  rawAnswers.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                        <h4 className="text-xs sm:text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                          <FileQuestion size={17} className="text-amber-500 shrink-0" />
                          <span>Câu hỏi sàng lọc & Câu trả lời</span>
                        </h4>
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                          {rawAnswers.length} câu hỏi
                        </span>
                      </div>

                      {rawAnswers.slice().sort((a, b) => a.orderIndex - b.orderIndex).map((ans: ProposalAnswerDto, idx: number) => (
                        <div key={ans.proposalAnswersId || idx} className="rounded-2xl border border-border/80 bg-surface-card/60 p-4.5 space-y-3.5 shadow-2xs">
                          <div className="flex items-start justify-between gap-3">
                            <h5 className="text-sm sm:text-base font-black text-text-primary leading-snug">
                              {ans.orderIndex || idx + 1}. {ans.questionText}
                            </h5>
                            {ans.isRequired && (
                              <span className="shrink-0 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-xs font-black uppercase text-rose-500">
                                Bắt buộc
                              </span>
                            )}
                          </div>

                          <div className="rounded-xl bg-surface-muted/50 border border-border/60 p-3.5 text-sm space-y-1.5">
                            <span className="block text-xs font-black uppercase text-text-muted tracking-wider">
                              Câu trả lời của ứng viên
                            </span>
                            <p className="text-text-primary whitespace-pre-wrap leading-relaxed font-normal text-sm sm:text-base">
                              {ans.answerText?.trim() || t('proposalAnswers.noAnswerProvided', 'Ứng viên chưa nhập câu trả lời.')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border bg-surface-muted/20 p-12 text-center text-sm text-text-muted space-y-2">
                      <FileQuestion size={38} className="mx-auto text-text-muted/40" />
                      <p className="font-bold text-text-primary text-base">Không có câu trả lời phỏng vấn nào.</p>
                    </div>
                  )
                )}
              </>
            )}

            {/* TAB 3: AI EVALUATION REPORT */}
            {modalTab === 'aiReport' && showAiReportTab && (
              <>
                {evalLoading && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <LemniscateBloomLoader label={t('proposalModal.aiReportLoading', 'Đang tải Báo cáo AI...')} size={48} />
                  </div>
                )}

                {evalError && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-center text-rose-500 text-xs font-bold">
                    {evalError}
                  </div>
                )}

                {!evalLoading && !activeProposal?.aiTechnicalQualityScore && !activeProposal?.aiFullEvaluationJson && (
                  <div className="rounded-2xl border border-border bg-surface-muted/20 p-12 text-center text-xs text-muted-foreground space-y-3">
                    <Brain size={38} className="mx-auto text-brand/60" />
                    <div>
                      <p className="font-bold text-foreground text-sm">{t('proposalModal.aiReportEmptyTitle', 'Chưa có Báo cáo Đánh giá AI cho proposal này.')}</p>
                      {rawAnswers.length > 0 && rawAnswers.some(ans => ans.answerText?.trim()) && (
                        <p className="text-muted-foreground mt-1">{t('proposalModal.aiReportEmptyDesc', 'Proposal này chưa được AI chấm điểm phỏng vấn.')}</p>
                      )}
                    </div>
                  </div>
                )}

                {(!evalLoading && (activeProposal?.aiTechnicalQualityScore || activeProposal?.aiFullEvaluationJson)) && (
                  <div className="space-y-5">
                    {/* Render AI Candidate Evaluation Engine Verdict Card */}
                    {activeProposal && (
                      <AIProposalVerdictCard proposal={activeProposal} />
                    )}

                    {/* Render Side-by-Side Comparative Milestone Matrix */}
                    <AISideBySideMilestoneMatrix
                      detail={detail}
                      proposal={activeProposal}
                      fullEvaluationJson={activeProposal?.aiFullEvaluationJson}
                      originalMilestones={originalMilestones || undefined}
                      jobPostBudgetMax={jobPostBudgetMax}
                      jobPostDuration={jobPostDuration}
                    />



                  {/* Questions Breakdown linked to Pillar 2 (Screening Q&A 30%) */}
                  {displayQuestions.length > 0 && (
                    <div className="space-y-4 pt-2">
                      <div className="rounded-2xl border border-border bg-surface-muted/50 p-4 space-y-2 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-black text-xs sm:text-sm text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                            <HelpCircle size={15} className="text-text-primary shrink-0" />
                            {t('proposalModal.pillar2Title', 'Screening Q&A Accuracy & Reasoning (30%) Audit')}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-surface-card border border-border px-3 py-1 text-xs font-black text-text-primary shadow-2xs">
                              {t('proposalModal.scoreLabel', 'Score: {{score}} / 100', { score: pillar2Score.toFixed(1) })}
                            </span>
                            <span className="text-xs font-extrabold text-text-primary bg-surface-card border border-border px-2.5 py-0.5 rounded-full shadow-2xs">
                              {t('proposalModal.pillar2EvidenceSource', 'Pillar 2 Evidence Source ({{count}} câu hỏi sàng lọc)', { count: displayQuestions.length })}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-text-muted font-normal">
                          {t('proposalModal.pillar2Desc', 'Bảng dưới đây liệt kê chi tiết từng câu hỏi sàng lọc, câu trả lời của ứng viên và điểm đối soát 5 tiêu chí kỹ thuật cấu thành nên điểm Screening Q&A (30% Weight).')}
                        </p>
                      </div>

                      <h4 className="text-xs sm:text-sm font-black text-text-primary uppercase tracking-wider border-b border-border/60 pb-2.5 flex items-center justify-between">
                        <span>{t('proposalAnswers.questionBreakdown', 'Chi tiết điểm từng câu hỏi & Feedback từ AI')}</span>
                        <span className="text-xs font-bold text-text-muted">
                          {t('proposalModal.screeningQuestionsCount', '{{count}} câu hỏi sàng lọc', { count: displayQuestions.length })}
                        </span>
                      </h4>

                      {displayQuestions.map((q: any, idx: number) => (
                        <div key={idx} className="rounded-2xl border border-border/80 p-4.5 space-y-3.5 bg-surface-card/60 shadow-2xs">
                          {/* Question Title & Overall Weighted Score */}
                          <div className="flex justify-between items-start gap-4">
                            <h5 className="text-sm sm:text-base font-black text-text-primary leading-snug">
                              {q.displayNumber}. {q.questionText}
                            </h5>
                            <span className={`shrink-0 rounded-full px-3 py-1 text-xs sm:text-sm font-black ${getScoreColorClass(q.overallScore)}`}>
                              {q.overallScore}/100
                            </span>
                          </div>

                          {/* Candidate Answer Box */}
                          <div className="rounded-xl bg-surface-muted/50 border border-border/60 p-3.5 text-sm space-y-1.5">
                            <span className="block text-xs font-black uppercase text-text-muted tracking-wider">
                              {t('proposalAnswers.candidateAnswerLabel', 'Câu trả lời của ứng viên')}
                            </span>
                            <p className="text-text-primary whitespace-pre-wrap leading-relaxed font-normal text-sm sm:text-base">
                              {q.candidateAnswer || t('proposalAnswers.noAnswerProvided', 'Không có câu trả lời')}
                            </p>
                          </div>

                          {/* 5-Subcriteria Technical Evaluation Grid */}
                          <div className="rounded-2xl border border-border bg-surface-muted/40 p-3.5 sm:p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                              <span className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
                                <SlidersHorizontal size={14} className="text-brand shrink-0" />
                                <span>{t('proposalAnswers.subcriteriaBreakdown', 'Chi tiết đánh giá 5 Tiêu chí Kỹ thuật (5 Sub-criteria Breakdown)')}</span>
                              </span>
                              <span className="text-[11px] font-medium text-text-muted hidden sm:inline-flex items-center gap-1.5">
                                <Info size={12} className="text-brand shrink-0" />
                                <span>{t('proposalAnswers.hoverHint', 'Rê chuột để xem tiêu chí & cách chấm')}</span>
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 w-full items-stretch">
                              {/* 1. Độ chính xác */}
                              <SubcriteriaDefinitionTooltip
                                title={t('proposalAnswers.correctnessTitle', 'Độ chính xác')}
                                weight="40%"
                                align="left"
                                className="w-full h-full flex flex-col"
                                score={q.subcriteria.correctness}
                                definition={t('proposalAnswers.correctnessDef', 'Đánh giá độ chính xác thực tế, khái niệm kỹ thuật và mức độ đáp ứng đúng yêu cầu của câu hỏi.')}
                              >
                                <div className="w-full h-full min-h-[105px] sm:min-h-[115px] flex flex-col justify-between rounded-xl bg-surface border border-border/80 p-3 text-center cursor-help transition-all duration-200 hover:border-brand hover:shadow-md hover:-translate-y-0.5 group">
                                  <div className="flex-1 flex flex-col justify-center items-center gap-1">
                                    <span className="block text-[11px] sm:text-xs font-black uppercase tracking-wider text-text-primary text-center line-clamp-2 leading-tight">
                                      {t('proposalAnswers.correctnessTitle', 'Độ chính xác')}
                                    </span>
                                    <span className="inline-flex items-center text-[10px] font-black text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                                      40%
                                    </span>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-border/60">
                                    <div className="flex items-center justify-center gap-1 leading-none">
                                      <span className={`text-sm sm:text-base font-black ${getScoreTextColor(q.subcriteria.correctness)}`}>
                                        {q.subcriteria.correctness}
                                      </span>
                                      <span className="text-[10px] font-bold text-text-muted">/100</span>
                                    </div>
                                    <div className="w-full bg-surface-muted rounded-full h-1 mt-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          q.subcriteria.correctness >= 80
                                            ? 'bg-emerald-500'
                                            : q.subcriteria.correctness >= 60
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(0, q.subcriteria.correctness))}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </SubcriteriaDefinitionTooltip>

                              {/* 2. Tư duy Kỹ thuật */}
                              <SubcriteriaDefinitionTooltip
                                title={t('proposalAnswers.reasoningTitle', 'Tư duy Kỹ thuật')}
                                weight="25%"
                                align="left"
                                className="w-full h-full flex flex-col"
                                score={q.subcriteria.reasoning}
                                definition={t('proposalAnswers.reasoningDef', 'Đánh giá độ sâu của logic giải quyết vấn đề, lập luận kỹ thuật và lý do đưa ra các giải pháp hoặc lựa chọn đánh đổi (trade-offs).')}
                              >
                                <div className="w-full h-full min-h-[105px] sm:min-h-[115px] flex flex-col justify-between rounded-xl bg-surface border border-border/80 p-3 text-center cursor-help transition-all duration-200 hover:border-brand hover:shadow-md hover:-translate-y-0.5 group">
                                  <div className="flex-1 flex flex-col justify-center items-center gap-1">
                                    <span className="block text-[11px] sm:text-xs font-black uppercase tracking-wider text-text-primary text-center line-clamp-2 leading-tight">
                                      {t('proposalAnswers.reasoningTitle', 'Tư duy Kỹ thuật')}
                                    </span>
                                    <span className="inline-flex items-center text-[10px] font-black text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                                      25%
                                    </span>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-border/60">
                                    <div className="flex items-center justify-center gap-1 leading-none">
                                      <span className={`text-sm sm:text-base font-black ${getScoreTextColor(q.subcriteria.reasoning)}`}>
                                        {q.subcriteria.reasoning}
                                      </span>
                                      <span className="text-[10px] font-bold text-text-muted">/100</span>
                                    </div>
                                    <div className="w-full bg-surface-muted rounded-full h-1 mt-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          q.subcriteria.reasoning >= 80
                                            ? 'bg-emerald-500'
                                            : q.subcriteria.reasoning >= 60
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(0, q.subcriteria.reasoning))}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </SubcriteriaDefinitionTooltip>

                              {/* 3. Độ liên quan */}
                              <SubcriteriaDefinitionTooltip
                                title={t('proposalAnswers.relevanceTitle', 'Độ liên quan')}
                                weight="15%"
                                align="center"
                                className="w-full h-full flex flex-col"
                                score={q.subcriteria.relevance}
                                definition={t('proposalAnswers.relevanceDef', 'Đánh giá mức độ trả lời trực tiếp vào đúng trọng tâm câu hỏi được hỏi, không đi lạc đề hoặc viết dài dòng sáo rỗng.')}
                              >
                                <div className="w-full h-full min-h-[105px] sm:min-h-[115px] flex flex-col justify-between rounded-xl bg-surface border border-border/80 p-3 text-center cursor-help transition-all duration-200 hover:border-brand hover:shadow-md hover:-translate-y-0.5 group">
                                  <div className="flex-1 flex flex-col justify-center items-center gap-1">
                                    <span className="block text-[11px] sm:text-xs font-black uppercase tracking-wider text-text-primary text-center line-clamp-2 leading-tight">
                                      {t('proposalAnswers.relevanceTitle', 'Độ liên quan')}
                                    </span>
                                    <span className="inline-flex items-center text-[10px] font-black text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                                      15%
                                    </span>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-border/60">
                                    <div className="flex items-center justify-center gap-1 leading-none">
                                      <span className={`text-sm sm:text-base font-black ${getScoreTextColor(q.subcriteria.relevance)}`}>
                                        {q.subcriteria.relevance}
                                      </span>
                                      <span className="text-[10px] font-bold text-text-muted">/100</span>
                                    </div>
                                    <div className="w-full bg-surface-muted rounded-full h-1 mt-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          q.subcriteria.relevance >= 80
                                            ? 'bg-emerald-500'
                                            : q.subcriteria.relevance >= 60
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(0, q.subcriteria.relevance))}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </SubcriteriaDefinitionTooltip>

                              {/* 4. Độ sâu */}
                              <SubcriteriaDefinitionTooltip
                                title={t('proposalAnswers.depthTitle', 'Độ sâu Kỹ thuật')}
                                weight="10%"
                                align="right"
                                className="w-full h-full flex flex-col"
                                score={q.subcriteria.depth}
                                definition={t('proposalAnswers.depthDef', 'Đánh giá tính cụ thể của các công cụ, công nghệ, framework, schema dữ liệu hoặc quy trình kỹ thuật so với các phát biểu chung chung.')}
                              >
                                <div className="w-full h-full min-h-[105px] sm:min-h-[115px] flex flex-col justify-between rounded-xl bg-surface border border-border/80 p-3 text-center cursor-help transition-all duration-200 hover:border-brand hover:shadow-md hover:-translate-y-0.5 group">
                                  <div className="flex-1 flex flex-col justify-center items-center gap-1">
                                    <span className="block text-[11px] sm:text-xs font-black uppercase tracking-wider text-text-primary text-center line-clamp-2 leading-tight">
                                      {t('proposalAnswers.depthTitle', 'Độ sâu Kỹ thuật')}
                                    </span>
                                    <span className="inline-flex items-center text-[10px] font-black text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                                      10%
                                    </span>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-border/60">
                                    <div className="flex items-center justify-center gap-1 leading-none">
                                      <span className={`text-sm sm:text-base font-black ${getScoreTextColor(q.subcriteria.depth)}`}>
                                        {q.subcriteria.depth}
                                      </span>
                                      <span className="text-[10px] font-bold text-text-muted">/100</span>
                                    </div>
                                    <div className="w-full bg-surface-muted rounded-full h-1 mt-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          q.subcriteria.depth >= 80
                                            ? 'bg-emerald-500'
                                            : q.subcriteria.depth >= 60
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(0, q.subcriteria.depth))}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </SubcriteriaDefinitionTooltip>

                              {/* 5. Ví dụ thực tế */}
                              <SubcriteriaDefinitionTooltip
                                title={t('proposalAnswers.examplesTitle', 'Ví dụ thực tế')}
                                weight="10%"
                                align="right"
                                className="col-span-2 sm:col-span-1 w-full h-full flex flex-col"
                                score={q.subcriteria.examples}
                                definition={t('proposalAnswers.examplesDef', 'Đánh giá việc đưa ra các kịch bản dự án thực tế, chi tiết kinh nghiệm triển khai đã qua hoặc quy trình thực thi thực tiễn.')}
                              >
                                <div className="w-full h-full min-h-[105px] sm:min-h-[115px] flex flex-col justify-between rounded-xl bg-surface border border-border/80 p-3 text-center cursor-help transition-all duration-200 hover:border-brand hover:shadow-md hover:-translate-y-0.5 group">
                                  <div className="flex-1 flex flex-col justify-center items-center gap-1">
                                    <span className="block text-[11px] sm:text-xs font-black uppercase tracking-wider text-text-primary text-center line-clamp-2 leading-tight">
                                      {t('proposalAnswers.examplesTitle', 'Ví dụ thực tế')}
                                    </span>
                                    <span className="inline-flex items-center text-[10px] font-black text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                                      10%
                                    </span>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-border/60">
                                    <div className="flex items-center justify-center gap-1 leading-none">
                                      <span className={`text-sm sm:text-base font-black ${getScoreTextColor(q.subcriteria.examples)}`}>
                                        {q.subcriteria.examples}
                                      </span>
                                      <span className="text-[10px] font-bold text-text-muted">/100</span>
                                    </div>
                                    <div className="w-full bg-surface-muted rounded-full h-1 mt-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          q.subcriteria.examples >= 80
                                            ? 'bg-emerald-500'
                                            : q.subcriteria.examples >= 60
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(0, q.subcriteria.examples))}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </SubcriteriaDefinitionTooltip>
                            </div>
                          </div>

                          {/* AI Generator Detection Warning Badge (If flagged) */}
                          {q.isAiGenerated && (
                            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs sm:text-sm text-rose-700 dark:text-rose-300 space-y-1.5 shadow-2xs">
                              <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                                <span>{t('proposalAnswers.aiGeneratedWarning', 'Cảnh báo: Phát hiện dấu hiệu câu trả lời do AI (ChatGPT/Claude) tạo')}</span>
                              </div>
                              <p className="text-xs sm:text-sm font-medium leading-relaxed">
                                {q.aiDetectionReason || t('proposalAnswers.aiDetectionDefault', 'Câu trả lời có dấu hiệu sao chép từ AI generator (định dạng lý thuyết, thiếu ví dụ thực tế hoặc trải nghiệm cá nhân).')}
                              </p>
                            </div>
                          )}


                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Actions Row - Buttons aligned to the right */}
          <div className="pt-3 sm:pt-4 border-t border-border/60 flex flex-wrap items-center justify-end gap-2 sm:gap-3 shrink-0 mt-auto bg-background/95 backdrop-blur-sm z-20">
            {activeId && !selectedJobCanNegotiate && (
              <span className="text-xs font-extrabold text-amber-600 mr-auto w-full sm:w-auto text-center sm:text-left">
                Dự án này đã đóng nhận proposal.
              </span>
            )}
            {activeId && canClientAct(currentStatus) && selectedJobCanNegotiate && (
              <button
                type="button"
                disabled={isBusy(activeId, 'shortlist')}
                onClick={() => updateStatus(activeId, ProposalStatus.Shortlisted, 'shortlist')}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-black text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 disabled:opacity-50 cursor-pointer transition-all"
              >
                <Check size={14} /> Shortlist
              </button>
            )}
            {activeId && canClientAct(currentStatus) && selectedJobCanNegotiate && (
              <>
                <button
                  type="button"
                  disabled={isBusy(activeId, 'reject')}
                  onClick={() => setRejectProposalId(activeId)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 disabled:opacity-50 cursor-pointer transition-all"
                >
                  <X size={14} /> Từ chối
                </button>
                <button
                  type="button"
                  disabled={isBusy(activeId, 'accept')}
                  onClick={() => acceptForNegotiation(activeId)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-brand px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-black text-white transition-all shadow-md hover:bg-brand-hover cursor-pointer"
                >
                  <MessageSquare size={14} /> Bắt đầu đàm phán
                </button>
              </>
            )}
            {activeId && currentStatus === ProposalStatus.Accepted && selectedJobCanNegotiate && (
              <button
                type="button"
                disabled={isBusy(activeId, 'open')}
                onClick={() => openNegotiation(activeId)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-emerald-600 px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-black text-white disabled:opacity-50 cursor-pointer shadow-md hover:bg-emerald-700 transition-all"
              >
                <MessageSquare size={14} /> Vào Phòng Đàm phán
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
