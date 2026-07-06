import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
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

const durationUnits = ['days', 'weeks', 'months'];

const parseDuration = (value?: string | null) => {
  const match = value?.match(/^(\d+)\s+([a-zA-Z]+)$/);
  return match
    ? { amount: match[1], unit: durationUnits.includes(match[2].toLowerCase()) ? match[2].toLowerCase() : 'weeks' }
    : { amount: '1', unit: 'weeks' };
};

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
  const proposedDuration = `${Math.max(1, Number(durationAmount) || 1)} ${durationUnit}`;
  const milestoneTotal = useMemo(
    () => milestones.reduce((total, item) => total + (Number(item.amount) || 0), 0),
    [milestones]
  );
  const parsedBudget = proposedBudget.trim() ? Number(proposedBudget) : null;
  const budgetValue = parsedBudget ?? 0;
  const totalsMatch = parsedBudget !== null && parsedBudget > 0 && Math.abs(milestoneTotal - parsedBudget) < 0.01;

  const hydrateProposal = (loaded: ProposalDetailDto) => {
    setProposal(loaded);
    setCoverLetter(loaded.coverLetter || '');
    setAnalysisSummary(loaded.analysisSummary || '');
    setSolutionApproach(loaded.solutionApproach || '');
    setDeliverables(loaded.deliverables || '');
    setAssumptions(loaded.assumptions || '');
    setOutOfScope(loaded.outOfScope || '');
    setWorkItems(loaded.workBreakdownItems?.length ? normalizeOrder(loaded.workBreakdownItems) : [emptyWorkItem(0)]);
    setMilestones(loaded.milestonePlans?.length ? normalizeOrder(loaded.milestonePlans) : [emptyMilestone(0)]);
    setProposedBudget(String(loaded.proposedBudget ?? ''));
    const parsed = parseDuration(loaded.proposedDuration);
    setDurationAmount(parsed.amount);
    setDurationUnit(parsed.unit);
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
    proposedBudget: parsedBudget && parsedBudget > 0 ? parsedBudget : null,
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
    if (coverLetter.trim().length < 50) return 'Introduction must be at least 50 characters.';
    if (analysisSummary.trim().length < 50) return 'Requirement analysis must be at least 50 characters.';
    if (solutionApproach.trim().length < 50) return 'Solution approach must be at least 50 characters.';
    if (!parsedBudget || parsedBudget <= 0) return 'Proposed budget must be greater than 0.';
    if (!workItems.length || workItems.some(item => !item.title?.trim())) return 'Every work breakdown item needs a title.';
    if (!milestones.length || milestones.some(item => !item.title?.trim() || Number(item.amount) <= 0 || !item.deliverables?.trim() || !item.acceptanceCriteria?.trim())) {
      return 'Every milestone needs a title, amount, deliverables, and acceptance criteria.';
    }
    if (!totalsMatch) return 'Milestone total must equal the proposed budget.';
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
    navigate('/proposals');
  };

  const updateWorkItem = (index: number, patch: Partial<ProposalWorkBreakdownItemDto>) =>
    setWorkItems(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const updateMilestone = (index: number, patch: Partial<ProposalMilestonePlanDto>) =>
    setMilestones(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
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
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Milestone and payment plan</h2><p className={`mt-1 text-sm ${totalsMatch ? 'text-emerald-500' : 'text-amber-600'}`}>Total {formatGigCoin(milestoneTotal)} / Budget {formatGigCoin(budgetValue)}</p></div><button type="button" onClick={() => setMilestones(items => [...items, emptyMilestone(items.length)])} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"><Plus size={16} /> Add milestone</button></div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-muted/30 text-xs uppercase text-muted-foreground"><tr><th className="p-3">Milestone</th><th className="p-3">Description</th><th className="p-3">Amount</th><th className="p-3">Duration</th><th className="p-3">Deliverables</th><th className="p-3">Acceptance criteria</th><th className="w-28 p-3">Actions</th></tr></thead><tbody>
                  {milestones.map((item, index) => <tr key={item.id || index} className="border-t border-border align-top"><td className="p-2"><input value={item.title || ''} onChange={e => updateMilestone(index, { title: e.target.value })} className={inputClass} placeholder="Title" /></td><td className="p-2"><textarea value={item.description || ''} onChange={e => updateMilestone(index, { description: e.target.value })} className={inputClass} rows={2} placeholder="Scope notes" /></td><td className="p-2"><input type="number" min="0" value={item.amount || ''} onChange={e => updateMilestone(index, { amount: Number(e.target.value) })} className={inputClass} /></td><td className="p-2"><input value={item.estimatedDuration || ''} onChange={e => updateMilestone(index, { estimatedDuration: e.target.value })} className={inputClass} /></td><td className="p-2"><textarea value={item.deliverables || ''} onChange={e => updateMilestone(index, { deliverables: e.target.value })} className={inputClass} rows={2} /></td><td className="p-2"><textarea value={item.acceptanceCriteria || ''} onChange={e => updateMilestone(index, { acceptanceCriteria: e.target.value })} className={inputClass} rows={2} /></td><td className="p-2"><div className="flex gap-1"><button title="Move up" onClick={() => moveItem(milestones, index, -1, setMilestones)}><ArrowUp size={15} /></button><button title="Move down" onClick={() => moveItem(milestones, index, 1, setMilestones)}><ArrowDown size={15} /></button><button title="Remove" onClick={() => setMilestones(items => normalizeOrder(items.filter((_, i) => i !== index)))}><Trash2 size={15} /></button></div></td></tr>)}
                </tbody></table>
              </div>
            </section>

            <section className="grid gap-4 border-t border-border pt-7 md:grid-cols-2">
              <label className="text-sm font-semibold">Proposed budget<input type="number" min="1" value={proposedBudget} onChange={e => setProposedBudget(e.target.value)} className={`${inputClass} mt-2`} /></label>
              <div><span className="text-sm font-semibold">Duration</span><div className="mt-2 grid grid-cols-[1fr_auto] gap-2"><input type="number" min="1" value={durationAmount} onChange={e => setDurationAmount(e.target.value)} className={inputClass} /><select value={durationUnit} onChange={e => setDurationUnit(e.target.value)} className={inputClass}>{durationUnits.map(unit => <option key={unit}>{unit}</option>)}</select></div></div>
            </section>

            <footer className="flex justify-end gap-3 border-t border-border pt-5"><button type="button" onClick={handleSaveDraft} disabled={submitting} className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-bold disabled:opacity-60"><Save size={16} /> Save draft</button><button type="button" onClick={handleSubmit} disabled={submitting} className="btn-cyan inline-flex items-center gap-2 px-5 py-2.5 text-sm"><Send size={16} /> Submit proposal</button></footer>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
