import { AlertTriangle, Bot, BriefcaseBusiness, Check, Heart, MapPin, RefreshCw, Star, Zap } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import type { AiTalentMatch } from '../../../types/talentMatching';
import { DataConfidenceBadge } from './DataConfidenceBadge';

interface SmartMatchingTabProps {
  layoutMode?: 'grid' | 'compact';
  loadingMatches: boolean;
  matchError: string | null;
  selectedJobId: string;
  filteredMatches: AiTalentMatch[];
  matchRunId: string | null;
  savedIds: Set<string>;
  savingIds: Set<string>;
  invitedIds: Set<string>;
  onRetry: () => void;
  onOpenProfile: (match: AiTalentMatch) => void;
  onToggleSaved: (profileId: string, matchRunId?: string) => void;
  onInvite: (profileId: string, displayName: string, jobId: string, matchRunId?: string) => void;
}

export function SmartMatchingTab({
  layoutMode = 'grid',
  loadingMatches,
  matchError,
  selectedJobId,
  filteredMatches,
  matchRunId,
  savedIds,
  savingIds,
  invitedIds,
  onRetry,
  onOpenProfile,
  onToggleSaved,
  onInvite,
}: SmartMatchingTabProps) {
  const { t } = useTranslation();

  if (loadingMatches) {
    return (
      <div className="rounded-2xl border border-border bg-surface-card/70 p-12 text-center">
        <Bot size={36} className="mx-auto mb-4 text-purple-500 animate-pulse" />
        <h2 className="font-bold text-text-primary">{t('talentMatching.findingFreelancers')}</h2>
        <p className="text-sm text-text-muted mt-1">{t('talentMatching.takingSeconds')}</p>
      </div>
    );
  }

  if (matchError) {
    return (
      <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-8 text-center">
        <AlertTriangle size={32} className="mx-auto text-red-500 mb-3" />
        <h2 className="font-bold text-text-primary">{t('talentMatching.smartMatchingError')}</h2>
        <p className="text-sm text-text-muted mt-1">{matchError}</p>
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand text-white px-5 py-2.5 text-sm font-bold"
        >
          <RefreshCw size={14} /> {t('talentMatching.retry')}
        </button>
      </div>
    );
  }

  if (!selectedJobId) {
    return (
      <div className="rounded-2xl border border-border bg-surface-card/70 p-10 text-center">
        <BriefcaseBusiness size={32} className="mx-auto text-text-muted mb-3" />
        <h2 className="font-bold text-text-primary">{t('talentMatching.createJobFirstTitle')}</h2>
        <p className="text-sm text-text-muted mt-1">{t('talentMatching.createJobFirstDesc')}</p>
      </div>
    );
  }

  if (filteredMatches.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-card/70 p-10 text-center">
        <BriefcaseBusiness size={32} className="mx-auto text-text-muted mb-3" />
        <h2 className="font-bold text-text-primary">{t('talentMatching.noEligibleFound')}</h2>
        <p className="text-sm text-text-muted mt-1">{t('talentMatching.noEligibleDesc')}</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${layoutMode === 'compact' ? 'space-y-2.5' : 'space-y-4'}`}>
      {filteredMatches.map((match, idx) => {
        if (layoutMode === 'compact') {
          return (
            <article
              key={match.freelancerProfileId}
              className="rounded-2xl border border-border bg-surface-card/80 p-3 sm:p-3.5 hover:border-purple-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <span className="text-xs font-black text-purple-500 shrink-0">#{idx + 1}</span>
                <button onClick={() => onOpenProfile(match)} className="shrink-0">
                  <UserAvatar
                    userId={match.userId}
                    src={match.avatarUrl}
                    name={match.displayName}
                    size="sm"
                    className="rounded-xl"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => onOpenProfile(match)}
                    className="font-bold text-xs sm:text-sm text-text-primary hover:text-brand transition-colors truncate block text-left max-w-full"
                  >
                    {match.displayName}
                  </button>
                  <p className="text-[11px] sm:text-xs text-brand font-semibold truncate max-w-full mt-0.5">
                    {match.title || t('talentMatching.freelancerRole')}
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] text-text-muted mt-1">
                    {match.location && <span className="truncate max-w-[140px]"><MapPin size={10} className="inline mr-0.5 shrink-0" />{match.location}</span>}
                    <span className="flex items-center gap-0.5 shrink-0"><Star size={10} className="text-amber-400 fill-current" />{match.averageRating > 0 ? match.averageRating.toFixed(1) : '—'}</span>
                    <span className="flex items-center gap-0.5 shrink-0"><Zap size={10} className="text-brand" />{match.eloPoints} ELO</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                {match.savingPercentage != null && match.savingPercentage !== 0 ? (
                  match.savingPercentage > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      💚 Saving {match.savingPercentage.toFixed(0)}% from your job budget
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      ⚠️ {Math.abs(match.savingPercentage).toFixed(0)}% above your job budget
                    </span>
                  )
                ) : null}
                {(() => {
                  const bonus = match.savingPercentage && match.savingPercentage > 0 ? (match.budgetBonus ?? match.savingPercentage) : 0;
                  const trackBase = Math.max(0, match.scoreBreakdown.algorithm - bonus);
                  const scoreBoost = 0.35 * bonus;
                  const baseScore = Math.max(0, match.finalScore - scoreBoost);

                  return (
                    <div className="relative group cursor-pointer text-left sm:text-right flex items-center sm:block gap-2">
                      <div className="text-base sm:text-lg font-black text-purple-500 leading-none group-hover:scale-105 transition-transform">{match.finalScore.toFixed(1)}</div>
                      <div className="text-[9px] uppercase tracking-wider text-text-muted">{t('talentMatching.matchScore')}</div>
                      <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-80 rounded-2xl bg-white dark:bg-slate-900 text-text-primary p-4 text-xs shadow-2xl border border-brand/40 text-left opacity-100">
                        <div className="font-bold text-brand mb-2 flex items-center justify-between border-b border-border/50 pb-2">
                          <span className="flex items-center gap-1.5 font-black text-xs sm:text-sm">📊 Match Score & Savings Impact</span>
                          <span className="text-[11px] font-mono text-brand bg-brand/15 px-2 py-0.5 rounded-md font-extrabold border border-brand/20">
                            {match.finalScore.toFixed(1)} PTS
                          </span>
                        </div>
                        <div className="font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-border/70 text-[11px] space-y-1.5">
                          <div className="flex justify-between items-center text-text-secondary">
                            <span>🎯 Skill Match (45%):</span>
                            <span className="font-bold text-brand">0.45 × {match.scoreBreakdown.embedding.toFixed(1)} = {(0.45 * match.scoreBreakdown.embedding).toFixed(1)} pts</span>
                          </div>
                          <div className="flex justify-between items-center text-text-secondary">
                            <span>🏆 Track Record (35%):</span>
                            <span className="font-bold text-purple-600 dark:text-purple-400">0.35 × {match.scoreBreakdown.algorithm.toFixed(1)} = {(0.35 * match.scoreBreakdown.algorithm).toFixed(1)} pts</span>
                          </div>
                          {bonus > 0 && (
                            <div className="pl-3 text-[10px] text-text-muted border-l border-brand/30 space-y-0.5 font-mono">
                              <div className="flex justify-between">
                                <span>└ Base Track Record:</span>
                                <span className="font-semibold text-text-primary">{trackBase.toFixed(1)} pts</span>
                              </div>
                              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-extrabold">
                                <span>└ Savings Bonus Added:</span>
                                <span>+{bonus.toFixed(1)} pts</span>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-text-secondary">
                            <span>⚡ Activity (20%):</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">0.20 × {match.scoreBreakdown.evidence.toFixed(1)} = {(0.20 * match.scoreBreakdown.evidence).toFixed(1)} pts</span>
                          </div>
                        </div>

                        {bonus > 0 ? (
                          <div className="mt-2.5 bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl text-[10px] text-emerald-700 dark:text-emerald-300 space-y-1 shadow-2xs">
                            <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                              <span>💚 BEFORE vs AFTER SAVINGS IMPACT</span>
                              <span className="font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300 font-extrabold">+{scoreBoost.toFixed(1)} pts</span>
                            </div>
                            <div className="flex justify-between text-text-secondary">
                              <span>• Score Before Savings:</span>
                              <span className="font-bold text-text-primary">{baseScore.toFixed(1)} Match Score</span>
                            </div>
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-extrabold">
                              <span>• + Savings Bonus Boost:</span>
                              <span>+{scoreBoost.toFixed(1)} pts (35% × {bonus.toFixed(1)} bonus)</span>
                            </div>
                            <div className="flex justify-between text-text-primary font-black pt-1 border-t border-emerald-500/25">
                              <span>• Score After Savings:</span>
                              <span className="text-brand font-black">{match.finalScore.toFixed(1)} Match Score</span>
                            </div>
                          </div>
                        ) : match.savingPercentage != null && match.savingPercentage < 0 ? (
                          <div className="mt-2.5 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-[10px] text-amber-700 dark:text-amber-300 text-center leading-relaxed font-medium">
                            ⚠️ Rate is <strong>{Math.abs(match.savingPercentage).toFixed(1)}% above budget</strong> (0.0 pts bonus). Match score based on skills & qualification.
                          </div>
                        ) : (
                          <div className="mt-2 text-[10px] text-text-muted text-center leading-relaxed">
                            Sum: <strong>{(0.45 * match.scoreBreakdown.embedding).toFixed(1)}</strong> + <strong>{(0.35 * match.scoreBreakdown.algorithm).toFixed(1)}</strong> + <strong>{(0.20 * match.scoreBreakdown.evidence).toFixed(1)}</strong> = <strong className="text-brand font-black">{match.finalScore.toFixed(1)} Match Score</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-2">
                  <button
                    disabled={savingIds.has(match.freelancerProfileId)}
                    onClick={() => void onToggleSaved(match.freelancerProfileId, matchRunId || undefined)}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all disabled:opacity-50 min-h-[38px] min-w-[38px] ${
                      savedIds.has(match.freelancerProfileId)
                        ? 'border-red-400/40 bg-red-400/10 text-red-500'
                        : 'border-border hover:border-red-400/40 text-text-muted'
                    }`}
                    aria-label="Save freelancer"
                  >
                    <Heart size={14} className={savedIds.has(match.freelancerProfileId) ? 'fill-current' : ''} />
                  </button>
                  <button
                    onClick={() =>
                      onInvite(
                        match.freelancerProfileId,
                        match.displayName,
                        selectedJobId,
                        matchRunId || undefined,
                      )
                    }
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all min-h-[38px] text-center ${
                      invitedIds.has(match.freelancerProfileId)
                        ? 'bg-success/10 text-success border border-success/25'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white hover:opacity-90'
                    }`}
                  >
                    {invitedIds.has(match.freelancerProfileId)
                      ? t('talentMatching.invitedBadge')
                      : t('talentMatching.inviteToJobBtn')}
                  </button>
                </div>
              </div>
            </article>
          );
        }

        return (
          <article
            key={match.freelancerProfileId}
            className="rounded-2xl border border-border bg-surface-card/80 overflow-hidden hover:border-purple-500/30 hover:shadow-md transition-all duration-200"
            style={{ backdropFilter: 'blur(12px)' }}
          >
          {/* Rank indicator */}
          <div className="h-1 w-full bg-gradient-to-r from-purple-600 to-indigo-400" />

          <div className="p-4 sm:p-5">
            <div className="flex gap-3 sm:gap-4 items-start">
              <button onClick={() => onOpenProfile(match)} className="shrink-0">
                <UserAvatar
                  userId={match.userId}
                  src={match.avatarUrl}
                  name={match.displayName}
                  size="md"
                  className="rounded-2xl"
                />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onOpenProfile(match)}
                      className="text-left font-black text-sm sm:text-base text-text-primary hover:text-brand transition-colors truncate block max-w-full"
                    >
                      {match.displayName}
                    </button>
                    <p className="text-xs sm:text-sm font-semibold text-brand truncate max-w-full">
                      {match.title || t('talentMatching.freelancerRole')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {match.savingPercentage != null && match.savingPercentage !== 0 ? (
                      <div className="relative group cursor-pointer shrink-0">
                        {match.savingPercentage > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-sm transition-transform group-hover:scale-105">
                            💚 Saving {match.savingPercentage.toFixed(0)}% from your job budget
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 shadow-sm transition-transform group-hover:scale-105">
                            ⚠️ {Math.abs(match.savingPercentage).toFixed(0)}% above your job budget
                          </span>
                        )}
                        <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-76 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 text-text-primary p-4 text-xs shadow-2xl border border-brand/40 text-left opacity-100">
                          {(() => {
                            const hourlyTarget = match.jobBudget ? match.jobBudget / 160 : 0;
                            const hourlyVariance = (hourlyTarget > 0 && match.candidateRate)
                              ? ((hourlyTarget - match.candidateRate) / hourlyTarget) * 100
                              : 0;
                            const isHourlyComp = Boolean(
                              match.jobBudget &&
                              match.candidateRate &&
                              match.savingPercentage != null &&
                              Math.abs(Math.abs(match.savingPercentage) - Math.abs(hourlyVariance)) < 2.0
                            );
                            const targetHourly = isHourlyComp ? hourlyTarget : match.jobBudget;
                            const jobDispStr = targetHourly ? (isHourlyComp ? `${targetHourly.toFixed(1)}/hr` : `${Math.round(targetHourly).toLocaleString()}`) : 'Budget';
                            const candDispStr = match.candidateRate ? (isHourlyComp ? `${match.candidateRate.toFixed(1)}/hr` : `${Math.round(match.candidateRate).toLocaleString()}`) : 'Rate';

                            return match.savingPercentage > 0 ? (
                              <>
                                <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center justify-between border-b border-border/50 pb-2">
                                  <span className="flex items-center gap-1.5 font-black">💰 Budget Saving Formula</span>
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md font-mono font-extrabold border border-emerald-500/30">
                                    +{(match.budgetBonus ?? match.savingPercentage).toFixed(1)} pts
                                  </span>
                                </div>
                                <div className="font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-border/70 text-[11px] space-y-1.5">
                                  <div className="flex justify-between text-text-secondary">
                                    <span>Job Budget:</span>
                                    <span className="font-bold text-text-primary">
                                      {match.jobBudget ? (isHourlyComp ? `${targetHourly?.toFixed(1)} GigCoins/hr (${Math.round(match.jobBudget).toLocaleString()} Total)` : `${Math.round(match.jobBudget).toLocaleString()} GigCoins`) : 'Standard Budget'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-text-secondary">
                                    <span>Freelancer Rate:</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                      {match.candidateRate ? (isHourlyComp ? `${match.candidateRate.toFixed(1)} GigCoins/hr` : `${Math.round(match.candidateRate).toLocaleString()} GigCoins`) : 'Preferred Rate'}
                                    </span>
                                  </div>
                                  {match.candidateRate ? (
                                    <div className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 text-right italic font-sans">
                                      ℹ️ Formed by: Total Proposal Budgets ÷ Total Milestone Hours
                                    </div>
                                  ) : null}
                                  <div className="border-t border-border/60 pt-1 text-[10px] text-emerald-600 dark:text-emerald-400 flex justify-between font-semibold">
                                    <span>Formula:</span>
                                    <span>({jobDispStr} - {candDispStr}) / {jobDispStr}</span>
                                  </div>
                                </div>
                                <div className="mt-2 text-[10px] text-text-muted text-center">
                                  Cost savings: <strong className="text-text-primary">{match.savingPercentage.toFixed(1)}%</strong> &rarr; awarded <strong className="text-emerald-600 dark:text-emerald-400">+{ (match.budgetBonus ?? match.savingPercentage).toFixed(1) } pts bonus</strong>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center justify-between border-b border-border/50 pb-2">
                                  <span className="flex items-center gap-1.5 font-black">⚠️ Budget Variance Breakdown</span>
                                  <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md font-mono font-extrabold border border-amber-500/30">
                                    +0.0 pts
                                  </span>
                                </div>
                                <div className="font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-border/70 text-[11px] space-y-1.5">
                                  <div className="flex justify-between text-text-secondary">
                                    <span>Job Budget:</span>
                                    <span className="font-bold text-text-primary">
                                      {match.jobBudget ? (isHourlyComp ? `${targetHourly?.toFixed(1)} GigCoins/hr (${Math.round(match.jobBudget).toLocaleString()} Total)` : `${Math.round(match.jobBudget).toLocaleString()} GigCoins`) : 'Standard Budget'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-text-secondary">
                                    <span>Freelancer Rate:</span>
                                    <span className="font-bold text-amber-600 dark:text-amber-400">
                                      {match.candidateRate ? (isHourlyComp ? `${match.candidateRate.toFixed(1)} GigCoins/hr` : `${Math.round(match.candidateRate).toLocaleString()} GigCoins`) : 'Preferred Rate'}
                                    </span>
                                  </div>
                                  {match.candidateRate ? (
                                    <div className="text-[9px] text-amber-600/80 dark:text-amber-400/80 text-right italic font-sans">
                                      ℹ️ Formed by: Total Proposal Budgets ÷ Total Milestone Hours
                                    </div>
                                  ) : null}
                                  <div className="border-t border-border/60 pt-1 text-[10px] text-amber-600 dark:text-amber-400 flex justify-between font-semibold">
                                    <span>Variance:</span>
                                    <span>+{Math.abs(match.savingPercentage).toFixed(1)}% higher than budget</span>
                                  </div>
                                </div>
                                <div className="mt-2 text-[10px] text-text-muted text-center">
                                  Rate is <strong className="text-amber-600 dark:text-amber-400">{Math.abs(match.savingPercentage).toFixed(1)}% higher</strong> than job budget (0.0 pts bonus).
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : null}
                    {(() => {
                      const bonus = match.savingPercentage && match.savingPercentage > 0 ? (match.budgetBonus ?? match.savingPercentage) : 0;
                      const trackBase = Math.max(0, match.scoreBreakdown.algorithm - bonus);
                      const scoreBoost = 0.35 * bonus;
                      const baseScore = Math.max(0, match.finalScore - scoreBoost);

                      return (
                        <div className="relative group cursor-pointer text-right shrink-0">
                          <div className="text-xl sm:text-2xl font-black text-purple-500 leading-none group-hover:scale-105 transition-transform">{match.finalScore.toFixed(1)}</div>
                          <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-text-muted mt-0.5">
                            {t('talentMatching.matchScore')}
                          </div>
                          <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-80 sm:w-84 rounded-2xl bg-white dark:bg-slate-900 text-text-primary p-4 text-xs shadow-2xl border border-brand/40 text-left opacity-100">
                            <div className="font-bold text-brand mb-2 flex items-center justify-between border-b border-border/50 pb-2">
                              <span className="flex items-center gap-1.5 font-black text-xs sm:text-sm">📊 Match Score & Savings Impact</span>
                              <span className="text-[11px] font-mono text-brand bg-brand/15 px-2 py-0.5 rounded-md font-extrabold border border-brand/20">
                                {match.finalScore.toFixed(1)} PTS
                              </span>
                            </div>
                            <div className="font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-border/70 text-[11px] space-y-1.5">
                              <div className="flex justify-between items-center text-text-secondary">
                                <span>🎯 Skill Match (45%):</span>
                                <span className="font-bold text-brand">0.45 × {match.scoreBreakdown.embedding.toFixed(1)} = {(0.45 * match.scoreBreakdown.embedding).toFixed(1)} pts</span>
                              </div>
                              <div className="flex justify-between items-center text-text-secondary">
                                <span>🏆 Track Record (35%):</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400">0.35 × {match.scoreBreakdown.algorithm.toFixed(1)} = {(0.35 * match.scoreBreakdown.algorithm).toFixed(1)} pts</span>
                              </div>
                              {bonus > 0 && (
                                <div className="pl-3 text-[10px] text-text-muted border-l border-brand/30 space-y-0.5 font-mono">
                                  <div className="flex justify-between">
                                    <span>└ Base Track Record:</span>
                                    <span className="font-semibold text-text-primary">{trackBase.toFixed(1)} pts</span>
                                  </div>
                                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-extrabold">
                                    <span>└ Savings Bonus Added:</span>
                                    <span>+{bonus.toFixed(1)} pts</span>
                                  </div>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-text-secondary">
                                <span>⚡ Activity (20%):</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">0.20 × {match.scoreBreakdown.evidence.toFixed(1)} = {(0.20 * match.scoreBreakdown.evidence).toFixed(1)} pts</span>
                              </div>
                            </div>

                            {bonus > 0 ? (
                              <div className="mt-2.5 bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl text-[10px] text-emerald-700 dark:text-emerald-300 space-y-1 shadow-2xs">
                                <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                                  <span>💚 BEFORE vs AFTER SAVINGS IMPACT</span>
                                  <span className="font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300 font-extrabold">+{scoreBoost.toFixed(1)} pts</span>
                                </div>
                                <div className="flex justify-between text-text-secondary">
                                  <span>• Score Before Savings:</span>
                                  <span className="font-bold text-text-primary">{baseScore.toFixed(1)} Match Score</span>
                                </div>
                                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-extrabold">
                                  <span>• + Savings Bonus Boost:</span>
                                  <span>+{scoreBoost.toFixed(1)} pts (35% × {bonus.toFixed(1)} bonus)</span>
                                </div>
                                <div className="flex justify-between text-text-primary font-black pt-1 border-t border-emerald-500/25">
                                  <span>• Score After Savings:</span>
                                  <span className="text-brand font-black">{match.finalScore.toFixed(1)} Match Score</span>
                                </div>
                              </div>
                            ) : match.savingPercentage != null && match.savingPercentage < 0 ? (
                              <div className="mt-2.5 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-[10px] text-amber-700 dark:text-amber-300 text-center leading-relaxed font-medium">
                                ⚠️ Rate is <strong>{Math.abs(match.savingPercentage).toFixed(1)}% above budget</strong> (0.0 pts bonus). Match score based on skills & qualification.
                              </div>
                            ) : (
                              <div className="mt-2 text-[10px] text-text-muted text-center leading-relaxed">
                                Sum: <strong>{(0.45 * match.scoreBreakdown.embedding).toFixed(1)}</strong> + <strong>{(0.35 * match.scoreBreakdown.algorithm).toFixed(1)}</strong> + <strong>{(0.20 * match.scoreBreakdown.evidence).toFixed(1)}</strong> = <strong className="text-brand font-black">{match.finalScore.toFixed(1)} Match Score</strong>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                  <DataConfidenceBadge match={match} />
                  {match.location && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-muted border border-border text-[10px] sm:text-[11px] text-text-muted">
                      <MapPin size={11} /> {match.location}
                    </span>
                  )}
                  <span className="text-[10px] font-black text-text-muted bg-surface-muted border border-border px-2 py-0.5 rounded-full">
                    #{idx + 1}
                  </span>
                </div>
              </div>
            </div>

            {/* Score breakdown */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3.5 sm:mt-4">
              {[
                { label: t('talentMatching.skillMatch'), score: match.scoreBreakdown.embedding, color: 'text-brand' },
                { label: t('talentMatching.trackRecord'), score: match.scoreBreakdown.algorithm, color: 'text-purple-500' },
                { label: t('talentMatching.activity'), score: match.scoreBreakdown.evidence, color: 'text-emerald-500' },
              ].map(item => (
                <div key={item.label} className="rounded-xl bg-surface-muted border border-border p-2 sm:p-2.5 text-center">
                  <strong className={`block text-sm sm:text-base font-black ${item.color}`}>{item.score.toFixed(1)}</strong>
                  <span className="text-[9px] sm:text-[10px] uppercase text-text-muted block truncate">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Insights */}
            <div className="mt-4 sm:mt-5 space-y-3">
              {(() => {
                const displayStrengths = match.semanticStrengths
                  .filter(s => !s.toLowerCase().includes('above job budget') && !s.startsWith('Rate is'))
                  .map(s => s.replace(/\s*(vs\s+job\s+budget\s*)?\(\+\d+(\.\d+)?\s*pts?\s*bonus\)/gi, '').trim());
                return displayStrengths.length > 0 ? (
                  <p className="text-text-primary text-base sm:text-lg font-medium leading-relaxed">
                    <span className="font-black text-text-primary text-base sm:text-lg">{t('talentMatching.whyStandOut')} </span>
                    {displayStrengths.join(' · ')}
                  </p>
                ) : null;
              })()}
              {match.matchedSkills.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm sm:text-base font-extrabold text-text-primary">{t('talentMatching.matched')}</span>
                  {match.matchedSkills.map(skill => (
                    <span
                      key={skill}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-success/10 text-success text-xs sm:text-sm font-bold border border-success/25"
                    >
                      <Check size={14} /> {skill}
                    </span>
                  ))}
                </div>
              )}
              {match.missingSkills.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm sm:text-base font-extrabold text-text-primary">{t('talentMatching.skillGaps')}</span>
                  {match.missingSkills.map(skill => (
                    <span
                      key={skill}
                      className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 text-xs sm:text-sm font-bold border border-amber-500/25"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              {match.reasons.length > 0 && (
                <ul className="space-y-1.5 text-sm sm:text-base text-text-secondary list-disc pl-6 font-medium leading-relaxed">
                  {match.reasons.map(reason => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 sm:mt-5 pt-4 sm:pt-4 border-t border-border/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm sm:text-base text-text-primary font-bold">
                <span className="flex items-center gap-1.5">
                  <Star size={15} className="text-amber-400" fill="currentColor" />
                  {match.reviewCount > 0 ? `${match.averageRating.toFixed(1)} (${match.reviewCount})` : t('talentMatching.noReviews')}
                </span>
                <span className="font-bold">
                  {t(match.completedContracts === 1 ? 'talentMatching.contractCount_one' : 'talentMatching.contractCount_other', {
                    count: match.completedContracts,
                  })}
                </span>
                <span className="flex items-center gap-1.5 font-bold">
                  <Zap size={14} className="text-brand" />
                  {match.eloPoints} ELO
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  disabled={savingIds.has(match.freelancerProfileId)}
                  onClick={() => void onToggleSaved(match.freelancerProfileId, matchRunId || undefined)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all disabled:opacity-50 min-h-[38px] min-w-[38px] ${
                    savedIds.has(match.freelancerProfileId)
                      ? 'border-red-400/40 bg-red-400/10 text-red-500'
                      : 'border-border hover:border-red-400/40 text-text-muted'
                  }`}
                  aria-label="Save freelancer"
                >
                  <Heart size={15} className={savedIds.has(match.freelancerProfileId) ? 'fill-current' : ''} />
                </button>
                <button
                  onClick={() =>
                    onInvite(
                      match.freelancerProfileId,
                      match.displayName,
                      selectedJobId,
                      matchRunId || undefined,
                    )
                  }
                  className={`flex-1 sm:flex-initial rounded-xl px-4 py-2 text-xs font-bold transition-all min-h-[38px] text-center ${
                    invitedIds.has(match.freelancerProfileId)
                      ? 'bg-success/10 text-success border border-success/25'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white hover:opacity-90'
                  }`}
                >
                  {invitedIds.has(match.freelancerProfileId)
                    ? t('talentMatching.invitedBadge')
                    : t('talentMatching.inviteToJobBtn')}
                </button>
              </div>
            </div>
          </div>
        </article>
      );
    })}
    </div>
  );
}
