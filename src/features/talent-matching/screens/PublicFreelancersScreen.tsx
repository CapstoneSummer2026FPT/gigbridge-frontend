import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Star,
  MapPin,
  Briefcase,
  Sparkles,
  UserCheck,
  Bookmark,
  Send,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { TopNav } from '../../../shared/components/TopNav';
import { Footer } from '../../../shared/components/Footer';
import { AuthInviteModal } from '../../../shared/components/AuthInviteModal';
import { useApp } from '../../../app/providers/AppProvider';
import { publicMarketplaceAPI, type PublicFreelancerSummaryDto } from '../../../api/publicAPI/GET';

const PAGE_SIZE = 10;

export default function PublicFreelancersScreen() {
  const navigate = useNavigate();
  const { user } = useApp();

  const [freelancers, setFreelancers] = useState<PublicFreelancerSummaryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  
  // Auth invite modal state for guest actions
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTargetName, setAuthModalTargetName] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const loadFreelancers = async () => {
      setLoading(true);
      try {
        const res = await publicMarketplaceAPI.getPublicFreelancers({
          page,
          pageSize: PAGE_SIZE,
          search: search.trim() || undefined,
        });

        if (res.success && res.data && isMounted) {
          setFreelancers(res.data.items || []);
          setTotalCount(res.data.totalCount || 0);
        }
      } catch (err) {
        console.error('Failed to load public freelancers:', err);
        if (isMounted) setFreelancers([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(loadFreelancers, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [search, page]);

  // Reset to page 1 on new search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handleGuestAction = (actionType: 'hire' | 'save' | 'contact', freelancerName: string) => {
    if (user) {
      if (actionType === 'hire') navigate('/client/post-job');
      return;
    }
    setAuthModalTargetName(freelancerName);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      <TopNav />

      {/* Hero Header */}
      <div className="relative pt-28 pb-14 px-4 sm:px-8 overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background border-b border-border/40">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-primary/5 blur-[120px]" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-foreground border border-border/60 shadow-sm backdrop-blur-md">
            <Sparkles className="size-3.5 text-primary animate-pulse" />
            <span>Public Freelancer Directory</span>
          </div>

          <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground max-w-3xl">
            Hire World-Class <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">Freelance Experts</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl">
            Explore verified talent, review skills, and connect with premier software engineers, designers, and domain specialists.
          </p>

          {/* Clean Search Input Bar */}
          <div className="mt-8 w-full max-w-2xl bg-card/90 border border-border/80 p-2 rounded-2xl shadow-xl backdrop-blur-xl">
            <div className="relative flex items-center">
              <Search className="absolute left-4 size-5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search freelancers by name, skills, title, or keywords..."
                className="w-full bg-transparent pl-12 pr-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Marketplace Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-10">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserCheck className="size-4 text-primary" />
            <span>Showing {freelancers.length} of {totalCount} Freelancers (Page {page} of {totalPages})</span>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-secondary/30 border border-border/40 animate-pulse" />
            ))}
          </div>
        ) : freelancers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-secondary/20 border border-border/50">
            <UserCheck className="size-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-bold text-foreground">No Freelancers Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              Try adjusting your search terms to discover active freelancers.
            </p>
          </div>
        ) : (
          <>
            {/* Grid Layout - 10 Cards per page */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {freelancers.map((freelancer) => (
                <div
                  key={freelancer.userId}
                  className="group relative flex flex-col justify-between rounded-2xl bg-card border border-border/70 p-6 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300 backdrop-blur-md"
                >
                  <div>
                    {/* Top Header: Avatar & Status */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {freelancer.userAvatar ? (
                          <img
                            src={freelancer.userAvatar}
                            alt={freelancer.userFullName || 'Freelancer Avatar'}
                            className="size-12 rounded-full object-cover border border-border shadow-sm"
                          />
                        ) : (
                          <div className="size-12 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm shadow-md">
                            {(freelancer.userFullName || 'F').substring(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-foreground text-base tracking-tight group-hover:text-primary transition-colors">
                              {freelancer.userFullName || 'Freelancer'}
                            </h3>
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 font-medium">
                            {freelancer.title || freelancer.majorName || 'Freelance Expert'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleGuestAction('save', freelancer.userFullName || 'this profile')}
                        className="p-2 rounded-full bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                        title="Save Profile"
                      >
                        <Bookmark className="size-4" />
                      </button>
                    </div>

                    {/* Rating & Location Info */}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-3 border-t border-border/40">
                      <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                        <Star className="size-3.5 text-amber-400 fill-amber-400" />
                        <span>{(freelancer.rating ?? 5.0).toFixed(1)}</span>
                      </div>

                      {freelancer.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          <span className="line-clamp-1">{freelancer.location}</span>
                        </div>
                      )}

                      {freelancer.majorName && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="size-3.5" />
                          <span className="line-clamp-1">{freelancer.majorName}</span>
                        </div>
                      )}
                    </div>

                    {/* Bio Preview */}
                    {freelancer.bio && (
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {freelancer.bio}
                      </p>
                    )}

                    {/* Skill Badges */}
                    {freelancer.skills && freelancer.skills.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {freelancer.skills.slice(0, 4).map((skill, idx) => (
                          <span
                            key={idx}
                            className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-mono font-medium text-foreground border border-border/60"
                          >
                            {skill.skillName}
                          </span>
                        ))}
                        {freelancer.skills.length > 4 && (
                          <span className="text-[10px] font-mono text-muted-foreground px-1 py-0.5">
                            +{freelancer.skills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-2">
                    <button
                      onClick={() => handleGuestAction('hire', freelancer.userFullName || 'this freelancer')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background shadow-md hover:scale-[1.02] active:scale-95 transition-all min-h-[44px]"
                    >
                      <Send className="size-3.5" />
                      <span>Invite to Job</span>
                    </button>

                    <button
                      onClick={() => handleGuestAction('contact', freelancer.userFullName || 'this freelancer')}
                      className="inline-flex items-center justify-center rounded-xl bg-secondary/80 border border-border/70 px-3 py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-all min-h-[44px]"
                    >
                      Contact
                    </button>
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
        description={`Đăng nhập hoặc tạo tài khoản để tương tác với ${authModalTargetName || 'freelancer'}.`}
      />
    </div>
  );
}
