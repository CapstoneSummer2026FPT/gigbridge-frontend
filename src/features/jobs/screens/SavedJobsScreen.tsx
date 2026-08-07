import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  Clock,
  Globe,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import { savedJobAPI } from '../../../api/savedJobAPI';
import type { SavedJobDto } from '../../../types/savedJob';
import { GigCoinBudget } from '../../../shared/components/GigCoinAmount';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { useTranslation } from '../../../hooks/useTranslation';

const getSavedJobPostId = (job: SavedJobDto): string => job.jobPostId ?? job.jobPostsId ?? '';

const getSavedJobSkillNames = (job: SavedJobDto): string[] => [
  ...(job.skillNames || []),
  ...(job.skills || []).map(skill => skill.name || skill.skillName || '').filter(Boolean),
];

const formatDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

type SortOption = 'newest' | 'oldest' | 'budget';

export default function SavedJobsScreen() {
  const { t } = useTranslation(['jobs', 'common']);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [savedJobs, setSavedJobs] = useState<SavedJobDto[]>([]);
  const [removingJobIds, setRemovingJobIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  useEffect(() => {
    let isMounted = true;

    const fetchSavedJobs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const jobs = await savedJobAPI.getMySavedJobs();
        if (isMounted) setSavedJobs(jobs);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : t('savedJobs.noSavedJobs');
        console.error('Failed to load saved jobs:', err);
        setError(message);
        setSavedJobs([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSavedJobs();

    return () => {
      isMounted = false;
    };
  }, [t]);

  // GSAP Entrance animation
  usePageGSAP({
    containerRef,
    loading: isLoading,
    groups: [
      { selector: '.sjs-gsap-header', y: 20, duration: 0.55 },
      { selector: '.sjs-gsap-filter', y: 14, duration: 0.45 },
      { selector: '.sjs-gsap-card', y: 24, duration: 0.5, stagger: 0.08 },
    ],
  });

  const removeSavedJob = async (job: SavedJobDto) => {
    const jobPostId = getSavedJobPostId(job);
    if (!jobPostId) {
      toast.error(t('savedJobs.unsaveError', { defaultValue: 'This saved job cannot be removed.' }));
      return;
    }

    setRemovingJobIds(prev => new Set(prev).add(jobPostId));

    try {
      await savedJobAPI.unsaveJob(jobPostId);
      setSavedJobs(prev => prev.filter(savedJob => getSavedJobPostId(savedJob) !== jobPostId));
      toast.success(t('savedJobs.removedToast'));
    } catch (err) {
      console.error('Failed to remove saved job:', err);
      toast.error(err instanceof Error ? err.message : t('savedJobs.removeFailed', { defaultValue: 'Could not remove saved job.' }));
    } finally {
      setRemovingJobIds(prev => {
        const next = new Set(prev);
        next.delete(jobPostId);
        return next;
      });
    }
  };

  // Filtered & Sorted Jobs
  const filteredJobs = useMemo(() => {
    let result = [...savedJobs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(job => {
        const titleMatch = (job.title || '').toLowerCase().includes(q);
        const descMatch = (job.description || job.descriptionPreview || '').toLowerCase().includes(q);
        const categoryMatch = (job.categoryName || '').toLowerCase().includes(q);
        const skillsMatch = getSavedJobSkillNames(job).some(s => s.toLowerCase().includes(q));
        return titleMatch || descMatch || categoryMatch || skillsMatch;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        const dateA = new Date(a.savedAt || a.jobCreatedAt || 0).getTime();
        const dateB = new Date(b.savedAt || b.jobCreatedAt || 0).getTime();
        return dateB - dateA;
      }
      if (sortBy === 'oldest') {
        const dateA = new Date(a.savedAt || a.jobCreatedAt || 0).getTime();
        const dateB = new Date(b.savedAt || b.jobCreatedAt || 0).getTime();
        return dateA - dateB;
      }
      if (sortBy === 'budget') {
        const budgetA = a.budgetMax || a.budgetMin || 0;
        const budgetB = b.budgetMax || b.budgetMin || 0;
        return budgetB - budgetA;
      }
      return 0;
    });

    return result;
  }, [savedJobs, searchQuery, sortBy]);

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
          <LemniscateBloomLoader label={t('savedJobs.loading', { defaultValue: 'Đang tải công việc đã lưu...' })} tag="Saved Jobs" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div ref={containerRef} className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:py-8">

        {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
        <div className="sjs-gsap-header mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
              {t('savedJobs.titleWord1')} <span className="text-brand italic font-light">{t('savedJobs.titleWord2')}</span>
            </h1>
            <p className="mt-1 text-sm font-semibold text-text-secondary">
              {t('savedJobs.subtitle')}
            </p>
          </div>

          {/* Stats Badge */}
          <div
            className="flex items-center gap-2.5 rounded-2xl border border-border bg-background p-3 px-4 shadow-sm shrink-0"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Bookmark size={18} fill="currentColor" />
            </div>
            <div>
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                Tổng số lưu
              </span>
              <span className="text-base font-black text-text-primary">
                {t('savedJobs.totalSaved', { count: savedJobs.length })}
              </span>
            </div>
          </div>
        </div>

        {/* ── Search & Filter Controls ───────────────────────────────────────── */}
        {savedJobs.length > 0 && (
          <div className="sjs-gsap-filter mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('savedJobs.searchPlaceholder')}
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-9 text-sm text-text-primary transition-all placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Sort Control */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-text-muted shrink-0" />
              <span className="text-xs font-bold text-text-muted shrink-0">{t('savedJobs.sortBy')}:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-text-primary transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"
              >
                <option value="newest">{t('savedJobs.sortNewest')}</option>
                <option value="oldest">{t('savedJobs.sortOldest')}</option>
                <option value="budget">{t('savedJobs.sortBudget')}</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Main Content ────────────────────────────────────────────────────── */}
        {error ? (
          /* Error State */
          <div className="rounded-3xl border border-border bg-background p-10 text-center shadow-sm">
            <Bookmark size={44} className="mx-auto mb-3 text-text-muted" />
            <p className="text-base font-bold text-text-primary mb-2">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/jobs/browse')}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
              style={{ background: 'var(--brand)', boxShadow: '0 4px 16px -2px rgba(73,75,231,0.3)' }}
            >
              <Briefcase size={14} /> {t('savedJobs.browseJobs')}
            </button>
          </div>
        ) : savedJobs.length === 0 ? (
          /* Empty State */
          <div className="sjs-gsap-header rounded-3xl border border-border bg-background p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Bookmark size={32} />
            </div>
            <h2 className="text-xl font-black text-text-primary mb-2">
              {t('savedJobs.noSavedJobs')}
            </h2>
            <p className="mx-auto max-w-md text-xs font-medium leading-relaxed text-text-secondary mb-6">
              {t('savedJobs.noSavedJobsDesc')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/jobs/browse')}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
              style={{
                background: 'var(--brand)',
                boxShadow: '0 6px 20px -4px rgba(73,75,231,0.35)',
              }}
            >
              <Briefcase size={15} /> {t('savedJobs.browseJobs')}
            </button>
          </div>
        ) : filteredJobs.length === 0 ? (
          /* Search Filter Empty State */
          <div className="rounded-2xl border border-border bg-surface-muted/50 p-8 text-center">
            <Search size={32} className="mx-auto mb-2 text-text-muted" />
            <p className="text-sm font-bold text-text-primary">Không tìm thấy công việc phù hợp với từ khóa "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs font-bold text-brand hover:underline"
            >
              Xóa từ khóa tìm kiếm
            </button>
          </div>
        ) : (
          /* Saved Job Cards List */
          <div className="space-y-4">
            {filteredJobs.map(job => {
              const jobPostId = getSavedJobPostId(job);
              const isRemoving = removingJobIds.has(jobPostId);
              const skillNames = getSavedJobSkillNames(job);

              return (
                <div
                  key={jobPostId || job.savedJobId || job.savedJobsId}
                  className="sjs-gsap-card rounded-2xl border border-border bg-background p-5 md:p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-brand/30"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                    {/* Left Details */}
                    <div className="min-w-0 flex-1 space-y-3">
                      {/* Badges & Title */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {job.categoryName && (
                            <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-0.5 text-[10px] font-extrabold text-brand uppercase tracking-wider">
                              {job.categoryName}
                            </span>
                          )}
                          {job.majorName && (
                            <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                              {job.majorName}
                            </span>
                          )}
                        </div>

                        <h2
                          onClick={() => jobPostId && navigate(`/jobs/${jobPostId}`)}
                          className="text-base font-bold text-text-primary hover:text-brand transition-colors cursor-pointer leading-snug tracking-tight"
                        >
                          {job.title}
                        </h2>
                      </div>

                      {/* Description preview */}
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                        {job.description || job.descriptionPreview || 'Không có mô tả chi tiết.'}
                      </p>

                      {/* Skills Tags */}
                      {skillNames.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {skillNames.map(skill => (
                            <span
                              key={skill}
                              className="rounded-lg border border-border bg-surface-muted/70 px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:border-brand/30 hover:text-brand"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold text-text-muted">
                        <span className="flex items-center gap-1.5 text-brand font-bold">
                          <GigCoinBudget min={job.budgetMin} max={job.budgetMax} />
                        </span>

                        <span className="flex items-center gap-1">
                          <Globe size={13} className="text-text-muted" />
                          {job.estimatedDuration || 'Linh hoạt'}
                        </span>

                        {job.jobCreatedAt && (
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="text-text-muted" />
                            {t('savedJobs.postedAt', { date: formatDate(job.jobCreatedAt) })}
                          </span>
                        )}

                        {job.savedAt && (
                          <span className="flex items-center gap-1 text-text-secondary">
                            <Bookmark size={13} fill="currentColor" className="text-brand" />
                            {t('savedJobs.savedAt', { date: formatDate(job.savedAt) })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 justify-end md:justify-start w-full md:w-36 pt-2 md:pt-0 border-t border-border/50 md:border-t-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/jobs/${jobPostId}`)}
                        disabled={!jobPostId}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold text-white transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-50"
                        style={{
                          background: 'var(--brand)',
                          boxShadow: '0 4px 14px -2px rgba(73,75,231,0.3)',
                        }}
                      >
                        {t('savedJobs.viewDetails')}
                        <ArrowRight size={14} />
                      </button>

                      {/* Unsave button with thick Mint & Brand gradient border */}
                      <button
                        type="button"
                        onClick={() => removeSavedJob(job)}
                        disabled={isRemoving || !jobPostId}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-text-secondary hover:text-rose-500 transition-all disabled:opacity-50 cursor-pointer"
                        style={{
                          background: 'linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(135deg, var(--brand), var(--mint)) border-box',
                          border: '2px solid transparent',
                        }}
                      >
                        <Bookmark size={13} fill="currentColor" className="text-brand shrink-0" />
                        <span>{isRemoving ? t('savedJobs.removing') : t('savedJobs.unsave')}</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
