import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Calendar,
  Briefcase,
  Sparkles,
  Bookmark,
  Building2,
  Tag,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { TopNav } from '../../../shared/components/TopNav';
import { Footer } from '../../../shared/components/Footer';
import { AuthInviteModal } from '../../../shared/components/AuthInviteModal';
import { useApp } from '../../../app/providers/AppProvider';
import { publicMarketplaceAPI, type PublicJobPostSummaryDto } from '../../../api/publicAPI/GET';

const PAGE_SIZE = 10;

export default function PublicJobPostsScreen() {
  const navigate = useNavigate();
  const { user } = useApp();

  const [jobs, setJobs] = useState<PublicJobPostSummaryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  
  // Auth invite modal state for guest actions
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTargetName, setAuthModalTargetName] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const loadJobs = async () => {
      setLoading(true);
      try {
        const res = await publicMarketplaceAPI.getPublicJobPosts({
          page: 1,
          pageSize: 100,
          search: search.trim() || undefined,
        });

        if (res.success && res.data && isMounted) {
          setJobs(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load public job posts:', err);
        if (isMounted) setJobs([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(loadJobs, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [search]);

  // Reset page when search changes
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const totalPages = Math.ceil(jobs.length / PAGE_SIZE) || 1;

  const paginatedJobs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return jobs.slice(start, start + PAGE_SIZE);
  }, [jobs, page]);

  const handleGuestAction = (actionType: 'apply' | 'save' | 'view', jobTitle: string) => {
    if (user) {
      if (actionType === 'apply' || actionType === 'view') navigate('/jobs');
      return;
    }
    setAuthModalTargetName(jobTitle);
    setAuthModalOpen(true);
  };

  const formatBudget = (min?: number | null, max?: number | null) => {
    if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()} USD`;
    if (min) return `From $${min.toLocaleString()} USD`;
    if (max) return `Up to $${max.toLocaleString()} USD`;
    return 'Fixed / Negotiable';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      <TopNav />

      {/* Hero Header */}
      <div className="relative pt-28 pb-14 px-4 sm:px-8 overflow-hidden bg-gradient-to-b from-indigo-500/10 via-background to-background border-b border-border/40">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-indigo-500/5 blur-[120px]" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-foreground border border-border/60 shadow-sm backdrop-blur-md">
            <Sparkles className="size-3.5 text-primary animate-pulse" />
            <span>Public Job Marketplace</span>
          </div>

          <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground max-w-3xl">
            Discover Public <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">Freelance Opportunities</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl">
            Browse active client listings, competitive budgets, and high-impact software, design, and consulting projects.
          </p>

          {/* Clean Search Bar */}
          <div className="mt-8 w-full max-w-2xl bg-card/90 border border-border/80 p-2 rounded-2xl shadow-xl backdrop-blur-xl">
            <div className="relative flex items-center">
              <Search className="absolute left-4 size-5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search job titles, required skills, or keywords..."
                className="w-full bg-transparent pl-12 pr-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Directory Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-10">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Briefcase className="size-4 text-primary" />
            <span>Showing {jobs.length} Active Public Job Listings (Page {page} of {totalPages})</span>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-secondary/30 border border-border/40 animate-pulse" />
            ))}
          </div>
        ) : paginatedJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-secondary/20 border border-border/50">
            <Briefcase className="size-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-bold text-foreground">No Jobs Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              Try adjusting your search terms to discover more job posts.
            </p>
          </div>
        ) : (
          <>
            {/* Grid Layout - 10 Cards per page */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paginatedJobs.map((job) => (
                <div
                  key={job.jobPostsId}
                  className="group relative flex flex-col justify-between rounded-2xl bg-card border border-border/70 p-6 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300 backdrop-blur-md"
                >
                  <div className="space-y-3">
                    {/* Category & Date Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {job.majorName && (
                        <span className="rounded-full bg-primary/10 px-3 py-1 font-bold text-primary border border-primary/20 flex items-center gap-1">
                          <Tag className="size-3" /> {job.majorName}
                        </span>
                      )}

                      {job.categoryName && (
                        <span className="rounded-full bg-secondary px-3 py-1 font-semibold text-foreground border border-border/60">
                          {job.categoryName}
                        </span>
                      )}

                      <span className="text-muted-foreground flex items-center gap-1 font-medium ml-auto">
                        <Calendar className="size-3.5" /> {formatDate(job.createdAt)}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3
                      onClick={() => handleGuestAction('view', job.title)}
                      className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors cursor-pointer line-clamp-2"
                    >
                      {job.title}
                    </h3>

                    {job.descriptionPreview && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {job.descriptionPreview}
                      </p>
                    )}

                    {/* Skill Badges & Client Info */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {job.clientFullName && (
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium mr-2">
                          <Building2 className="size-3.5 text-muted-foreground" />
                          <span>{job.clientFullName}</span>
                        </div>
                      )}

                      {job.skillNames && job.skillNames.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {job.skillNames.slice(0, 4).map((skill, idx) => (
                            <span
                              key={idx}
                              className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-mono font-medium text-foreground border border-border/60"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.skillNames.length > 4 && (
                            <span className="text-[10px] font-mono text-muted-foreground px-1 py-0.5">
                              +{job.skillNames.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Budget & Actions */}
                  <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Estimated Budget</span>
                      <p className="text-sm sm:text-base font-mono font-bold text-foreground">
                        {formatBudget(job.budgetMin, job.budgetMax)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleGuestAction('save', job.title)}
                        className="p-2.5 rounded-xl bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Save Job"
                      >
                        <Bookmark className="size-4" />
                      </button>

                      <button
                        onClick={() => handleGuestAction('apply', job.title)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background shadow-md hover:scale-[1.02] active:scale-95 transition-all min-h-[44px]"
                      >
                        <span>Apply</span>
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-3">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary/80 border border-border/70 text-xs font-bold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-all min-h-[44px]"
                >
                  <ChevronLeft className="size-4" />
                  <span>Trang trước</span>
                </button>

                <div className="px-4 py-2 rounded-xl bg-card border border-border/60 text-xs font-mono font-bold text-foreground">
                  Trang {page} / {totalPages}
                </div>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary/80 border border-border/70 text-xs font-bold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-all min-h-[44px]"
                >
                  <span>Trang sau</span>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Guest Invitation Modal */}
      <AuthInviteModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title="Tham gia GigBridge ngay"
        description={`Đăng nhập hoặc tạo tài khoản để ứng tuyển vào công việc ${authModalTargetName || ''}.`}
      />
    </div>
  );
}
