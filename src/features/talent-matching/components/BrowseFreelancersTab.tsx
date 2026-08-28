import { useNavigate } from 'react-router';
import { AlertTriangle, Heart, MapPin, RefreshCw, Star, Users, Zap } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { getProfilePath } from '../../../shared/hooks/useProfileNavigation';
import type { FreelancerSummaryDto } from '../../../types/models/Profile';
import type { ViewStage } from '../hooks/useSmartTalentMatching';

interface BrowseFreelancersTabProps {
  activeStage: ViewStage;
  layoutMode?: 'grid' | 'compact';
  loadingInitial: boolean;
  browseError: string | null;
  filteredFreelancers: FreelancerSummaryDto[];
  savedIds: Set<string>;
  savingIds: Set<string>;
  invitedIds: Set<string>;
  hasActiveFilters: boolean;
  onRetry: () => void;
  onResetFilters: () => void;
  onChangeStage: (stage: ViewStage) => void;
  onToggleSaved: (profileId: string) => void;
  onInvite: (profileId: string, displayName: string) => void;
}

export function BrowseFreelancersTab({
  activeStage,
  layoutMode = 'grid',
  loadingInitial,
  browseError,
  filteredFreelancers,
  savedIds,
  savingIds,
  invitedIds,
  hasActiveFilters,
  onRetry,
  onResetFilters,
  onChangeStage,
  onToggleSaved,
  onInvite,
}: BrowseFreelancersTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (loadingInitial) {
    return (
      <div className="rounded-2xl border border-border bg-surface-card/70 p-12 text-center">
        <Users size={36} className="mx-auto mb-4 text-brand animate-pulse" />
        <h2 className="font-bold text-text-primary">{t('talentMatching.loadingDirectory')}</h2>
      </div>
    );
  }

  if (browseError) {
    return (
      <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-8 text-center">
        <AlertTriangle size={32} className="mx-auto text-red-500 mb-3" />
        <h2 className="font-bold text-text-primary">{t('talentMatching.freelancersLoadError')}</h2>
        <p className="text-sm text-text-muted mt-1">{browseError}</p>
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand text-white px-5 py-2.5 text-sm font-bold"
        >
          <RefreshCw size={14} /> {t('talentMatching.retry')}
        </button>
      </div>
    );
  }

  if (filteredFreelancers.length === 0) {
    const isSavedTabEmpty = activeStage === 'saved' && !hasActiveFilters;
    return (
      <div className="rounded-2xl border border-border bg-surface-card/70 p-10 text-center">
        {activeStage === 'saved' ? (
          <Heart size={32} className="mx-auto text-text-muted mb-3" />
        ) : (
          <Users size={32} className="mx-auto text-text-muted mb-3" />
        )}
        <h2 className="font-bold text-text-primary">
          {isSavedTabEmpty
            ? t('talentMatching.noSavedFreelancersYet')
            : t('talentMatching.noFreelancersMatch')}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {isSavedTabEmpty
            ? t('talentMatching.savedEmptyDesc')
            : t('talentMatching.filterEmptyDesc')}
        </p>
        <button
          onClick={isSavedTabEmpty ? () => onChangeStage('browse') : onResetFilters}
          className="mt-4 text-sm text-brand font-bold hover:underline"
        >
          {isSavedTabEmpty ? t('talentMatching.browseFreelancers') : t('talentMatching.clearFilters')}
        </button>
      </div>
    );
  }

  return (
    <div className={`w-full ${layoutMode === 'compact' ? 'space-y-2.5' : 'space-y-4'}`}>
      {filteredFreelancers.map(freelancer => {
        const profileId = freelancer.freelancerProfilesId;
        const displayName = freelancer.userFullName || 'Freelancer';
        const profilePath = getProfilePath(freelancer.userId, 'freelancer');

        if (layoutMode === 'compact') {
          return (
            <article
              key={profileId}
              className="rounded-2xl border border-border bg-surface-card/80 p-3 sm:p-3.5 hover:border-brand/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button onClick={() => { if (profilePath) navigate(profilePath); }} className="shrink-0">
                  <UserAvatar
                    userId={freelancer.userId}
                    src={freelancer.userAvatar}
                    name={displayName}
                    size="sm"
                    className="rounded-xl"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => { if (profilePath) navigate(profilePath); }}
                    className="font-bold text-xs sm:text-sm text-text-primary hover:text-brand transition-colors truncate block text-left max-w-full"
                  >
                    {displayName}
                  </button>
                  <p className="text-[11px] sm:text-xs text-brand font-semibold truncate max-w-full mt-0.5">
                    {freelancer.title || t('talentMatching.freelancerRole')}
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] text-text-muted mt-1">
                    {freelancer.location && <span className="truncate max-w-[140px]"><MapPin size={10} className="inline mr-0.5 shrink-0" />{freelancer.location}</span>}
                    <span className="flex items-center gap-0.5 shrink-0"><Star size={10} className="text-amber-400 fill-current" />{freelancer.rating ? freelancer.rating.toFixed(1) : '—'}</span>
                    <span className="flex items-center gap-0.5 shrink-0"><Zap size={10} className="text-brand" />{freelancer.eloPoints ?? 100} ELO</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                <button
                  disabled={savingIds.has(profileId)}
                  onClick={() => void onToggleSaved(profileId)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all disabled:opacity-50 min-h-[38px] min-w-[38px] ${
                    savedIds.has(profileId)
                      ? 'border-red-400/40 bg-red-400/10 text-red-500'
                      : 'border-border hover:border-red-400/40 text-text-muted'
                  }`}
                  aria-label="Save freelancer"
                >
                  <Heart size={14} className={savedIds.has(profileId) ? 'fill-current' : ''} />
                </button>
                <button
                  onClick={() => onInvite(profileId, displayName)}
                  className={`flex-1 sm:flex-initial rounded-xl px-3.5 py-2 text-xs font-bold transition-all min-h-[38px] text-center ${
                    invitedIds.has(profileId)
                      ? 'bg-success/10 text-success border border-success/25'
                      : 'bg-gradient-to-r from-[var(--brand)] to-indigo-500 text-white hover:opacity-90'
                  }`}
                >
                  {invitedIds.has(profileId) ? t('talentMatching.invitedBadge') : t('talentMatching.inviteBtn')}
                </button>
              </div>
            </article>
          );
        }

        return (
          <article
            key={profileId}
            className="rounded-2xl border border-border bg-surface-card/80 p-4 sm:p-5 hover:border-brand/30 hover:shadow-md transition-all duration-200"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            {/* Top row */}
            <div className="flex gap-3 sm:gap-4 items-start">
              <button
                onClick={() => {
                  if (profilePath) navigate(profilePath);
                }}
                className="shrink-0"
              >
                <UserAvatar
                  userId={freelancer.userId}
                  src={freelancer.userAvatar}
                  name={displayName}
                  size="md"
                  className="rounded-2xl"
                />
              </button>
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => {
                    if (profilePath) navigate(profilePath);
                  }}
                  className="text-left font-black text-sm sm:text-base text-text-primary hover:text-brand transition-colors truncate block max-w-full"
                >
                  {displayName}
                </button>
                <p className="text-xs sm:text-sm font-semibold text-brand truncate max-w-full">
                  {freelancer.title || t('talentMatching.freelancerRole')}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1.5 sm:mt-2">
                  {freelancer.location && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-muted border border-border text-[10px] sm:text-[11px] text-text-muted">
                      <MapPin size={11} /> {freelancer.location}
                    </span>
                  )}
                  {freelancer.majorName && (
                    <span className="px-2 py-0.5 rounded-full bg-surface-muted border border-border text-[10px] sm:text-[11px] text-text-muted">
                      {freelancer.majorName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {freelancer.bio && (
              <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-text-secondary line-clamp-2 leading-relaxed">
                {freelancer.bio}
              </p>
            )}

            {freelancer.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 sm:mt-3">
                {freelancer.skills.slice(0, 7).map(skill => (
                  <span
                    key={skill.skillId}
                    className="px-2 py-0.5 rounded-lg bg-brand/8 text-brand text-[10px] sm:text-[11px] font-semibold border border-brand/15"
                  >
                    {skill.skillName}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3.5 sm:mt-4 pt-3 sm:pt-3.5 border-t border-border/70 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1 font-medium">
                  <Star size={12} className="text-amber-400" fill="currentColor" />
                  {freelancer.rating ? freelancer.rating.toFixed(1) : t('talentMatching.noReviews')}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Zap size={12} className="text-brand" />
                  {freelancer.eloPoints ?? 100} ELO
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  disabled={savingIds.has(profileId)}
                  onClick={() => void onToggleSaved(profileId)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all disabled:opacity-50 min-h-[38px] min-w-[38px] ${
                    savedIds.has(profileId)
                      ? 'border-red-400/40 bg-red-400/10 text-red-500'
                      : 'border-border hover:border-red-400/40 hover:bg-red-400/8 text-text-muted'
                  }`}
                  aria-label="Save freelancer"
                >
                  <Heart size={15} className={savedIds.has(profileId) ? 'fill-current' : ''} />
                </button>
                <button
                  onClick={() => onInvite(profileId, displayName)}
                  className={`flex-1 sm:flex-initial rounded-xl px-4 py-2 text-xs font-bold transition-all min-h-[38px] text-center ${
                    invitedIds.has(profileId)
                      ? 'bg-success/10 text-success border border-success/25'
                      : 'bg-gradient-to-r from-[var(--brand)] to-indigo-500 text-white hover:opacity-90'
                  }`}
                >
                  {invitedIds.has(profileId) ? t('talentMatching.invitedBadge') : t('talentMatching.inviteBtn')}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
