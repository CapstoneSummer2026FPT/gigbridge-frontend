import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Search, Filter, Bot, Clock, Users, Globe, Bookmark, ChevronDown, Trophy, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { toast } from 'sonner';
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
  const [aiOnly, setAiOnly] = useState(false);
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
  const isFreelancer = role === UserRole.Freelancer;

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
      setParams(current => {
        const next = new URLSearchParams(current);
        if (search.trim()) next.set('q', sanitizeSearch(search).trim()); else next.delete('q');
        next.set('page', '1');
        return next;
      }, { replace: true });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [search, setParams]);

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
          aiOnly,
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
  }, [aiOnly, category, committedBudgetMax, committedBudgetMin, committedSearch, committedSkills, datePosted, page, sortBy, workType]);

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
    setParams(current => {
      const next = new URLSearchParams(current);
      next.set('page', String(page));
      return next;
    }, { replace: true });
  }, [page, setParams]);

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
      <div className="browse-jobs-shell">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            {t('jobs.browseJobs').split(' ')[0]} <span className="text-blue-600 black:text-blue-400 italic font-light">{t('jobs.browseJobs').split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="browse-jobs-desc">{t('jobs.browseJobsDesc')}</p>
        </div>

        <div className="browse-jobs-layout-grid">
          {/* Left Column (2/3 width) */}
          <div className="browse-jobs-results space-y-6">
            <div className="glass-card p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 browse-jobs-search-icon" />
                  <input
                    type="text"
                    value={search}
                    onChange={event => setSearch(sanitizeSearch(event.target.value))}
                    onKeyDown={event => event.key === 'Enter' && commitSearch()}
                    placeholder={t('jobs.searchPlaceholder')}
                    className="input-gb w-full browse-jobs-search-input"
                  />
                </div>
                <button onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all browse-jobs-filter-btn">
                  <Filter size={16} /> {t('jobs.filters')}
                </button>
                <button onClick={() => { setAiOnly(!aiOnly); resetBrowsePage(); }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${aiOnly ? 'browse-jobs-ai-toggle-active' : 'browse-jobs-ai-toggle-inactive'}`}>
                  <Bot size={16} />
                  {t('jobs.aiRecommended')}
                </button>
              </div>

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
                      <input value={skills} onChange={event => setSkills(sanitizeSearch(event.target.value))} placeholder="React, SQL" />
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

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categoryOptions.map(cat => (
                <button key={cat} onClick={() => { setCategory(cat); resetBrowsePage(); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${category === cat ? 'browse-jobs-ai-toggle-active' : 'browse-jobs-ai-toggle-inactive'}`}>
                  {cat === 'All' ? (isEn ? 'All' : 'Tất cả') : cat}
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm browse-jobs-desc">
                  <span className="text-primary font-semibold">{totalResults}</span> {t('jobs.openJobsFound')}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs browse-jobs-desc">{t('jobs.sortBy')}:</span>
                  <button onClick={() => { setSortBy(sortBy === 'relevance' ? 'date' : 'relevance'); resetBrowsePage(); }} className="flex items-center gap-1 text-sm text-primary">
                    {sortBy === 'relevance' ? t('jobs.mostRelevant') : t('jobs.datePosted')} <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {pagedJobs.map((job, idx) => (
                  <div key={job.id}
                    className="glass-card p-5 cursor-pointer group browse-jobs-job-card"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                    onClick={() => openJob(job)}>
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-2 flex-wrap mb-2">
                          <h2 className="text-primary font-semibold group-hover:text-[#0077FF] transition-colors">{job.title}</h2>
                          {job.isFeatured && <span className="badge-purple text-xs flex-shrink-0">{t('jobs.featured')}</span>}
                          {job.isAiRecommended && <span className="badge-cyan text-xs flex-shrink-0">{t('jobs.aiPick')}</span>}
                          {job.hasAiInterview && isFreelancer && (
                            <span className="badge-purple text-xs flex-shrink-0 inline-flex items-center gap-1">
                              <Bot size={11} /> {t('jobs.aiInterviewTag')}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <div className="flex items-center gap-1 text-xs browse-jobs-job-meta">
                            <GigCoinBudget min={job.budgetMin} max={job.budgetMax} /> • {t('jobs.fixedPrice')}
                          </div>
                          <div className="flex items-center gap-1 text-xs browse-jobs-job-meta"><Globe size={12} /> {t('jobs.remote')}</div>
                          <div className="flex items-center gap-1 text-xs browse-jobs-job-meta"><Users size={12} /> {job.proposalCount} {t('jobs.proposals').toLowerCase()}</div>
                          <div className="flex items-center gap-1 text-xs browse-jobs-job-meta"><Clock size={12} /> {job.postedAt}</div>
                        </div>

                        <p className="text-sm leading-relaxed mb-3 line-clamp-2 browse-jobs-job-meta">{job.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.skills.map(skill => <span key={skill} className="tag-pill">{skill}</span>)}
                        </div>
                      </div>

                      <div className="flex md:flex-col items-center md:items-end gap-3 flex-shrink-0">
                        {(() => {
                          const isSaved = savedJobIds.has(job.id);
                          const isSaving = savingJobIds.has(job.id);
                          const canSaveJob = Boolean(user && isFreelancer);

                          return (
                            <>
                        {job.aiMatchScore && user && (
                          <div className={`match-score ${job.aiMatchScore >= 90 ? 'high' : job.aiMatchScore >= 70 ? 'medium' : 'low'} flex-shrink-0`}>
                            <Bot size={10} />
                            {job.aiMatchScore}% {t('jobs.match')}
                          </div>
                        )}
                        <button
                          onClick={event => { event.stopPropagation(); toggleSave(job.id); }}
                          disabled={!canSaveJob || isSaving}
                          title={canSaveJob ? undefined : t('jobs.onlyFreelancersCanSave')}
                          className={`p-2 rounded-lg transition-all ${isSaved ? 'browse-jobs-save-icon-active' : 'browse-jobs-save-icon'} ${(!canSaveJob || isSaving) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
                        </button>
                            </>
                          );
                        })()}
                        <button onClick={event => { event.stopPropagation(); openJob(job); }}
                          className="btn-ghost-cyan px-3 py-1.5 text-xs flex-shrink-0">
                          {t('jobs.viewJob')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!loading && jobs.length === 0 && (
                <div className="text-center py-20">
                  <Bot size={48} className="mx-auto mb-4 opacity-30 browse-jobs-job-meta" />
                  <p className="text-primary font-semibold mb-2">
                    {loadError || t('jobs.noJobsFound')}
                  </p>
                </div>
              )}

              {totalResults > PAGE_SIZE && (
                <div className="browse-jobs-pagination">
                  <button disabled={page === 1} onClick={() => setPage(prev => prev - 1)}>{t('jobs.previous')}</button>
                  <span>{t('jobs.pageOf', { page, totalPages })}</span>
                  <button disabled={page === totalPages} onClick={() => setPage(prev => prev + 1)}>{t('jobs.next')}</button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1/3 width) - Sidebar with System Ads and Freelancer Rankings */}
          <aside className="system-ads-sidebar-container" aria-label="Promotions and freelancer insights">
            <SponsoredPromotionCard promotionType="job" />
            {/* Ad 1: Premium upgrade or promotion activation */}
            {isPremium !== null && <div className={`system-ad-card ${isPremium ? 'system-ad-card-promotion' : 'system-ad-card-premium'}`}>
              <div className="system-ad-title">
                {isPremium ? <TrendingUp size={18} className="ad-icon-promotion" /> : <Sparkles size={18} className="ad-icon-purple" />}
                <span>{isPremium ? t('jobs.promotionTitle') : t('jobs.premiumTitle')}</span>
              </div>
              <p className="system-ad-subtitle">
                {isPremium ? t('jobs.promotionDesc') : t('jobs.premiumDesc')}
              </p>
              <button
                className={`system-ad-btn ${isPremium ? 'system-ad-btn-promotion' : 'system-ad-btn-primary'}`}
                disabled={Boolean(isPremium && isPromotionActive)}
                onClick={() => navigate(isPremium ? '/premium/freelancer/promotions' : '/premium/freelancer/pricing')}
              >
                {isPremium
                  ? t(isPromotionActive ? 'jobs.promotionActive' : 'jobs.startPromotion')
                  : t('jobs.upgradePlan')}
              </button>
            </div>}

            {/* Ad 2: Skill Certification */}
            <div className="system-ad-card">
              <div className="system-ad-title">
                <Zap size={18} className="ad-icon-cyan" />
                <span>{t('jobs.verifySkills')}</span>
              </div>
              <p className="system-ad-subtitle">
                {t('jobs.verifySkillsDesc')}
              </p>
              <button className="system-ad-btn system-ad-btn-secondary">
                {t('jobs.startChallenge')}
              </button>
            </div>

            {/* Freelancer ELO Leaderboard */}
            <div className="freelancer-ranking-card">
              <div className="freelancer-ranking-header">
                <div className="freelancer-ranking-title">
                  <Trophy size={18} className="trophy-icon" />
                  <span>{t('jobs.topFreelancers')}</span>
                </div>
                <span className="freelancer-ranking-subtitle flex items-center gap-1">
                  <TrendingUp size={12} className="text-emerald-500" />
                  {t('jobs.eloRatings')}
                </span>
              </div>

              <div className="ranking-list">
                {topFreelancers.length === 0 ? <p className="p-4 text-xs text-muted-foreground">No freelancer ranking data is available.</p> : topFreelancers.map((freelancer, index) => {
                  const rank = index + 1;
                  const isGold = rank === 1;
                  const isSilver = rank === 2;
                  const isBronze = rank === 3;
                  
                  return (
                    <div 
                      key={freelancer.freelancerProfilesId}
                      className={`ranking-item ${
                        isGold ? 'ranking-item-top1' : 
                        isSilver ? 'ranking-item-top2' : 
                        isBronze ? 'ranking-item-top3' : ''
                      }`}
                    >
                      <div className="ranking-user-info">
                        <div className={`ranking-position ${
                          isGold ? 'ranking-position-gold' : 
                          isSilver ? 'ranking-position-silver' : 
                          isBronze ? 'ranking-position-bronze' : ''
                        }`}>
                          {rank}
                        </div>
                        <div className="ranking-avatar-container">
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
                          <span className="ranking-name">{freelancer.userFullName || 'Freelancer'}</span>
                          <span className="ranking-role">{freelancer.title || 'Independent professional'}</span>
                        </div>
                      </div>
                      <div className="ranking-elo">
                        <span className="ranking-elo-value">{freelancer.eloPoints}</span>
                        <span className="ranking-elo-label">{t('jobs.elo')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
