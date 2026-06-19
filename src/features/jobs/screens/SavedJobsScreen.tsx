import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bookmark, Briefcase, Clock, DollarSign, Globe } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { MOCK_BROWSE_JOBS } from '../mock/data-for-BrowseJobsScreen';
import '../styles/browse-jobs-screen.css';

export default function SavedJobsScreen() {
  const navigate = useNavigate();
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem('gb_saved_jobs');
    setSavedIds(stored ? JSON.parse(stored) : []);
  }, []);

  const savedJobs = useMemo(() => MOCK_BROWSE_JOBS.filter(job => savedIds.includes(job.id)), [savedIds]);

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
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            Saved <span className="text-blue-600 black:text-blue-400 italic font-light">Jobs</span>
          </h1>
          <p className="browse-jobs-desc">Jobs you bookmarked for later review.</p>
        </div>

        {savedJobs.length === 0 ? (
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
