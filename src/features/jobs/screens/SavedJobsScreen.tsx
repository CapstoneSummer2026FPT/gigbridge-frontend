import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bookmark, Briefcase, Clock, DollarSign, Globe } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import type { Job } from '../../../types/models/Job';
import '../styles/browse-jobs-screen.css';

export default function SavedJobsScreen() {
  const navigate = useNavigate();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = window.localStorage.getItem('gb_saved_jobs');
    setSavedIds(stored ? JSON.parse(stored) : []);
  }, []);

  useEffect(() => {
    const fetchSavedJobs = async () => {
      try {
        setLoading(true);
        setError('');

        const results = await Promise.allSettled(savedIds.map(id => jobGetAPI.getJobById(id)));
        const jobs = results
          .filter((result): result is PromiseFulfilledResult<{ job: Job; client: null; clientProfile: null }> => result.status === 'fulfilled')
          .map(result => result.value.job);

        setSavedJobs(jobs);
      } catch (error) {
        console.error('Failed to load saved jobs:', error);
        setError('Failed to load saved jobs.');
        setSavedJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedJobs();
  }, [savedIds]);

  const toggleSave = (jobId: string) => {
    setSavedIds(prev => {
      const next = prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId];
      window.localStorage.setItem('gb_saved_jobs', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-primary mb-2">Saved Jobs</h1>
          <p className="browse-jobs-desc">Jobs you bookmarked for later review.</p>
        </div>

        {loading ? (
          <div className="text-center py-20 glass-card">
            <Bookmark size={44} className="mx-auto mb-4 browse-jobs-job-meta" />
            <p className="text-primary font-semibold mb-2">Loading saved jobs...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 glass-card">
            <Bookmark size={44} className="mx-auto mb-4 browse-jobs-job-meta" />
            <p className="text-primary font-semibold mb-2">{error}</p>
          </div>
        ) : savedJobs.length === 0 ? (
          <div className="text-center py-20 glass-card">
            <Bookmark size={44} className="mx-auto mb-4 browse-jobs-job-meta" />
            <p className="text-primary font-semibold mb-2">No saved jobs yet</p>
            <button className="btn-cyan px-4 py-2 text-sm" onClick={() => navigate('/jobs/browse')}>Browse Jobs</button>
          </div>
        ) : (
          <div className="space-y-4">
            {savedJobs.map(job => (
              <div key={job.id} className="glass-card p-5 browse-jobs-job-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="text-primary font-semibold">{job.title}</h2>
                      <span className={`job-detail-status job-detail-status-${job.status === 'cancelled' ? 'closed' : job.status}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm browse-jobs-job-meta mb-3">{job.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs browse-jobs-job-meta">
                      <span className="flex items-center gap-1"><DollarSign size={12} />${job.budgetMin} - ${job.budgetMax}</span>
                      <span className="flex items-center gap-1"><Globe size={12} />Remote</span>
                      <span className="flex items-center gap-1"><Clock size={12} />{job.postedAt}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="btn-ghost-cyan px-3 py-2 text-xs" onClick={() => navigate(`/jobs/${job.id}`, { state: { job } })}>
                      <Briefcase size={14} /> View
                    </button>
                    <button className="btn-ghost-cyan px-3 py-2 text-xs" onClick={() => toggleSave(job.id)}>
                      <Bookmark size={14} fill="currentColor" /> Unsave
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
