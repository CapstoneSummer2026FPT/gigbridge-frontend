import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { Search, Filter, Bot, Clock, Users, Globe, Bookmark, ChevronDown, Trophy, Sparkles, TrendingUp, Flame, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { savedJobAPI } from '../../../api/savedJobAPI';
import { UserRole } from '../../../types/models/User';
import type { Job } from '../../../types/models/Job';
import type { SavedJobDto } from '../../../types/savedJob';
import '../styles/browse-jobs-screen.css';
import { GigCoinBudget } from '../../../shared/components/GigCoinAmount';
import { useTranslation } from '../../../hooks/useTranslation';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import type { FreelancerSummaryDto } from '../../../types/models/Profile';
import type { FreelancerProfileDetailDto } from '../../../types/models/Profile';
import type { MajorCategoryDto } from '../../../types/models/Category';
import { premiumAPI } from '../../premium/api';
import { SponsoredPromotionCard } from '../../premium/components/SponsoredPromotionCard';
import { getProfilePath } from '../../../shared/hooks/useProfileNavigation';
import {
  BROWSE_JOBS_VIEW,
  resolveBrowseJobsView,
  type BrowseJobsView,
} from '../utils/browseJobsView';
import { BrowseJobCategoryTags } from '../components/BrowseJobCategoryTags';
import { ConicBorderButton } from '../../../shared/components/ConicBorderButton';

const PAGE_SIZE = 20;
const WORK_TYPES = ['All', 'fixed'];
const DATE_POSTED = ['Any time', 'Last 24 hours', 'Last 7 days', 'Last 30 days'];

type BrowseJob = Job & {
  datePosted: string;
  isFeatured: boolean;
};

const sanitizeSearch = (value: string) => value.replace(/[<>"'`;]/g, '').slice(0, 120);

const getDatePostedDays = (value: string) => {
  if (value === 'Last 24 hours') return 1;
  if (value === 'Last 7 days') return 7;
  if (value === 'Last 30 days') return 30;
  return null;
};

const getSavedJobPostId = (job: SavedJobDto): string => job.jobPostId ?? job.jobPostsId ?? '';

export default function BrowseJobsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const isAiMatchHighlighted = params.get('aiMatch') === 'true' || Boolean((location.state as { highlightAiMatch?: boolean })?.highlightAiMatch);

  const setParamsRef = useRef(setParams);
  useEffect(() => {
    setParamsRef.current = setParams;
  }, [setParams]);

  const { user, role } = useApp();
  const isFreelancer = role === UserRole.Freelancer;
  const hasExplicitBrowseCriteria = Boolean(params.get('q')?.trim() || params.get('cat'));
  const [search, setSearch] = useState(sanitizeSearch(params.get('q') || ''));
  const [committedSearch, setCommittedSearch] = useState(sanitizeSearch(params.get('q') || ''));
  const [category, setCategory] = useState(params.get('cat') || 'All');
  const [skills, setSkills] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [committedSkills, setCommittedSkills] = useState('');
  const [committedBudgetMin, setCommittedBudgetMin] = useState('');
  const [committedBudgetMax, setCommittedBudgetMax] = useState('');
  const [workType, setWorkType] = useState('All');
  const [datePosted, setDatePosted] = useState('Any time');
  const [sortBy, setSortBy] = useState<'relevance' | 'date'>(() => (
    resolveBrowseJobsView(Boolean(user), isFreelancer, params.get('view'), hasExplicitBrowseCriteria)
      === BROWSE_JOBS_VIEW.Profile ? 'relevance' : 'date'
  ));
  const [showFilters, setShowFilters] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savingJobIds, setSavingJobIds] = useState<Set<string>>(new Set());
  const [allJobs, setAllJobs] = useState<BrowseJob[]>([]);
  const [categoryTaxonomy, setCategoryTaxonomy] = useState<MajorCategoryDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [topFreelancers, setTopFreelancers] = useState<FreelancerSummaryDto[]>([]);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [isPromotionActive, setIsPromotionActive] = useState(false);
  const [page, setPage] = useState(() => Math.max(1, Number(params.get('page')) || 1));
  const [totalResults, setTotalResults] = useState(0);
  const [searchEventId, setSearchEventId] = useState<string | null>(null);
  const [browseView, setBrowseView] = useState<BrowseJobsView>(() => (
    resolveBrowseJobsView(
      Boolean(user),
      isFreelancer,
      params.get('view'),
      hasExplicitBrowseCriteria,
    )
  ));
  const [freelancerProfile, setFreelancerProfile] = useState<FreelancerProfileDetailDto | null>(null);
  const [profileLoading, setProfileLoading] = useState(Boolean(user && isFreelancer));
  const [profileFallbackMessage, setProfileFallbackMessage] = useState<string | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<BrowseJob[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const browseViewRef = useRef<BrowseJobsView>(browseView);

  const isProfileView = browseView === BROWSE_JOBS_VIEW.Profile;
  const isRecommendedView = browseView === BROWSE_JOBS_VIEW.Recommended;
  const categoryOptions = useMemo(() => ['All', ...Array.from(new Set(
    categoryTaxonomy.map(item => item.categoryName).filter(Boolean),
  )).sort((left, right) => left.localeCompare(right))], [categoryTaxonomy]);

  useEffect(() => {
    const routeParams = new URLSearchParams(location.search);
    const routeSearch = sanitizeSearch(routeParams.get('q') || '');
    const routeCategory = routeParams.get('cat') || 'All';
    const routePage = Math.max(1, Number(routeParams.get('page')) || 1);
    const routeView = routeParams.get('view');

    setSearch(routeSearch);
    setCommittedSearch(routeSearch);
    setCategory(routeCategory);
    setPage(routePage);

    const nextView = resolveBrowseJobsView(
      Boolean(user),
      isFreelancer,
      routeView,
      Boolean(routeSearch || routeParams.get('cat')),
    );
    if (browseViewRef.current !== nextView) {
      setSortBy(nextView === BROWSE_JOBS_VIEW.Profile ? 'relevance' : 'date');
      browseViewRef.current = nextView;
    }
    setBrowseView(nextView);
    if (nextView !== BROWSE_JOBS_VIEW.Recommended) setRecommendedJobs([]);

    if (routeParams.has('profileCats')) {
      setParamsRef.current(current => {
        const next = new URLSearchParams(current);
        next.delete('profileCats');
        return next;
      }, { replace: true });
    }
  }, [isFreelancer, location.search, user]);

  useEffect(() => {
    browseViewRef.current = browseView;
  }, [browseView]);

  // Reusable GSAP Entrance Hook
  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.browse-jobs-header-card', y: 20, duration: 0.4, clearProps: 'all' },
      { selector: '.browse-category-pill', scale: 0.9, stagger: 0.02, duration: 0.3, clearProps: 'all' },
      { selector: '.browse-jobs-job-card', y: 20, stagger: 0.03, duration: 0.35, clearProps: 'all' },
      { selector: '.system-ad-card, .freelancer-ranking-card, .promotion-sticky-card', x: 20, stagger: 0.05, duration: 0.35, clearProps: 'all' },
    ],
  });

  useEffect(() => {
    if (!user || !isFreelancer) {
      setFreelancerProfile(null);
      setProfileLoading(false);
      setProfileFallbackMessage(null);
      return;
    }

    let isMounted = true;
    setProfileLoading(true);
    setProfileFallbackMessage(null);

    profileGetAPI.getMyFreelancerProfile()
      .then(response => {
        if (!isMounted) return;
        const profile = response.success ? response.data : null;
        const hasMatchData = Boolean(profile?.majorId);
        if (!profile || !hasMatchData) {
          setFreelancerProfile(profile || null);
          setProfileFallbackMessage(t('jobs.profileFallback'));
          setBrowseView(BROWSE_JOBS_VIEW.All);
          setParamsRef.current(current => {
            const next = new URLSearchParams(current);
            next.set('view', BROWSE_JOBS_VIEW.All);
            next.delete('profileCats');
            return next;
          }, { replace: true });
          return;
        }

        setFreelancerProfile(profile);
        const requestedView = resolveBrowseJobsView(
          true,
          true,
          new URLSearchParams(location.search).get('view'),
          Boolean(new URLSearchParams(location.search).get('q')?.trim() || new URLSearchParams(location.search).get('cat')),
        );
        if (requestedView === BROWSE_JOBS_VIEW.Profile) {
          setParamsRef.current(current => {
            const next = new URLSearchParams(current);
            next.set('view', BROWSE_JOBS_VIEW.Profile);
            next.delete('profileCats');
            return next;
          }, { replace: true });
        }
      })
      .catch(error => {
        if (!isMounted) return;
        console.error('Failed to load freelancer profile for Browse Jobs:', error);
        setFreelancerProfile(null);
        setProfileFallbackMessage(t('jobs.profileFallback'));
        setBrowseView(BROWSE_JOBS_VIEW.All);
        setParamsRef.current(current => {
          const next = new URLSearchParams(current);
          next.set('view', BROWSE_JOBS_VIEW.All);
          next.delete('profileCats');
          return next;
        }, { replace: true });
      })
      .finally(() => {
        if (isMounted) setProfileLoading(false);
      });

    return () => { isMounted = false; };
  }, [isFreelancer, user]);

  useEffect(() => {
    if (!isRecommendedView || !user || !isFreelancer) {
      setRecommendedLoading(false);
      return;
    }

    let isMounted = true;
    setRecommendedLoading(true);

    jobGetAPI.getRecommendedJobs(PAGE_SIZE)
      .then(jobs => {
        if (!isMounted) return;
        setRecommendedJobs(jobs.map(job => ({
          ...job,
          datePosted: job.createdAt || '',
          isFeatured: Boolean(job.isFeatured),
        })));
      })
      .catch(error => {
        if (!isMounted) return;
        console.error('Failed to fetch recommended jobs:', error);
        toast.error(error instanceof Error ? error.message : t('jobs.recommendedError'));
        setRecommendedJobs([]);
      })
      .finally(() => {
        if (isMounted) setRecommendedLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isFreelancer, isRecommendedView, t, user]);

  useEffect(() => {
    let isMounted = true;

    const fetchPremiumStatus = async () => {
      if (!user || !isFreelancer) {
        setIsPremium(false);
        setIsPromotionActive(false);
        return;
      }

      setIsPremium(null);
      const response = await premiumAPI.currentSubscription();
      if (!isMounted) return;
      const subscription = response.success ? response.data : null;
      const hasPremium = Boolean(
        subscription?.isPremium && new Date(subscription.endDate) > new Date(),
      );
      setIsPremium(hasPremium);
      if (!hasPremium) {
        setIsPromotionActive(false);
        return;
      }

      const promotionResponse = await premiumAPI.currentPromotion();
      if (isMounted) setIsPromotionActive(Boolean(promotionResponse.success && promotionResponse.data));
    };

    void fetchPremiumStatus();
    return () => { isMounted = false; };
  }, [isFreelancer, user]);

  useEffect(() => {
    let isMounted = true;

    const fetchSavedJobs = async () => {
      if (!user || !isFreelancer) {
        setSavedJobIds(new Set());
        return;
      }

      try {
        const savedJobs = await savedJobAPI.getMySavedJobs();
        if (isMounted) {
          setSavedJobIds(new Set(savedJobs.map(getSavedJobPostId).filter(Boolean)));
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load saved jobs:', error);
        setSavedJobIds(new Set());
        toast.error(error instanceof Error ? error.message : 'Saved job state could not be loaded.');
      }
    };

    fetchSavedJobs();

    return () => {
      isMounted = false;
    };
  }, [isFreelancer, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCommittedSearch(sanitizeSearch(search).trim());
      setPage(1);
      setSearchEventId(null);
      setParamsRef.current(current => {
        const next = new URLSearchParams(current);
        if (search.trim()) next.set('q', sanitizeSearch(search).trim()); else next.delete('q');
        next.set('page', '1');
        return next;
      }, { replace: true });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCommittedSkills(skills.trim());
      setCommittedBudgetMin(budgetMin);
      setCommittedBudgetMax(budgetMax);
      setPage(1);
      setSearchEventId(null);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [budgetMax, budgetMin, skills]);

  useEffect(() => {
    const controller = new AbortController();
    if (isRecommendedView || (isProfileView && profileLoading)) {
      setLoading(false);
      return () => controller.abort();
    }

    const fetchJobs = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const commonFilters = {
          pageIndex: page,
          pageSize: PAGE_SIZE,
          search: committedSearch || undefined,
          budgetMin: committedBudgetMin ? Number(committedBudgetMin) : undefined,
          budgetMax: committedBudgetMax ? Number(committedBudgetMax) : undefined,
          sortBy: sortBy === 'date' ? 'newest' : 'relevance',
          sortDesc: true,
          skills: committedSkills || undefined,
          workType: workType === 'All' ? undefined : workType,
          postedWithinDays: getDatePostedDays(datePosted) ?? undefined,
          searchEventId: page > 1 ? searchEventId : null,
        };
        const result = isProfileView
          ? await jobGetAPI.getProfileMatchedJobs({
            ...commonFilters,
          }, controller.signal)
          : await jobGetAPI.searchPublicJobs({
            ...commonFilters,
            category: category === 'All' ? undefined : category,
          }, controller.signal);
        setAllJobs(result.items.map(job => ({
          ...job,
          datePosted: job.createdAt || '',
          isFeatured: Boolean(job.isFeatured),
        })));
        setTotalResults(result.totalResults);
        if (result.searchEventId) setSearchEventId(result.searchEventId);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch jobs:', error);
        setLoadError(t('jobs.loadError'));
        setAllJobs([]);
        setTotalResults(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchJobs();
    return () => controller.abort();
  }, [category, committedBudgetMax, committedBudgetMin, committedSearch, committedSkills, datePosted, isProfileView, isRecommendedView, page, profileLoading, sortBy, t, workType]);

  useEffect(() => {
    let isMounted = true;
    profileGetAPI.getFreelancers({ page: 1, pageSize: 5, sort: 'elo' }).then(response => {
      if (isMounted && response.success && response.data) setTopFreelancers(response.data.items);
    }).catch(() => {
      if (isMounted) setTopFreelancers([]);
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    jobGetAPI.getMajorCategories().then(response => {
      if (!isMounted || !response.success || !response.data) return;
      setCategoryTaxonomy(response.data);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const budgetInvalid = Boolean(budgetMin && budgetMax && Number(budgetMin) > Number(budgetMax));
  const jobs = budgetInvalid ? [] : allJobs;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const pagedJobs = isRecommendedView ? recommendedJobs : jobs;

  useEffect(() => {
    setParamsRef.current(current => {
      const next = new URLSearchParams(current);
      next.set('page', String(page));
      return next;
    }, { replace: true });
  }, [page]);

  const commitSearch = () => {
    setCommittedSearch(sanitizeSearch(search).trim());
    setSearchEventId(null);
    setPage(1);
  };

  const resetBrowsePage = () => {
    setPage(1);
    setSearchEventId(null);
  };

  const setBrowseViewParam = (view: BrowseJobsView): void => {
    setBrowseView(view);
    setParamsRef.current(current => {
      const next = new URLSearchParams(current);
      next.set('view', view);
      next.set('page', '1');
      return next;
    }, { replace: true });
  };

  const openJob = (job: BrowseJob) => {
    void jobGetAPI.recordJobOpen(job.id, searchEventId);
    navigate(`/jobs/${job.id}`, { state: { job, searchEventId } });
  };

  const enterRecommendedMode = (): void => {
    setBrowseViewParam(BROWSE_JOBS_VIEW.Recommended);
    resetBrowsePage();
  };

  const exitRecommendedMode = (): void => {
    setRecommendedJobs([]);
    setBrowseViewParam(freelancerProfile ? BROWSE_JOBS_VIEW.Profile : BROWSE_JOBS_VIEW.All);
    resetBrowsePage();
  };

  const findMatchingJobs = (): void => {
    if (!user || !isFreelancer) {
      toast.error(t('jobs.onlyFreelancersCanSave'));
      return;
    }

    if (isRecommendedView) {
      exitRecommendedMode();
      return;
    }

    enterRecommendedMode();
  };

  const selectCategory = (nextCategory: string): void => {
    setRecommendedJobs([]);
    setBrowseView(BROWSE_JOBS_VIEW.All);
    setCategory(nextCategory);
    resetBrowsePage();
    setParamsRef.current(current => {
      const next = new URLSearchParams(current);
      next.set('view', BROWSE_JOBS_VIEW.All);
      next.set('page', '1');
      next.delete('profileCats');
      if (nextCategory === 'All') next.delete('cat');
      else next.set('cat', nextCategory);
      return next;
    }, { replace: true });
  };

  const handleCategorySelectChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    selectCategory(event.target.value);
  };

  const selectAllJobs = (): void => {
    selectCategory('All');
  };

  const resetProfileMode = (): void => {
    if (!freelancerProfile) {
      selectCategory('All');
      return;
    }
    setRecommendedJobs([]);
    setBrowseView(BROWSE_JOBS_VIEW.Profile);
    setCategory('All');
    resetBrowsePage();
    setParamsRef.current(current => {
      const next = new URLSearchParams(current);
      next.set('view', BROWSE_JOBS_VIEW.Profile);
      next.delete('profileCats');
      next.delete('cat');
      next.set('page', '1');
      return next;
    }, { replace: true });
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (isRecommendedView) exitRecommendedMode();
    setSearch(sanitizeSearch(event.target.value));
  };

  const handleFilterToggle = (): void => {
    if (isRecommendedView) exitRecommendedMode();
    setShowFilters(current => !current);
  };

  const toggleSave = async (id: string) => {
    if (!id) {
      toast.error('This job cannot be saved yet.');
      return;
    }

    if (!user || !isFreelancer) {
      toast.error('Please log in as a freelancer to save jobs.');
      return;
    }

    setSavingJobIds(prev => new Set(prev).add(id));

    try {
      if (savedJobIds.has(id)) {
        await savedJobAPI.unsaveJob(id);
        setSavedJobIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.success('Job removed from saved jobs.');
      } else {
        await savedJobAPI.saveJob(id);
        setSavedJobIds(prev => new Set(prev).add(id));
        toast.success('Job saved.');
      }
    } catch (error) {
      console.error('Failed to update saved job:', error);
      toast.error(error instanceof Error ? error.message : 'Saved job status could not be updated.');
    } finally {
      setSavingJobIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const isEn = t('common.search') === 'Search';
  const translateDatePosted = (item: string) => {
    if (item === 'Any time') return isEn ? 'Any time' : 'Mọi lúc';
    if (item === 'Last 24 hours') return isEn ? 'Last 24 hours' : '24 giờ qua';
    if (item === 'Last 7 days') return isEn ? 'Last 7 days' : '7 ngày qua';
    if (item === 'Last 30 days') return isEn ? 'Last 30 days' : '30 ngày qua';
    return item;
  };

  return (
    <AppLayout>
      <div className="browse-jobs-shell" ref={containerRef}>
        {/* Header Title Section */}
        <div className="mb-6">
          <h1 className="browse-jobs-header-title mb-1.5">
            {t('jobs.browseJobs').split(' ')[0]} <span className="text-[var(--brand,#494be7)] italic font-light">{t('jobs.browseJobs').split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="browse-jobs-desc">{t('jobs.browseJobsDesc')}</p>
        </div>

        {/* Main Grid Layout */}
        <div className="browse-jobs-layout-grid">
          {/* Left Column - Main Content & Job Cards */}
          <div className="browse-jobs-results space-y-5">
            {/* Search & Filter Header Box */}
            <div className="browse-jobs-glass-card p-4 browse-jobs-header-card">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="browse-jobs-search-wrapper">
                  <Search size={16} className="browse-jobs-search-icon" />
                  <input
                    type="text"
                    value={search}
                    onChange={handleSearchChange}
                    onKeyDown={event => event.key === 'Enter' && commitSearch()}
                    placeholder={t('jobs.searchPlaceholder')}
                    className="browse-jobs-search-input"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFilterToggle}
                  className={`browse-jobs-filter-btn ${showFilters ? 'active' : ''}`}
                >
                  <Filter size={16} />
                  <span>{t('jobs.filters')}</span>
                </button>
                {user && isFreelancer && (
                  <ConicBorderButton
                    onClick={findMatchingJobs}
                    disabled={recommendedLoading}
                    isActive={isRecommendedView}
                    wrapperClassName="shrink-0"
                  >
                    <Sparkles size={15} className="text-brand shrink-0 animate-pulse" />
                    <span>{recommendedLoading ? t('jobs.findingMatchingJobs') : isRecommendedView ? t('jobs.backToProfileMatches') : t('jobs.findMatchingJobs')}</span>
                  </ConicBorderButton>
                )}
              </div>

              {profileFallbackMessage && (
                <p className="browse-jobs-profile-notice" role="status">{profileFallbackMessage}</p>
              )}

              {/* Filter Expansion Grid */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t browse-jobs-divider">
                  <div className="browse-jobs-filter-grid">
                    <label>
                      {t('jobs.category')}
                      {isProfileView ? (
                        <div className="browse-jobs-profile-major-summary">
                          {t('jobs.profileMajorSelected', {
                            major: freelancerProfile?.majorName || t('jobs.forYou'),
                          })}
                        </div>
                      ) : (
                        <select value={category} onChange={handleCategorySelectChange}>
                          {categoryOptions.map(item => <option key={item} value={item}>{item === 'All' ? t('jobs.all') : item}</option>)}
                        </select>
                      )}
                    </label>
                    <label>
                      {t('jobs.skills')}
                      <input value={skills} onChange={event => { if (isRecommendedView) exitRecommendedMode(); setSkills(sanitizeSearch(event.target.value)); }} placeholder="React, SQL..." />
                    </label>
                    <label>
                      {t('jobs.minBudget')}
                      <input type="number" min="0" value={budgetMin} onChange={event => { if (isRecommendedView) exitRecommendedMode(); setBudgetMin(event.target.value); }} />
                    </label>
                    <label>
                      {t('jobs.maxBudget')}
                      <input type="number" min="0" value={budgetMax} onChange={event => { if (isRecommendedView) exitRecommendedMode(); setBudgetMax(event.target.value); }} />
                    </label>
                    <label>
                      {t('jobs.workType')}
                      <select value={workType} onChange={event => { if (isRecommendedView) exitRecommendedMode(); setWorkType(event.target.value); resetBrowsePage(); }}>
                        {WORK_TYPES.map(item => <option key={item} value={item}>{item === 'All' ? (isEn ? 'All' : 'Tất cả') : t('jobs.fixedPrice')}</option>)}
                      </select>
                    </label>
                    <label>
                      {t('jobs.datePosted')}
                      <select value={datePosted} onChange={event => { if (isRecommendedView) exitRecommendedMode(); setDatePosted(event.target.value); resetBrowsePage(); }}>
                        {DATE_POSTED.map(item => <option key={item} value={item}>{translateDatePosted(item)}</option>)}
                      </select>
                    </label>
                  </div>
                  {budgetInvalid && <p className="browse-jobs-error">{t('jobs.budgetRangeInvalid')}</p>}
                </div>
              )}
            </div>

            {/* Category Filter Horizontal Smooth Scroll Pill Container */}
            <BrowseJobCategoryTags
              view={browseView}
              categories={categoryOptions.filter(item => item !== 'All')}
              publicCategory={category}
              isFreelancer={Boolean(user && isFreelancer && freelancerProfile)}
              onResetProfile={resetProfileMode}
              onSelectAll={selectAllJobs}
              onSelectPublicCategory={selectCategory}
            />

            {/* Results Count & Sort Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-3.5">
                {isRecommendedView ? (
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-[var(--brand,#494be7)]" />
                    <p className="text-sm browse-jobs-desc font-medium">
                      {t('jobs.recommendedJobsTitle')}
                      {!recommendedLoading && (
                        <span className="text-[var(--brand,#494be7)] font-bold"> · {recommendedJobs.length}</span>
                      )}
                    </p>
                  </div>
                ) : isProfileView ? (
                  <div className="flex items-center gap-2">
                    <p className="text-sm browse-jobs-desc font-medium">
                      {t('jobs.profileMatchedJobsTitle')}
                      <span className="text-[var(--brand,#494be7)] font-bold"> · {totalResults}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm browse-jobs-desc font-medium">
                    <span className="text-[var(--brand,#494be7)] font-bold">{totalResults}</span> {t('jobs.openJobsFound')}
                  </p>
                )}
                {isRecommendedView ? (
                  <button
                    type="button"
                    onClick={exitRecommendedMode}
                    className="text-xs font-bold text-[var(--brand,#494be7)] hover:underline cursor-pointer"
                  >
                    {t('jobs.backToProfileMatches')}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs browse-jobs-desc font-medium">{t('jobs.sortBy')}:</span>
                    <button
                      type="button"
                      onClick={() => { setSortBy(sortBy === 'relevance' ? 'date' : 'relevance'); resetBrowsePage(); }}
                      className="flex items-center gap-1 text-xs font-bold text-[var(--brand,#494be7)] hover:underline cursor-pointer"
                    >
                      {sortBy === 'relevance' ? t('jobs.mostRelevant') : t('jobs.datePosted')}
                      <ChevronDown size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Job Cards List */}
              <div className="space-y-3.5">
                {!recommendedLoading && pagedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="browse-jobs-job-card"
                    onClick={() => openJob(job)}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title & Badges */}
                        <div className="flex items-start gap-2 flex-wrap mb-2">
                          <h2 className="text-base font-bold text-[var(--text-primary)] hover:text-[var(--brand,#494be7)] transition-colors line-clamp-1">
                            {job.title}
                          </h2>
                          {job.isFeatured && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-500/10 text-purple-600 border border-purple-500/20 shrink-0">
                              {t('jobs.featured')}
                            </span>
                          )}
                          {job.hasAiInterview && isFreelancer && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[var(--brand-soft,#494be715)] text-[var(--brand,#494be7)] border border-[var(--brand,#494be730)] shrink-0 inline-flex items-center gap-1">
                              <Bot size={11} /> {t('jobs.aiInterviewTag')}
                            </span>
                          )}
                        </div>

                        {/* Meta Pills */}
                        <div className="flex flex-wrap items-center gap-3 mb-2.5">
                          <div className="flex items-center gap-1 text-xs font-semibold text-[var(--brand,#494be7)] bg-[var(--brand-soft,#494be710)] px-2.5 py-1 rounded-lg">
                            <GigCoinBudget min={job.budgetMin} max={job.budgetMax} />
                            <span className="text-[var(--text-secondary)] font-normal ml-1">• {t('jobs.fixedPrice')}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs browse-jobs-job-meta">
                            <Globe size={13} className="text-[var(--text-muted)]" />
                            <span>{t('jobs.remote')}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs browse-jobs-job-meta">
                            <Users size={13} className="text-[var(--text-muted)]" />
                            <span>{job.proposalCount} {t('jobs.proposals').toLowerCase()}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs browse-jobs-job-meta">
                            <Clock size={13} className="text-[var(--text-muted)]" />
                            <span>{job.postedAt}</span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs leading-relaxed mb-3 line-clamp-2 browse-jobs-job-meta">
                          {job.description}
                        </p>

                        {/* Skill Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {job.skills.map(skill => (
                            <span key={skill} className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)]">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right Action Container */}
                      <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0">
                        {(() => {
                          const isSaved = savedJobIds.has(job.id);
                          const isSaving = savingJobIds.has(job.id);
                          const canSaveJob = Boolean(user && isFreelancer);

                          return (
                            <div className="flex items-center gap-2">
                              {job.aiMatchScore && user && (
                                <div
                                  className="px-2 py-1 rounded-md text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1"
                                  title={job.matchReasons?.length ? `${t('jobs.matchReasonsTitle')}: ${job.matchReasons.join(' · ')}` : undefined}
                                >
                                  <Bot size={11} />
                                  <span>{job.aiMatchScore}% {t('jobs.match')}</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={event => { event.stopPropagation(); toggleSave(job.id); }}
                                disabled={!canSaveJob || isSaving}
                                title={canSaveJob ? undefined : t('jobs.onlyFreelancersCanSave')}
                                className={`p-2 rounded-xl border border-[var(--border)] transition-all ${isSaved ? 'browse-jobs-save-icon-active bg-amber-500/10 border-amber-500/30' : 'browse-jobs-save-icon hover:bg-[var(--surface-hover)]'} ${(!canSaveJob || isSaving) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
                              </button>
                            </div>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={event => { event.stopPropagation(); openJob(job); }}
                          className="px-3.5 py-2 rounded-xl bg-[var(--brand,#494be7)] text-white text-xs font-bold shadow-sm hover:bg-[var(--brand-hover,#3f41d0)] transition-all cursor-pointer"
                        >
                          {t('jobs.viewJob')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommended Loading State */}
              {isRecommendedView && recommendedLoading && (
                <div className="text-center py-16 browse-jobs-glass-card">
                  <Sparkles size={44} className="mx-auto mb-3 opacity-30 text-[var(--brand,#494be7)] animate-pulse" />
                  <p className="text-sm text-[var(--text-primary)] font-bold mb-1">
                    {t('jobs.findingMatchingJobs')}
                  </p>
                </div>
              )}

              {isProfileView && profileLoading && (
                <div className="text-center py-16 browse-jobs-glass-card">
                  <Sparkles size={44} className="mx-auto mb-3 opacity-30 text-[var(--brand,#494be7)] animate-pulse" />
                  <p className="text-sm text-[var(--text-primary)] font-bold mb-1">
                    {t('jobs.profileLoading')}
                  </p>
                </div>
              )}

              {/* Empty State */}
              {!recommendedLoading && !profileLoading && !loading && pagedJobs.length === 0 && (
                <div className="text-center py-16 browse-jobs-glass-card">
                  <Bot size={44} className="mx-auto mb-3 opacity-30 text-[var(--brand,#494be7)]" />
                  <p className="text-sm text-[var(--text-primary)] font-bold mb-1">
                    {isRecommendedView
                      ? t('jobs.noRecommendedJobs')
                      : isProfileView
                        ? (loadError || t('jobs.profileNoMatches'))
                        : (loadError || t('jobs.noJobsFound'))}
                  </p>
                </div>
              )}

              {/* Pagination */}
              {!isRecommendedView && totalResults > PAGE_SIZE && (
                <div className="browse-jobs-pagination">
                  <button type="button" disabled={page === 1} onClick={() => setPage(prev => prev - 1)}>
                    {t('jobs.previous')}
                  </button>
                  <span>{t('jobs.pageOf', { page, totalPages })}</span>
                  <button type="button" disabled={page === totalPages} onClick={() => setPage(prev => prev + 1)}>
                    {t('jobs.next')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Desktop Sticky Sidebar */}
          <aside className="system-ads-sidebar-container" aria-label="Promotions and freelancer insights">
            {/* Promoted Job Card (Featured Opportunities) */}
            <SponsoredPromotionCard promotionType="job" />

            {/* Fashion-Forward Premium & Profile Promotion Card */}
            {isPremium !== null && (
              <div className={`system-ad-card ${isPremium ? 'system-ad-card-premium' : ''}`}>
                <div className="system-ad-premium-orb" aria-hidden />

                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="system-ad-title" style={{ margin: 0 }}>
                    {isPremium ? (
                      <div className="w-8 h-8 rounded-xl bg-[var(--cp-accent-dim,#6366f11c)] text-[var(--brand,#494be7)] flex items-center justify-center flex-shrink-0">
                        <Flame size={18} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-[var(--cp-accent-dim,#6366f11c)] text-[var(--brand,#494be7)] flex items-center justify-center flex-shrink-0">
                        <Sparkles size={18} />
                      </div>
                    )}
                    <span className="font-extrabold text-[15px]">{isPremium ? t('jobs.promotionTitle') : t('jobs.premiumTitle')}</span>
                  </div>

                  {isPremium && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--cp-accent-dim,#6366f11c)] text-[var(--brand,#494be7)] border border-[rgba(99,102,241,0.2)]">
                      {isPromotionActive ? 'ACTIVE ✦' : 'PROMOTION'}
                    </span>
                  )}
                </div>

                <p className="system-ad-subtitle" style={{ fontSize: 12, lineHeight: 1.55, margin: '0 0 16px' }}>
                  {isPremium ? t('jobs.promotionDesc') : t('jobs.premiumDesc')}
                </p>

                {isPremium ? (
                  isPromotionActive ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: 'var(--cp-accent-dim,#6366f11c)', border: '1px solid var(--cp-border,rgba(99,102,241,0.2))', color: 'var(--brand,#494be7)', fontSize: 13, fontWeight: 800 }}>
                      <Sparkles size={15} />
                      <span>{t('jobs.promotionActive')}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="system-ad-btn system-ad-btn-primary"
                      onClick={() => navigate('/premium/freelancer/promotions')}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 18px', fontSize: 13, fontWeight: 800 }}
                    >
                      <Flame size={15} />
                      <span>{t('jobs.startPromotion')}</span>
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    className="system-ad-btn system-ad-btn-primary"
                    onClick={() => navigate('/premium/freelancer/pricing')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 18px', fontSize: 13, fontWeight: 800 }}
                  >
                    <Sparkles size={15} />
                    <span>{t('jobs.upgradePlan')}</span>
                  </button>
                )}
              </div>
            )}

            {/* Top Freelancers Leaderboard */}
            <div className="freelancer-ranking-card">
              <div className="freelancer-ranking-header">
                <div className="freelancer-ranking-title">
                  <div className="w-8 h-8 rounded-xl bg-[var(--cp-accent-dim,#6366f11c)] text-[var(--brand,#494be7)] flex items-center justify-center flex-shrink-0">
                    <Trophy size={18} />
                  </div>
                  <span className="font-extrabold text-[15px]">{t('jobs.topFreelancers')}</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--cp-accent-dim,#6366f11c)] text-[var(--brand,#494be7)] border border-[rgba(99,102,241,0.2)] flex items-center gap-1">
                  <TrendingUp size={12} />
                  {t('jobs.eloRatings')}
                </span>
              </div>

              <div className="ranking-list">
                {topFreelancers.length === 0 ? (
                  <p className="p-4 text-xs text-[var(--text-muted)] text-center font-medium">No freelancer ranking data available.</p>
                ) : (
                  topFreelancers.map((freelancer, index) => {
                    const rank = index + 1;
                    const isTop1 = rank === 1;

                    return (
                      <div
                        key={freelancer.freelancerProfilesId}
                        onClick={() => {
                          const path = getProfilePath(freelancer.userId || freelancer.freelancerProfilesId, 'freelancer');
                          if (path) navigate(path);
                        }}
                        className={`ranking-item ${isTop1 ? 'ranking-item-top1' : ''}`}
                      >
                        <div className="ranking-user-info">
                          <div className={`ranking-position ${isTop1 ? 'ranking-position-top1' : ''}`}>
                            {isTop1 ? <Crown size={14} /> : `#${rank}`}
                          </div>
                          <div className="relative shrink-0">
                            <img
                              src={freelancer.userAvatar || '/img/avatar-fallback.png'}
                              alt={freelancer.userFullName || 'Freelancer'}
                              className={`ranking-avatar ${isTop1 ? 'ranking-avatar-top1' : ''}`}
                            />
                          </div>
                          <div className="ranking-text-details">
                            <span className="ranking-name" title={freelancer.userFullName || 'Freelancer'}>
                              {freelancer.userFullName || 'Freelancer'}
                            </span>
                            <span className="ranking-role" title={freelancer.title || 'Independent professional'}>
                              {freelancer.title || 'Independent professional'}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <span className="ranking-elo-value">{freelancer.eloPoints}</span>
                          <span className="ranking-elo-label">{t('jobs.elo')}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
