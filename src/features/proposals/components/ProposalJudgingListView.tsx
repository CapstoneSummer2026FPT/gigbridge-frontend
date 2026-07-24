import React, { useState, useMemo } from 'react';
import { Brain, Award, CheckCircle2, XCircle, Sparkles, Filter, RefreshCw, Check, MessageSquare, X, Eye, ChevronRight } from 'lucide-react';
import type { ProposalDto } from '../../../types/models/Proposal';
import { ProposalStatus } from '../../../types/models/Proposal';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { useTranslation } from '../../../hooks/useTranslation';

interface ProposalJudgingListViewProps {
  jobPostId: string;
  jobTitle: string;
  proposals: ProposalDto[];
  loading: boolean;
  onSelectProposal: (proposalId: string) => void;
  onOpenAiReport: (proposalId: string) => void;
  onShortlist: (proposalId: string) => void;
  onStartNegotiation: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
  canAct: boolean;
  onRefreshProposals: () => void;
}

type FilterRec = 'all' | 'recommended' | 'unjudged';
type SortByOption = 'aiScore' | 'budget' | 'newest';

export const ProposalJudgingListView: React.FC<ProposalJudgingListViewProps> = ({
  jobPostId,
  jobTitle,
  proposals,
  loading,
  onSelectProposal,
  onOpenAiReport,
  onShortlist,
  onStartNegotiation,
  onReject,
  canAct,
  onRefreshProposals,
}) => {
  const { t } = useTranslation();
  const [filterRec, setFilterRec] = useState<FilterRec>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortByOption>('aiScore');

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

    if (filterRec === 'recommended') {
      list = list.filter(p => p.aiRecommendedHire === true);
    } else if (filterRec === 'unjudged') {
      list = list.filter(p => typeof p.aiScore !== 'number');
    }

    if (minScoreFilter > 0) {
      list = list.filter(p => (p.aiScore || 0) >= minScoreFilter);
    }

    return list.sort((a, b) => {
      if (sortBy === 'budget') return (a.proposedBudget || 0) - (b.proposedBudget || 0);
      if (sortBy === 'newest') return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
      
      // Default: Sort by AI score (descending), putting unjudged at the end
      const scoreA = typeof a.aiScore === 'number' ? a.aiScore : -1;
      const scoreB = typeof b.aiScore === 'number' ? b.aiScore : -1;
      return scoreB - scoreA;
    });
  }, [proposals, filterRec, minScoreFilter, sortBy]);

  // Chunked Batch Judging Handler (processes in chunks of 10)
  const handleBatchJudge = async () => {
    if (batchLoading || proposals.length === 0 || stats.unjudgedCount === 0) return;

    setBatchLoading(true);
    setBatchError('');
    let remaining = stats.unjudgedCount;
    let processedTotal = 0;

    try {
      while (remaining > 0) {
        const response = await proposalPostAPI.judgeAllProposals(jobPostId, 10);
        if (!response.success || response.data.processedCount === 0) {
          setBatchError(
            !response.success
              ? (response.message || 'Batch evaluation encountered an error.')
              : 'Evaluation stopped: some proposals could not be processed by the AI.'
          );
          break;
        }

        processedTotal += response.data.processedCount;
        remaining = response.data.remainingCount;
        setBatchProgress({ processed: processedTotal, remaining });

        // Trigger parent state refresh after each chunk
        onRefreshProposals();

        if (response.data.isCompleted) break;
      }
    } catch (err: any) {
      setBatchError(err?.message || 'Failed to complete batch judging.');
    } finally {
      setBatchLoading(false);
      setBatchProgress(null);
      onRefreshProposals();
    }
  };

  const getScoreColorClass = (score?: number | null) => {
    if (typeof score !== 'number') return 'border-border text-muted-foreground bg-muted/20';
    if (score >= 80) return 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400';
    if (score >= 60) return 'border-amber-500/40 text-amber-600 bg-amber-500/10 dark:text-amber-400';
    return 'border-rose-500/40 text-rose-600 bg-rose-500/10 dark:text-rose-400';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Analytics Banner */}
      <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-purple-500/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-500" />
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                AI Proposal Leaderboard & Judging
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ranked candidate evaluations for <strong className="text-foreground">{jobTitle}</strong>
            </p>
          </div>

          {/* Batch Judge Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleBatchJudge}
              disabled={batchLoading || proposals.length === 0 || stats.unjudgedCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110 disabled:opacity-50"
            >
              {batchLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>
                    Evaluating ({batchProgress ? `${batchProgress.processed} done, ${batchProgress.remaining} left` : 'Starting...'})
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {stats.unjudgedCount > 0 ? `Judge All (${stats.unjudgedCount} un-judged)` : 'All Judged'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Aggregate Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div className="rounded-xl border border-border bg-card/60 p-3.5">
            <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">Total Proposals</span>
            <span className="text-xl font-extrabold">{stats.totalCount}</span>
            <span className="ml-2 text-xs text-muted-foreground">({stats.judgedCount} judged)</span>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-3.5">
            <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">Average AI Score</span>
            <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">{stats.avgScore}/100</span>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-3.5">
            <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">Top Candidate Score</span>
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.topScore}/100</span>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-3.5">
            <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">Recommended Hires</span>
            <span className="text-xl font-extrabold text-emerald-500">{stats.recommendedCount}</span>
          </div>
        </div>

        {batchError && (
          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
            {batchError}
          </div>
        )}
      </div>

      {/* 2. Filter & Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 font-bold text-muted-foreground">
            <Filter size={14} /> Filter:
          </span>
          <button
            onClick={() => setFilterRec('all')}
            className={`rounded-lg px-3 py-1.5 font-semibold transition ${filterRec === 'all' ? 'bg-purple-500/15 text-purple-600 border border-purple-500/30' : 'bg-muted/30 text-muted-foreground hover:bg-muted'}`}
          >
            All Candidates ({proposals.length})
          </button>
          <button
            onClick={() => setFilterRec('recommended')}
            className={`rounded-lg px-3 py-1.5 font-semibold transition ${filterRec === 'recommended' ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' : 'bg-muted/30 text-muted-foreground hover:bg-muted'}`}
          >
            Recommended Only ({stats.recommendedCount})
          </button>
          <button
            onClick={() => setFilterRec('unjudged')}
            className={`rounded-lg px-3 py-1.5 font-semibold transition ${filterRec === 'unjudged' ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30' : 'bg-muted/30 text-muted-foreground hover:bg-muted'}`}
          >
            Un-judged ({stats.unjudgedCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={minScoreFilter}
            onChange={e => setMinScoreFilter(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-1.5 font-medium"
          >
            <option value={0}>Min Score: Any</option>
            <option value={80}>Score 80+</option>
            <option value={70}>Score 70+</option>
            <option value={60}>Score 60+</option>
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortByOption)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 font-medium"
          >
            <option value="aiScore">Sort: Highest AI Score</option>
            <option value="budget">Sort: Proposed Budget</option>
            <option value="newest">Sort: Newest Submitted</option>
          </select>
        </div>
      </div>

      {/* 3. Ranked Candidate Cards Leaderboard */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading candidates leaderboard...</div>
      ) : rankedCandidates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No candidate proposals match the selected filter criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {rankedCandidates.map((candidate, index) => {
            const hasScore = typeof candidate.aiScore === 'number';
            const status = Number(candidate.status);

            return (
              <div
                key={candidate.proposalsId}
                onClick={() => onSelectProposal(candidate.proposalsId)}
                className="group relative cursor-pointer rounded-2xl border border-border bg-card p-5 transition hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/5"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Rank & Candidate Details */}
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Rank Badge */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 font-black text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      #{index + 1}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-base text-foreground truncate">
                          {candidate.freelancerName || 'Freelancer'}
                        </h3>
                        {candidate.aiRecommendedHire === true && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={12} /> Recommended
                          </span>
                        )}
                        {candidate.aiRecommendedHire === false && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            <XCircle size={12} /> Not Recommended
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Budget: <strong className="text-foreground">{formatGigCoin(candidate.proposedBudget || 0)}</strong> · Duration: {candidate.proposedDuration || 'N/A'} · Submitted: {new Date(candidate.submittedAt).toLocaleDateString()}
                      </p>

                      {/* AI Summary */}
                      {candidate.aiSummary ? (
                        <p className="text-xs text-foreground/90 leading-relaxed italic bg-purple-500/5 p-2.5 rounded-lg border border-purple-500/10 mt-2 whitespace-pre-wrap">
                          "{candidate.aiSummary}"
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          No AI evaluation cached yet. Click "Judge All" to evaluate candidates.
                        </p>
                      )}

                      {/* Technical & Soft Skills Tags */}
                      {((candidate.aiTechnicalSkills?.length ?? 0) > 0 || (candidate.aiSoftSkills?.length ?? 0) > 0) && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {candidate.aiTechnicalSkills?.map((s, idx) => (
                            <span key={idx} className="rounded bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                              {s}
                            </span>
                          ))}
                          {candidate.aiSoftSkills?.map((s, idx) => (
                            <span key={idx} className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: AI Score Meter & Actions */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 border-border pt-3 lg:pt-0 shrink-0">
                    {/* Score Circle */}
                    <div className="flex items-center gap-3">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${getScoreColorClass(candidate.aiScore)}`}>
                        <span className="text-lg font-black">{hasScore ? candidate.aiScore : '--'}</span>
                      </div>
                      <div className="text-left">
                        <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">AI Score</span>
                        <span className="text-xs font-semibold">{hasScore ? `${candidate.aiScore}/100` : 'Not Judged'}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {status === ProposalStatus.Pending && canAct && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onShortlist(candidate.proposalsId);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 px-3 py-2 text-xs font-bold text-cyan-600 hover:bg-cyan-500/10"
                        >
                          <Check size={14} /> Shortlist
                        </button>
                      )}

                      {canAct && (
                        <>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onStartNegotiation(candidate.proposalsId);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <MessageSquare size={14} /> Negotiate
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onReject(candidate.proposalsId);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-500/10"
                          >
                            <X size={14} />
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
    </div>
  );
};
