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
    <div className={`max-h-[calc(100vh-270px)] overflow-y-auto custom-scrollbar pr-1.5 ${layoutMode === 'compact' ? 'space-y-2' : 'space-y-4'}`}>
      {filteredFreelancers.map(freelancer => {
        const profileId = freelancer.freelancerProfilesId;
        const displayName = freelancer.userFullName || 'Freelancer';
        const profilePath = getProfilePath(freelancer.userId, 'freelancer');

        if (layoutMode === 'compact') {
          return (
            <article
              key={profileId}
              className="rounded-xl border border-border bg-surface-card/80 p-3 hover:border-brand/30 transition-all flex items-center justify-between gap-3"
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => { if (profilePath) navigate(profilePath); }}
                      className="font-bold text-sm text-text-primary hover:text-brand transition-colors truncate"
                    >
                      {displayName}
                    </button>
                    <span className="text-xs text-brand font-semibold shrink-0">
                      • {freelancer.title || t('talentMatching.freelancerRole')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-text-muted mt-0.5">
                    {freelancer.location && <span><MapPin size={10} className="inline mr-0.5" />{freelancer.location}</span>}
                    <span className="flex items-center gap-0.5"><Star size={10} className="text-amber-400 fill-current" />{freelancer.rating ? freelancer.rating.toFixed(1) : '—'}</span>
                    <span className="flex items-center gap-0.5"><Zap size={10} className="text-brand" />{freelancer.eloPoints ?? 100} ELO</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  disabled={savingIds.has(profileId)}
                  onClick={() => void onToggleSaved(profileId)}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all disabled:opacity-50 ${
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
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
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
            className="rounded-2xl border border-border bg-surface-card/80 p-5 hover:border-brand/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            {/* Top row */}
            <div className="flex gap-4 items-start">
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
                  size="lg"
                  className="rounded-2xl"
                />
              </button>
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => {
                    if (profilePath) navigate(profilePath);
                  }}
                  className="text-left font-black text-base text-text-primary hover:text-brand transition-colors"
                >
                  {displayName}
                </button>
                <p className="text-sm font-semibold text-brand">
                  {freelancer.title || t('talentMatching.freelancerRole')}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {freelancer.location && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-muted border border-border text-[11px] text-text-muted">
                      <MapPin size={11} /> {freelancer.location}
                    </span>
                  )}
                  {freelancer.majorName && (
                    <span className="px-2 py-0.5 rounded-full bg-surface-muted border border-border text-[11px] text-text-muted">
                      {freelancer.majorName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {freelancer.bio && (
              <p className="mt-3 text-sm text-text-secondary line-clamp-2 leading-relaxed">
                {freelancer.bio}
              </p>
            )}

            {freelancer.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {freelancer.skills.slice(0, 7).map(skill => (
                  <span
                    key={skill.skillId}
                    className="px-2 py-0.5 rounded-lg bg-brand/8 text-brand text-[11px] font-semibold border border-brand/15"
                  >
                    {skill.skillName}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3.5 border-t border-border/70 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Star size={12} className="text-amber-400" fill="currentColor" />
                  {freelancer.rating ? freelancer.rating.toFixed(1) : t('talentMatching.noReviews')}
                </span>
                <span className="flex items-center gap-1">
                  <Zap size={12} className="text-brand" />
                  {freelancer.eloPoints ?? 100} ELO
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={savingIds.has(profileId)}
                  onClick={() => void onToggleSaved(profileId)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all disabled:opacity-50 ${
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
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
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
