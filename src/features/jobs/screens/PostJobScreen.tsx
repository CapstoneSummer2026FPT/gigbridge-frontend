import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Bot, ChevronRight, FileText, Pencil, Sparkles } from 'lucide-react';
import { jobAPI } from '../../../api/jobAPI';
import { AppLayout } from '../../../shared/components/AppLayout';
import type { GetMyJobPostDto } from '../../../types/models/Job';
import { PostJobDraftModal } from '../components/PostJobDraftModal';
import type { PostJobRouteState } from '../hooks/usePostJob';
import '../styles/PostJobScreen.css';

export function PostJobScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as PostJobRouteState | null;
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [drafts, setDrafts] = useState<GetMyJobPostDto[]>([]);
  const [isDraftsLoading, setIsDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);

  useEffect(() => {
    if (routeState?.jobPostId || routeState?.jobData) {
      navigate('/jobs/post/details', { replace: true, state: routeState });
    }
  }, [navigate, routeState]);

  const loadDrafts = async (): Promise<void> => {
    setIsDraftModalOpen(true);
    setIsDraftsLoading(true);
    setDraftsError(null);

    const response = await jobAPI.getMyDraftJobPosts();
    setIsDraftsLoading(false);

    if (!response.success || !response.data) {
      setDrafts([]);
      setDraftsError(response.message || 'Unable to load draft JobPosts.');
      return;
    }

    setDrafts(response.data);
  };

  const handleContinueDraft = (draft: GetMyJobPostDto): void => {
    setIsDraftModalOpen(false);
    navigate('/jobs/post/details', { state: { jobPostId: draft.jobPostsId } satisfies PostJobRouteState });
  };

  const handleCreateNew = (): void => {
    setIsDraftModalOpen(false);
    navigate('/jobs/post/details', { replace: true, state: null });
  };

  return (
    <AppLayout>
      <div className="max-w-[1180px] mx-auto px-6 py-8 relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.02),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.02),transparent_50%)] opacity-50 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4 border-b border-border pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground uppercase" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", letterSpacing: '0.05em' }}>
              Create New Job Post
            </h1>
            <p className="text-sm text-muted-foreground mt-2">Choose how you want to start this JobPost.</p>
          </div>
          <button
            type="button"
            onClick={loadDrafts}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all shadow-sm cursor-pointer border border-border bg-background hover:bg-muted text-foreground"
          >
            <FileText size={14} />
            Continue Draft
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <button
            type="button"
            onClick={() => navigate('/jobs/post/details', { state: null })}
            className="bg-card border border-border rounded-2xl p-7 text-left shadow-sm hover:border-[var(--gb-cyan)]/50 hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)] flex items-center justify-center mb-5">
              <Pencil size={22} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">Manual</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Fill Job Details yourself, then add Interview Questions on the next screen.
                </p>
              </div>
              <ChevronRight size={20} className="text-muted-foreground group-hover:text-[var(--gb-cyan)] group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/jobs/post/ai')}
            className="bg-card border border-[var(--gb-purple)]/20 rounded-2xl p-7 text-left shadow-sm hover:border-[var(--gb-purple)]/50 hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[var(--gb-purple)]/15 to-[var(--gb-cyan)]/15 text-[var(--gb-purple)] flex items-center justify-center mb-5 relative">
              <Bot size={22} />
              <Sparkles size={12} className="absolute right-2 top-2 text-[var(--gb-cyan)]" />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">AI</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Describe what you need. GigBridge AI will prepare Job Details for you to review.
                </p>
              </div>
              <ChevronRight size={20} className="text-muted-foreground group-hover:text-[var(--gb-purple)] group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>

        <PostJobDraftModal
          isOpen={isDraftModalOpen}
          drafts={drafts}
          isLoading={isDraftsLoading}
          error={draftsError}
          onClose={() => setIsDraftModalOpen(false)}
          onContinueDraft={handleContinueDraft}
          onCreateNew={handleCreateNew}
        />
      </div>
    </AppLayout>
  );
}
