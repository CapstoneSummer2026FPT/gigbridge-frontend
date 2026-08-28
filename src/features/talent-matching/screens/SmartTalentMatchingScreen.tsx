import { useState } from 'react';
import { toast } from 'sonner';

import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import { AuthInviteModal } from '../../../shared/components/AuthInviteModal';
import { useApp } from '../../../app/providers/AppProvider';
import { InviteFreelancerToJobModal } from '../../profile/components/InviteFreelancerToJobModal';

import { BrowseFreelancersTab } from '../components/BrowseFreelancersTab';
import { SmartMatchingTab } from '../components/SmartMatchingTab';
import { TalentMatchingFilterBar } from '../components/TalentMatchingFilterBar';
import { TalentMatchingHeader } from '../components/TalentMatchingHeader';
import { TalentMatchingRightSidebar } from '../components/TalentMatchingRightSidebar';
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

  const { user } = useApp();
  const [showAuthInvite, setShowAuthInvite] = useState(false);

  const handleToggleSavedWithAuth = (id: string) => {
    if (!user) {
      setShowAuthInvite(true);
      return;
    }
    toggleSaved(id);
  };

  const handleInviteWithAuth = (profileId: string, displayName: string, jobId?: string, matchRunIdParam?: string) => {
    if (!user) {
      setShowAuthInvite(true);
      return;
    }
    setInviteTarget({
      profileId,
      displayName,
      initialJobId: jobId,
      matchRunId: matchRunIdParam,
    });
  };

  const handleOpenProfileWithAuth = (match: any) => {
    if (!user) {
      setShowAuthInvite(true);
      return;
    }
    openMatchedProfile(match);
  };

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
      <div className="max-w-[1500px] mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">

        {/* Header */}
        <TalentMatchingHeader
          activeStage={activeStage}
          changeStage={(stage) => {
            if (!user && (stage === 'smart' || stage === 'saved')) {
              setShowAuthInvite(true);
              return;
            }
            changeStage(stage);
          }}
          requestSmartMatching={() => {
            if (!user) {
              setShowAuthInvite(true);
              return;
            }
            requestSmartMatching();
          }}
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

        {/* Main 2-column layout (Expanded main content taking full left space) */}
        <div className="grid grid-cols-12 gap-4 lg:gap-6 items-start">

          {/* Main Content Area (Expanded to col-span-12 lg:col-span-9) */}
          <main className="col-span-12 lg:col-span-9 space-y-4 min-w-0">

            {/* Consolidated Filter & Search Header Toolbar */}
            <TalentMatchingFilterBar
              activeStage={activeStage}
              resultTitle={resultTitle}
              resultDescription={resultDescription}
              visibleResultCount={visibleResultCount}
              query={query}
              setQuery={setQuery}
              jobs={jobs}
              selectedJobId={selectedJobId}
              setSelectedJobId={setSelectedJobId}
              selectedJob={selectedJob}
              loadingInitial={loadingInitial}
              onCreateJob={() => {
                if (!user) {
                  setShowAuthInvite(true);
                  return;
                }
                navigate('/jobs/post');
              }}
              majorCategoryId={majorCategoryId}
              setMajorCategoryId={setMajorCategoryId}
              categoryOptions={categoryOptions}
              selectedCategoryName={selectedCategoryName}
              skillIds={skillIds}
              toggleSkill={toggleSkill}
              pageSize={pageSize}
              setPageSize={setPageSize}
              layoutMode={layoutMode}
              setLayoutMode={setLayoutMode}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
            />

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
                onToggleSaved={handleToggleSavedWithAuth}
                onInvite={(profileId, displayName) => handleInviteWithAuth(profileId, displayName)}
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
                onOpenProfile={handleOpenProfileWithAuth}
                onToggleSaved={handleToggleSavedWithAuth}
                onInvite={(profileId, displayName, jobId, matchRunIdParam) =>
                  handleInviteWithAuth(profileId, displayName, jobId, matchRunIdParam)
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

        {/* Auth Invitation Modal for Guest Users */}
        <AuthInviteModal
          isOpen={showAuthInvite}
          onClose={() => setShowAuthInvite(false)}
        />
      </div>
    </AppLayout>
  );
}
