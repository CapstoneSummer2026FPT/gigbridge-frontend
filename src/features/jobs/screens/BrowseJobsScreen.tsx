import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Search, Filter, Bot, Clock, Users, Globe, Bookmark, ChevronDown, Trophy, Sparkles, TrendingUp, Medal, Zap } from 'lucide-react';
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

const PAGE_SIZE = 20;
const WORK_TYPES = ['All', 'fixed'];
const DATE_POSTED = ['Any time', 'Last 24 hours', 'Last 7 days', 'Last 30 days'];

type BrowseJob = Job & {
  datePosted: string;
  isFeatured: boolean;
};

const MOCK_TOP_FREELANCERS = [
  {
    rank: 1,
    name: 'Alex Rivera',
    role: 'Full-Stack Engineer',
    elo: 2840,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isPro: true,
  },
  {
    rank: 2,
    name: 'Sofia Chen',
    role: 'UI/UX Designer',
    elo: 2750,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    isPro: true,
  },
  {
    rank: 3,
    name: 'Marcus Vance',
    role: 'DevOps Architect',
    elo: 2690,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    isPro: false,
  },
  {
    rank: 4,
    name: 'Priya Patel',
    role: 'Data Scientist',
    elo: 2610,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isPro: true,
  },
  {
    rank: 5,
    name: 'Liam Nguyen',
    role: 'React Developer',
    elo: 2580,
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    isPro: false,
  },
];

