import { toast } from 'sonner';
import { ArrowUpDown, LayoutGrid, Rows, Search } from 'lucide-react';

import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import { InviteFreelancerToJobModal } from '../../profile/components/InviteFreelancerToJobModal';

import { BrowseFreelancersTab } from '../components/BrowseFreelancersTab';
import { SmartMatchingTab } from '../components/SmartMatchingTab';
import { TalentMatchingHeader } from '../components/TalentMatchingHeader';
import { TalentMatchingRightSidebar } from '../components/TalentMatchingRightSidebar';
import { TalentMatchingSidebar } from '../components/TalentMatchingSidebar';
import { useSmartTalentMatching } from '../hooks/useSmartTalentMatching';
import '../styles/smart-talent-matching-screen.css';

export default function SmartTalentMatchingScreen() {
  const { t } = useTranslation();
  const {
    role,
    navigate,
    premiumStatus,
    hasSmartMatchingAccess,
    activeStage,
    layoutMode,
    setLayoutMode,
    sortOrder,
    setSortOrder,
    pageSize,
    setPageSize,
    jobs,
    selectedJobId,
    setSelectedJobId,
    selectedJob,
    saved,
    savedIds,
    matchRunId,
    majorCategoryId,
    setMajorCategoryId,
    skillIds,
    query,
    setQuery,
    loadingInitial,
    jobsError,
    browseError,
    matchError,
    loadingMatches,
    savingIds,
    invitedIds,
    setInvitedIds,
    inviteTarget,
    setInviteTarget,
    categoryOptions,
    displayFreelancers,
    displayMatches,
    openMatchedProfile,
    toggleSaved,
    toggleSkill,
    resetFilters,
    changeStage,
    requestSmartMatching,
    loadInitialData,
    loadMatches,
    isDirectoryStage,
    visibleResultCount,
    selectedCategoryName,
    hasActiveFilters,
  } = useSmartTalentMatching();

  const resultTitle = activeStage === 'smart'
    ? t('talentMatching.smartRecommendationsTitle')
    : activeStage === 'saved'
      ? t('talentMatching.savedFreelancersTitle')
      : t('talentMatching.directoryTitle');

  const resultDescription = activeStage === 'smart'
    ? t('talentMatching.smartRecommendationsDesc')
    : activeStage === 'saved'
      ? t('talentMatching.savedFreelancersDesc')
      : t('talentMatching.directoryDesc');

  return (
    <AppLayout>
      <div className="max-w-[1500px] mx-auto px-4 py-8">

        {/* Header */}
        <TalentMatchingHeader
          activeStage={activeStage}
          changeStage={changeStage}
          requestSmartMatching={requestSmartMatching}
          savedCount={saved.length}
          hasSmartMatchingAccess={hasSmartMatchingAccess}
          premiumLoading={premiumStatus.loading}
          role={role}
          onViewPremium={() => navigate('/premium/client/pricing')}
        />

        {/* Jobs error in smart mode */}
        {activeStage === 'smart' && jobsError && (
          <div className="mb-6 rounded-2xl border border-red-500/25 bg-red-500/5 p-4 flex items-center justify-between gap-4 text-red-500 text-sm">
            <span>{jobsError}</span>
            <button
              onClick={() => void loadInitialData()}
              className="flex items-center gap-2 font-bold hover:text-red-700 transition-colors"
            >
              {t('talentMatching.retry')}
            </button>
          </div>
        )}

        {/* Main 3-column layout */}
        <div className="grid grid-cols-12 gap-5 items-start">

          {/* Left Sidebar Filters */}
          <TalentMatchingSidebar
            activeStage={activeStage}
            jobs={jobs}
            selectedJobId={selectedJobId}
            setSelectedJobId={setSelectedJobId}
            selectedJob={selectedJob}
            loadingInitial={loadingInitial}
            onCreateJob={() => navigate('/jobs/post')}
            majorCategoryId={majorCategoryId}
            setMajorCategoryId={setMajorCategoryId}
            categoryOptions={categoryOptions}
            skillIds={skillIds}
            toggleSkill={toggleSkill}
            pageSize={pageSize}
            setPageSize={setPageSize}
          />

          {/* Main Content Area */}
          <main className="col-span-12 lg:col-span-6 space-y-4 lg:sticky lg:top-24">

            {/* Search + Result Summary Header */}
            <section
              className="sticky top-24 z-10 rounded-2xl border border-border bg-surface-card/90 p-5 shadow-sm"
              style={{ backdropFilter: 'blur(16px)' }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-text-primary">{resultTitle}</h2>
                    <span className="rounded-full bg-brand/10 border border-brand/20 px-2.5 py-0.5 text-[10px] font-black text-brand">
                      {t(visibleResultCount === 1 ? 'talentMatching.resultsCount_one' : 'talentMatching.resultsCount_other', {
                        count: visibleResultCount,
                      })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-secondary">{resultDescription}</p>
                </div>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="shrink-0 text-xs font-bold text-brand hover:underline">
                    {t('talentMatching.clearFilters')}
                  </button>
                )}
              </div>

              {/* Search input + Layout & Sort toggle icons */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={
                      activeStage === 'smart'
                        ? t('talentMatching.searchSmartPlaceholder')
                        : t('talentMatching.searchDirectoryPlaceholder')
                    }
                    className="w-full rounded-xl border border-border bg-surface-muted py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10 text-text-primary placeholder:text-text-muted"
                  />
                </div>

                {/* Control 1: Layout view toggle (Grid / Rows) */}
                <button
                  type="button"
                  onClick={() => setLayoutMode(mode => (mode === 'grid' ? 'compact' : 'grid'))}
                  title={layoutMode === 'grid' ? t('talentMatching.layoutCompact') : t('talentMatching.layoutGrid')}
                  className={`p-2.5 rounded-xl border transition-all shrink-0 ${
                    layoutMode === 'compact'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border bg-surface-muted text-text-muted hover:text-text-primary hover:border-brand/30'
                  }`}
                >
                  {layoutMode === 'grid' ? <LayoutGrid size={16} /> : <Rows size={16} />}
                </button>

                {/* Control 2: Sort order toggle (Ascending / Descending) */}
                <button
                  type="button"
                  onClick={() => setSortOrder(order => (order === 'desc' ? 'asc' : 'desc'))}
                  title={sortOrder === 'desc' ? t('talentMatching.sortOrderAsc') : t('talentMatching.sortOrderDesc')}
                  className={`p-2.5 rounded-xl border transition-all shrink-0 ${
                    sortOrder === 'asc'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border bg-surface-muted text-text-muted hover:text-text-primary hover:border-brand/30'
                  }`}
                >
                  <ArrowUpDown size={16} className={sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
              </div>

              {(selectedCategoryName || skillIds.length > 0) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-text-muted">{t('talentMatching.activeFilters')}</span>
                  {selectedCategoryName && (
                    <span className="rounded-full bg-brand/10 border border-brand/20 px-3 py-1 font-bold text-brand">
                      {selectedCategoryName}
                    </span>
                  )}
                  {skillIds.length > 0 && (
                    <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 font-bold text-purple-500">
                      {t(skillIds.length === 1 ? 'talentMatching.skillFilterCount_one' : 'talentMatching.skillFilterCount_other', {
                        count: skillIds.length,
                      })}
                    </span>
                  )}
                </div>
              )}
            </section>

            {/* Tab content */}
            {isDirectoryStage ? (
              <BrowseFreelancersTab
                activeStage={activeStage}
                layoutMode={layoutMode}
                loadingInitial={loadingInitial}
                browseError={browseError}
                filteredFreelancers={displayFreelancers}
                savedIds={savedIds}
                savingIds={savingIds}
                invitedIds={invitedIds}
                hasActiveFilters={hasActiveFilters}
                onRetry={() => void loadInitialData()}
                onResetFilters={resetFilters}
                onChangeStage={changeStage}
                onToggleSaved={toggleSaved}
                onInvite={(profileId, displayName) => setInviteTarget({ profileId, displayName })}
              />
            ) : (
              <SmartMatchingTab
                layoutMode={layoutMode}
                loadingMatches={loadingMatches}
                matchError={matchError}
                selectedJobId={selectedJobId}
                filteredMatches={displayMatches}
                matchRunId={matchRunId}
                savedIds={savedIds}
                savingIds={savingIds}
                invitedIds={invitedIds}
                onRetry={() => void loadMatches()}
                onOpenProfile={openMatchedProfile}
                onToggleSaved={toggleSaved}
                onInvite={(profileId, displayName, jobId, matchRunIdParam) =>
                  setInviteTarget({
                    profileId,
                    displayName,
                    initialJobId: jobId,
                    matchRunId: matchRunIdParam,
                  })
                }
              />
            )}
          </main>

          {/* Right Sidebar Info Panel */}
          <TalentMatchingRightSidebar isDirectoryStage={isDirectoryStage} />
        </div>

        {/* Invite Modal */}
        {inviteTarget && (
          <InviteFreelancerToJobModal
            freelancerName={inviteTarget.displayName}
            freelancerId={inviteTarget.profileId}
            initialJobId={inviteTarget.initialJobId}
            matchRunId={inviteTarget.matchRunId}
            onClose={() => setInviteTarget(null)}
            onInvited={() => {
              setInvitedIds(current => new Set(current).add(inviteTarget.profileId));
              toast.success(t('talentMatching.invitationSent'));
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
