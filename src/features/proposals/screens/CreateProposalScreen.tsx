import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
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
import { aiInterviewAPI } from '../../ai-interview/aiInterviewAPI';
import { NestedMilestonePlanEditor, type EditableMilestonePlan } from '../../../shared/components/NestedMilestonePlanEditor';
import {
  PROPOSAL_DURATION_UNITS,
  calculateProposalBudget,
  calculateProposalDuration,
  formatProposalDuration,
  parseProposalDuration,
  proposalDurationsEqual,
  roundProposalAmount,
  type ProposalDurationUnit,
} from '../utils/proposalTotals';

const emptyWorkItem = (orderIndex: number): ProposalWorkBreakdownItemDto => ({
  title: '', description: '', deliverables: '', estimatedDuration: '', orderIndex, milestoneOrderIndex: 0,
});

const emptyMilestone = (orderIndex: number): ProposalMilestonePlanDto => ({
  title: '', description: '', amount: 0, estimatedDuration: '', deliverables: '', acceptanceCriteria: '', orderIndex,
});

const normalizeOrder = <T extends { orderIndex: number }>(items: T[]) =>
  items.map((item, orderIndex) => ({ ...item, orderIndex }));

export default function CreateProposalScreen() {
  const navigate = useNavigate();
  const { jobPostId, proposalId } = useParams<{ jobPostId?: string; proposalId?: string }>();
  const [jobPost, setJobPost] = useState<JobPostDetailDto | null>(null);
  const [proposal, setProposal] = useState<ProposalDetailDto | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [analysisSummary, setAnalysisSummary] = useState('');
  const [solutionApproach, setSolutionApproach] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [assumptions, setAssumptions] = useState('');
  const [outOfScope, setOutOfScope] = useState('');
  const [workItems, setWorkItems] = useState<ProposalWorkBreakdownItemDto[]>([emptyWorkItem(0)]);
  const [milestones, setMilestones] = useState<ProposalMilestonePlanDto[]>([emptyMilestone(0)]);
  const [budgetMode, setBudgetMode] = useState<'auto' | 'manual'>('auto');
  const [manualBudget, setManualBudget] = useState('');
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(0);
  const [milestoneErrors, setMilestoneErrors] = useState<Record<string, string>>({});
  const [durationMode, setDurationMode] = useState<'auto' | 'manual'>('auto');
  const [durationAmount, setDurationAmount] = useState('');
  const [durationUnit, setDurationUnit] = useState<ProposalDurationUnit>('weeks');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const resolvedJobPostId = proposal?.jobPostId || jobPostId || '';
  const draftProposalId = proposal?.proposalId || proposalId || '';
  const isDraft = !proposal || canEditProposal(proposal.status);
  const milestoneTotal = useMemo(() => calculateProposalBudget(milestones.map(item => item.amount)), [milestones]);
  const calculatedDuration = useMemo(
    () => calculateProposalDuration(milestones.map(item => item.estimatedDuration)),
    [milestones]
  );
  const automaticDuration = parseProposalDuration(calculatedDuration);
  const proposedBudget = budgetMode === 'auto'
    ? (milestoneTotal > 0 ? milestoneTotal : null)
    : (manualBudget.trim() ? roundProposalAmount(Number(manualBudget)) : null);
  const proposedDuration = durationMode === 'auto'
    ? calculatedDuration
    : (Number.isInteger(Number(durationAmount)) && Number(durationAmount) > 0
        ? formatProposalDuration(Number(durationAmount), durationUnit)
        : null);

  const hydrateProposal = (loaded: ProposalDetailDto) => {
    setProposal(loaded);
    setCoverLetter(loaded.coverLetter || '');
    setAnalysisSummary(loaded.analysisSummary || '');
    setSolutionApproach(loaded.solutionApproach || '');
    setDeliverables(loaded.deliverables || '');
    setAssumptions(loaded.assumptions || '');
    setOutOfScope(loaded.outOfScope || '');
    const loadedWorkItems = loaded.workBreakdownItems?.length
      ? loaded.workBreakdownItems
      : (loaded.milestonePlans || []).flatMap(milestone => (milestone.workItems || []).map(item => ({ ...item, milestoneOrderIndex: milestone.orderIndex })));
    setWorkItems(loadedWorkItems.length ? normalizeOrder(loadedWorkItems) : [emptyWorkItem(0)]);
    const loadedMilestones = loaded.milestonePlans?.length
      ? normalizeOrder(loaded.milestonePlans)
      : [emptyMilestone(0)];
    setMilestones(loadedMilestones);

    const loadedMilestoneTotal = calculateProposalBudget(loadedMilestones.map(item => item.amount));
    const hasBudgetOverride = loaded.proposedBudget != null
      && roundProposalAmount(loaded.proposedBudget) !== loadedMilestoneTotal;
    setBudgetMode(hasBudgetOverride ? 'manual' : 'auto');
    setManualBudget(loaded.proposedBudget != null ? String(loaded.proposedBudget) : '');

    const loadedCalculatedDuration = calculateProposalDuration(loadedMilestones.map(item => item.estimatedDuration));
    const parsed = parseProposalDuration(loaded.proposedDuration);
    const hasDurationOverride = Boolean(loaded.proposedDuration)
      && !proposalDurationsEqual(loaded.proposedDuration, loadedCalculatedDuration);
    setDurationMode(hasDurationOverride ? 'manual' : 'auto');
    setDurationAmount(parsed ? String(parsed.amount) : '');
    setDurationUnit(parsed?.unit ?? 'weeks');
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
          setWorkItems(jobResponse.data.milestonePlans.flatMap((milestone, milestoneIndex) =>
            (milestone.workItems || []).map((item, itemIndex) => ({
              ...item,
              milestoneOrderIndex: milestoneIndex,
              orderIndex: itemIndex,
            }))));
          setExpandedMilestone(0);
          setNotice('The client baseline has been copied. Review and adjust milestones and work items before submitting.');
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
    analysisSummary: analysisSummary.trim(),
    solutionApproach: solutionApproach.trim(),
    deliverables: deliverables.trim(),
    assumptions: assumptions.trim(),
    outOfScope: outOfScope.trim(),
    workBreakdownItems: normalizeOrder(workItems),
    milestonePlans: normalizeOrder(milestones.map(item => ({
      ...item,
      amount: Number(item.amount) || 0,
      workItems: normalizeOrder(workItems.filter(workItem => workItem.milestoneOrderIndex === item.orderIndex)),
    }))),
  });

  const validateForSubmit = () => {
    setMilestoneErrors({});
    if (coverLetter.trim().length < 50) return 'Introduction must be at least 50 characters.';
    if (analysisSummary.trim().length < 50) return 'Requirement analysis must be at least 50 characters.';
    if (solutionApproach.trim().length < 50) return 'Solution approach must be at least 50 characters.';
    if (!workItems.length || workItems.some(item => !item.title?.trim() || !item.description?.trim())) return 'Every work breakdown item needs a title and description.';
    if (!milestones.length) return 'Add at least one milestone before submitting.';
    if (workItems.some(item => item.milestoneOrderIndex == null)) return 'Every work item must belong to a milestone.';
    if (milestones.some(item => !workItems.some(workItem => workItem.milestoneOrderIndex === item.orderIndex))) return 'Every milestone needs at least one work item.';
    const errors: Record<string, string> = {};
    milestones.forEach((item, index) => {
      if (!item.title?.trim()) errors[`${index}.title`] = 'Milestone title is required.';
      if (Number(item.amount) <= 0) errors[`${index}.amount`] = 'Amount must be greater than 0.';
      if (!parseProposalDuration(item.estimatedDuration)) errors[`${index}.estimatedDuration`] = 'Duration must be a positive whole number.';
      if (!item.deliverables?.trim()) errors[`${index}.deliverables`] = 'Deliverables are required.';
      if (!item.acceptanceCriteria?.trim()) errors[`${index}.acceptanceCriteria`] = 'Acceptance criteria are required.';
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
    const questionsResponse = await jobGetAPI.getJobPostQuestions(resolvedJobPostId);
    if (!questionsResponse.success) { setSubmitting(false); return setError(questionsResponse.message || 'Clarifying questions could not be loaded.'); }
    if ((questionsResponse.data || []).some(question => question.isRequired)) {
      setSubmitting(false);
      navigate(`/proposals/create/${resolvedJobPostId}/questions`, { state: { proposalId: savedId, jobPostId: resolvedJobPostId } });
      return;
    }
    const response = await proposalPatchAPI.updateProposalStatus(savedId, { status: ProposalStatus.Pending });
    setSubmitting(false);
    if (!response.success) return setError(response.message || 'Proposal was saved, but could not be submitted.');
    const interview = await aiInterviewAPI.requirement(resolvedJobPostId);
    if (interview.success && interview.data?.required && !interview.data.completed) {
      const params = new URLSearchParams({ jobPostId: resolvedJobPostId });
      if (interview.data.interviewDefinitionId) params.set('definitionId', interview.data.interviewDefinitionId);
      navigate(`/ai-interview?${params.toString()}`);
      return;
    }
    navigate('/proposals');
  };

  const nestedMilestones = useMemo<EditableMilestonePlan[]>(() => milestones.map(milestone => ({
    ...milestone,
    workItems: workItems.filter(item => item.milestoneOrderIndex === milestone.orderIndex),
  })), [milestones, workItems]);
  const updateNestedPlan = (plans: EditableMilestonePlan[]) => {
    setMilestones(normalizeOrder(plans.map(({ workItems: _workItems, ...milestone }) => milestone)));
    setWorkItems(plans.flatMap((milestone, milestoneIndex) => milestone.workItems.map((item, orderIndex) => ({
      ...item,
      milestonePlanId: milestone.id || null,
      milestoneOrderIndex: milestoneIndex,
      orderIndex,
    }))));
    setBudgetMode('auto');
    setManualBudget('');
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
              <MarkdownEditor label="Requirement analysis" value={analysisSummary} onChange={setAnalysisSummary} rows={6} placeholder="Summarize the problem, constraints, risks, and baseline requirements." />
              <MarkdownEditor label="Solution approach" value={solutionApproach} onChange={setSolutionApproach} rows={6} placeholder="Describe the implementation strategy, architecture, and validation plan." />
              <div className="grid gap-4 md:grid-cols-3">
                <MarkdownEditor label="Overall deliverables" value={deliverables} onChange={setDeliverables} rows={4} />
                <MarkdownEditor label="Assumptions" value={assumptions} onChange={setAssumptions} rows={4} />
                <MarkdownEditor label="Out of scope" value={outOfScope} onChange={setOutOfScope} rows={4} />
              </div>
            </section>

            <NestedMilestonePlanEditor
              value={nestedMilestones}
              onChange={updateNestedPlan}
              title="Milestone, payment plan and Work Breakdown Structure"
              description="Start from the client baseline, then propose the payable outcomes and work items you can commit to."
              expandedIndex={expandedMilestone}
              onExpandedChange={setExpandedMilestone}
              errors={milestoneErrors}
            />


            <section className="grid gap-5 border-t border-border pt-7 md:grid-cols-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">Calculated proposal budget</span><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-600">Milestone total</span></div>
                <div aria-label="Calculated proposal budget" className={`${inputClass} mt-2 min-w-0 font-bold`}>{formatGigCoin(proposedBudget || 0)}</div>
                {budgetMode === 'manual' && <p className="mt-2 text-xs text-amber-600">Legacy draft budget is preserved until you edit the milestone plan.</p>}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">Overall proposal duration</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${durationMode === 'manual' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>{durationMode === 'manual' ? 'Manual override' : 'Synced to milestones'}</span></div>
                <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2"><input aria-label="Overall proposal duration" type="number" min="1" step="1" value={durationMode === 'auto' ? (automaticDuration?.amount ?? '') : durationAmount} onChange={e => { setDurationMode('manual'); setDurationAmount(e.target.value); }} className={`${inputClass} min-w-0`} /><select aria-label="Overall proposal duration unit" value={durationMode === 'auto' ? (automaticDuration?.unit ?? 'weeks') : durationUnit} onChange={e => { setDurationMode('manual'); setDurationUnit(e.target.value as ProposalDurationUnit); }} className={`${inputClass} min-w-0`}>{PROPOSAL_DURATION_UNITS.map(unit => <option key={unit}>{unit}</option>)}</select></div>
                {durationMode === 'manual' && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"><span className={proposalDurationsEqual(proposedDuration, calculatedDuration) ? 'text-emerald-600' : 'text-amber-600'}>Milestone duration: {calculatedDuration || 'incomplete'}</span><button type="button" onClick={() => { setDurationMode('auto'); setDurationAmount(''); }} className="font-semibold text-[var(--gb-cyan)] hover:underline">Use milestone duration</button></div>}
              </div>
            </section>

            <footer className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={handleSaveDraft} disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-bold disabled:opacity-60"><Save size={16} /> Save draft</button><button type="button" onClick={handleSubmit} disabled={submitting} className="btn-cyan inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm"><Send size={16} /> Submit proposal</button></footer>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