const sanitizeSearch = (value: string) => value.replace(/[<>"'`;]/g, '').slice(0, 120);

const getDatePostedDays = (value: string) => {
  if (value === 'Last 24 hours') return 1;
  if (value === 'Last 7 days') return 7;
  if (value === 'Last 30 days') return 30;
  return null;
};

const getSavedJobPostId = (job: SavedJobDto): string => job.jobPostId ?? job.jobPostsId ?? '';

export default function BrowseJobsScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, role } = useApp();
  const [search, setSearch] = useState(sanitizeSearch(params.get('q') || ''));
  const [category, setCategory] = useState(params.get('cat') || 'All');
  const [skills, setSkills] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
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
  const [page, setPage] = useState(1);
  const isFreelancer = role === UserRole.Freelancer;

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
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await jobGetAPI.getJobs();
        setAllJobs(data.map(job => ({
          ...job,
          datePosted: new Date().toISOString().slice(0, 10),
          isFeatured: Boolean(job.isAiRecommended),
        })));
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
        setLoadError('Unable to load jobs from the backend.');
        setAllJobs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
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

  const jobs = useMemo(() => {
    if (budgetInvalid) return [];

    const query = sanitizeSearch(search).toLowerCase();
    const skillTerms = skills.split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
    const postedWithinDays = getDatePostedDays(datePosted);

    const scored = allJobs
      .filter(job => job.status === 'open')
      .filter(job => {
        const searchableText = `${job.title} ${job.description}`.toLowerCase();
        const matchesSearch = !query || searchableText.includes(query);
        const matchesCategory = category === 'All' || job.category === category;
        const matchesSkills = skillTerms.length === 0 || skillTerms.every(skill =>
          job.skills.some(jobSkill => jobSkill.toLowerCase().includes(skill))
        );
        const matchesBudgetMin = !budgetMin || job.budgetMax >= Number(budgetMin);
        const matchesBudgetMax = !budgetMax || job.budgetMin <= Number(budgetMax);
        const matchesWorkType = workType === 'All' || job.jobType === workType;
        const matchesAi = !aiOnly || job.isAiRecommended;
        const matchesDate = !postedWithinDays || (
          (Date.now() - new Date(job.datePosted).getTime()) / 86400000 <= postedWithinDays
        );

        return matchesSearch && matchesCategory && matchesSkills && matchesBudgetMin
          && matchesBudgetMax && matchesWorkType && matchesAi && matchesDate;
      })
      .map(job => {
        const titleScore = query && job.title.toLowerCase().includes(query) ? 3 : 0;
        const descScore = query && job.description.toLowerCase().includes(query) ? 1 : 0;
        const skillScore = query ? job.skills.filter(skill => skill.toLowerCase().includes(query)).length : 0;
        return { job, relevance: titleScore + descScore + skillScore + (job.aiMatchScore || 0) / 100 };
      });

    scored.sort((a, b) => {
      if ((a.job.isFeatured ? 1 : 0) !== (b.job.isFeatured ? 1 : 0)) {
        return (b.job.isFeatured ? 1 : 0) - (a.job.isFeatured ? 1 : 0);
      }
      if (sortBy === 'date') {
        return new Date(b.job.datePosted).getTime() - new Date(a.job.datePosted).getTime();
      }
      return b.relevance - a.relevance;
    });

    return scored.map(item => item.job);
  }, [aiOnly, allJobs, budgetInvalid, budgetMax, budgetMin, category, datePosted, search, skills, sortBy, workType]);

  const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const pagedJobs = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, category, skills, budgetMin, budgetMax, workType, datePosted, sortBy, aiOnly]);

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

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            Browse <span className="text-blue-600 black:text-blue-400 italic font-light">Jobs</span>
          </h1>
          <p className="browse-jobs-desc">Discover open opportunities with search, advanced filters, and saved jobs.</p>
        </div>

        <div className="browse-jobs-layout-grid">
          {/* Left Column (2/3 width) */}
          <div className="space-y-6">
            <div className="glass-card p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 browse-jobs-search-icon" />
                  <input
                    type="text"
                    value={search}
                    onChange={event => setSearch(sanitizeSearch(event.target.value))}
                    placeholder="Search title or description..."
                    className="input-gb w-full browse-jobs-search-input"
                  />
                </div>
                <button onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all browse-jobs-filter-btn">
                  <Filter size={16} /> Filters
                </button>
                <button onClick={() => setAiOnly(!aiOnly)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${aiOnly ? 'browse-jobs-ai-toggle-active' : 'browse-jobs-ai-toggle-inactive'}`}>
                  <Bot size={16} />
                  AI Recommended
                </button>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t browse-jobs-divider">
                  <div className="browse-jobs-filter-grid">
                    <label>
                      Category
                      <select value={category} onChange={event => setCategory(event.target.value)}>
                        {categoryOptions.map(item => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                    <label>
                      Skills
                      <input value={skills} onChange={event => setSkills(sanitizeSearch(event.target.value))} placeholder="React, SQL" />
                    </label>
                    <label>
                      Min Budget
                      <input type="number" min="0" value={budgetMin} onChange={event => setBudgetMin(event.target.value)} />
                    </label>
                    <label>
                      Max Budget
                      <input type="number" min="0" value={budgetMax} onChange={event => setBudgetMax(event.target.value)} />
                    </label>
                    <label>
                      Work Type
                      <select value={workType} onChange={event => setWorkType(event.target.value)}>
                        {WORK_TYPES.map(item => <option key={item} value={item}>{item === 'All' ? 'All' : 'Fixed Price'}</option>)}
                      </select>
                    </label>
                    <label>
                      Date Posted
                      <select value={datePosted} onChange={event => setDatePosted(event.target.value)}>
                        {DATE_POSTED.map(item => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                  </div>
                  {budgetInvalid && <p className="browse-jobs-error">Budget range is invalid. Min must be less than or equal to Max.</p>}
                </div>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categoryOptions.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${category === cat ? 'browse-jobs-ai-toggle-active' : 'browse-jobs-ai-toggle-inactive'}`}>
                  {cat}
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm browse-jobs-desc">
                  <span className="text-primary font-semibold">{jobs.length}</span> open jobs found
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs browse-jobs-desc">Sort by:</span>
                  <button onClick={() => setSortBy(sortBy === 'relevance' ? 'date' : 'relevance')} className="flex items-center gap-1 text-sm text-primary">
                    {sortBy === 'relevance' ? 'Most Relevant' : 'Date Posted'} <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {pagedJobs.map((job, idx) => (
                  <div key={job.id}
                    className="glass-card p-5 cursor-pointer group browse-jobs-job-card"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                    onClick={() => navigate(`/jobs/${job.id}`, { state: { job } })}>
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-2 flex-wrap mb-2">
                          <h2 className="text-primary font-semibold group-hover:text-[#0077FF] transition-colors">{job.title}</h2>
                          {job.isFeatured && <span className="badge-purple text-xs flex-shrink-0">Featured</span>}
                          {job.isAiRecommended && <span className="badge-cyan text-xs flex-shrink-0">AI Pick</span>}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <div className="flex items-center gap-1 text-xs browse-jobs-job-meta">
                            <GigCoinBudget min={job.budgetMin} max={job.budgetMax} /> ? Fixed
                          </div>
                          <div className="flex items-center gap-1 text-xs browse-jobs-job-meta"><Globe size={12} /> Remote</div>
                          <div className="flex items-center gap-1 text-xs browse-jobs-job-meta"><Users size={12} /> {job.proposalCount} proposals</div>
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
                            {job.aiMatchScore}% Match
                          </div>
                        )}
                        <button
                          onClick={event => { event.stopPropagation(); toggleSave(job.id); }}
                          disabled={!canSaveJob || isSaving}
                          title={canSaveJob ? undefined : 'Only freelancers can save jobs'}
                          className={`p-2 rounded-lg transition-all ${isSaved ? 'browse-jobs-save-icon-active' : 'browse-jobs-save-icon'} ${(!canSaveJob || isSaving) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
                        </button>
                            </>
                          );
                        })()}
                        <button onClick={event => { event.stopPropagation(); navigate(`/jobs/${job.id}`, { state: { job } }); }}
                          className="btn-ghost-cyan px-3 py-1.5 text-xs flex-shrink-0">
                          View Job
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
                    {loadError || 'No jobs match your criteria. Try adjusting filters.'}
                  </p>
                </div>
              )}

              {jobs.length > PAGE_SIZE && (
                <div className="browse-jobs-pagination">
                  <button disabled={page === 1} onClick={() => setPage(prev => prev - 1)}>Previous</button>
                  <span>Page {page} of {totalPages}</span>
                  <button disabled={page === totalPages} onClick={() => setPage(prev => prev + 1)}>Next</button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1/3 width) - Sidebar with System Ads and Freelancer Rankings */}
          <div className="system-ads-sidebar-container">
            {/* Ad 1: GigBridge Premium */}
            <div className="system-ad-card system-ad-card-premium">
              <div className="system-ad-title">
                <Sparkles size={18} className="ad-icon-purple" />
                <span>GigBridge Premium</span>
              </div>
              <p className="system-ad-subtitle">
                Get priority matching, badge highlights, and double the proposal visibility. Stand out from the crowd!
              </p>
              <button className="system-ad-btn system-ad-btn-primary">
                Upgrade Plan
              </button>
            </div>

            {/* Ad 2: Skill Certification */}
            <div className="system-ad-card">
              <div className="system-ad-title">
                <Zap size={18} className="ad-icon-cyan" />
                <span>Verify Your Skills</span>
              </div>
              <p className="system-ad-subtitle">
                Complete a fast technical ELO test and add a verified Pro Certificate directly onto your profile.
              </p>
              <button className="system-ad-btn system-ad-btn-secondary">
                Start Challenge
              </button>
            </div>

            {/* Freelancer ELO Leaderboard */}
            <div className="freelancer-ranking-card">
              <div className="freelancer-ranking-header">
                <div className="freelancer-ranking-title">
                  <Trophy size={18} className="trophy-icon" />
                  <span>Top Freelancers</span>
                </div>
                <span className="freelancer-ranking-subtitle flex items-center gap-1">
                  <TrendingUp size={12} className="text-emerald-500" />
                  Elo Ratings
                </span>
              </div>

              <div className="ranking-list">
                {MOCK_TOP_FREELANCERS.map((freelancer) => {
                  const isGold = freelancer.rank === 1;
                  const isSilver = freelancer.rank === 2;
                  const isBronze = freelancer.rank === 3;
                  
                  return (
                    <div 
                      key={freelancer.rank} 
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
                          {freelancer.rank}
                        </div>
                        <div className="ranking-avatar-container">
                          <img 
                            src={freelancer.avatar} 
                            alt={freelancer.name} 
                            className={`ranking-avatar ${
                              isGold ? 'ranking-avatar-gold' : 
                              isSilver ? 'ranking-avatar-silver' : 
                              isBronze ? 'ranking-avatar-bronze' : ''
                            }`}
                          />
                          {freelancer.isPro && (
                            <div className="ranking-badge-overlay">
                              <Medal size={10} className="text-[#9f4bff]" fill="currentColor" />
                            </div>
                          )}
                        </div>
                        <div className="ranking-text-details">
                          <span className="ranking-name">{freelancer.name}</span>
                          <span className="ranking-role">{freelancer.role}</span>
                        </div>
                      </div>
                      <div className="ranking-elo">
                        <span className="ranking-elo-value">{freelancer.elo}</span>
                        <span className="ranking-elo-label">Elo</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
