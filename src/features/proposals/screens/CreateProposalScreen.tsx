import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Plus,
  Save,
  Send,
  Trash2,
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
  title: '', description: '', deliverables: '', estimatedDuration: '', orderIndex,
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
    setWorkItems(loaded.workBreakdownItems?.length ? normalizeOrder(loaded.workBreakdownItems) : [emptyWorkItem(0)]);
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
    milestonePlans: normalizeOrder(milestones.map(item => ({ ...item, amount: Number(item.amount) || 0 }))),
  });

  const validateForSubmit = () => {
    setMilestoneErrors({});
    if (coverLetter.trim().length < 50) return 'Introduction must be at least 50 characters.';
    if (analysisSummary.trim().length < 50) return 'Requirement analysis must be at least 50 characters.';
    if (solutionApproach.trim().length < 50) return 'Solution approach must be at least 50 characters.';
    if (!workItems.length || workItems.some(item => !item.title?.trim())) return 'Every work breakdown item needs a title.';
    if (!milestones.length) return 'Add at least one milestone before submitting.';
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
    navigate('/proposals', { state: { submittedProposalId: savedId } });
  };

  const updateWorkItem = (index: number, patch: Partial<ProposalWorkBreakdownItemDto>) =>
    setWorkItems(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const updateMilestone = (index: number, patch: Partial<ProposalMilestonePlanDto>) => {
    setMilestones(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    setMilestoneErrors(current => {
      const next = { ...current };
      Object.keys(patch).forEach(field => delete next[`${index}.${field}`]);
      return next;
    });
  };
  const addMilestone = () => {
    const nextIndex = milestones.length;
    setMilestones(items => [...items, emptyMilestone(items.length)]);
    setExpandedMilestone(nextIndex);
  };
  const removeMilestone = (index: number) => {
    setMilestones(items => normalizeOrder(items.filter((_, itemIndex) => itemIndex !== index)));
    setMilestoneErrors({});
    setExpandedMilestone(current => current === index ? null : current !== null && current > index ? current - 1 : current);
  };
  const moveItem = <T,>(items: T[], index: number, direction: -1 | 1, setter: (value: T[]) => void) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setter(normalizeOrder(next as Array<T & { orderIndex: number }>) as T[]);
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

            <section className="space-y-4 border-t border-border pt-7">
              <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Work breakdown</h2><button type="button" onClick={() => setWorkItems(items => [...items, emptyWorkItem(items.length)])} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"><Plus size={16} /> Add item</button></div>
              {workItems.map((item, index) => (
                <div key={item.id || index} className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2">
                  <div className="md:col-span-2 flex items-center justify-between"><strong className="text-sm">Work item {index + 1}</strong><div className="flex gap-1"><button title="Move up" onClick={() => moveItem(workItems, index, -1, setWorkItems)}><ArrowUp size={16} /></button><button title="Move down" onClick={() => moveItem(workItems, index, 1, setWorkItems)}><ArrowDown size={16} /></button><button title="Remove" onClick={() => setWorkItems(items => normalizeOrder(items.filter((_, i) => i !== index)))}><Trash2 size={16} /></button></div></div>
                  <input value={item.title || ''} onChange={e => updateWorkItem(index, { title: e.target.value })} className={inputClass} placeholder="Title" />
                  <input value={item.estimatedDuration || ''} onChange={e => updateWorkItem(index, { estimatedDuration: e.target.value })} className={inputClass} placeholder="Estimated duration" />
                  <textarea value={item.description || ''} onChange={e => updateWorkItem(index, { description: e.target.value })} className={inputClass} rows={3} placeholder="Tasks and method" />
                  <textarea value={item.deliverables || ''} onChange={e => updateWorkItem(index, { deliverables: e.target.value })} className={inputClass} rows={3} placeholder="Deliverables" />
                </div>
              ))}
            </section>

            <section className="space-y-4 border-t border-border pt-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h2 className="text-lg font-bold">Milestone and payment plan</h2><p className="mt-1 text-sm text-muted-foreground">Break the project into reviewable, payable outcomes.</p></div>
                <button type="button" onClick={addMilestone} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><Plus size={16} /> Add milestone</button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Milestone total</p><p className="mt-1 break-words text-2xl font-bold text-foreground">{formatGigCoin(milestoneTotal)}</p></div>
                <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Calculated duration</p><p className="mt-1 break-words text-2xl font-bold text-foreground">{calculatedDuration || 'Not available'}</p><p className={`mt-1 text-xs ${milestoneTotal > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{milestones.length} {milestones.length === 1 ? 'milestone' : 'milestones'} in the payment plan.</p></div>
              </div>

              {milestones.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-center"><p className="font-semibold">No milestones yet</p><p className="mt-1 text-sm text-muted-foreground">Add the first payable outcome for this proposal.</p><button type="button" onClick={addMilestone} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"><Plus size={16} /> Add first milestone</button></div>
              ) : milestones.map((item, index) => {
                const isExpanded = expandedMilestone === index;
                const parsedDuration = parseProposalDuration(item.estimatedDuration);
                const duration = { amount: parsedDuration ? String(parsedDuration.amount) : '', unit: parsedDuration?.unit ?? 'weeks' as ProposalDurationUnit };
                const isComplete = Boolean(item.title?.trim() && Number(item.amount) > 0 && parsedDuration && item.deliverables?.trim() && item.acceptanceCriteria?.trim());
                const errorFor = (field: string) => milestoneErrors[`${index}.${field}`];
                const fieldClass = (field: string) => `${inputClass} ${errorFor(field) ? 'border-red-500 focus:ring-red-500' : ''}`;
                const updateDuration = (amount: string, unit: ProposalDurationUnit) => updateMilestone(index, {
                  estimatedDuration: amount ? `${amount} ${unit}` : '',
                });
                return (
                  <article key={item.id || index} className={`overflow-hidden rounded-lg border ${Object.keys(milestoneErrors).some(key => key.startsWith(`${index}.`)) ? 'border-red-500/60' : 'border-border'} bg-card`}>
                    <div className="flex items-center gap-2 p-3 sm:p-4">
                      <button type="button" onClick={() => setExpandedMilestone(isExpanded ? null : index)} aria-expanded={isExpanded} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{index + 1}</span>
                        <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title?.trim() || `Untitled milestone ${index + 1}`}</strong><span className="mt-0.5 block text-xs text-muted-foreground">{formatGigCoin(Number(item.amount) || 0)}{item.estimatedDuration ? ` · ${item.estimatedDuration}` : ''}</span></span>
                        {isComplete && <span title="Milestone complete" className="hidden items-center gap-1 text-xs font-semibold text-emerald-600 sm:flex"><CheckCircle2 size={15} /> Ready</span>}
                      </button>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" title="Move up" disabled={index === 0} onClick={() => { setMilestoneErrors({}); moveItem(milestones, index, -1, setMilestones); setExpandedMilestone(index - 1); }} className="rounded p-2 hover:bg-muted disabled:opacity-30"><ArrowUp size={16} /></button>
                        <button type="button" title="Move down" disabled={index === milestones.length - 1} onClick={() => { setMilestoneErrors({}); moveItem(milestones, index, 1, setMilestones); setExpandedMilestone(index + 1); }} className="rounded p-2 hover:bg-muted disabled:opacity-30"><ArrowDown size={16} /></button>
                        <button type="button" title="Remove milestone" onClick={() => removeMilestone(index)} className="rounded p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    {isExpanded && <div className="grid gap-4 border-t border-border bg-background/50 p-4 md:grid-cols-2">
                      <label className="text-sm font-semibold">Title *<input data-milestone-field={`${index}.title`} value={item.title || ''} onChange={e => updateMilestone(index, { title: e.target.value })} className={`${fieldClass('title')} mt-2`} placeholder="e.g. Discovery and technical design" />{errorFor('title') && <span className="mt-1 block text-xs text-red-500">{errorFor('title')}</span>}</label>
                      <label className="text-sm font-semibold">Amount *<input data-milestone-field={`${index}.amount`} type="number" min="0" step="0.01" value={item.amount || ''} onChange={e => updateMilestone(index, { amount: Math.round((Number(e.target.value) || 0) * 100) / 100 })} className={`${fieldClass('amount')} mt-2`} placeholder="0.00" />{errorFor('amount') && <span className="mt-1 block text-xs text-red-500">{errorFor('amount')}</span>}</label>
                      <label className="text-sm font-semibold md:col-span-2">Duration *<div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2"><input data-milestone-field={`${index}.estimatedDuration`} type="number" min="1" step="1" value={duration.amount} onChange={e => updateDuration(e.target.value, duration.unit)} className={`${fieldClass('estimatedDuration')} min-w-0`} placeholder="Estimated duration" /><select value={duration.unit} onChange={e => updateDuration(duration.amount, e.target.value as ProposalDurationUnit)} className={`${inputClass} min-w-0`}>{PROPOSAL_DURATION_UNITS.map(unit => <option key={unit}>{unit}</option>)}</select></div>{errorFor('estimatedDuration') && <span className="mt-1 block text-xs text-red-500">{errorFor('estimatedDuration')}</span>}</label>
                      <label className="text-sm font-semibold md:col-span-2">Description<textarea value={item.description || ''} onChange={e => updateMilestone(index, { description: e.target.value })} className={`${inputClass} mt-2 min-h-24 resize-y`} placeholder="Describe the scope and work included in this milestone." /></label>
                      <label className="text-sm font-semibold">Deliverables *<textarea data-milestone-field={`${index}.deliverables`} value={item.deliverables || ''} onChange={e => updateMilestone(index, { deliverables: e.target.value })} className={`${fieldClass('deliverables')} mt-2 min-h-32 resize-y`} placeholder="List the concrete outputs the client will receive." />{errorFor('deliverables') && <span className="mt-1 block text-xs text-red-500">{errorFor('deliverables')}</span>}</label>
                      <label className="text-sm font-semibold">Acceptance criteria *<textarea data-milestone-field={`${index}.acceptanceCriteria`} value={item.acceptanceCriteria || ''} onChange={e => updateMilestone(index, { acceptanceCriteria: e.target.value })} className={`${fieldClass('acceptanceCriteria')} mt-2 min-h-32 resize-y`} placeholder="Define the objective conditions for client approval." />{errorFor('acceptanceCriteria') && <span className="mt-1 block text-xs text-red-500">{errorFor('acceptanceCriteria')}</span>}</label>
                    </div>}
                  </article>
                );
              })}
            </section>

            <section className="grid gap-5 border-t border-border pt-7 md:grid-cols-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">Proposed rate</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${budgetMode === 'manual' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>{budgetMode === 'manual' ? 'Manual override' : 'Synced to milestones'}</span></div>
                <input aria-label="Proposed rate" type="number" min="0.01" step="0.01" max="9999999999999999.99" value={budgetMode === 'auto' ? (milestoneTotal || '') : manualBudget} onChange={e => { setBudgetMode('manual'); setManualBudget(e.target.value); }} className={`${inputClass} mt-2 min-w-0`} placeholder="0.00" />
                {budgetMode === 'manual' && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"><span className={proposedBudget === milestoneTotal ? 'text-emerald-600' : 'text-amber-600'}>Milestone total: {formatGigCoin(milestoneTotal)}</span><button type="button" onClick={() => { setBudgetMode('auto'); setManualBudget(''); }} className="font-semibold text-[var(--gb-cyan)] hover:underline">Use milestone total</button></div>}
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
