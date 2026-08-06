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
    <div className={`max-h-[calc(100vh-270px)] overflow-y-auto custom-scrollbar pr-1.5 ${layoutMode === 'compact' ? 'space-y-2' : 'space-y-4'}`}>
      {filteredMatches.map((match, idx) => {
        if (layoutMode === 'compact') {
          return (
            <article
              key={match.freelancerProfileId}
              className="rounded-xl border border-border bg-surface-card/80 p-3 hover:border-purple-500/30 transition-all flex items-center justify-between gap-3"
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onOpenProfile(match)}
                      className="font-bold text-sm text-text-primary hover:text-brand transition-colors truncate"
                    >
                      {match.displayName}
                    </button>
                    <span className="text-xs text-brand font-semibold shrink-0">
                      • {match.title || t('talentMatching.freelancerRole')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-text-muted mt-0.5">
                    {match.location && <span><MapPin size={10} className="inline mr-0.5" />{match.location}</span>}
                    <span className="flex items-center gap-0.5"><Star size={10} className="text-amber-400 fill-current" />{match.averageRating > 0 ? match.averageRating.toFixed(1) : '—'}</span>
                    <span className="flex items-center gap-0.5"><Zap size={10} className="text-brand" />{match.eloPoints} ELO</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-lg font-black text-purple-500 leading-none">{match.finalScore.toFixed(1)}</div>
                  <div className="text-[9px] uppercase tracking-wider text-text-muted">{t('talentMatching.matchScore')}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={savingIds.has(match.freelancerProfileId)}
                    onClick={() => void onToggleSaved(match.freelancerProfileId, matchRunId || undefined)}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all disabled:opacity-50 ${
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
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
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
            className="rounded-2xl border border-border bg-surface-card/80 overflow-hidden hover:border-purple-500/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            style={{ backdropFilter: 'blur(12px)' }}
          >
          {/* Rank indicator */}
          <div className="h-1 w-full bg-gradient-to-r from-purple-600 to-indigo-400" />

          <div className="p-5">
            <div className="flex gap-4 items-start">
              <button onClick={() => onOpenProfile(match)} className="shrink-0">
                <UserAvatar
                  userId={match.userId}
                  src={match.avatarUrl}
                  name={match.displayName}
                  size="lg"
                  className="rounded-2xl"
                />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <button
                      onClick={() => onOpenProfile(match)}
                      className="text-left font-black text-base text-text-primary hover:text-brand transition-colors"
                    >
                      {match.displayName}
                    </button>
                    <p className="text-sm font-semibold text-brand">
                      {match.title || t('talentMatching.freelancerRole')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-black text-purple-500">{match.finalScore.toFixed(1)}</div>
                    <div className="text-[10px] uppercase tracking-widest text-text-muted">
                      {t('talentMatching.matchScore')}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <DataConfidenceBadge match={match} />
                  {match.location && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-muted border border-border text-[11px] text-text-muted">
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
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: t('talentMatching.skillMatch'), score: match.scoreBreakdown.embedding, color: 'text-brand' },
                { label: t('talentMatching.trackRecord'), score: match.scoreBreakdown.algorithm, color: 'text-purple-500' },
                { label: t('talentMatching.activity'), score: match.scoreBreakdown.evidence, color: 'text-emerald-500' },
              ].map(item => (
                <div key={item.label} className="rounded-xl bg-surface-muted border border-border p-2.5 text-center">
                  <strong className={`block text-base font-black ${item.color}`}>{item.score.toFixed(1)}</strong>
                  <span className="text-[10px] uppercase text-text-muted">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Insights */}
            <div className="mt-4 space-y-2 text-sm">
              {match.semanticStrengths.length > 0 && (
                <p className="text-text-secondary text-xs leading-relaxed">
                  <span className="font-bold text-text-primary">{t('talentMatching.whyStandOut')} </span>
                  {match.semanticStrengths.join(' · ')}
                </p>
              )}
              {match.matchedSkills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-text-primary">{t('talentMatching.matched')}</span>
                  {match.matchedSkills.map(skill => (
                    <span
                      key={skill}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-success/10 text-success text-xs font-semibold border border-success/20"
                    >
                      <Check size={11} /> {skill}
                    </span>
                  ))}
                </div>
              )}
              {match.missingSkills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-text-primary">{t('talentMatching.skillGaps')}</span>
                  {match.missingSkills.map(skill => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-semibold border border-amber-500/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              {match.reasons.length > 0 && (
                <ul className="space-y-0.5 text-xs text-text-muted list-disc pl-4">
                  {match.reasons.map(reason => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3.5 border-t border-border/70 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Star size={12} className="text-amber-400" fill="currentColor" />
                  {match.reviewCount > 0 ? `${match.averageRating.toFixed(1)} (${match.reviewCount})` : t('talentMatching.noReviews')}
                </span>
                <span>
                  {t(match.completedContracts === 1 ? 'talentMatching.contractCount_one' : 'talentMatching.contractCount_other', {
                    count: match.completedContracts,
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Zap size={11} className="text-brand" />
                  {match.eloPoints} ELO
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={savingIds.has(match.freelancerProfileId)}
                  onClick={() => void onToggleSaved(match.freelancerProfileId, matchRunId || undefined)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all disabled:opacity-50 ${
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
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
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
