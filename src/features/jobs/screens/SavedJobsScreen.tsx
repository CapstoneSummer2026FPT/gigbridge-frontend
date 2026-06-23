import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bookmark, Briefcase, Clock, DollarSign, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import { savedJobAPI } from '../../../api/savedJobAPI';
import type { SavedJobDto } from '../../../types/savedJob';
import '../styles/browse-jobs-screen.css';

const getSavedJobPostId = (job: SavedJobDto): string => job.jobPostId ?? job.jobPostsId ?? '';

const getSavedJobSkillNames = (job: SavedJobDto): string[] => [
  ...(job.skillNames || []),
  ...(job.skills || []).map(skill => skill.name || skill.skillName || '').filter(Boolean),
];

const formatDate = (value?: string): string => {
  if (!value) return 'Not specified';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export default function SavedJobsScreen() {
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState<SavedJobDto[]>([]);
  const [removingJobIds, setRemovingJobIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const message = err instanceof Error ? err.message : 'Unable to load saved jobs.';
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
  }, []);

  const removeSavedJob = async (job: SavedJobDto) => {
    const jobPostId = getSavedJobPostId(job);
    if (!jobPostId) {
      toast.error('This saved job cannot be removed yet.');
      return;
    }

    setRemovingJobIds(prev => new Set(prev).add(jobPostId));

    try {
      await savedJobAPI.unsaveJob(jobPostId);
      setSavedJobs(prev => prev.filter(savedJob => getSavedJobPostId(savedJob) !== jobPostId));
      toast.success('Saved job removed.');
    } catch (err) {
      console.error('Failed to remove saved job:', err);
      toast.error(err instanceof Error ? err.message : 'Saved job could not be removed.');
    } finally {
      setRemovingJobIds(prev => {
        const next = new Set(prev);
        next.delete(jobPostId);
        return next;
      });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            Saved <span className="text-blue-600 black:text-blue-400 italic font-light">Jobs</span>
          </h1>
          <p className="browse-jobs-desc">Jobs you bookmarked for later review.</p>
        </div>

        {isLoading ? (
          <div className="text-center py-20 glass-card">
            <p className="text-primary font-semibold mb-2">Loading saved jobs...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 glass-card">
            <Bookmark size={44} className="mx-auto mb-4 browse-jobs-job-meta" />
            <p className="text-primary font-semibold mb-2">{error}</p>
            <button className="btn-cyan px-4 py-2 text-sm" onClick={() => navigate('/jobs/browse')}>Browse Jobs</button>
          </div>
        ) : savedJobs.length === 0 ? (
          <div className="text-center py-20 glass-card">
            <Bookmark size={44} className="mx-auto mb-4 browse-jobs-job-meta" />
            <p className="text-primary font-semibold mb-2">You have not saved any jobs yet.</p>
            <button className="btn-cyan px-4 py-2 text-sm" onClick={() => navigate('/jobs/browse')}>Browse Jobs</button>
          </div>
        ) : (
          <div className="space-y-4">
            {savedJobs.map(job => {
              const jobPostId = getSavedJobPostId(job);
              const isRemoving = removingJobIds.has(jobPostId);

              return (
              <div key={jobPostId || job.savedJobId || job.savedJobsId} className="glass-card p-5 browse-jobs-job-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="text-primary font-semibold">{job.title}</h2>
                      {job.categoryName && <span className="badge-cyan text-xs">{job.categoryName}</span>}
                      {job.majorName && <span className="badge-purple text-xs">{job.majorName}</span>}
                    </div>
                    <p className="text-sm browse-jobs-job-meta mb-3">{job.description || job.descriptionPreview || 'No description provided.'}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {getSavedJobSkillNames(job).map(skill => <span key={skill} className="tag-pill">{skill}</span>)}
                      {(job.customSkillNames || []).map(skill => <span key={skill} className="tag-pill">{skill} (custom)</span>)}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs browse-jobs-job-meta">
                      <span className="flex items-center gap-1"><DollarSign size={12} />{job.currency || '$'}{job.budgetMin ?? 0} - {job.currency || '$'}{job.budgetMax ?? 0}</span>
                      <span className="flex items-center gap-1"><Globe size={12} />{job.estimatedDuration || 'Duration not specified'}</span>
                      <span className="flex items-center gap-1"><Clock size={12} />Posted {formatDate(job.jobCreatedAt)}</span>
                      <span>Saved {formatDate(job.savedAt)}</span>
                      {typeof job.status === 'number' && <span>Status: {job.status}</span>}
                      {typeof job.visibility === 'number' && <span>Visibility: {job.visibility}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="btn-ghost-cyan px-3 py-2 text-xs" onClick={() => navigate(`/jobs/${jobPostId}`)} disabled={!jobPostId}>
                      <Briefcase size={14} /> View
                    </button>
                    <button
                      className="btn-ghost-cyan px-3 py-2 text-xs disabled:opacity-60"
                      onClick={() => removeSavedJob(job)}
                      disabled={isRemoving || !jobPostId}
                    >
                      <Bookmark size={14} fill="currentColor" /> {isRemoving ? 'Removing...' : 'Unsave'}
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
