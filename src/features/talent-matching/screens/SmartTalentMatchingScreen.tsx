import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Bot,
  BriefcaseBusiness,
  Check,
  Heart,
  Info,
  LockKeyhole,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';

import { jobAPI } from '../../../api/jobAPI';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { savedFreelancerAPI } from '../../../api/savedFreelancerAPI';
import { talentMatchingAPI } from '../../../api/talentMatchingAPI';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../app/components/ui/tooltip';
import { useApp } from '../../../app/providers/AppProvider';
import { AppLayout } from '../../../shared/components/AppLayout';
import { getProfilePath } from '../../../shared/hooks/useProfileNavigation';
import type { GetMyJobPostDto } from '../../../types/models/Job';
import { JobPostStatus } from '../../../types/models/Job';
import type { FreelancerSummaryDto } from '../../../types/models/Profile';
import type { SavedFreelancerDto } from '../../../types/savedFreelancer';
import type { AiTalentMatch } from '../../../types/talentMatching';
import { UserRole } from '../../../types/models/User';
import { SponsoredPromotionCard } from '../../premium/components/SponsoredPromotionCard';
import { usePremiumStatus } from '../../premium/hooks';
import { InviteFreelancerToJobModal } from '../../profile/components/InviteFreelancerToJobModal';
import { canUseSmartMatching } from '../utils/smartMatchingAccess';
import '../styles/smart-talent-matching-screen.css';

type ViewStage = 'browse' | 'saved' | 'smart';

interface InviteTarget {
  profileId: string;
  displayName: string;
  initialJobId?: string;
  matchRunId?: string;
}

const savedProfileId = (item: SavedFreelancerDto) =>
  item.freelancerProfileId ?? item.freelancerProfilesId ?? '';

const freelancerProfileId = (item: FreelancerSummaryDto) => item.freelancerProfilesId;

const initials = (name?: string | null) =>
  (name || 'Freelancer')
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

const rankingFactors = [
  {
    label: 'Skill match',
    description: 'Skills and experience relevant to this job',
    weight: 45,
    color: 'bg-blue-500',
    marker: 'bg-blue-500',
  },
  {
    label: 'Track record',
    description: 'Past work, ratings, and reliability',
    weight: 35,
    color: 'bg-purple-500',
    marker: 'bg-purple-500',
  },
  {
    label: 'Platform activity',
    description: 'Recent, verified activity on GigBridge',
    weight: 20,
    color: 'bg-emerald-500',
    marker: 'bg-emerald-500',
  },
] as const;

