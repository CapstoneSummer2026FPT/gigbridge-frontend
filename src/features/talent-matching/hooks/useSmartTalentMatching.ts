import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { jobAPI } from '../../../api/jobAPI';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { savedFreelancerAPI } from '../../../api/savedFreelancerAPI';
import { talentMatchingAPI } from '../../../api/talentMatchingAPI';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { getProfilePath } from '../../../shared/hooks/useProfileNavigation';
import type { GetMyJobPostDto } from '../../../types/models/Job';
import { JobPostStatus } from '../../../types/models/Job';
import type { FreelancerSummaryDto } from '../../../types/models/Profile';
import type { SavedFreelancerDto } from '../../../types/savedFreelancer';
import type { AiTalentMatch } from '../../../types/talentMatching';
import { UserRole } from '../../../types/models/User';
import { usePremiumStatus } from '../../premium/hooks';
import { canUseSmartMatching } from '../utils/smartMatchingAccess';

export type ViewStage = 'browse' | 'saved' | 'smart';

export interface InviteTarget {
  profileId: string;
  displayName: string;
  initialJobId?: string;
  matchRunId?: string;
}

const savedProfileId = (item: SavedFreelancerDto) =>
  item.freelancerProfileId ?? item.freelancerProfilesId ?? '';

const freelancerProfileId = (item: any) =>
  item.freelancerProfilesId || item.freelancerProfileId || item.userId || '';

export function useSmartTalentMatching() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role, user } = useApp();
  const { t } = useTranslation();
  const premiumStatus = usePremiumStatus(role);
  const hasSmartMatchingAccess = canUseSmartMatching(role, premiumStatus.isPremium);
  const requestSequence = useRef(0);

  const [activeStage, setActiveStage] = useState<ViewStage>('browse');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'compact'>('grid');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [pageSize, setPageSize] = useState<10 | 20 | 50 | 'all'>(20);
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
      (freelancer.categories || []).forEach(category => options.set(category.majorCategoryId, category.name));
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

    if (!user) {
      setJobs([]);
      setSaved([]);
      try {
        const publicResponse = await profileGetAPI.getPublicFreelancers({ page: 1, pageSize: 50, sort: 'featured' });
        if (publicResponse.success && publicResponse.data) {
          const mapped = (publicResponse.data.items || []).map(item => ({
            ...item,
            freelancerProfilesId: item.userId,
            categories: (item as any).categories || [],
            skills: (item.skills || []).map(s => typeof s === 'string' ? { skillId: s, skillName: s } : { skillId: (s as any).skillName || s, skillName: (s as any).skillName || s }),
            rating: item.rating ?? 0,
            eloPoints: (item as any).eloPoints ?? 1000,
          })) as unknown as FreelancerSummaryDto[];
          setFreelancers(mapped);
        } else {
          setFreelancers([]);
        }
      } catch (err) {
        console.error('Failed to load public freelancers:', err);
        setFreelancers([]);
      } finally {
        setLoadingInitial(false);
      }
      return;
    }

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
          : t('talentMatching.createJobAlert'),
      );
    } else {
      const openJobs = (jobsResponse.value.data || []).filter(
        job => Number(job.status) === JobPostStatus.Open,
      );
      setJobs(openJobs);
      const requestedJobId = searchParams.get('job');
      setSelectedJobId(current =>
        requestedJobId && openJobs.some(job => job.jobPostsId === requestedJobId)
          ? requestedJobId
          : openJobs.some(job => job.jobPostsId === current)
            ? current
            : openJobs[0]?.jobPostsId || '',
      );
    }

    if (freelancersResponse.status === 'rejected' || !freelancersResponse.value.success) {
      setFreelancers([]);
      setBrowseError(
        freelancersResponse.status === 'fulfilled'
          ? freelancersResponse.value.message
          : t('talentMatching.freelancersLoadError'),
      );
    } else {
      setFreelancers(
        (freelancersResponse.value.data?.items || []).filter(item => freelancerProfileId(item)),
      );
    }

    setSaved(savedResult.status === 'fulfilled' ? savedResult.value : []);
    setLoadingInitial(false);
  }, [searchParams, t, user]);

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
          ? t('talentMatching.smartMatchingError')
          : response.message || t('talentMatching.noMatchesFound'),
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
  }, [activeStage, hasSmartMatchingAccess, majorCategoryId, selectedJobId, skillIds, t]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const filteredFreelancers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = freelancers.filter(freelancer => {
      const profileId = freelancerProfileId(freelancer);
      if (activeStage === 'saved' && !savedIds.has(profileId)) return false;
      if (
        majorCategoryId &&
        freelancer.categories &&
        freelancer.categories.length > 0 &&
        !freelancer.categories.some(category => category.majorCategoryId === majorCategoryId)
      ) return false;
      if (!normalized) return true;
      return [
        freelancer.userFullName,
        freelancer.title,
        freelancer.bio,
        freelancer.location,
        freelancer.majorName,
        ...(freelancer.skills || []).map(skill => typeof skill === 'string' ? skill : skill.skillName),
        ...(freelancer.categories || []).map(category => category.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });

    return result.sort((a, b) => {
      const scoreA = (a.rating ?? 0) * 20 + (a.eloPoints ?? 100);
      const scoreB = (b.rating ?? 0) * 20 + (b.eloPoints ?? 100);
      return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });
  }, [activeStage, freelancers, majorCategoryId, query, savedIds, sortOrder]);

  const filteredMatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = !normalized
      ? [...matches]
      : matches.filter(match =>
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

    return list.sort((a, b) =>
      sortOrder === 'desc' ? b.finalScore - a.finalScore : a.finalScore - b.finalScore,
    );
  }, [matches, query, sortOrder]);

  const displayFreelancers = useMemo(() => {
    if (pageSize === 'all') return filteredFreelancers;
    return filteredFreelancers.slice(0, pageSize);
  }, [filteredFreelancers, pageSize]);

  const displayMatches = useMemo(() => {
    if (pageSize === 'all') return filteredMatches;
    return filteredMatches.slice(0, pageSize);
  }, [filteredMatches, pageSize]);

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
        toast.success(t('talentMatching.removedSuccess'));
      } else {
        await savedFreelancerAPI.saveFreelancer(profileId, attributedRunId);
        setSaved(await savedFreelancerAPI.getMySavedFreelancers());
        toast.success(t('talentMatching.savedSuccess'));
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
      toast.info(t('talentMatching.premiumAlert'));
      navigate(role === UserRole.Client ? '/premium/client/pricing' : '/');
      return;
    }
    changeStage('smart');
  };

  const isDirectoryStage = activeStage === 'browse' || activeStage === 'saved';
  const visibleResultCount = activeStage === 'smart' ? filteredMatches.length : filteredFreelancers.length;
  const selectedCategoryName = categoryOptions.find(option => option.id === majorCategoryId)?.name;
  const hasActiveFilters = Boolean(query.trim() || majorCategoryId || skillIds.length);

  return {
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
    freelancers,
    selectedJobId,
    setSelectedJobId,
    selectedJob,
    saved,
    savedIds,
    matches,
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
    filteredFreelancers,
    filteredMatches,
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
  };
}
