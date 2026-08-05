import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Search, Filter, Bot, Clock, Users, Globe, Bookmark, ChevronDown, Trophy, Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
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
import { premiumAPI } from '../../premium/api';
import { SponsoredPromotionCard } from '../../premium/components/SponsoredPromotionCard';
import { getProfilePath } from '../../../shared/hooks/useProfileNavigation';

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
  const [params, setParams] = useSearchParams();
  const setParamsRef = useRef(setParams);
  useEffect(() => {
    setParamsRef.current = setParams;
  }, [setParams]);

  const { user, role } = useApp();
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
  const [sortBy, setSortBy] = useState<'relevance' | 'date'>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savingJobIds, setSavingJobIds] = useState<Set<string>>(new Set());
  const [allJobs, setAllJobs] = useState<BrowseJob[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['All']);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [topFreelancers, setTopFreelancers] = useState<FreelancerSummaryDto[]>([]);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [isPromotionActive, setIsPromotionActive] = useState(false);
  const [page, setPage] = useState(() => Math.max(1, Number(params.get('page')) || 1));
  const [totalResults, setTotalResults] = useState(0);
  const [searchEventId, setSearchEventId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isFreelancer = role === UserRole.Freelancer;

  // GSAP Entrance Animations
  useGSAP(() => {
    if (containerRef.current) {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo('.browse-jobs-header-card', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 })
        .fromTo('.browse-category-pill', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, stagger: 0.03, duration: 0.35 }, '-=0.2')
        .fromTo('.browse-jobs-job-card', { opacity: 0, y: 25 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, clearProps: 'transform,opacity' }, '-=0.2')
        .fromTo('.system-ad-card, .freelancer-ranking-card, .promotion-sticky-card', { opacity: 0, x: 20 }, { opacity: 1, x: 0, stagger: 0.08, duration: 0.4, clearProps: 'transform,opacity' }, '-=0.3');
    }
  }, { scope: containerRef, dependencies: [loading, allJobs.length] });

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
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const result = await jobGetAPI.searchPublicJobs({
          pageIndex: page,
          pageSize: PAGE_SIZE,
          search: committedSearch || undefined,
          budgetMin: committedBudgetMin ? Number(committedBudgetMin) : undefined,
          budgetMax: committedBudgetMax ? Number(committedBudgetMax) : undefined,
          sortBy: sortBy === 'date' ? 'newest' : undefined,
          sortDesc: true,
          category: category === 'All' ? undefined : category,
          skills: committedSkills || undefined,
          workType: workType === 'All' ? undefined : workType,
          postedWithinDays: getDatePostedDays(datePosted) ?? undefined,
          searchEventId: page > 1 ? searchEventId : null,
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
        setLoadError('Unable to load jobs from the backend.');
        setAllJobs([]);
        setTotalResults(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchJobs();
    return () => controller.abort();
  }, [category, committedBudgetMax, committedBudgetMin, committedSearch, committedSkills, datePosted, page, sortBy, workType]);

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
      const categories = Array.from(new Set(
        response.data.map(item => item.categoryName).filter(Boolean)
      )).sort((a, b) => a.localeCompare(b));
      setCategoryOptions(['All', ...categories]);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const budgetInvalid = Boolean(budgetMin && budgetMax && Number(budgetMin) > Number(budgetMax));
  const jobs = budgetInvalid ? [] : allJobs;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const pagedJobs = jobs;

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

  const openJob = (job: BrowseJob) => {
    void jobGetAPI.recordJobOpen(job.id, searchEventId);
    navigate(`/jobs/${job.id}`, { state: { job, searchEventId } });
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
                    onChange={event => setSearch(sanitizeSearch(event.target.value))}
                    onKeyDown={event => event.key === 'Enter' && commitSearch()}
                    placeholder={t('jobs.searchPlaceholder')}
                    className="browse-jobs-search-input"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`browse-jobs-filter-btn ${showFilters ? 'active' : ''}`}
                >
                  <Filter size={16} />
                  <span>{t('jobs.filters')}</span>
                </button>
              </div>

              {/* Filter Expansion Grid */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t browse-jobs-divider">
                  <div className="browse-jobs-filter-grid">
                    <label>
                      {t('jobs.category')}
                      <select value={category} onChange={event => { setCategory(event.target.value); resetBrowsePage(); }}>
                        {categoryOptions.map(item => <option key={item} value={item}>{item === 'All' ? (isEn ? 'All' : 'Tất cả') : item}</option>)}
                      </select>
                    </label>
                    <label>
                      {t('jobs.skills')}
                      <input value={skills} onChange={event => setSkills(sanitizeSearch(event.target.value))} placeholder="React, SQL..." />
                    </label>
                    <label>
                      {t('jobs.minBudget')}
                      <input type="number" min="0" value={budgetMin} onChange={event => setBudgetMin(event.target.value)} />
                    </label>
                    <label>
                      {t('jobs.maxBudget')}
                      <input type="number" min="0" value={budgetMax} onChange={event => setBudgetMax(event.target.value)} />
                    </label>
                    <label>
                      {t('jobs.workType')}
                      <select value={workType} onChange={event => { setWorkType(event.target.value); resetBrowsePage(); }}>
                        {WORK_TYPES.map(item => <option key={item} value={item}>{item === 'All' ? (isEn ? 'All' : 'Tất cả') : t('jobs.fixedPrice')}</option>)}
                      </select>
                    </label>
                    <label>
                      {t('jobs.datePosted')}
                      <select value={datePosted} onChange={event => { setDatePosted(event.target.value); resetBrowsePage(); }}>
                        {DATE_POSTED.map(item => <option key={item} value={item}>{translateDatePosted(item)}</option>)}
                      </select>
                    </label>
                  </div>
                  {budgetInvalid && <p className="browse-jobs-error">{t('jobs.budgetRangeInvalid')}</p>}
                </div>
              )}
            </div>

            {/* Category Filter Horizontal Smooth Scroll Pill Container */}
            <div className="browse-category-scroll-container">
              {categoryOptions.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { setCategory(cat); resetBrowsePage(); }}
                  className={`browse-category-pill ${category === cat ? 'active' : ''}`}
                >
                  {cat === 'All' ? (isEn ? 'All' : 'Tất cả') : cat}
                </button>
              ))}
            </div>

            {/* Results Count & Sort Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <p className="text-sm browse-jobs-desc font-medium">
                  <span className="text-[var(--brand,#494be7)] font-bold">{totalResults}</span> {t('jobs.openJobsFound')}
                </p>
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
              </div>

              {/* Job Cards List */}
              <div className="space-y-3.5">
                {pagedJobs.map((job) => (
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
                                <div className="px-2 py-1 rounded-md text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
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

              {/* Empty State */}
              {!loading && jobs.length === 0 && (
                <div className="text-center py-16 browse-jobs-glass-card">
                  <Bot size={44} className="mx-auto mb-3 opacity-30 text-[var(--brand,#494be7)]" />
                  <p className="text-sm text-[var(--text-primary)] font-bold mb-1">
                    {loadError || t('jobs.noJobsFound')}
                  </p>
                </div>
              )}

              {/* Pagination */}
              {totalResults > PAGE_SIZE && (
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

            {/* Premium upgrade card */}
            {isPremium !== null && (
              <div className="system-ad-card">
                <div className="system-ad-title">
                  {isPremium ? <TrendingUp size={18} className="text-emerald-500" /> : <Sparkles size={18} className="text-[var(--brand,#494be7)]" />}
                  <span>{isPremium ? t('jobs.promotionTitle') : t('jobs.premiumTitle')}</span>
                </div>
                <p className="system-ad-subtitle">
                  {isPremium ? t('jobs.promotionDesc') : t('jobs.premiumDesc')}
                </p>
                <button
                  type="button"
                  className="system-ad-btn system-ad-btn-primary"
                  disabled={Boolean(isPremium && isPromotionActive)}
                  onClick={() => navigate(isPremium ? '/premium/freelancer/promotions' : '/premium/freelancer/pricing')}
                >
                  {isPremium
                    ? t(isPromotionActive ? 'jobs.promotionActive' : 'jobs.startPromotion')
                    : t('jobs.upgradePlan')}
                </button>
              </div>
            )}

            {/* Top Freelancers Leaderboard */}
            <div className="freelancer-ranking-card">
              <div className="freelancer-ranking-header">
                <div className="freelancer-ranking-title">
                  <Trophy size={18} className="text-amber-500" />
                  <span>{t('jobs.topFreelancers')}</span>
                </div>
                <span className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1">
                  <TrendingUp size={12} className="text-emerald-500" />
                  {t('jobs.eloRatings')}
                </span>
              </div>

              <div className="ranking-list">
                {topFreelancers.length === 0 ? (
                  <p className="p-3 text-xs text-[var(--text-muted)] text-center">No freelancer ranking data is available.</p>
                ) : (
                  topFreelancers.map((freelancer, index) => {
                    const rank = index + 1;
                    const isGold = rank === 1;
                    const isSilver = rank === 2;
                    const isBronze = rank === 3;
                    
                    return (
                      <div 
                        key={freelancer.freelancerProfilesId}
                        onClick={() => {
                          const path = getProfilePath(freelancer.userId || freelancer.freelancerProfilesId, 'freelancer');
                          if (path) navigate(path);
                        }}
                        className={`ranking-item ${
                          isGold ? 'ranking-item-top1' : 
                          isSilver ? 'ranking-item-top2' : 
                          isBronze ? 'ranking-item-top3' : ''
                        }`}
                      >
                        <div className="ranking-user-info">
                          <div className={`ranking-position ${
                            isGold ? 'text-amber-500 font-black' : 
                            isSilver ? 'text-slate-400 font-bold' : 
                            isBronze ? 'text-amber-700 font-bold' : 'text-[var(--text-muted)] font-medium'
                          }`}>
                            {isGold ? '👑' : `#${rank}`}
                          </div>
                          <div className="relative shrink-0">
                            <img 
                              src={freelancer.userAvatar || '/img/avatar-fallback.png'}
                              alt={freelancer.userFullName || 'Freelancer'}
                              className={`ranking-avatar ${
                                isGold ? 'ranking-avatar-gold' : 
                                isSilver ? 'ranking-avatar-silver' : 
                                isBronze ? 'ranking-avatar-bronze' : ''
                              }`}
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
                        <div className="flex flex-col items-end shrink-0 pl-1">
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
