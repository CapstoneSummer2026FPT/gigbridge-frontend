import React, { useState, useMemo } from 'react';
import {
  Brain,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  Check,
  MessageSquare,
  X,
  Search,
  SlidersHorizontal,
  Trophy,
  Users,
  Star,
  BarChart2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { ProposalDto } from '../../../types/models/Proposal';
import { ProposalStatus } from '../../../types/models/Proposal';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { CustomSelect } from '../../../shared/components/CustomSelect';

interface ProposalJudgingListViewProps {
  jobPostId: string;
  jobTitle: string;
  proposals: ProposalDto[];
  loading: boolean;
  onSelectProposal: (proposalId: string) => void;
  onShortlist: (proposalId: string) => void;
  onStartNegotiation: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
  canAct: boolean;
  onRefreshProposals: () => void;
}

type FilterRec = 'all' | 'recommended' | 'unjudged';
type SortByOption = 'aiScore' | 'budget' | 'newest';

const MIN_SCORE_OPTIONS = [
  { value: '0', label: 'Any Score' },
  { value: '60', label: 'Score 60+' },
  { value: '70', label: 'Score 70+' },
  { value: '80', label: 'Score 80+' },
];

const SORT_OPTIONS = [
  { value: 'aiScore', label: 'Highest AI Score' },
  { value: 'budget', label: 'Proposed Budget' },
  { value: 'newest', label: 'Newest Submitted' },
];

const FILTER_TABS: { key: FilterRec; label: string; colorClass: string; activeClass: string }[] = [
  {
    key: 'all',
    label: 'Tất cả',
    colorClass: 'text-text-muted hover:text-text-primary',
    activeClass: 'bg-purple-600 text-white shadow-md shadow-purple-500/20',
  },
  {
    key: 'recommended',
    label: 'AI Recommended',
    colorClass: 'text-text-muted hover:text-emerald-600',
    activeClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
  },
  {
    key: 'unjudged',
    label: 'Chưa chấm',
    colorClass: 'text-text-muted hover:text-amber-600',
    activeClass: 'bg-amber-500 text-white shadow-md shadow-amber-500/20',
  },
];

export const ProposalJudgingListView: React.FC<ProposalJudgingListViewProps> = ({
  jobPostId,
  jobTitle,
  proposals,
  loading,
  onSelectProposal,
  onShortlist,
  onStartNegotiation,
  onReject,
  canAct,
  onRefreshProposals,
}) => {
  const [filterRec, setFilterRec] = useState<FilterRec>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortByOption>('aiScore');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterRec, minScoreFilter, sortBy, jobPostId, searchQuery]);

  // Batch Judging State
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ processed: number; remaining: number } | null>(null);
  const [batchError, setBatchError] = useState('');

  // Analytics Metrics
  const stats = useMemo(() => {
    const judged = proposals.filter(p => typeof p.aiScore === 'number');
    const totalCount = proposals.length;
    const judgedCount = judged.length;
    const unjudgedCount = totalCount - judgedCount;
    const avgScore = judgedCount > 0 ? Math.round(judged.reduce((sum, p) => sum + (p.aiScore || 0), 0) / judgedCount) : 0;
    const topScore = judgedCount > 0 ? Math.max(...judged.map(p => p.aiScore || 0)) : 0;
    const recommendedCount = judged.filter(p => p.aiRecommendedHire).length;

    return { totalCount, judgedCount, unjudgedCount, avgScore, topScore, recommendedCount };
  }, [proposals]);

  // Filter & Sort Candidate Leaderboard
  const rankedCandidates = useMemo(() => {
    let list = [...proposals];

    if (filterRec === 'recommended') list = list.filter(p => p.aiRecommendedHire === true);
    else if (filterRec === 'unjudged') list = list.filter(p => typeof p.aiScore !== 'number');

    if (minScoreFilter > 0) list = list.filter(p => (p.aiScore || 0) >= minScoreFilter);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(p => {
        const name = p.freelancerName?.toLowerCase() || '';
        const summary = p.aiSummary?.toLowerCase() || '';
        const techSkills = p.aiTechnicalSkills?.map(s => s.toLowerCase()) || [];
        const softSkills = p.aiSoftSkills?.map(s => s.toLowerCase()) || [];
        return name.includes(query) || summary.includes(query) || techSkills.some(s => s.includes(query)) || softSkills.some(s => s.includes(query));
      });
    }

    return list.sort((a, b) => {
      if (sortBy === 'budget') return (a.proposedBudget || 0) - (b.proposedBudget || 0);
      if (sortBy === 'newest') return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
      const scoreA = typeof a.aiScore === 'number' ? a.aiScore : -1;
      const scoreB = typeof b.aiScore === 'number' ? b.aiScore : -1;
      return scoreB - scoreA;
    });
  }, [proposals, filterRec, minScoreFilter, sortBy, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(rankedCandidates.length / pageSize));
  const pagedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rankedCandidates.slice(start, start + pageSize);
  }, [rankedCandidates, currentPage, pageSize]);

  const handleBatchJudge = async () => {
    if (batchLoading || proposals.length === 0 || stats.unjudgedCount === 0) return;

    setBatchLoading(true);
    setBatchError('');
    let remaining = stats.unjudgedCount;
    let processedTotal = 0;

    try {
      while (remaining > 0) {
        const response = await proposalPostAPI.judgeAllProposals(jobPostId, 10);
        if (!response.success || !response.data || response.data.processedCount === 0) {
          setBatchError(!response.success ? (response.message || 'Batch evaluation encountered an error.') : 'Evaluation stopped: some proposals could not be processed by the AI.');
          break;
        }
        processedTotal += response.data.processedCount;
        remaining = response.data.remainingCount;
        setBatchProgress({ processed: processedTotal, remaining });
        onRefreshProposals();
        if (response.data.isCompleted) break;
      }
    } catch (err: unknown) {
      setBatchError(err instanceof Error ? err.message : 'Failed to complete batch judging.');
    } finally {
      setBatchLoading(false);
      setBatchProgress(null);
      onRefreshProposals();
    }
  };

  const getScoreRing = (score?: number | null) => {
    if (typeof score !== 'number') return 'border-border/60 text-text-muted bg-surface-muted/40';
    if (score >= 80) return 'border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
    if (score >= 60) return 'border-amber-500/60 text-amber-600 dark:text-amber-400 bg-amber-500/10';
    return 'border-rose-500/60 text-rose-600 dark:text-rose-400 bg-rose-500/10';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-amber-400/20 text-amber-500 border-amber-400/40 shadow-sm';
    if (rank === 2) return 'bg-slate-400/20 text-slate-500 border-slate-400/40';
    if (rank === 3) return 'bg-orange-400/20 text-orange-600 border-orange-400/40';
    return 'bg-surface-muted/60 text-text-muted border-border/60';
  };

  const hasActiveFilters = minScoreFilter > 0 || sortBy !== 'aiScore';

  return (
    <div className="space-y-5">

      {/* ═══ 1. HERO ANALYTICS BANNER ═══════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-600/10 via-indigo-500/5 to-background p-5 shadow-sm">
        {/* Decorative blobs */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Top row: Title + Batch Button */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600/15 border border-purple-500/25">
                  <Brain size={16} className="text-purple-500" />
                </div>
                <h2 className="text-base font-black bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent">
                  AI Judging Leaderboard
                </h2>
              </div>
              <p className="text-[11px] text-text-muted pl-10.5">
                Xếp hạng tự động cho <span className="font-bold text-text-primary">{jobTitle}</span>
              </p>
            </div>

            <button
              onClick={handleBatchJudge}
              disabled={batchLoading || proposals.length === 0 || stats.unjudgedCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-purple-500/20 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {batchLoading ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>
                    Đang chấm ({batchProgress ? `${batchProgress.processed} xong, còn ${batchProgress.remaining}` : 'Đang khởi động...'})
                  </span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>
                    {stats.unjudgedCount > 0 ? `Chấm tất cả (${stats.unjudgedCount} chưa chấm)` : 'Đã chấm xong'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Stat Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Proposals */}
            <div className="rounded-xl border border-border/60 bg-background/60 backdrop-blur-sm p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-text-muted">
                <Users size={11} /> Tổng proposals
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-text-primary">{stats.totalCount}</span>
                <span className="text-[10px] font-semibold text-text-muted">({stats.judgedCount} đã chấm)</span>
              </div>
            </div>

            {/* Avg Score */}
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-purple-500/80">
                <BarChart2 size={11} /> Điểm TB
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.avgScore}</span>
                <span className="text-xs font-bold text-text-muted">/100</span>
              </div>
            </div>

            {/* Top Score */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-600/80">
                <Trophy size={11} /> Điểm cao nhất
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.topScore}</span>
                <span className="text-xs font-bold text-text-muted">/100</span>
              </div>
            </div>

            {/* Recommended */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-600/80">
                <Star size={11} /> AI Recommended
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.recommendedCount}</span>
                <span className="text-xs font-bold text-text-muted">ứng viên</span>
              </div>
            </div>
          </div>

          {batchError && (
            <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
              {batchError}
            </div>
          )}
        </div>
      </div>

      {/* ═══ 2. FILTER & SORT TOOLBAR ════════════════════════════════════ */}
      <div className="space-y-3">
        {/* Main Toolbar Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface-muted/30 p-3">
          {/* Left: Filter Pill Tabs */}
          <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-background/60 border border-border/60 shadow-xs">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterRec(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition-all cursor-pointer ${
                  filterRec === tab.key ? tab.activeClass : tab.colorClass
                }`}
              >
                {tab.label}
                {tab.key === 'all' && <span className="ml-1 opacity-70">({proposals.length})</span>}
                {tab.key === 'recommended' && <span className="ml-1 opacity-70">({stats.recommendedCount})</span>}
                {tab.key === 'unjudged' && <span className="ml-1 opacity-70">({stats.unjudgedCount})</span>}
              </button>
            ))}
          </div>

          {/* Right: Search + Advanced Filters Toggle */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-44">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                <Search size={13} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm ứng viên..."
                className="w-full rounded-xl border border-border/80 bg-background py-2 pl-7.5 pr-6 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-purple-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Advanced Filters Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(prev => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-black transition cursor-pointer ${
                showAdvanced || hasActiveFilters
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                  : 'border-border/80 bg-background text-text-muted hover:text-text-primary hover:bg-surface-muted'
              }`}
            >
              <SlidersHorizontal size={13} />
              Bộ lọc
              {hasActiveFilters && (
                <span className="flex items-center justify-center h-4 min-w-4 rounded-full bg-purple-600 px-1 text-[9px] font-black text-white leading-none">
                  {(minScoreFilter > 0 ? 1 : 0) + (sortBy !== 'aiScore' ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filter Panel */}
        {showAdvanced && (
          <div className="rounded-2xl border border-purple-500/15 bg-purple-500/5 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-black text-text-primary">
                <SlidersHorizontal size={13} className="text-purple-600" />
                Bộ lọc nâng cao & Sắp xếp
              </h3>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => { setMinScoreFilter(0); setSortBy('aiScore'); }}
                  className="text-[11px] font-black text-purple-600 hover:underline cursor-pointer"
                >
                  Xoá bộ lọc
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Min Score CustomSelect */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-text-muted uppercase tracking-wider">Điểm AI tối thiểu</label>
                <CustomSelect
                  value={String(minScoreFilter)}
                  options={MIN_SCORE_OPTIONS}
                  onChange={val => setMinScoreFilter(Number(val))}
                  searchable={false}
                  placeholder="Any Score"
                  ariaLabel="Minimum AI Score"
                />
              </div>

              {/* Sort By CustomSelect */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-text-muted uppercase tracking-wider">Sắp xếp theo</label>
                <CustomSelect
                  value={sortBy}
                  options={SORT_OPTIONS}
                  onChange={val => setSortBy(val as SortByOption)}
                  searchable={false}
                  placeholder="Sort by..."
                  ariaLabel="Sort candidates by"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 3. RANKED CANDIDATE CARDS LEADERBOARD ═══════════════════════ */}
      {loading ? (
        <div className="py-16 text-center text-xs text-text-muted">
          <Brain size={32} className="mx-auto mb-3 text-purple-500/40 animate-pulse" />
          <p>Đang tải bảng xếp hạng...</p>
        </div>
      ) : rankedCandidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center space-y-2">
          <Users size={32} className="mx-auto text-text-muted/30" />
          <p className="text-sm font-bold text-text-primary">Không có ứng viên nào phù hợp</p>
          <p className="text-xs text-text-muted">Thử điều chỉnh lại bộ lọc tìm kiếm.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pagedCandidates.map((candidate, index) => {
            const hasScore = typeof candidate.aiScore === 'number';
            const status = Number(candidate.status);
            const rankIndex = (currentPage - 1) * pageSize + index + 1;
            const isTopThree = rankIndex <= 3;

            return (
              <div
                key={candidate.proposalsId}
                onClick={() => onSelectProposal(candidate.proposalsId)}
                className={`group relative cursor-pointer rounded-2xl border bg-background p-4 transition-all hover:shadow-md ${
                  isTopThree
                    ? 'border-purple-500/25 hover:border-purple-500/50 hover:shadow-purple-500/5'
                    : 'border-border/70 hover:border-border hover:shadow-border/20'
                }`}
              >
                {/* Top-3 glow accent */}
                {rankIndex === 1 && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 opacity-80" />
                )}

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* LEFT: Rank + Avatar + Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-black text-sm ${getRankBadge(rankIndex)}`}>
                      {rankIndex <= 3 ? (
                        <Trophy size={14} className={rankIndex === 1 ? 'text-amber-500' : rankIndex === 2 ? 'text-slate-400' : 'text-orange-500'} />
                      ) : (
                        <span className="text-xs">#{rankIndex}</span>
                      )}
                    </div>

                    {/* Avatar + Details */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Name row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <UserAvatar
                          userId={candidate.freelancerUserId}
                          name={candidate.freelancerName || 'Freelancer'}
                          size="sm"
                        />
                        <h3 className="font-black text-sm text-text-primary truncate">
                          <UserProfileLink userId={candidate.freelancerUserId} role="freelancer">
                            {candidate.freelancerName || 'Freelancer'}
                          </UserProfileLink>
                        </h3>

                        {candidate.aiVerdictBadge === 'top_value' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/35 px-2.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                            🔥 Top Value Candidate
                          </span>
                        )}
                        {candidate.aiVerdictBadge === 'top_technical' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/35 px-2.5 py-0.5 text-[10px] font-black text-purple-600 dark:text-purple-400">
                            ⚡ Top Technical Expert
                          </span>
                        )}
                        {candidate.aiVerdictBadge === 'budget_saver' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/35 px-2.5 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
                            💰 Budget Saver
                          </span>
                        )}
                        {!candidate.aiVerdictBadge && candidate.aiRecommendedHire === true && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={11} /> AI Recommended
                          </span>
                        )}
                        {candidate.aiRecommendedHire === false && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/12 border border-rose-500/25 px-2 py-0.5 text-[10px] font-black text-rose-600 dark:text-rose-400">
                            <XCircle size={11} /> Not Recommended
                          </span>
                        )}
                      </div>

                      {/* Meta info row */}
                      <p className="text-[11px] text-text-muted">
                        Ngân sách: <strong className="text-text-primary font-black">{formatGigCoin(candidate.proposedBudget || 0)}</strong>
                        {' · '}
                        Thời gian: <strong className="text-text-primary">{candidate.proposedDuration || 'N/A'}</strong>
                        {' · '}
                        Nộp: {new Date(candidate.submittedAt).toLocaleDateString('vi-VN')}
                      </p>

                      {/* AI Summary */}
                      {candidate.aiSummary ? (
                        <p className="text-[11px] text-text-primary/90 leading-relaxed italic bg-purple-500/5 px-3 py-2 rounded-xl border border-purple-500/10 whitespace-pre-wrap">
                          "{candidate.aiSummary}"
                        </p>
                      ) : (
                        <p className="text-[11px] text-text-muted italic">
                          Chưa có đánh giá AI. Nhấn "Chấm tất cả" để chấm điểm.
                        </p>
                      )}

                      {/* Skill Tags */}
                      {((candidate.aiTechnicalSkills?.length ?? 0) > 0 || (candidate.aiSoftSkills?.length ?? 0) > 0) && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {candidate.aiTechnicalSkills?.map((s, idx) => (
                            <span key={idx} className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                              {s}
                            </span>
                          ))}
                          {candidate.aiSoftSkills?.map((s, idx) => (
                            <span key={idx} className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: AI Score + Actions */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 border-t lg:border-t-0 border-border/50 pt-3 lg:pt-0 shrink-0">
                    {/* Score Circle */}
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-xs ${getScoreRing(candidate.aiScore)}`}>
                        <span className="text-lg font-black">{hasScore ? candidate.aiScore : '--'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-widest text-text-muted">AI Score</span>
                        <span className="text-xs font-bold text-text-primary">{hasScore ? `${candidate.aiScore}/100` : 'Chưa chấm'}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      {status === ProposalStatus.Pending && canAct && (
                        <button
                          onClick={() => onShortlist(candidate.proposalsId)}
                          className="inline-flex items-center gap-1 rounded-xl border border-brand/30 bg-brand/10 px-3 py-1.5 text-[11px] font-black text-brand hover:bg-brand/20 cursor-pointer transition"
                        >
                          <Check size={13} /> Shortlist
                        </button>
                      )}

                      {canAct && (
                        <>
                          <button
                            onClick={() => onStartNegotiation(candidate.proposalsId)}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-emerald-700 cursor-pointer transition shadow-sm"
                          >
                            <MessageSquare size={13} /> Đàm phán
                          </button>
                          <button
                            onClick={() => onReject(candidate.proposalsId)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-black text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer transition"
                          >
                            <X size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ 4. PAGINATION ═══════════════════════════════════════════════ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-background hover:bg-surface-muted hover:text-purple-600 disabled:opacity-40 transition cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>

          {(() => {
            const pages: (number | string)[] = [];
            const range = 1;
            for (let i = 1; i <= totalPages; i++) {
              if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
                pages.push(i);
              } else if ((i === currentPage - range - 1 && i > 1) || (i === currentPage + range + 1 && i < totalPages)) {
                pages.push('...');
              }
            }
            const filtered = pages.filter((p, idx) => p !== '...' || pages[idx - 1] !== '...');
            return filtered.map((page, idx) =>
              page === '...' ? (
                <span key={idx} className="px-1 text-xs text-text-muted select-none">···</span>
              ) : (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(page as number)}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition cursor-pointer ${
                    page === currentPage
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                      : 'border border-border/80 bg-background hover:bg-surface-muted hover:text-purple-600 text-text-primary'
                  }`}
                >
                  {page}
                </button>
              )
            );
          })()}

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-background hover:bg-surface-muted hover:text-purple-600 disabled:opacity-40 transition cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
