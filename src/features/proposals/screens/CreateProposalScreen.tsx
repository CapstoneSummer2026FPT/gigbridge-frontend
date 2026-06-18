import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Briefcase, Calendar, DollarSign, FileText, Send, Timer } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobGetAPI, jobQuestionAPI } from '../../../api/jobAPI';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import { proposalPutAPI } from '../../../api/proposalAPI/PUT';
import type { Job } from '../../../types/models/Job';
import {
  ProposalStatus,
  type ProposalDetailDto,
} from '../../../types/models/Proposal';
import {
  buildProposalPayload,
  buildProposedDuration,
  durationUnits,
  parseProposedDuration,
  type DurationUnit,
  type ProposalFormState,
} from '../utils/proposalDraft';
import { getStatusLabel } from '../utils/statusHelpers';
import '../styles/create-proposal-screen.css';

const initialForm: ProposalFormState = {
  coverLetter: '',
  proposedRate: '',
  durationValue: '',
  durationUnit: 'week',
};

export default function CreateProposalScreen() {
  const { jobPostId, proposalId } = useParams<{ jobPostId?: string; proposalId?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(proposalId);

  const [job, setJob] = useState<Job | null>(null);
  const [proposal, setProposal] = useState<ProposalDetailDto | null>(null);
  const [existingNonDraftProposal, setExistingNonDraftProposal] = useState<ProposalDetailDto | null>(null);
  const [form, setForm] = useState<ProposalFormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingQuestions, setCheckingQuestions] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProposalFormState | 'jobPostId', string>>>({});

  const currentJobPostId = jobPostId || proposal?.jobPostId || '';

  useEffect(() => {
    const loadProposalForEdit = async () => {
      if (!proposalId) return;

      try {
        setLoading(true);
        setError('');

        const response = await proposalGetAPI.getProposalDetail(proposalId);

        if (!response.success || !response.data) {
          setError(response.message || 'Failed to load proposal.');
          return;
        }

        const detail = response.data;
        setProposal(detail);

        if (Number(detail.status) !== ProposalStatus.Draft) {
          setExistingNonDraftProposal(detail);
        }

        const duration = parseProposedDuration(detail.proposedDuration);
        setForm({
          coverLetter: detail.coverLetter || '',
          proposedRate: detail.proposedBudget ? String(detail.proposedBudget) : '',
          durationValue: duration.durationValue,
          durationUnit: duration.durationUnit,
        });

        const jobResponse = await jobGetAPI.getJobById(detail.jobPostId);
        setJob(jobResponse.job);
      } catch (loadError) {
        console.error('Failed to load draft proposal:', loadError);
        setError('Failed to load proposal.');
      } finally {
        setLoading(false);
      }
    };

    const loadProposalForCreate = async () => {
      if (!jobPostId) return;

      try {
        setLoading(true);
        setError('');

        const jobResponse = await jobGetAPI.getJobById(jobPostId);
        setJob(jobResponse.job);

        const existingResponse = await proposalGetAPI.getMyProposalByJobPost(jobPostId);
        if (existingResponse.success && existingResponse.data) {
          if (Number(existingResponse.data.status) === ProposalStatus.Draft) {
            navigate(`/proposals/${existingResponse.data.proposalId}/edit`, { replace: true });
            return;
          }

          setExistingNonDraftProposal(existingResponse.data);
        } else if (existingResponse.statusCode !== 404) {
          setError(existingResponse.message || 'Failed to check existing proposal status.');
        }
      } catch (loadError) {
        console.error('Failed to load proposal form:', loadError);
        setError('Failed to load proposal form.');
      } finally {
        setLoading(false);
      }
    };

    if (proposalId) {
      loadProposalForEdit();
      return;
    }

    if (jobPostId) {
      loadProposalForCreate();
      return;
    }

    setError('Invalid proposal route.');
    setLoading(false);
  }, [jobPostId, navigate, proposalId]);

  const ratePreview = useMemo(() => {
    const value = Number(form.proposedRate);
    return value > 0 ? `$${value.toLocaleString()}` : 'Not set';
  }, [form.proposedRate]);

  const durationPreview = useMemo(() => {
    if (!form.durationValue) return 'Not set';
    return buildProposedDuration(form.durationValue, form.durationUnit);
  }, [form.durationUnit, form.durationValue]);

  const validate = () => {
    const nextErrors: Partial<Record<keyof ProposalFormState | 'jobPostId', string>> = {};
    const proposedRate = Number(form.proposedRate);
    const durationValue = Number(form.durationValue);

    if (!currentJobPostId) {
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

    if (!form.durationValue.trim()) {
      nextErrors.durationValue = 'Proposed duration is required.';
    } else if (!Number.isFinite(durationValue) || durationValue <= 0) {
      nextErrors.durationValue = 'Duration must be greater than 0.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveProposal = async (status: ProposalStatus) => {
    if (!currentJobPostId) {
      throw new Error('Job post is required.');
    }

    const payload = buildProposalPayload(currentJobPostId, form, status);

    if (proposalId || proposal?.proposalId) {
      const id = proposalId || proposal?.proposalId || '';
      const response = await proposalPutAPI.updateProposal(id, {
        coverLetter: payload.coverLetter,
        proposedBudget: payload.proposedBudget,
        proposedDuration: payload.proposedDuration,
        status,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to update proposal.');
      }

      return id;
    }

    const response = await proposalPostAPI.createProposal(payload);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create proposal.');
    }

    return response.data;
  };

  const handleSaveDraft = async () => {
    setError('');
    if (!validate()) return;

    try {
      setSubmitting(true);
      await saveProposal(ProposalStatus.Draft);
      toast.success('Proposal draft saved successfully.');
      navigate('/proposals', {
        state: { successMessage: 'Proposal draft saved successfully.' },
      });
    } catch (saveError) {
      console.error('Failed to save proposal draft:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to save proposal draft.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    setError('');
    if (!validate() || !currentJobPostId) return;

    try {
      setCheckingQuestions(true);

      const questionsResponse = await jobQuestionAPI.getJobPostQuestions(currentJobPostId);

      if (!questionsResponse.success) {
        setError(questionsResponse.message || 'Failed to load JobPost questions.');
        return;
      }

      const questions = questionsResponse.data || [];

      if (questions.length === 0) {
        await saveProposal(ProposalStatus.Pending);
        toast.success('Proposal submitted successfully.');
        navigate('/proposals', {
          state: { successMessage: 'Proposal submitted successfully.' },
        });
        return;
      }

      navigate(`/proposals/create/${currentJobPostId}/questions`, {
        state: {
          jobPostId: currentJobPostId,
          proposalId: proposalId || proposal?.proposalId,
          form,
        },
      });
    } catch (nextError) {
      console.error('Failed to continue proposal flow:', nextError);
      setError(nextError instanceof Error ? nextError.message : 'Failed to continue proposal flow.');
    } finally {
      setCheckingQuestions(false);
    }
  };

  if (!jobPostId && !proposalId) {
    return <Navigate to="/jobs/browse" replace />;
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="create-proposal-page">
          <div className="create-proposal-loading glass-card">Loading proposal form...</div>
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
            <p>{isEditing ? 'Edit Draft Proposal' : 'Create Proposal'}</p>
            <h1>{job?.title || proposal?.jobPostTitle || 'Proposal Details'}</h1>
          </div>
        </div>

        <div className="create-proposal-layout">
          <section className="create-proposal-form glass-card">
            <div className="create-proposal-form-title">
              <Send size={18} />
              <div>
                <h2>Proposal Details</h2>
                <p>Write a focused application for this JobPost.</p>
              </div>
            </div>

            {error && <div className="create-proposal-alert">{error}</div>}
            {fieldErrors.jobPostId && <div className="create-proposal-alert">{fieldErrors.jobPostId}</div>}

            {existingNonDraftProposal && (
              <div className="create-proposal-alert">
                You already have a {getStatusLabel(existingNonDraftProposal.status)} proposal for this JobPost.
                Duplicate proposals are not allowed.
              </div>
            )}

            <label className="create-proposal-field">
              <span>Cover Letter *</span>
              <textarea
                value={form.coverLetter}
                onChange={event => setForm(prev => ({ ...prev, coverLetter: event.target.value }))}
                placeholder="Explain your relevant experience, how you will approach the work, and why you are a good fit..."
                rows={12}
                className="input-gb"
                disabled={Boolean(existingNonDraftProposal)}
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
                  disabled={Boolean(existingNonDraftProposal)}
                />
                {fieldErrors.proposedRate && <small className="error">{fieldErrors.proposedRate}</small>}
              </label>

              <label className="create-proposal-field">
                <span>Proposed Duration *</span>
                <div className="create-proposal-duration-row">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.durationValue}
                    onChange={event => setForm(prev => ({ ...prev, durationValue: event.target.value }))}
                    placeholder="3"
                    className="input-gb"
                    disabled={Boolean(existingNonDraftProposal)}
                  />
                  <select
                    value={form.durationUnit}
                    onChange={event => setForm(prev => ({ ...prev, durationUnit: event.target.value as DurationUnit }))}
                    className="input-gb"
                    disabled={Boolean(existingNonDraftProposal)}
                  >
                    {durationUnits.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                {fieldErrors.durationValue && <small className="error">{fieldErrors.durationValue}</small>}
              </label>
            </div>

            <div className="create-proposal-actions">
              <button
                type="button"
                className="create-proposal-secondary"
                onClick={() => navigate(currentJobPostId ? `/jobs/${currentJobPostId}` : '/jobs/browse')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="create-proposal-secondary"
                onClick={handleSaveDraft}
                disabled={submitting || checkingQuestions || Boolean(existingNonDraftProposal)}
              >
                {submitting ? 'Saving Draft...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                className="btn-cyan create-proposal-submit"
                onClick={handleNext}
                disabled={submitting || checkingQuestions || Boolean(existingNonDraftProposal)}
              >
                {checkingQuestions ? 'Checking Questions...' : 'Next'}
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
              <strong>{durationPreview}</strong>
            </div>

            <div className="create-proposal-summary-icons">
              <div>
                <DollarSign size={16} />
                <span>{ratePreview}</span>
              </div>
              <div>
                <Timer size={16} />
                <span>{durationPreview}</span>
              </div>
              <div>
                <Calendar size={16} />
                <span>{job?.deadline || 'Flexible'}</span>
              </div>
              {proposal?.proposalId && (
                <div>
                  <FileText size={16} />
                  <span>Draft {proposal.proposalId.substring(0, 8)}...</span>
                </div>
              )}
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
