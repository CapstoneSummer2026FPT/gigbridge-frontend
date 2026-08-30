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
                {match.savingPercentage && match.savingPercentage > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    💚 Saving {match.savingPercentage.toFixed(0)}% from your job budget
                  </span>
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
                      <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-80 rounded-xl bg-slate-900/95 text-white p-3.5 text-xs shadow-2xl border border-purple-500/30 backdrop-blur-md text-left">
                        <div className="font-bold text-purple-400 mb-1.5 flex items-center justify-between">
                          <span>📊 Match Score & Savings Impact</span>
                          <span className="text-[11px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md font-bold">
                            {match.finalScore.toFixed(1)} PTS
                          </span>
                        </div>
                        <div className="font-mono bg-slate-950/85 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1.5">
                          <div className="flex justify-between items-center text-slate-300">
                            <span>🎯 Skill Match (45%):</span>
                            <span className="font-bold text-brand">0.45 × {match.scoreBreakdown.embedding.toFixed(1)} = {(0.45 * match.scoreBreakdown.embedding).toFixed(1)} pts</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span>🏆 Track Record (35%):</span>
                            <span className="font-bold text-purple-400">0.35 × {match.scoreBreakdown.algorithm.toFixed(1)} = {(0.35 * match.scoreBreakdown.algorithm).toFixed(1)} pts</span>
                          </div>
                          {bonus > 0 && (
                            <div className="pl-3 text-[10px] text-slate-400 border-l border-purple-500/40 space-y-0.5 font-mono">
                              <div className="flex justify-between">
                                <span>└ Base Track Record:</span>
                                <span>{trackBase.toFixed(1)} pts</span>
                              </div>
                              <div className="flex justify-between text-emerald-400 font-semibold">
                                <span>└ Savings Bonus Added:</span>
                                <span>+{bonus.toFixed(1)} pts</span>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-slate-300">
                            <span>⚡ Activity (20%):</span>
                            <span className="font-bold text-emerald-400">0.20 × {match.scoreBreakdown.evidence.toFixed(1)} = {(0.20 * match.scoreBreakdown.evidence).toFixed(1)} pts</span>
                          </div>
                        </div>

                        {bonus > 0 ? (
                          <div className="mt-2.5 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-lg text-[10px] text-emerald-300 space-y-1">
                            <div className="font-bold text-emerald-400 flex items-center justify-between">
                              <span>💚 BEFORE vs AFTER SAVINGS IMPACT</span>
                              <span className="font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">+{scoreBoost.toFixed(1)} pts</span>
                            </div>
                            <div className="flex justify-between text-slate-300">
                              <span>• Score Before Savings:</span>
                              <span className="font-bold text-slate-200">{baseScore.toFixed(1)} Match Score</span>
                            </div>
                            <div className="flex justify-between text-emerald-400 font-bold">
                              <span>• + Savings Bonus Boost:</span>
                              <span>+{scoreBoost.toFixed(1)} pts (35% × {bonus.toFixed(1)} bonus)</span>
                            </div>
                            <div className="flex justify-between text-white font-black pt-1 border-t border-emerald-500/20">
                              <span>• Score After Savings:</span>
                              <span className="text-purple-400">{match.finalScore.toFixed(1)} Match Score</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 text-[10px] text-slate-300 text-center leading-relaxed">
                            Sum: <strong>{(0.45 * match.scoreBreakdown.embedding).toFixed(1)}</strong> + <strong>{(0.35 * match.scoreBreakdown.algorithm).toFixed(1)}</strong> + <strong>{(0.20 * match.scoreBreakdown.evidence).toFixed(1)}</strong> = <strong className="text-purple-400">{match.finalScore.toFixed(1)} Match Score</strong>
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
                    {match.savingPercentage && match.savingPercentage > 0 ? (
                      <div className="relative group cursor-pointer shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-sm transition-transform group-hover:scale-105">
                          💚 Saving {match.savingPercentage.toFixed(0)}% from your job budget
                        </span>
                        <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-72 rounded-xl bg-slate-900/95 text-white p-3 text-xs shadow-2xl border border-emerald-500/30 backdrop-blur-md">
                          <div className="font-bold text-emerald-400 mb-1 flex items-center justify-between">
                            <span>💰 Budget Saving Formula</span>
                            <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                              +{(match.budgetBonus ?? match.savingPercentage).toFixed(1)} pts
                            </span>
                          </div>
                          <div className="font-mono bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-[11px] space-y-1">
                            <div className="flex justify-between text-slate-300">
                              <span>Job Budget:</span>
                              <span className="font-bold text-white">
                                {match.jobBudget ? `${match.jobBudget.toLocaleString()} GigCoins` : 'Standard Budget'}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-300">
                              <span>Freelancer Rate:</span>
                              <span className="font-bold text-emerald-400">
                                {match.candidateRate ? `${match.candidateRate.toLocaleString()} GigCoins` : 'Preferred Rate'}
                              </span>
                            </div>
                            <div className="border-t border-slate-800 pt-1 text-[10px] text-emerald-300 flex justify-between">
                              <span>Formula:</span>
                              <span>({match.jobBudget || 'Budget'} - {match.candidateRate || 'Rate'}) / {match.jobBudget || 'Budget'}</span>
                            </div>
                          </div>
                          <div className="mt-2 text-[10px] text-slate-300 text-center">
                            Cost savings: <strong>{match.savingPercentage.toFixed(1)}%</strong> &rarr; awarded <strong>+{(match.budgetBonus ?? match.savingPercentage).toFixed(1)} pts bonus</strong>
                          </div>
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
                          <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-80 sm:w-84 rounded-xl bg-slate-900/95 text-white p-3.5 text-xs shadow-2xl border border-purple-500/30 backdrop-blur-md text-left">
                            <div className="font-bold text-purple-400 mb-1.5 flex items-center justify-between">
                              <span>📊 Match Score & Savings Impact</span>
                              <span className="text-[11px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md font-bold">
                                {match.finalScore.toFixed(1)} PTS
                              </span>
                            </div>
                            <div className="font-mono bg-slate-950/85 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1.5">
                              <div className="flex justify-between items-center text-slate-300">
                                <span>🎯 Skill Match (45%):</span>
                                <span className="font-bold text-brand">0.45 × {match.scoreBreakdown.embedding.toFixed(1)} = {(0.45 * match.scoreBreakdown.embedding).toFixed(1)} pts</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-300">
                                <span>🏆 Track Record (35%):</span>
                                <span className="font-bold text-purple-400">0.35 × {match.scoreBreakdown.algorithm.toFixed(1)} = {(0.35 * match.scoreBreakdown.algorithm).toFixed(1)} pts</span>
                              </div>
                              {bonus > 0 && (
                                <div className="pl-3 text-[10px] text-slate-400 border-l border-purple-500/40 space-y-0.5 font-mono">
                                  <div className="flex justify-between">
                                    <span>└ Base Track Record:</span>
                                    <span>{trackBase.toFixed(1)} pts</span>
                                  </div>
                                  <div className="flex justify-between text-emerald-400 font-semibold">
                                    <span>└ Savings Bonus Added:</span>
                                    <span>+{bonus.toFixed(1)} pts</span>
                                  </div>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-slate-300">
                                <span>⚡ Activity (20%):</span>
                                <span className="font-bold text-emerald-400">0.20 × {match.scoreBreakdown.evidence.toFixed(1)} = {(0.20 * match.scoreBreakdown.evidence).toFixed(1)} pts</span>
                              </div>
                            </div>

                            {bonus > 0 ? (
                              <div className="mt-2.5 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-lg text-[10px] text-emerald-300 space-y-1">
                                <div className="font-bold text-emerald-400 flex items-center justify-between">
                                  <span>💚 BEFORE vs AFTER SAVINGS IMPACT</span>
                                  <span className="font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">+{scoreBoost.toFixed(1)} pts</span>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>• Score Before Savings:</span>
                                  <span className="font-bold text-slate-200">{baseScore.toFixed(1)} Match Score</span>
                                </div>
                                <div className="flex justify-between text-emerald-400 font-bold">
                                  <span>• + Savings Bonus Boost:</span>
                                  <span>+{scoreBoost.toFixed(1)} pts (35% × {bonus.toFixed(1)} bonus)</span>
                                </div>
                                <div className="flex justify-between text-white font-black pt-1 border-t border-emerald-500/20">
                                  <span>• Score After Savings:</span>
                                  <span className="text-purple-400">{match.finalScore.toFixed(1)} Match Score</span>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 text-[10px] text-slate-300 text-center leading-relaxed">
                                Sum: <strong>{(0.45 * match.scoreBreakdown.embedding).toFixed(1)}</strong> + <strong>{(0.35 * match.scoreBreakdown.algorithm).toFixed(1)}</strong> + <strong>{(0.20 * match.scoreBreakdown.evidence).toFixed(1)}</strong> = <strong className="text-purple-400">{match.finalScore.toFixed(1)} Match Score</strong>
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
            <div className="mt-3.5 sm:mt-4 space-y-2 text-xs sm:text-sm">
              {match.semanticStrengths.length > 0 && (
                <p className="text-text-secondary text-xs leading-relaxed">
                  <span className="font-bold text-text-primary">{t('talentMatching.whyStandOut')} </span>
                  {match.semanticStrengths.join(' · ')}
                </p>
              )}
              {match.matchedSkills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] sm:text-xs font-bold text-text-primary">{t('talentMatching.matched')}</span>
                  {match.matchedSkills.map(skill => (
                    <span
                      key={skill}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-success/10 text-success text-[10px] sm:text-xs font-semibold border border-success/20"
                    >
                      <Check size={11} /> {skill}
                    </span>
                  ))}
                </div>
              )}
              {match.missingSkills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] sm:text-xs font-bold text-text-primary">{t('talentMatching.skillGaps')}</span>
                  {match.missingSkills.map(skill => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 text-[10px] sm:text-xs font-semibold border border-amber-500/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              {match.reasons.length > 0 && (
                <ul className="space-y-0.5 text-[11px] sm:text-xs text-text-muted list-disc pl-4">
                  {match.reasons.map(reason => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="mt-3.5 sm:mt-4 pt-3 sm:pt-3.5 border-t border-border/70 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1 font-medium">
                  <Star size={12} className="text-amber-400" fill="currentColor" />
                  {match.reviewCount > 0 ? `${match.averageRating.toFixed(1)} (${match.reviewCount})` : t('talentMatching.noReviews')}
                </span>
                <span className="font-medium">
                  {t(match.completedContracts === 1 ? 'talentMatching.contractCount_one' : 'talentMatching.contractCount_other', {
                    count: match.completedContracts,
                  })}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Zap size={11} className="text-brand" />
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
