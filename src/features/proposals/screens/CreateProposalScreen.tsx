import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Save,
  Send,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import { proposalPutAPI } from '../../../api/proposalAPI/PUT';
import {
  ProposalStatus,
  type ProposalDetailDto,
  type ProposalMilestonePlanDto,
  type ProposalWorkBreakdownItemDto,
} from '../../../types/models/Proposal';
import type { JobPostDetailDto } from '../../../types/models/Job';
import { canEditProposal, getStatusLabel } from '../utils/statusHelpers';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { MarkdownEditor } from '../../../shared/components/MarkdownEditor';
import { NestedMilestonePlanEditor, type EditableMilestonePlan } from '../../../shared/components/NestedMilestonePlanEditor';
import {
  calculateProposalBudget,
  calculateProposalDuration,
} from '../utils/proposalTotals';
import { getProposalNarrativeValidationError } from '../utils/proposalSubmissionValidation';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  currentLocalDate,
  extractCustomWorkItems,
  resolveProposalMilestonePlan,
} from '../utils/proposalMilestonePlan';

const emptyMilestone = (orderIndex: number): ProposalMilestonePlanDto => ({
  title: '', description: '', amount: 0, estimatedDuration: '', dueDate: null, deliverables: '', acceptanceCriteria: '', orderIndex,
});

const normalizeOrder = <T extends { orderIndex: number }>(items: T[]) =>
  items.map((item, orderIndex) => ({ ...item, orderIndex }));