function DataConfidenceBadge({ match }: { match: AiTalentMatch }) {
  const details = match.confidenceBreakdown;
  const scoreAgreement = details?.scoreAgreement ?? Math.max(
    0,
    100 - Math.abs(match.scoreBreakdown.embedding - match.scoreBreakdown.algorithm),
  );
  const ariaLabel = details
    ? `${match.confidence} confidence. Profile information ${details.dataCoverage.toFixed(1)} percent. Result consistency ${scoreAgreement.toFixed(1)} percent.`
    : `${match.confidence} confidence. Result consistency ${scoreAgreement.toFixed(1)} percent.`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${match.confidence === 'high' ? 'bg-green-500/10 text-green-600' : match.confidence === 'medium' ? 'bg-amber-500/10 text-amber-600' : 'bg-gray-500/10 text-muted-foreground'}`}
          aria-label={ariaLabel}
        >
          {match.confidence} confidence
          <Info size={12} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-72 space-y-1.5">
        <p className="font-semibold">How much information supports this result?</p>
        {details ? (
          <>
            <p>Profile information: {details.dataCoverage.toFixed(1)}%</p>
            <p>Result consistency: {scoreAgreement.toFixed(1)}%</p>
            <p>Confidence score: {details.confidenceScore.toFixed(1)}/100</p>
          </>
        ) : (
          <>
            <p>Result consistency: {scoreAgreement.toFixed(1)}%</p>
            <p>More confidence details will appear when available.</p>
          </>
        )}
        <p className="opacity-80">This reflects how much information is available, not the freelancer's match score.</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function SmartTalentMatchingScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useApp();
  const premiumStatus = usePremiumStatus(role);
  const hasSmartMatchingAccess = canUseSmartMatching(role, premiumStatus.isPremium);
  const requestSequence = useRef(0);
  const [activeStage, setActiveStage] = useState<ViewStage>('browse');
  const [jobs, setJobs] = useState<GetMyJobPostDto[]>([]);
  const [freelancers, setFreelancers] = useState<FreelancerSummaryDto[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [saved, setSaved] = useState<SavedFreelancerDto[]>([]);
  const [matches, setMatches] = useState<AiTalentMatch[]>([]);
  const [matchRunId, setMatchRunId] = useState<string | null>(null);
  const [majorCategoryId, setMajorCategoryId] = useState<string | null>(null);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [inviteTarget, setInviteTarget] = useState<InviteTarget | null>(null);

  const selectedJob = jobs.find(job => job.jobPostsId === selectedJobId);
  const savedIds = useMemo(() => new Set(saved.map(savedProfileId).filter(Boolean)), [saved]);
  const categoryOptions = useMemo(() => {
    const options = new Map<string, string>();
    freelancers.forEach(freelancer => {
      freelancer.categories.forEach(category => options.set(category.majorCategoryId, category.name));
    });
    jobs.forEach(job => {
      if (job.majorCategoryId) {
        options.set(job.majorCategoryId, job.categoryName || job.majorName || 'Job category');
      }
    });
    return [...options.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [freelancers, jobs]);

  const loadInitialData = useCallback(async () => {
    setLoadingInitial(true);
    setJobsError(null);
    setBrowseError(null);
    const [jobsResponse, freelancersResponse, savedResult] = await Promise.allSettled([
      jobAPI.getMyJobPosts({ pageIndex: 1, pageSize: 100 }),
      profileGetAPI.getFreelancers({ page: 1, pageSize: 50, sort: 'featured' }),
      savedFreelancerAPI.getMySavedFreelancers(),
    ]);

    if (jobsResponse.status === 'rejected' || !jobsResponse.value.success) {
      setJobs([]);
      setJobsError(
        jobsResponse.status === 'fulfilled'
          ? jobsResponse.value.message
          : 'Unable to load your open jobs.',
      );
    } else {
      const openJobs = (jobsResponse.value.data || []).filter(
        job => Number(job.status) === JobPostStatus.Open,
      );
      setJobs(openJobs);
      setSelectedJobId(current =>
        openJobs.some(job => job.jobPostsId === current)
          ? current
          : openJobs[0]?.jobPostsId || '',
      );
    }

    if (freelancersResponse.status === 'rejected' || !freelancersResponse.value.success) {
      setFreelancers([]);
      setBrowseError(
        freelancersResponse.status === 'fulfilled'
          ? freelancersResponse.value.message
          : 'Unable to load freelancer profiles.',
      );
    } else {
      setFreelancers(
        (freelancersResponse.value.data?.items || []).filter(item => freelancerProfileId(item)),
      );
    }

    setSaved(savedResult.status === 'fulfilled' ? savedResult.value : []);
    setLoadingInitial(false);
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    setMajorCategoryId(null);
    setSkillIds([]);
  }, [selectedJobId]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab === 'saved') {
      setActiveStage('saved');
    } else if (requestedTab === 'smart' && !premiumStatus.loading && hasSmartMatchingAccess) {
      setActiveStage('smart');
    } else if (!requestedTab || requestedTab === 'browse') {
      setActiveStage('browse');
    }
  }, [hasSmartMatchingAccess, premiumStatus.loading, searchParams]);

  const loadMatches = useCallback(async () => {
    if (!selectedJobId || activeStage !== 'smart' || !hasSmartMatchingAccess) return;

    const sequence = ++requestSequence.current;
    setLoadingMatches(true);
    setMatchError(null);
    const response = await talentMatchingAPI.getMatches(selectedJobId, {
      topK: 20,
      filters: { majorCategoryId, skillIds },
    });
    if (sequence !== requestSequence.current) return;

    if (!response.success || !response.data) {
      setMatches([]);
      setMatchRunId(null);
      setMatchError(
        response.statusCode === 503
          ? 'Smart matching is temporarily unavailable. Your job and filters are safe—please retry.'
          : response.message || 'Unable to generate talent matches.',
      );
      setLoadingMatches(false);
      return;
    }

    setMatches(response.data.matches);
    setMatchRunId(response.data.matchRunId);
    setLoadingMatches(false);
    void Promise.allSettled(
      response.data.matches.map(match =>
        talentMatchingAPI.recordEvent(selectedJobId, {
          matchRunId: response.data!.matchRunId,
          freelancerProfileId: match.freelancerProfileId,
          eventType: 'impression',
          idempotencyKey: `match:${response.data!.matchRunId}:impression:${match.freelancerProfileId}`,
        }),
      ),
    );
  }, [activeStage, hasSmartMatchingAccess, majorCategoryId, selectedJobId, skillIds]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const filteredFreelancers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return freelancers.filter(freelancer => {
      const profileId = freelancerProfileId(freelancer);
      if (activeStage === 'saved' && !savedIds.has(profileId)) return false;
      if (
        majorCategoryId &&
        !freelancer.categories.some(category => category.majorCategoryId === majorCategoryId)
      ) return false;
      if (!normalized) return true;
      return [
        freelancer.userFullName,
        freelancer.title,
        freelancer.bio,
        freelancer.location,
        freelancer.majorName,
        ...freelancer.skills.map(skill => skill.skillName),
        ...freelancer.categories.map(category => category.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [activeStage, freelancers, majorCategoryId, query, savedIds]);

  const filteredMatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return matches;
    return matches.filter(match =>
      [
        match.displayName,
        match.title,
        match.location,
        ...match.matchedSkills,
        ...match.semanticStrengths,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [matches, query]);

  const openMatchedProfile = (match: AiTalentMatch) => {
    if (matchRunId && selectedJobId) {
      void talentMatchingAPI.recordEvent(selectedJobId, {
        matchRunId,
        freelancerProfileId: match.freelancerProfileId,
        eventType: 'profile_opened',
        idempotencyKey: `match:${matchRunId}:profile-opened:${match.freelancerProfileId}`,
      });
    }
    const path = getProfilePath(match.userId, 'freelancer');
    if (path) navigate(path);
  };

  const toggleSaved = async (profileId: string, attributedRunId?: string) => {
    if (!profileId) return;
    setSavingIds(current => new Set(current).add(profileId));
    try {
      if (savedIds.has(profileId)) {
        await savedFreelancerAPI.unsaveFreelancer(profileId);
        setSaved(current => current.filter(item => savedProfileId(item) !== profileId));
        toast.success('Freelancer removed from saved talent.');
      } else {
        await savedFreelancerAPI.saveFreelancer(profileId, attributedRunId);
        setSaved(await savedFreelancerAPI.getMySavedFreelancers());
        toast.success('Freelancer saved.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update saved talent.');
    } finally {
      setSavingIds(current => {
        const next = new Set(current);
        next.delete(profileId);
        return next;
      });
    }
  };

  const toggleSkill = (skillId: string) => {
    setSkillIds(current =>
      current.includes(skillId)
        ? current.filter(id => id !== skillId)
        : [...current, skillId],
    );
  };

  const resetFilters = () => {
    setMajorCategoryId(null);
    setSkillIds([]);
    setQuery('');
  };

  const changeStage = (stage: ViewStage) => {
    requestSequence.current += 1;
    setActiveStage(stage);
    setMajorCategoryId(null);
    setSkillIds([]);
    setQuery('');
    setLoadingMatches(false);
    setMatchError(null);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('tab', stage);
    setSearchParams(nextSearchParams, { replace: true });
    if (stage === 'smart') {
      setMatches([]);
      setMatchRunId(null);
    }
  };

  const requestSmartMatching = () => {
    if (premiumStatus.loading) return;
    if (!hasSmartMatchingAccess) {
      toast.info('Smart Matching is available with Client Premium.');
      navigate(role === UserRole.Client ? '/premium/client/pricing' : '/');
      return;
    }
    changeStage('smart');
  };

  const isDirectoryStage = activeStage === 'browse' || activeStage === 'saved';
  const visibleResultCount = activeStage === 'smart' ? filteredMatches.length : filteredFreelancers.length;
  const resultTitle = activeStage === 'smart'
    ? 'Smart recommendations'
    : activeStage === 'saved'
      ? 'Saved freelancers'
      : 'Freelancer directory';
  const resultDescription = activeStage === 'smart'
    ? 'Ranked for the selected job using skills, track record, and activity on GigBridge.'
    : activeStage === 'saved'
      ? 'Review the talent you shortlisted and invite the right people when you are ready.'
      : 'Search the complete talent pool by name, specialty, skill, location, or category.';
  const selectedCategoryName = categoryOptions.find(option => option.id === majorCategoryId)?.name;
  const hasActiveFilters = Boolean(query.trim() || majorCategoryId || skillIds.length);

  return (
    <AppLayout>
      <div className="max-w-[1500px] mx-auto px-4 py-8">
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-purple-600 text-xs font-black uppercase tracking-[0.2em] mb-3">
              <Sparkles size={16} /> Talent discovery
            </div>
            <h1 className="text-4xl font-black text-foreground">Find the right freelancer</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Browse the complete freelancer directory, then use job-specific smart matching when you need a ranked shortlist.
            </p>
          </div>
          <div className="flex max-w-full overflow-x-auto rounded-2xl border border-border bg-surface p-1">
            <button className={`px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 ${activeStage === 'browse' ? 'bg-blue-600 text-white' : 'text-muted-foreground'}`} onClick={() => changeStage('browse')}>
              <Users size={16} /> Browse freelancers
            </button>
            <button className={`px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap ${activeStage === 'saved' ? 'bg-blue-600 text-white' : 'text-muted-foreground'}`} onClick={() => changeStage('saved')}>
              <Heart size={16} className={activeStage === 'saved' ? 'fill-current' : ''} /> Saved freelancers
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeStage === 'saved' ? 'bg-white/20 text-white' : 'bg-blue-600/10 text-blue-600'}`}>{saved.length}</span>
            </button>
            <button
              className={`px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-60 ${activeStage === 'smart' ? 'bg-purple-600 text-white' : 'text-muted-foreground'}`}
              onClick={requestSmartMatching}
              disabled={premiumStatus.loading}
              aria-label={hasSmartMatchingAccess ? 'Smart matching' : 'Smart matching, Client Premium required'}
              title={hasSmartMatchingAccess ? 'Open Smart Matching' : 'Requires Client Premium'}
            >
              {hasSmartMatchingAccess ? <Sparkles size={16} /> : <LockKeyhole size={16} />}
              Smart matching
              {!premiumStatus.loading && !hasSmartMatchingAccess && <span className="rounded-full bg-purple-600/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-600">Premium</span>}
            </button>
          </div>
        </header>

        {!premiumStatus.loading && !hasSmartMatchingAccess && role === UserRole.Client && (
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-purple-500/25 bg-purple-500/5 p-5 sm:flex-row sm:items-center">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-purple-600/10 text-purple-600"><LockKeyhole size={21} /></span>
            <div className="min-w-0 flex-1">
              <strong className="text-foreground">Smart Matching is a Client Premium feature</strong>
              <p className="mt-1 text-sm text-muted-foreground">You can keep browsing, saving, and inviting freelancers with your Standard plan. Upgrade for job-specific ranked recommendations.</p>
            </div>
            <button onClick={() => navigate('/premium/client/pricing')} className="shrink-0 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white">View Premium</button>
          </div>
        )}

        {activeStage === 'smart' && jobsError && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 flex items-center justify-between gap-4 text-red-600">
            <span>{jobsError}</span>
            <button onClick={() => void loadInitialData()} className="flex items-center gap-2 font-bold"><RefreshCw size={16} /> Retry</button>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6 items-start">
          <aside className="col-span-12 lg:col-span-3 glass-panel rounded-3xl p-5 space-y-6 lg:sticky lg:top-24">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Refine talent</div>
              <p className="mt-1 text-xs text-muted-foreground">Use category and job skills to focus the results.</p>
            </div>
            {activeStage === 'smart' && (
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Open job</label>
                <select value={selectedJobId} onChange={event => setSelectedJobId(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3" disabled={loadingInitial || jobs.length === 0}>
                  {jobs.length === 0 && <option value="">No open jobs</option>}
                  {jobs.map(job => <option key={job.jobPostsId} value={job.jobPostsId}>{job.title}</option>)}
                </select>
                {jobs.length === 0 && !loadingInitial && (
                  <button onClick={() => navigate('/jobs/post')} className="mt-3 w-full rounded-xl bg-blue-600 text-white px-4 py-3 font-bold text-sm">
                    Create an open job
                  </button>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</label>
              <select value={majorCategoryId ?? ''} onChange={event => setMajorCategoryId(event.target.value || null)} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3">
                <option value="">Any category</option>
                {categoryOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </div>

            {activeStage === 'smart' && selectedJob && (
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">Canonical skills</div>
                <p className="text-xs text-muted-foreground mt-1">Job skills are preferences until you explicitly select them here.</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedJob.skills.length === 0 && <span className="text-sm text-muted-foreground">This job has no canonical skills.</span>}
                  {selectedJob.skills.map(skill => (
                    <button key={skill.skillId} onClick={() => toggleSkill(skill.skillId)} className={`px-3 py-1.5 rounded-full border text-xs font-bold ${skillIds.includes(skill.skillId) ? 'bg-blue-600 text-white border-blue-600' : 'border-border text-muted-foreground'}`}>
                      {skill.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </aside>

          <main className="col-span-12 lg:col-span-6 space-y-4">
            <section className="glass-panel rounded-3xl p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-foreground">{resultTitle}</h2>
                    <span className="rounded-full bg-blue-600/10 px-2.5 py-1 text-xs font-black text-blue-600">{visibleResultCount} result{visibleResultCount === 1 ? '' : 's'}</span>
                  </div>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">{resultDescription}</p>
                </div>
                {hasActiveFilters && <button onClick={resetFilters} className="shrink-0 text-sm font-bold text-blue-600 hover:underline">Clear filters</button>}
              </div>
              <div className="relative mt-5">
                <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder={activeStage === 'smart' ? 'Search recommendations by name, title, or skill...' : 'Search by name, title, skill, location, or category...'} className="w-full rounded-2xl border border-border bg-background py-3.5 pl-12 pr-4 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
              </div>
              {(selectedCategoryName || skillIds.length > 0) && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-muted-foreground">Active filters:</span>
                {selectedCategoryName && <span className="rounded-full bg-blue-600/10 px-3 py-1.5 font-semibold text-blue-700">{selectedCategoryName}</span>}
                {skillIds.length > 0 && <span className="rounded-full bg-purple-600/10 px-3 py-1.5 font-semibold text-purple-700">{skillIds.length} selected skill{skillIds.length === 1 ? '' : 's'}</span>}
              </div>}
            </section>

            {isDirectoryStage && (
              <>
                {loadingInitial && (
                  <div className="glass-panel rounded-3xl p-12 text-center">
                    <Users size={36} className="mx-auto mb-4 text-blue-600 animate-pulse" />
                    <h2 className="font-bold text-lg">Loading freelancer directory…</h2>
                  </div>
                )}
                {!loadingInitial && browseError && (
                  <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-8 text-center">
                    <AlertTriangle size={34} className="mx-auto text-red-500 mb-3" />
                    <h2 className="font-bold text-lg">Freelancers could not be loaded</h2>
                    <p className="text-sm text-muted-foreground mt-2">{browseError}</p>
                    <button onClick={() => void loadInitialData()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-5 py-3 font-bold"><RefreshCw size={16} /> Retry</button>
                  </div>
                )}
                {!loadingInitial && !browseError && filteredFreelancers.length === 0 && (
                  <div className="glass-panel rounded-3xl p-10 text-center">
                    {activeStage === 'saved' ? <Heart size={34} className="mx-auto text-muted-foreground mb-3" /> : <Users size={34} className="mx-auto text-muted-foreground mb-3" />}
                    <h2 className="font-bold text-lg">{activeStage === 'saved' && !hasActiveFilters ? 'No saved freelancers yet' : 'No freelancers match these filters'}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{activeStage === 'saved' && !hasActiveFilters ? 'Save promising people from the directory and they will appear here.' : 'Try a broader keyword or remove the active category filters.'}</p>
                    {activeStage === 'saved' && !hasActiveFilters ? <button onClick={() => changeStage('browse')} className="mt-4 text-blue-600 font-bold">Browse freelancers</button> : <button onClick={resetFilters} className="mt-4 text-blue-600 font-bold">Clear filters</button>}
                  </div>
                )}
                {!loadingInitial && !browseError && filteredFreelancers.map(freelancer => {
                  const profileId = freelancerProfileId(freelancer);
                  const displayName = freelancer.userFullName || 'Freelancer';
                  return (
                    <article key={profileId} className="bento-card rounded-3xl p-6">
                      <div className="flex gap-4 items-start">
                        <button onClick={() => { const path = getProfilePath(freelancer.userId, 'freelancer'); if (path) navigate(path); }} className="shrink-0">
                          {freelancer.userAvatar ? <img src={freelancer.userAvatar} alt="" className="w-16 h-16 rounded-2xl object-cover" /> : <span className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-black">{initials(displayName)}</span>}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button onClick={() => { const path = getProfilePath(freelancer.userId, 'freelancer'); if (path) navigate(path); }} className="text-left font-black text-xl hover:text-blue-600">{displayName}</button>
                          <p className="text-sm font-semibold text-blue-600">{freelancer.title || 'Freelancer'}</p>
                          <div className="flex flex-wrap gap-2 mt-3 text-xs">
                            {freelancer.location && <span className="px-2.5 py-1 rounded-full bg-surface border border-border inline-flex items-center gap-1"><MapPin size={12} />{freelancer.location}</span>}
                            {freelancer.majorName && <span className="px-2.5 py-1 rounded-full bg-surface border border-border">{freelancer.majorName}</span>}
                          </div>
                        </div>
                      </div>
                      {freelancer.bio && <p className="mt-4 text-sm text-muted-foreground line-clamp-3">{freelancer.bio}</p>}
                      {freelancer.skills.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{freelancer.skills.slice(0, 8).map(skill => <span key={skill.skillId} className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 text-xs font-semibold">{skill.skillName}</span>)}</div>}
                      <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground flex gap-3">
                          <span className="inline-flex items-center gap-1"><Star size={13} />{freelancer.rating ? freelancer.rating.toFixed(1) : 'No reviews yet'}</span>
                          <span>{freelancer.eloPoints ?? 100} ELO</span>
                        </div>
                        <div className="flex gap-2">
                          <button disabled={savingIds.has(profileId)} onClick={() => void toggleSaved(profileId)} className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-50" aria-label="Save freelancer"><Heart size={17} className={savedIds.has(profileId) ? 'fill-red-500 text-red-500' : ''} /></button>
                          <button onClick={() => setInviteTarget({ profileId, displayName })} className={`rounded-xl px-4 py-2 text-sm font-bold ${invitedIds.has(profileId) ? 'bg-green-500/10 text-green-700' : 'bg-blue-600 text-white'}`}>{invitedIds.has(profileId) ? 'Invited' : 'Invite'}</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </>
            )}

            {activeStage === 'smart' && (
              <>
                {loadingMatches && (
                  <div className="glass-panel rounded-3xl p-12 text-center">
                    <Bot size={36} className="mx-auto mb-4 text-purple-600 animate-pulse" />
                    <h2 className="font-bold text-lg">Finding freelancers for this job</h2>
                    <p className="text-sm text-muted-foreground mt-2">This usually takes a few seconds.</p>
                  </div>
                )}
                {!loadingMatches && matchError && (
                  <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-8 text-center">
                    <AlertTriangle size={34} className="mx-auto text-red-500 mb-3" />
                    <h2 className="font-bold text-lg">Smart matching could not complete</h2>
                    <p className="text-sm text-muted-foreground mt-2">{matchError}</p>
                    <button onClick={() => void loadMatches()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-5 py-3 font-bold"><RefreshCw size={16} /> Retry</button>
                  </div>
                )}
                {!loadingMatches && !matchError && !selectedJobId && (
                  <div className="glass-panel rounded-3xl p-10 text-center">
                    <BriefcaseBusiness size={34} className="mx-auto text-muted-foreground mb-3" />
                    <h2 className="font-bold text-lg">Create an open job to use smart matching</h2>
                    <p className="text-sm text-muted-foreground mt-2">The job title, description, category, and preferred skills help us find relevant freelancers.</p>
                  </div>
                )}
                {!loadingMatches && !matchError && selectedJobId && filteredMatches.length === 0 && (
                  <div className="glass-panel rounded-3xl p-10 text-center">
                    <BriefcaseBusiness size={34} className="mx-auto text-muted-foreground mb-3" />
                    <h2 className="font-bold text-lg">No eligible freelancers found</h2>
                    <p className="text-sm text-muted-foreground mt-2">Try removing an explicit category or skill filter. Missing job skills alone never exclude a freelancer.</p>
                  </div>
                )}
                {!loadingMatches && !matchError && filteredMatches.map(match => (
                  <article key={match.freelancerProfileId} className="bento-card rounded-3xl p-6">
                    <div className="flex gap-4 items-start">
                      <button onClick={() => openMatchedProfile(match)} className="shrink-0">
                        {match.avatarUrl ? <img src={match.avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover" /> : <span className="w-16 h-16 rounded-2xl bg-purple-600/10 text-purple-600 flex items-center justify-center font-black">{initials(match.displayName)}</span>}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap justify-between gap-3">
                          <div>
                            <button onClick={() => openMatchedProfile(match)} className="text-left font-black text-xl hover:text-blue-600">{match.displayName}</button>
                            <p className="text-sm font-semibold text-blue-600">{match.title || 'Freelancer'}</p>
                          </div>
                          <div className="text-right"><div className="text-3xl font-black text-purple-600">{match.finalScore.toFixed(1)}</div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Match score</div></div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3 text-xs">
                          <DataConfidenceBadge match={match} />
                          {match.location && <span className="px-2.5 py-1 rounded-full bg-surface border border-border inline-flex items-center gap-1"><MapPin size={12} />{match.location}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-5 text-center">
                      {[
                        { label: 'Skill match', score: match.scoreBreakdown.embedding },
                        { label: 'Track record', score: match.scoreBreakdown.algorithm },
                        { label: 'Platform activity', score: match.scoreBreakdown.evidence },
                      ].map(item => <div key={item.label} className="rounded-xl bg-surface border border-border p-3"><strong className="block">{item.score.toFixed(1)}</strong><span className="text-[10px] uppercase text-muted-foreground">{item.label}</span></div>)}
                    </div>
                    <div className="mt-5 space-y-3 text-sm">
                      {match.semanticStrengths.length > 0 && <div><strong>Why they stand out:</strong> {match.semanticStrengths.join(' · ')}</div>}
                      {match.matchedSkills.length > 0 && <div className="flex flex-wrap items-center gap-2"><strong>Matched:</strong>{match.matchedSkills.map(skill => <span key={skill} className="px-2 py-1 rounded-lg bg-green-500/10 text-green-700"><Check size={12} className="inline mr-1" />{skill}</span>)}</div>}
                      {match.missingSkills.length > 0 && <div className="flex flex-wrap items-center gap-2"><strong>Skill gaps:</strong>{match.missingSkills.map(skill => <span key={skill} className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700">{skill}</span>)}</div>}
                      <ul className="space-y-1 text-muted-foreground list-disc pl-5">{match.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
                    </div>
                    <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span className="inline-flex items-center gap-1"><Star size={13} />{match.reviewCount > 0 ? `${match.averageRating.toFixed(1)} (${match.reviewCount})` : 'No reviews yet'}</span>
                        <span>{match.completedContracts} completed contract{match.completedContracts === 1 ? '' : 's'}</span><span>{match.eloPoints} ELO</span>
                      </div>
                      <div className="flex gap-2">
                        <button disabled={savingIds.has(match.freelancerProfileId)} onClick={() => void toggleSaved(match.freelancerProfileId, matchRunId || undefined)} className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-50" aria-label="Save freelancer"><Heart size={17} className={savedIds.has(match.freelancerProfileId) ? 'fill-red-500 text-red-500' : ''} /></button>
                        <button onClick={() => setInviteTarget({ profileId: match.freelancerProfileId, displayName: match.displayName, initialJobId: selectedJobId, matchRunId: matchRunId || undefined })} className={`rounded-xl px-4 py-2 text-sm font-bold ${invitedIds.has(match.freelancerProfileId) ? 'bg-green-500/10 text-green-700' : 'bg-blue-600 text-white'}`}>{invitedIds.has(match.freelancerProfileId) ? 'Invited' : 'Invite to job'}</button>
                      </div>
                    </div>
                  </article>
                ))}
              </>
            )}
          </main>

          <aside className="col-span-12 lg:col-span-3 space-y-4">
            <div className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground px-1">Sponsored · separate from matching</div>
            <SponsoredPromotionCard promotionType="freelancer" />
            <div className="glass-panel rounded-3xl p-5">
              {isDirectoryStage ? (
                <><h3 className="font-bold flex items-center gap-2"><Users size={18} className="text-blue-600" /> Browse first</h3><p className="text-sm text-muted-foreground mt-3">Explore all available freelancer profiles in the directory.</p><p className="text-xs text-muted-foreground mt-3">Switch to Smart matching when you want a ranked shortlist for a specific open job.</p></>
              ) : (
                <>
                  <h3 className="font-bold flex items-center gap-2">
                    <Sparkles size={18} className="text-purple-600" />
                    How ranking works
                  </h3>
                  <p className="text-sm text-muted-foreground mt-3">
                    Each recommendation combines three factors:
                  </p>
                  <div
                    className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label="Ranking weights: skill match 45 percent, track record 35 percent, platform activity 20 percent"
                  >
                    {rankingFactors.map(factor => (
                      <span
                        key={factor.label}
                        className={factor.color}
                        style={{ width: `${factor.weight}%` }}
                        title={`${factor.label}: ${factor.weight}%`}
                      />
                    ))}
                  </div>
                  <div className="mt-4 space-y-3">
                    {rankingFactors.map(factor => (
                      <div key={factor.label} className="flex items-start gap-2.5">
                        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${factor.marker}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3 text-sm font-bold">
                            <span>{factor.label}</span>
                            <span>{factor.weight}%</span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{factor.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                    Freelancers with less activity history can still be matched — we just show a lower confidence score next to their result.
                  </p>
                </>
              )}
            </div>
          </aside>
        </div>

        {inviteTarget && (
          <InviteFreelancerToJobModal
            freelancerName={inviteTarget.displayName}
            freelancerId={inviteTarget.profileId}
            initialJobId={inviteTarget.initialJobId}
            matchRunId={inviteTarget.matchRunId}
            onClose={() => setInviteTarget(null)}
            onInvited={() => {
              setInvitedIds(current => new Set(current).add(inviteTarget.profileId));
              toast.success('Invitation sent.');
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
