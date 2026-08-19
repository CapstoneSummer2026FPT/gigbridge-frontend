import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
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
import { type EditableMilestonePlan } from '../../../shared/components/NestedMilestonePlanEditor';
import {
  calculateProposalBudget,
  calculateProposalDuration,
} from '../utils/proposalTotals';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  extractCustomWorkItems,
  resolveProposalMilestonePlan,
} from '../utils/proposalMilestonePlan';
import { parseJobDuration } from '../../jobs/utils/jobDuration';

const emptyMilestone = (orderIndex: number): ProposalMilestonePlanDto => ({
  title: '',
  description: '',
  amount: 0,
  estimatedDuration: '',
  dueDate: null,
  deliverables: '',
  acceptanceCriteria: '',
  orderIndex,
});

const normalizeOrder = <T extends { orderIndex: number }>(items: T[]) =>
  items.map((item, orderIndex) => ({ ...item, orderIndex }));

export function useCreateProposal() {
  const navigate = useNavigate();
  const { t } = useTranslation(['proposals', 'common']);
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const { jobPostId, proposalId } = useParams<{ jobPostId?: string; proposalId?: string }>();
  const [jobPost, setJobPost] = useState<JobPostDetailDto | null>(null);
  const [proposal, setProposal] = useState<ProposalDetailDto | null>(null);

  // Form State
  const [coverLetter, setCoverLetter] = useState('');
  const [proposalApproach, setProposalApproach] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [assumptions, setAssumptions] = useState('');
  const [outOfScope, setOutOfScope] = useState('');
  const [workItems, setWorkItems] = useState<ProposalWorkBreakdownItemDto[]>([]);
  const [milestones, setMilestones] = useState<ProposalMilestonePlanDto[]>([emptyMilestone(0)]);
  const [expandedMilestones, setExpandedMilestones] = useState<number[]>([0]);
  const [advancedMilestoneIndexes, setAdvancedMilestoneIndexes] = useState<number[]>([]);
  const [milestoneErrors, setMilestoneErrors] = useState<Record<string, string>>({});
  const [narrativeErrors, setNarrativeErrors] = useState<{ coverLetter?: string; proposalApproach?: string }>({});

  // UI Toggles & States
  const [showJobBrief, setShowJobBrief] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const draftSavePromiseRef = useRef<Promise<string | null> | null>(null);

  const resolvedJobPostId = proposal?.jobPostId || jobPostId || '';
  const draftProposalId = proposal?.proposalId || proposalId || '';
  const defaultAcceptanceCriteria = t('proposalMilestoneEditor.defaultAcceptanceCriteria');

  const resolvedPlan = useMemo(() => resolveProposalMilestonePlan(
    milestones,
    workItems,
    defaultAcceptanceCriteria,
    jobPost?.endDate,
  ), [defaultAcceptanceCriteria, jobPost?.endDate, milestones, workItems]);

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
    setExpandedMilestones(loadedMilestones.map((_, i) => i));
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        if (proposalId) {
          const response = await proposalGetAPI.getProposalDetail(proposalId);
          if (!response.success || !response.data) return setError(response.message || tRef.current('createProposal.errLoadProposal'));
          hydrateProposal(response.data);
          const jobResponse = await jobGetAPI.getJobPostDetail(response.data.jobPostId);
          if (jobResponse.success && jobResponse.data) setJobPost(jobResponse.data);
          return;
        }
        if (!jobPostId) return setError(tRef.current('createProposal.errMissingJobId'));
        const [jobResponse, existingResponse] = await Promise.all([
          jobGetAPI.getJobPostDetail(jobPostId),
          proposalGetAPI.getMyProposalByJobPost(jobPostId),
        ]);
        if (!jobResponse.success || !jobResponse.data) return setError(jobResponse.message || tRef.current('createProposal.errLoadJob'));
        setJobPost(jobResponse.data);
        if (existingResponse.success && existingResponse.data) {
          hydrateProposal(existingResponse.data);
          setNotice(canEditProposal(existingResponse.data.status)
            ? tRef.current('createProposal.draftReadyNotice')
            : tRef.current('createProposal.readOnlyNotice', { status: getStatusLabel(existingResponse.data.status) }));
        } else if (jobResponse.data.milestonePlans?.length) {
          const baseline = normalizeOrder(jobResponse.data.milestonePlans.map(item => ({ ...item, workItems: undefined })));
          setMilestones(baseline);
          setWorkItems([]);
          setAdvancedMilestoneIndexes([]);
          setExpandedMilestones(baseline.map((_, i) => i));
          setNotice(tRef.current('createProposal.baselineCopiedNotice'));
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

  const MIN_CHARS = 50;

  const clearNarrativeError = (field: 'coverLetter' | 'proposalApproach') => {
    setNarrativeErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateForSubmit = () => {
    setMilestoneErrors({});
    const fieldErrors: { coverLetter?: string; proposalApproach?: string } = {};
    if ((coverLetter || '').trim().length < MIN_CHARS) {
      fieldErrors.coverLetter = t('createProposal.errCoverLetterMinLength', { min: MIN_CHARS });
    }
    if ((proposalApproach || '').trim().length < MIN_CHARS) {
      fieldErrors.proposalApproach = t('createProposal.errApproachMinLength', { min: MIN_CHARS });
    }
    setNarrativeErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      // Scroll to first errored field
      requestAnimationFrame(() => {
        const field = fieldErrors.coverLetter ? '[data-field="coverLetter"]' : '[data-field="proposalApproach"]';
        document.querySelector<HTMLElement>(field)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return t('createProposal.errNarrative');
    }
    const invalidWorkItem = workItems.find(item => !item.title?.trim() || !item.description?.trim());
    if (invalidWorkItem) {
      const milestoneIndex = invalidWorkItem.milestoneOrderIndex ?? 0;
      setExpandedMilestones(indexes => indexes.includes(milestoneIndex)
        ? indexes
        : [...indexes, milestoneIndex].sort((left, right) => left - right));
      setAdvancedMilestoneIndexes(indexes => indexes.includes(milestoneIndex)
        ? indexes
        : [...indexes, milestoneIndex].sort((left, right) => left - right));
      return t('createProposal.errWorkItem');
    }
    if (!milestones.length) return t('createProposal.errNoMilestones');
    if (!jobPost?.endDate) return t('createProposal.errClosingDateRequired');
    const errors: Record<string, string> = {};
    milestones.forEach((item, index) => {
      if (!item.title?.trim()) errors[`${index}.title`] = t('createProposal.errMilestoneTitleRequired');
      if (Number(item.amount) <= 0) errors[`${index}.amount`] = t('createProposal.errMilestoneAmountMin');
      if (!parseJobDuration(item.estimatedDuration).value) {
        errors[`${index}.estimatedDuration`] = 'Duration must be a positive whole number in week(s), month(s), or year(s).';
      }
      if (!item.deliverables?.trim()) errors[`${index}.deliverables`] = t('createProposal.errMilestoneDeliverablesRequired');
    });
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      const [index, field] = firstErrorKey.split('.');
      const numIndex = Number(index);
      setMilestoneErrors(errors);
      setExpandedMilestones(indexes => indexes.includes(numIndex)
        ? indexes
        : [...indexes, numIndex].sort((left, right) => left - right));
      requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(`[data-milestone-field="${index}.${field}"]`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target?.focus();
      });
      return t('createProposal.errMilestoneFields');
    }
    if (!proposedBudget || proposedBudget <= 0) return t('createProposal.errRate');
    if (!proposedDuration) return t('createProposal.errDuration');
    return '';
  };

  const persistDraftCore = async () => {
    const payload = proposalPayload();
    if (draftProposalId) {
      // Proposals that are already submitted are read-only — never PUT them.
      if (!canEditProposal(proposal?.status)) return draftProposalId;
      let response = await proposalPutAPI.updateProposal(draftProposalId, payload);
      // A resumed question session may finish a stale request immediately before
      // this submit. Repeating this idempotent draft replacement resolves that race.
      if (!response.success && response.statusCode === 409) {
        response = await proposalPutAPI.updateProposal(draftProposalId, payload);
      }
      if (!response.success) { setError(response.message || t('createProposal.errLoadProposal')); return null; }
      return draftProposalId;
    }
    if (!resolvedJobPostId) { setError(t('createProposal.errMissingJobId')); return null; }
    const response = await proposalPostAPI.createProposal({ jobPostsId: resolvedJobPostId, ...payload });
    if (response.success && response.data) {
      setProposal({ proposalId: response.data, jobPostId: resolvedJobPostId, freelancerProfileId: '', status: ProposalStatus.Draft, ...payload });
      return response.data;
    }
    // Hydration may have missed an existing proposal; recover it instead of erroring.
    const existing = await proposalGetAPI.getMyProposalByJobPost(resolvedJobPostId);
    if (existing.success && existing.data) {
      hydrateProposal(existing.data);
      return existing.data.proposalId;
    }
    setError(response.message || t('createProposal.errLoadProposal'));
    return null;
  };

  const persistDraft = () => {
    // Save Draft and Submit may be clicked almost simultaneously. Reuse the same
    // in-flight write so the browser never races itself with duplicate PUT calls.
    if (draftSavePromiseRef.current) return draftSavePromiseRef.current;

    const save = persistDraftCore().finally(() => {
      draftSavePromiseRef.current = null;
    });
    draftSavePromiseRef.current = save;
    return save;
  };

  const handleSaveDraft = async () => {
    setSubmitting(true); setError('');
    const saved = await persistDraft();
    setSubmitting(false);
    if (saved) {
      toast.success(t('createProposal.draftSavedToast'));
      navigate('/proposals');
    }
  };

  const handleSubmit = async () => {
    const validation = validateForSubmit();
    if (validation) {
      toast.error(validation);
      return setError(validation);
    }
    // Already-submitted proposals are read-only: don't re-PUT or re-enter the interview.
    if (proposal && !canEditProposal(proposal.status)) {
      toast.info(t('createProposal.readOnlyNotice', { status: getStatusLabel(proposal.status) }));
      navigate('/proposals', { state: { submittedProposalId: proposal.proposalId } });
      return;
    }
    setSubmitting(true); setError('');
    const savedId = await persistDraft();
    if (!savedId || !resolvedJobPostId) return setSubmitting(false);

    if (jobPost?.hasAiInterview) {
      setSubmitting(false);
      navigate(`/ai-interview/${resolvedJobPostId}?proposalId=${savedId}`);
      return;
    }

    const questionsResponse = await jobGetAPI.getJobPostQuestions(resolvedJobPostId);
    if (!questionsResponse.success) {
      setSubmitting(false);
      return setError(questionsResponse.message || 'Clarifying questions could not be loaded.');
    }
    if ((questionsResponse.data || []).length > 0) {
      setSubmitting(false);
      navigate(`/proposals/create/${resolvedJobPostId}/questions?proposalId=${savedId}`, { state: { proposalId: savedId, jobPostId: resolvedJobPostId } });
      return;
    }
    const response = await proposalPatchAPI.updateProposalStatus(savedId, { status: ProposalStatus.Pending });
    setSubmitting(false);
    if (!response.success) return setError(response.message || 'Proposal was saved, but could not be submitted.');
    toast.success(t('createProposal.submittedSuccessToast'));
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

  return {
    t,
    navigate,
    proposalId,
    jobPost,
    proposal,
    coverLetter,
    setCoverLetter,
    proposalApproach,
    setProposalApproach,
    deliverables,
    setDeliverables,
    assumptions,
    setAssumptions,
    outOfScope,
    setOutOfScope,
    expandedMilestones,
    setExpandedMilestones,
    expandedMilestone: expandedMilestones[0] ?? null,
    setExpandedMilestone: (index: number | null) => setExpandedMilestones(index !== null ? [index] : []),
    advancedMilestoneIndexes,
    setAdvancedMilestoneIndexes,
    milestoneErrors,
    narrativeErrors,
    clearNarrativeError,
    showJobBrief,
    setShowJobBrief,
    loading,
    submitting,
    error,
    notice,
    proposedBudget,
    proposedDuration,
    nestedMilestones,
    updateNestedPlan,
    handleSaveDraft,
    handleSubmit,
  };
}
