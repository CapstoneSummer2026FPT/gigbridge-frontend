import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Briefcase, Calendar, DollarSign, Send, Timer } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import type { Job } from '../../../types/models/Job';
import '../styles/create-proposal-screen.css';

type ProposalForm = {
  coverLetter: string;
  proposedRate: string;
  proposedDuration: string;
};

const initialForm: ProposalForm = {
  coverLetter: '',
  proposedRate: '',
  proposedDuration: '',
};

export default function CreateProposalScreen() {
  const { jobPostId } = useParams<{ jobPostId: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [form, setForm] = useState<ProposalForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProposalForm | 'jobPostId', string>>>({});

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobPostId) {
        setError('Invalid job post.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await jobGetAPI.getJobById(jobPostId);
        setJob(response.job);
      } catch (err) {
        console.error('Failed to load job for proposal:', err);
        setError('Failed to load job details.');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobPostId]);

  const ratePreview = useMemo(() => {
    const value = Number(form.proposedRate);
    return value > 0 ? `$${value.toLocaleString()}` : 'Not set';
  }, [form.proposedRate]);

  const validate = () => {
    const nextErrors: Partial<Record<keyof ProposalForm | 'jobPostId', string>> = {};
    const proposedRate = Number(form.proposedRate);

    if (!jobPostId) {
      nextErrors.jobPostId = 'Job post is required.';
    }

    if (!form.coverLetter.trim()) {
      nextErrors.coverLetter = 'Cover letter is required.';
    } else if (form.coverLetter.trim().length < 50) {
      nextErrors.coverLetter = 'Cover letter must be at least 50 characters.';
    }

    if (!form.proposedRate.trim()) {
      nextErrors.proposedRate = 'Proposed rate is required.';
    } else if (!Number.isFinite(proposedRate) || proposedRate <= 0) {
      nextErrors.proposedRate = 'Proposed rate must be greater than 0.';
    }

    if (!form.proposedDuration.trim()) {
      nextErrors.proposedDuration = 'Proposed duration is required.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    setError('');

    if (!validate() || !jobPostId) return;

    try {
      setSubmitting(true);

      const response = await proposalPostAPI.createProposal({
        jobPostsId: jobPostId,
        coverLetter: form.coverLetter.trim(),
        proposedRate: Number(form.proposedRate),
        proposedDuration: form.proposedDuration.trim(),
      });

      if (!response.success || !response.data) {
        setError(response.message || 'Failed to submit proposal.');
        return;
      }

      navigate('/proposals');
    } catch (err) {
      console.error('Failed to submit proposal:', err);
      setError('Failed to submit proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="create-proposal-page">
          <div className="create-proposal-loading glass-card">Loading job details...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="create-proposal-page">
        <div className="create-proposal-header">
          <button className="create-proposal-back" type="button" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <p>Submit Proposal</p>
            <h1>{job?.title || 'Create Proposal'}</h1>
          </div>
        </div>

        <div className="create-proposal-layout">
          <section className="create-proposal-form glass-card">
            <div className="create-proposal-form-title">
              <Send size={18} />
              <div>
                <h2>Proposal Details</h2>
                <p>Write a focused application for this job.</p>
              </div>
            </div>

            {error && <div className="create-proposal-alert">{error}</div>}
            {fieldErrors.jobPostId && <div className="create-proposal-alert">{fieldErrors.jobPostId}</div>}

            <label className="create-proposal-field">
              <span>Cover Letter *</span>
              <textarea
                value={form.coverLetter}
                onChange={event => setForm(prev => ({ ...prev, coverLetter: event.target.value }))}
                placeholder="Explain your relevant experience, how you will approach the work, and why you are a good fit..."
                rows={12}
                className="input-gb"
              />
              <small className={fieldErrors.coverLetter ? 'error' : ''}>
                {fieldErrors.coverLetter || `${form.coverLetter.trim().length}/50 minimum characters`}
              </small>
            </label>

            <div className="create-proposal-field-grid">
              <label className="create-proposal-field">
                <span>Proposed Rate *</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.proposedRate}
                  onChange={event => setForm(prev => ({ ...prev, proposedRate: event.target.value }))}
                  placeholder="1200"
                  className="input-gb"
                />
                {fieldErrors.proposedRate && <small className="error">{fieldErrors.proposedRate}</small>}
              </label>

              <label className="create-proposal-field">
                <span>Proposed Duration *</span>
                <input
                  type="text"
                  value={form.proposedDuration}
                  onChange={event => setForm(prev => ({ ...prev, proposedDuration: event.target.value }))}
                  placeholder="e.g. 3 weeks"
                  className="input-gb"
                />
                {fieldErrors.proposedDuration && <small className="error">{fieldErrors.proposedDuration}</small>}
              </label>
            </div>

            <div className="create-proposal-actions">
              <button
                type="button"
                className="create-proposal-secondary"
                onClick={() => navigate(jobPostId ? `/jobs/${jobPostId}` : '/jobs/browse')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-cyan create-proposal-submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting Proposal...' : 'Submit Proposal'}
              </button>
            </div>
          </section>

          <aside className="create-proposal-summary glass-card">
            <div className="create-proposal-summary-title">
              <Briefcase size={18} />
              <h2>Job Summary</h2>
            </div>

            <div className="create-proposal-summary-row">
              <span>Budget</span>
              <strong>
                ${job?.budgetMin.toLocaleString() || 0} - ${job?.budgetMax.toLocaleString() || 0}
              </strong>
            </div>
            <div className="create-proposal-summary-row">
              <span>Type</span>
              <strong>{job?.jobType === 'hourly' ? 'Hourly Rate' : 'Fixed Price'}</strong>
            </div>
            <div className="create-proposal-summary-row">
              <span>Deadline</span>
              <strong>{job?.deadline || 'Flexible'}</strong>
            </div>
            <div className="create-proposal-summary-row">
              <span>Your rate</span>
              <strong>{ratePreview}</strong>
            </div>
            <div className="create-proposal-summary-row">
              <span>Duration</span>
              <strong>{form.proposedDuration || 'Not set'}</strong>
            </div>

            <div className="create-proposal-summary-icons">
              <div>
                <DollarSign size={16} />
                <span>{ratePreview}</span>
              </div>
              <div>
                <Timer size={16} />
                <span>{form.proposedDuration || 'Duration'}</span>
              </div>
              <div>
                <Calendar size={16} />
                <span>{job?.deadline || 'Flexible'}</span>
              </div>
            </div>

            {Boolean(job?.skills.length) && (
              <div className="create-proposal-skills">
                <span>Required Skills</span>
                <div>
                  {job?.skills.map(skill => (
                    <em key={skill}>{skill}</em>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
