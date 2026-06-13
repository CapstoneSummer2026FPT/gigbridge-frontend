import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, FileText, Send, Save } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import { proposalPutAPI } from '../../../api/proposalAPI/PUT';
import { ProposalStatus, type ProposalDetailDto } from '../../../types/models/Proposal';
import type { JobPostDetailDto } from '../../../types/models/Job';
import { canEditProposal, getStatusLabel } from '../utils/statusHelpers';

const durationUnits = ['days', 'weeks', 'months'];

const parseDuration = (value?: string | null) => {
  if (!value) return { amount: '1', unit: 'weeks' };
  const match = value.match(/^(\d+)\s+([a-zA-Z]+)$/);
  if (!match) return { amount: '1', unit: 'weeks' };
  return {
    amount: match[1],
    unit: durationUnits.includes(match[2].toLowerCase()) ? match[2].toLowerCase() : 'weeks',
  };
};

export default function CreateProposalScreen() {
  const navigate = useNavigate();
  const { jobPostId, proposalId } = useParams<{ jobPostId?: string; proposalId?: string }>();

  const [jobPost, setJobPost] = useState<JobPostDetailDto | null>(null);
  const [proposal, setProposal] = useState<ProposalDetailDto | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');
  const [durationAmount, setDurationAmount] = useState('1');
  const [durationUnit, setDurationUnit] = useState('weeks');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const resolvedJobPostId = proposal?.jobPostId || jobPostId || '';
  const draftProposalId = proposal?.proposalId || proposalId || '';
  const isDraft = !proposal || canEditProposal(proposal.status);
  const proposedDuration = useMemo(
    () => `${Math.max(1, Number(durationAmount) || 1)} ${durationUnit}`,
    [durationAmount, durationUnit]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        if (proposalId) {
          const proposalResponse = await proposalGetAPI.getProposalDetail(proposalId);
          if (!proposalResponse.success || !proposalResponse.data) {
            setError(proposalResponse.message || 'Proposal could not be loaded.');
            return;
          }

          const loadedProposal = proposalResponse.data;
          setProposal(loadedProposal);
          setCoverLetter(loadedProposal.coverLetter || '');
          setProposedBudget(String(loadedProposal.proposedBudget ?? ''));
          const parsed = parseDuration(loadedProposal.proposedDuration);
          setDurationAmount(parsed.amount);
          setDurationUnit(parsed.unit);

          const jobResponse = await jobGetAPI.getJobPostDetail(loadedProposal.jobPostId);
          if (jobResponse.success && jobResponse.data) {
            setJobPost(jobResponse.data);
          }
          return;
        }

        if (!jobPostId) {
          setError('JobPost id is missing.');
          return;
        }

        const [jobResponse, existingProposalResponse] = await Promise.all([
          jobGetAPI.getJobPostDetail(jobPostId),
          proposalGetAPI.getMyProposalByJobPost(jobPostId),
        ]);

        if (!jobResponse.success || !jobResponse.data) {
          setError(jobResponse.message || 'JobPost could not be loaded.');
          return;
        }

        setJobPost(jobResponse.data);

        if (existingProposalResponse.success && existingProposalResponse.data) {
          const existing = existingProposalResponse.data;
          setProposal(existing);
          setCoverLetter(existing.coverLetter || '');
          setProposedBudget(String(existing.proposedBudget ?? ''));
          const parsed = parseDuration(existing.proposedDuration);
          setDurationAmount(parsed.amount);
          setDurationUnit(parsed.unit);

          if (canEditProposal(existing.status)) {
            setNotice('You already have a draft proposal for this JobPost. Continue editing it here.');
          } else {
            setNotice(`You already have a ${getStatusLabel(existing.status)} proposal for this JobPost.`);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [jobPostId, proposalId]);

  const validate = () => {
    const budget = Number(proposedBudget);
    if (coverLetter.trim().length < 50) {
      return 'Cover letter must be at least 50 characters.';
    }
    if (!Number.isFinite(budget) || budget <= 0) {
      return 'Proposed budget must be greater than 0.';
    }
    if (proposedDuration.length > 100) {
      return 'Proposed duration must not exceed 100 characters.';
    }
    return '';
  };

  const persistDraft = async () => {
    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      return null;
    }

    const budget = Number(proposedBudget);

    if (draftProposalId) {
      const updateResponse = await proposalPutAPI.updateProposal(draftProposalId, {
        coverLetter: coverLetter.trim(),
        proposedBudget: budget,
        proposedDuration,
      });

      if (!updateResponse.success) {
        setError(updateResponse.message || 'Proposal could not be saved.');
        return null;
      }

      return draftProposalId;
    }

    if (!resolvedJobPostId) {
      setError('JobPost id is missing.');
      return null;
    }

    const createResponse = await proposalPostAPI.createProposal({
      jobPostsId: resolvedJobPostId,
      coverLetter: coverLetter.trim(),
      proposedBudget: budget,
      proposedDuration,
    });

    if (!createResponse.success || !createResponse.data) {
      setError(createResponse.message || 'Proposal could not be created.');
      return null;
    }

    const newProposal: ProposalDetailDto = {
      proposalId: createResponse.data,
      jobPostId: resolvedJobPostId,
      jobPostTitle: jobPost?.title,
      freelancerProfileId: '',
      coverLetter: coverLetter.trim(),
      proposedBudget: budget,
      proposedDuration,
      status: ProposalStatus.Draft,
    };
    setProposal(newProposal);
    return createResponse.data;
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    setError('');
    const savedProposalId = await persistDraft();
    setSubmitting(false);
    if (savedProposalId) {
      navigate('/proposals');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    const savedProposalId = await persistDraft();

    if (!savedProposalId || !resolvedJobPostId) {
      setSubmitting(false);
      return;
    }

    const questionsResponse = await jobGetAPI.getJobPostQuestions(resolvedJobPostId);
    if (!questionsResponse.success) {
      setSubmitting(false);
      setError(questionsResponse.message || 'JobPost questions could not be loaded.');
      return;
    }

    const questions = questionsResponse.data || [];
    if (questions.length > 0) {
      setSubmitting(false);
      navigate(`/proposals/create/${resolvedJobPostId}/questions`, {
        state: { proposalId: savedProposalId, jobPostId: resolvedJobPostId },
      });
      return;
    }

    const statusResponse = await proposalPatchAPI.updateProposalStatus(savedProposalId, {
      status: ProposalStatus.Pending,
    });

    setSubmitting(false);
    if (!statusResponse.success) {
      setError(statusResponse.message || 'Proposal was saved, but could not be submitted.');
      return;
    }

    navigate('/proposals');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto py-16 text-center text-muted-foreground">Loading proposal...</div>
      </AppLayout>
    );
  }

  const locked = proposal && !isDraft;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="glass-card p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {proposalId ? 'Edit Proposal' : 'Apply to JobPost'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {jobPost?.title || proposal?.jobPostTitle || 'JobPost proposal'}
              </p>
            </div>
            <FileText size={28} className="text-muted-foreground" />
          </div>

          {notice && (
            <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
              {notice}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {locked ? (
            <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              This proposal is {getStatusLabel(proposal.status)} and can no longer be edited.
            </div>
          ) : (
            <div className="space-y-5">
              <label className="block">
                <span className="block text-sm font-semibold text-foreground mb-2">Cover Letter</span>
                <textarea
                  value={coverLetter}
                  onChange={event => setCoverLetter(event.target.value)}
                  rows={9}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]"
                  placeholder="Tell the client how you will approach the project..."
                />
                <span className="mt-1 block text-xs text-muted-foreground">{coverLetter.trim().length}/4000 characters</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-semibold text-foreground mb-2">Proposed Budget</span>
                  <input
                    type="number"
                    min="1"
                    value={proposedBudget}
                    onChange={event => setProposedBudget(event.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]"
                    placeholder="1200"
                  />
                </label>

                <div>
                  <span className="block text-sm font-semibold text-foreground mb-2">Duration</span>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      type="number"
                      min="1"
                      value={durationAmount}
                      onChange={event => setDurationAmount(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]"
                    />
                    <select
                      value={durationUnit}
                      onChange={event => setDurationUnit(event.target.value)}
                      className="rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]"
                    >
                      {durationUnits.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted/20 disabled:opacity-60"
                >
                  <Save size={16} />
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-cyan inline-flex items-center gap-2 px-5 py-2.5 text-sm"
                >
                  <Send size={16} />
                  Submit Proposal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