export default function CreateProposalScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { jobPostId, proposalId } = useParams<{ jobPostId?: string; proposalId?: string }>();
  const [jobPost, setJobPost] = useState<JobPostDetailDto | null>(null);
  const [proposal, setProposal] = useState<ProposalDetailDto | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [proposalApproach, setProposalApproach] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [assumptions, setAssumptions] = useState('');
  const [outOfScope, setOutOfScope] = useState('');
  const [workItems, setWorkItems] = useState<ProposalWorkBreakdownItemDto[]>([]);
  const [milestones, setMilestones] = useState<ProposalMilestonePlanDto[]>([emptyMilestone(0)]);
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(0);
  const [advancedMilestoneIndexes, setAdvancedMilestoneIndexes] = useState<number[]>([]);
  const [milestoneErrors, setMilestoneErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const resolvedJobPostId = proposal?.jobPostId || jobPostId || '';
  const draftProposalId = proposal?.proposalId || proposalId || '';
  const isDraft = !proposal || canEditProposal(proposal.status);
  const today = useMemo(() => currentLocalDate(), []);
  const defaultAcceptanceCriteria = t('proposalMilestoneEditor.defaultAcceptanceCriteria');
  const resolvedPlan = useMemo(() => resolveProposalMilestonePlan(
    milestones,
    workItems,
    defaultAcceptanceCriteria,
    jobPost?.endDate,
    today,
  ), [defaultAcceptanceCriteria, jobPost?.endDate, milestones, today, workItems]);
  const milestoneTotal = useMemo(
    () => calculateProposalBudget(resolvedPlan.milestonePlans.map(item => item.amount)),
    [resolvedPlan.milestonePlans],
  );
  const proposedDuration = useMemo(
    () => calculateProposalDuration(resolvedPlan.milestonePlans.map(item => item.estimatedDuration)),
    [resolvedPlan.milestonePlans],
  );
  const proposedBudget = milestoneTotal > 0 ? milestoneTotal : null;

  const hydrateProposal = (loaded: ProposalDetailDto) => {
    setProposal(loaded);
    setCoverLetter(loaded.coverLetter || '');
    setProposalApproach(loaded.analysisSummary || loaded.solutionApproach || '');
    setDeliverables(loaded.deliverables || '');
    setAssumptions(loaded.assumptions || '');
    setOutOfScope(loaded.outOfScope || '');
    const loadedMilestones = loaded.milestonePlans?.length
      ? normalizeOrder(loaded.milestonePlans)
      : [emptyMilestone(0)];
    const loadedWorkItems = loaded.workBreakdownItems?.length
      ? loaded.workBreakdownItems
      : loadedMilestones.flatMap((milestone, milestoneIndex) =>
        (milestone.workItems || []).map((item, orderIndex) => ({
          ...item,
          milestoneOrderIndex: milestoneIndex,
          orderIndex,
        })));
    const editableItems = extractCustomWorkItems(loadedMilestones, loadedWorkItems);
    setWorkItems(editableItems.customWorkItems);
    setAdvancedMilestoneIndexes(editableItems.customMilestoneIndexes);
    setMilestones(loadedMilestones);
    setExpandedMilestone(editableItems.customMilestoneIndexes[0] ?? 0);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        if (proposalId) {
          const response = await proposalGetAPI.getProposalDetail(proposalId);
          if (!response.success || !response.data) return setError(response.message || 'Proposal could not be loaded.');
          hydrateProposal(response.data);
          const jobResponse = await jobGetAPI.getJobPostDetail(response.data.jobPostId);
          if (jobResponse.success && jobResponse.data) setJobPost(jobResponse.data);
          return;
        }
        if (!jobPostId) return setError('Project request id is missing.');
        const [jobResponse, existingResponse] = await Promise.all([
          jobGetAPI.getJobPostDetail(jobPostId),
          proposalGetAPI.getMyProposalByJobPost(jobPostId),
        ]);
        if (!jobResponse.success || !jobResponse.data) return setError(jobResponse.message || 'Project request could not be loaded.');
        setJobPost(jobResponse.data);
        if (existingResponse.success && existingResponse.data) {
          hydrateProposal(existingResponse.data);
          setNotice(canEditProposal(existingResponse.data.status)
            ? 'Your draft is ready to continue.'
            : `This proposal is ${getStatusLabel(existingResponse.data.status)} and is read-only.`);
        } else if (jobResponse.data.milestonePlans?.length) {
          const baseline = normalizeOrder(jobResponse.data.milestonePlans.map(item => ({ ...item, workItems: undefined })));
          setMilestones(baseline);
          setWorkItems([]);
          setAdvancedMilestoneIndexes([]);
          setExpandedMilestone(0);
          setNotice('The client baseline has been copied. Review the milestone outcomes before submitting.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [jobPostId, proposalId]);

  const proposalPayload = () => ({
    coverLetter: coverLetter.trim(),
    proposedBudget,
    proposedDuration,
    analysisSummary: proposalApproach.trim(),
    solutionApproach: proposalApproach.trim(),
    deliverables: deliverables.trim(),
    assumptions: assumptions.trim(),
    outOfScope: outOfScope.trim(),
    workBreakdownItems: resolvedPlan.workBreakdownItems,
    milestonePlans: resolvedPlan.milestonePlans,
  });

  const validateForSubmit = () => {
    setMilestoneErrors({});
    const narrativeError = getProposalNarrativeValidationError({
      coverLetter,
      analysisSummary: proposalApproach,
      solutionApproach: proposalApproach,
    });
    if (narrativeError) return narrativeError;
    const invalidWorkItem = workItems.find(item => !item.title?.trim() || !item.description?.trim());
    if (invalidWorkItem) {
      const milestoneIndex = invalidWorkItem.milestoneOrderIndex ?? 0;
      setExpandedMilestone(milestoneIndex);
      setAdvancedMilestoneIndexes(indexes => indexes.includes(milestoneIndex)
        ? indexes
        : [...indexes, milestoneIndex].sort((left, right) => left - right));
      return 'Every custom work breakdown item needs a title and description.';
    }
    if (!milestones.length) return 'Add at least one milestone before submitting.';
    const errors: Record<string, string> = {};
    const proposalClosingDate = jobPost?.endDate?.split('T')[0] || null;
    let previousDueDate: string | null = null;
    milestones.forEach((item, index) => {
      if (!item.title?.trim()) errors[`${index}.title`] = 'Milestone title is required.';
      if (Number(item.amount) <= 0) errors[`${index}.amount`] = 'Amount must be greater than 0.';
      if (!item.dueDate) {
        errors[`${index}.dueDate`] = 'Deadline is required.';
      } else {
        if (item.dueDate < today) errors[`${index}.dueDate`] = 'Deadline cannot be in the past.';
        if (proposalClosingDate && item.dueDate <= proposalClosingDate) {
          errors[`${index}.dueDate`] = 'Deadline must be after the proposal closing date.';
        }
        if (previousDueDate && item.dueDate <= previousDueDate) {
          errors[`${index}.dueDate`] = 'Deadline must be later than the previous milestone deadline.';
        }
        previousDueDate = item.dueDate;
      }
      if (!item.deliverables?.trim()) errors[`${index}.deliverables`] = 'Deliverables are required.';
    });
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      const [index, field] = firstErrorKey.split('.');
      setMilestoneErrors(errors);
      setExpandedMilestone(Number(index));
      requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(`[data-milestone-field="${index}.${field}"]`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target?.focus();
      });
      return 'Complete the highlighted milestone fields before submitting.';
    }
    if (!proposedBudget || proposedBudget <= 0) return 'Proposed rate must be greater than 0.';
    if (!proposedDuration) return 'Proposal duration must be a positive whole number.';
    return '';
  };

  const persistDraft = async () => {
    const payload = proposalPayload();
    if (draftProposalId) {
      const response = await proposalPutAPI.updateProposal(draftProposalId, payload);
      if (!response.success) { setError(response.message || 'Proposal could not be saved.'); return null; }
      return draftProposalId;
    }
    if (!resolvedJobPostId) { setError('Project request id is missing.'); return null; }
    const response = await proposalPostAPI.createProposal({ jobPostsId: resolvedJobPostId, ...payload });
    if (!response.success || !response.data) { setError(response.message || 'Proposal could not be created.'); return null; }
    setProposal({ proposalId: response.data, jobPostId: resolvedJobPostId, freelancerProfileId: '', status: ProposalStatus.Draft, ...payload });
    return response.data;
  };

  const handleSaveDraft = async () => {
    setSubmitting(true); setError('');
    const saved = await persistDraft();
    setSubmitting(false);
    if (saved) navigate('/proposals');
  };

  const handleSubmit = async () => {
    const validation = validateForSubmit();
    if (validation) return setError(validation);
    setSubmitting(true); setError('');
    const savedId = await persistDraft();
    if (!savedId || !resolvedJobPostId) return setSubmitting(false);
    if (jobPost?.hasAiInterview) {
      setSubmitting(false);
      navigate(`/ai-interview/${resolvedJobPostId}`, {
        state: {
          proposalId: savedId,
          jobPostId: resolvedJobPostId,
          jobTitle: jobPost.title,
        },
      });
      return;
    }
    const questionsResponse = await jobGetAPI.getJobPostQuestions(resolvedJobPostId);
    if (!questionsResponse.success) { setSubmitting(false); return setError(questionsResponse.message || 'Clarifying questions could not be loaded.'); }
    if ((questionsResponse.data || []).length > 0) {
      setSubmitting(false);
      navigate(`/proposals/create/${resolvedJobPostId}/questions`, { state: { proposalId: savedId, jobPostId: resolvedJobPostId } });
      return;
    }
    const response = await proposalPatchAPI.updateProposalStatus(savedId, { status: ProposalStatus.Pending });
    setSubmitting(false);
    if (!response.success) return setError(response.message || 'Proposal was saved, but could not be submitted.');
    navigate('/proposals', { state: { submittedProposalId: savedId } });
  };

  const nestedMilestones = useMemo<EditableMilestonePlan[]>(() => resolvedPlan.milestonePlans.map(milestone => ({
    ...milestone,
    workItems: workItems.filter(item => item.milestoneOrderIndex === milestone.orderIndex),
  })), [resolvedPlan.milestonePlans, workItems]);
  const updateNestedPlan = (plans: EditableMilestonePlan[]) => {
    setMilestones(normalizeOrder(plans.map(({ workItems: _workItems, ...milestone }) => milestone)));
    setWorkItems(plans.flatMap((milestone, milestoneIndex) => milestone.workItems.map((item, orderIndex) => ({
      ...item,
      milestonePlanId: milestone.id || null,
      milestoneOrderIndex: milestoneIndex,
      orderIndex,
    }))));
    setAdvancedMilestoneIndexes(indexes => Array.from(new Set([
      ...indexes.filter(index => index < plans.length),
      ...plans.flatMap((milestone, index) => milestone.workItems.length > 0 ? [index] : []),
    ])).sort((left, right) => left - right));
    setMilestoneErrors({});
  };

  if (loading) return <AppLayout><div className="mx-auto max-w-5xl py-16 text-center text-muted-foreground">Loading proposal...</div></AppLayout>;
  const locked = proposal && !isDraft;
  const inputClass = 'w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]';

  return (
    <AppLayout>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 border-none bg-transparent text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back
        </button>
        <header className="mb-7 flex items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Project Proposal</h1>
            <p className="mt-1 text-sm text-muted-foreground">{jobPost?.title || proposal?.jobPostTitle || 'Project request'}</p>
          </div>
          <FileText size={28} className="text-[var(--gb-cyan)]" />
        </header>
        {notice && <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600">{notice}</div>}
        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>}
        {locked ? (
          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">This proposal is {getStatusLabel(proposal.status)} and can no longer be edited.</div>
        ) : (
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-bold">Analysis and approach</h2>
              <label className="block text-sm font-semibold">Introduction
                <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)} rows={4} className={`${inputClass} mt-2`} placeholder="Introduce your relevant experience and why your approach fits." />
              </label>
              <MarkdownEditor label="Your Proposal Approach" value={proposalApproach} onChange={setProposalApproach} rows={6} placeholder="Summarize the problem, constraints, risks, and baseline requirements." />

              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors bg-card cursor-pointer border-none"
                >
                  <span>Additional Details</span>
                  <ChevronRight size={14} className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                </button>
                {showAdvanced && (
                  <div className="px-4 pb-4 pt-2 border-t border-border grid gap-4 md:grid-cols-3">
                    <MarkdownEditor label="Overall deliverables" value={deliverables} onChange={setDeliverables} rows={4} />
                    <MarkdownEditor label="Assumptions" value={assumptions} onChange={setAssumptions} rows={4} />
                    <MarkdownEditor label="Out of scope" value={outOfScope} onChange={setOutOfScope} rows={4} />
                  </div>
                )}
              </div>
            </section>

            <NestedMilestonePlanEditor
              value={nestedMilestones}
              onChange={updateNestedPlan}
              title={t('proposalMilestoneEditor.title')}
              description={t('proposalMilestoneEditor.description')}
              expandedIndex={expandedMilestone}
              onExpandedChange={setExpandedMilestone}
              advancedIndexes={advancedMilestoneIndexes}
              onAdvancedIndexesChange={setAdvancedMilestoneIndexes}
              errors={milestoneErrors}
              showDueDate
              simplifiedMilestoneFields
              milestoneTitleMaxLength={200}
              workItemTitleMaxLength={200}
              durationMaxLength={100}
              fieldHints={{
                deadline: 'Final date to complete and submit this milestone.',
              }}
              uiCopy={{
                advancedDetails: t('proposalMilestoneEditor.advancedDetails'),
                derivedDuration: t('proposalMilestoneEditor.derivedDuration'),
                acceptanceCriteria: t('proposalMilestoneEditor.acceptanceCriteria'),
                workBreakdown: t('proposalMilestoneEditor.workBreakdown'),
                addWorkItem: t('proposalMilestoneEditor.addWorkItem'),
              }}
            />


            <section className="grid gap-5 border-t border-border pt-7 md:grid-cols-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">Calculated proposal budget</span><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-600">Milestone total</span></div>
                <div aria-label="Calculated proposal budget" className={`${inputClass} mt-2 min-w-0 font-bold`}>{formatGigCoin(proposedBudget || 0)}</div>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">Overall proposal duration</span><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-600">Synced to milestones</span></div>
                <div aria-label="Overall proposal duration" className={`${inputClass} mt-2 min-w-0 font-bold`}>{proposedDuration || 'incomplete'}</div>
              </div>
            </section>

            <footer className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={handleSaveDraft} disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-bold disabled:opacity-60"><Save size={16} /> Save draft</button><button type="button" onClick={handleSubmit} disabled={submitting} className="btn-cyan inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm"><Send size={16} /> Submit proposal</button></footer>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
