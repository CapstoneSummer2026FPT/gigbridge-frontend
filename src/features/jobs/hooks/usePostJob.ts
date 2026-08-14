import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useBlocker, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { GIGCOIN_CURRENCY_CODE } from '../../../shared/utils/gigcoin';
import { jobAPI } from '../../../api/jobAPI';
import type { CategoryOptionDto, MajorDto, SkillOptionDto } from '../../../types/models/Category';

import {
  JobPostVisibility,
  JobPostStatus,
  type CreateDraftJobPostResponse,
  type GetMyJobPostDetailDto,
  type JobPostQuestionDto,
  type SaveDraftJobPostRequest,
  type JobPostMilestonePlanDto,
  type JobPostAttachmentDto,
  type GenerateJobDescriptionDetailsResponse,
} from '../../../types/models/Job';
import {
  durationToDays,
  durationToWeeks,
  formatJobDuration,
  isValidJobDurationValue,
  parseJobDuration,
  type JobDurationUnit,
} from '../utils/jobDuration';
import { clampMilestonesToExpectedTargets } from '../utils/milestoneClamping';

const MAX_QUESTION_LENGTH = 1000;
const DEFAULT_DRAFT_TITLE = 'Untitled Job Post';
const EMPTY_DRAFT_KEPT_MESSAGE = 'This draft already contains information, so it was kept as a saved draft.';

// Pure calendar-date math done entirely in UTC so it's unaffected by the browser's
// local timezone offset — parsing "YYYY-MM-DD" at local midnight and round-tripping
// through toISOString() would silently lose a day for any timezone ahead of UTC
// (e.g. Vietnam, UTC+7), since local midnight is still the previous evening in UTC.
const addDaysToDateString = (dateString: string, days: number): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().split('T')[0];
};

export interface QuestionInput {
  questionText: string;
  isRequired: boolean;
}

export interface OrderedQuestionInput extends QuestionInput {
  orderIndex: number;
}

export interface PostJobFormState {
  title: string;
  majorId: string;
  majorCategoryId: string;
  categoryId: string;
  description: string;
  skillIds: string[];
  customSkillNames: string[];
  budget: string;
  currency: string;
  estimatedDurationValue: string;
  estimatedDurationUnit: JobDurationUnit;
  visibility: string;
  deadline: string;
  isAigenerated: boolean;
}

export interface PostJobRouteQuestion {
  questionText?: string | null;
  question?: string | null;
  isRequired?: boolean | null;
}

export interface PostJobRouteJobData {
  title?: string | null;
  majorId?: string | null;
  majorName?: string | null;
  majorCategoryId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  description?: string | null;
  skillIds?: readonly string[] | null;
  customSkillNames?: readonly string[] | null;
  customSkills?: readonly string[] | null;
  budgetMin?: string | number | null;
  budgetMax?: string | number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  attachments?: readonly JobPostAttachmentDto[] | null;
  visibility?: string | number | null;
  deadline?: string | null;
  endDate?: string | null;
  isAigenerated?: boolean | null;
  skillNameById?: Record<string, string>;
  skillNamesById?: Record<string, string>;
  interviewQuestions?: readonly PostJobRouteQuestion[] | null;
  milestonePlans?: JobPostMilestonePlanDto[] | null;
}

export interface PostJobRouteState {
  jobPostId?: string | null;
  jobData?: PostJobRouteJobData | null;
}

export type PostJobSubmitMode = 'draft' | 'plan' | 'review' | 'publish';
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type PostJobReviewSection = 'project' | 'terms' | 'hiringPlan';
export type PostJobSubmitResult =
  | { status: 'success' }
  | { status: 'validation-error'; section: PostJobReviewSection; fieldSelector?: string }
  | { status: 'budget-exceeded' }
  | { status: 'error' };
type LeaveAction = 'save' | 'discard' | null;

/**
 * True when a client-entered expected budget exists and the milestone plan
 * total exceeds it — the "budget-exceeded" confirmation should be shown.
 * A missing/zero expected budget means there is nothing to exceed, so no
 * confirmation is shown.
 */
export const shouldConfirmBudgetOverride = (budgetValue: string, milestonePlanTotal: number): boolean => {
  const expected = Number(budgetValue);
  return expected > 0 && milestonePlanTotal > expected;
};

/**
 * True when the milestone plan's total duration (in weeks) exceeds the job
 * post's estimated duration (in weeks) — the "duration-exceeded" confirmation
 * is shown alongside the budget one. A missing/zero estimated duration means
 * there is nothing to exceed, so no confirmation is shown.
 */
export const shouldConfirmDurationOverride = (
  milestoneTotalWeeks: number,
  expectedDurationWeeks: number,
): boolean => expectedDurationWeeks > 0 && milestoneTotalWeeks > expectedDurationWeeks;

interface PostJobValidationIssue {
  message: string;
  section: PostJobReviewSection;
  fieldSelector?: string;
}

type DraftResponseWithLegacyId = CreateDraftJobPostResponse & {
  JobPostId?: string;
};

let draftJobPostRequest: Promise<string> | null = null;

const createDraftJobPostOnce = async (): Promise<string> => {
  if (!draftJobPostRequest) {
    draftJobPostRequest = jobAPI.createDraftJobPost()
      .then(response => {
        const data = response.data as DraftResponseWithLegacyId | undefined;
        const jobPostId = data?.jobPostId ?? data?.JobPostId;

        if (!response.success || !jobPostId) {
          throw new Error(response.message || 'Draft JobPost could not be created.');
        }

        return String(jobPostId);
      })
      .finally(() => {
        draftJobPostRequest = null;
      });
  }

  return draftJobPostRequest;
};

const emptyQuestion = (): QuestionInput => ({ questionText: '', isRequired: true });

const withoutWorkBreakdownItems = (
  milestones: readonly JobPostMilestonePlanDto[],
): JobPostMilestonePlanDto[] => milestones.map(milestone => ({
  ...milestone,
  workItems: [],
}));

const normalizeSkillName = (value: string): string => value.trim().toLowerCase()
  .replaceAll('#', 'sharp').replaceAll('+', 'plus').replaceAll('&', 'and')
  .replace(/[^\p{L}\p{N}]/gu, '');

const isDefaultDraftTitle = (value: string): boolean => {
  const title = value.trim();
  return !title || title.toLowerCase() === DEFAULT_DRAFT_TITLE.toLowerCase() || title.toLowerCase() === 'untitled draft';
};

const toStringValue = (value: string | number | null | undefined): string => (
  value !== undefined && value !== null ? String(value) : ''
);

const initialQuestionsFromState = (initialJobData?: PostJobRouteJobData | null): QuestionInput[] => {
  const initialQuestions = initialJobData?.interviewQuestions?.map(question => ({
    questionText: question.questionText || question.question || '',
    isRequired: question.isRequired ?? true,
  })) || [];

  return initialQuestions.length > 0 ? initialQuestions : [emptyQuestion()];
};

const questionsFromDtos = (questions: JobPostQuestionDto[]): QuestionInput[] => {
  const mapped = [...questions]
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map(question => ({
      questionText: question.questionText || '',
      isRequired: question.isRequired ?? true,
    }));

  return mapped.length > 0 ? mapped : [emptyQuestion()];
};

const formFromJobDetail = (job: GetMyJobPostDetailDto): PostJobFormState => ({
  ...(() => {
    const duration = parseJobDuration(job.estimatedDuration);
    return {
      estimatedDurationValue: duration.value,
      estimatedDurationUnit: duration.unit,
    };
  })(),
  title: isDefaultDraftTitle(job.title || '') ? '' : job.title || '',
  description: job.description || '',
  majorId: job.majorId || '',
  majorCategoryId: job.majorCategoryId || '',
  categoryId: job.categoryId || '',
  skillIds: job.skills?.map(skill => skill.skillsId.toLowerCase()) || [],
  customSkillNames: job.customSkillNames || [],
  budget: toStringValue(job.budgetMin ?? job.budgetMax),
  currency: job.currency || GIGCOIN_CURRENCY_CODE,
  visibility: String(job.visibility ?? JobPostVisibility.Public),
  deadline: job.endDate?.split?.('T')?.[0] || '',
  isAigenerated: false,
});

const initialFormFromState = (initialJobData?: PostJobRouteJobData | null): PostJobFormState => {
  const duration = parseJobDuration(initialJobData?.estimatedDuration);

  return {
    title: initialJobData?.title || '',
    majorId: initialJobData?.majorId || '',
    majorCategoryId: initialJobData?.majorCategoryId || '',
    categoryId: initialJobData?.categoryId || '',
    description: initialJobData?.description || '',
    skillIds: (initialJobData?.skillIds || []).map(id => id.toLowerCase()),
    customSkillNames: [...(initialJobData?.customSkillNames || initialJobData?.customSkills || [])],
    budget: toStringValue(initialJobData?.budgetMin ?? initialJobData?.budgetMax),
    currency: initialJobData?.currency || GIGCOIN_CURRENCY_CODE,
    estimatedDurationValue: duration.value,
    estimatedDurationUnit: duration.unit,
    visibility: String(initialJobData?.visibility ?? JobPostVisibility.Public),
    deadline: initialJobData?.deadline || initialJobData?.endDate?.split?.('T')?.[0] || '',
    isAigenerated: initialJobData?.isAigenerated ?? false,
  };
};

export function usePostJob() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');
  const routeState = location.state as PostJobRouteState | null;
  const initialJobData = routeState?.jobData ?? null;
  const initialJobPostId = routeState?.jobPostId ? String(routeState.jobPostId) : null;
  const hasBudgetFromWizardNavigation = initialJobData !== null
    && (initialJobData.budgetMin !== undefined || initialJobData.budgetMax !== undefined);
  const navigationAllowedRef = useRef(false);

  const [skillInput, setSkillInput] = useState('');
  const [submitMode, setSubmitMode] = useState<PostJobSubmitMode | null>(null);
  const [isBudgetExceededPromptOpen, setIsBudgetExceededPromptOpen] = useState(false);
  const [pendingBudgetSubmitMode, setPendingBudgetSubmitMode] = useState<PostJobSubmitMode | null>(null);
  const budgetOverrideRef = useRef<string | null>(null);
  const durationOverrideRef = useRef(false);
  const [leaveAction, setLeaveAction] = useState<LeaveAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobPostId, setJobPostId] = useState<string | null>(initialJobPostId);
  const jobPostIdRef = useRef<string | null>(initialJobPostId);
  const [isDraftInitializing, setIsDraftInitializing] = useState(Boolean(initialJobPostId));
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftRequestAttempt, setDraftRequestAttempt] = useState(0);
  const [isLeavePromptOpen, setIsLeavePromptOpen] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestDraftSignatureRef = useRef('');
  const [taxonomyDisplayNames, setTaxonomyDisplayNames] = useState({
    majorName: initialJobData?.majorName || '',
    categoryName: initialJobData?.categoryName || '',
  });

  const [isInstantJobMode, setIsInstantJobMode] = useState(() => {
    return (location.state as any)?.instantJobMode ?? false;
  });
  const [isJobDetailsGenerated, setIsJobDetailsGenerated] = useState(false);
  const [isGeneratingInstant, setIsGeneratingInstant] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [aiClientPrompt, setAiClientPrompt] = useState<string>(() => {
    return (location.state as any)?.aiClientPrompt ?? '';
  });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [pendingGeneratedDetails, setPendingGeneratedDetails] = useState<GenerateJobDescriptionDetailsResponse | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isHiringPlanGenerated, setIsHiringPlanGenerated] = useState(() => {
    return (location.state as any)?.hiringPlanGenerated ?? false;
  });
  const [backgroundHiringPlanStatus, setBackgroundHiringPlanStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [backgroundHiringPlanError, setBackgroundHiringPlanError] = useState<string | null>(null);
  const backgroundHiringPlanPromiseRef = useRef<Promise<{ milestones: JobPostMilestonePlanDto[]; questions: QuestionInput[] } | null> | null>(null);
  // Tracks the current generation so stale Flow 2 results (Scenarios 2 & 3) are silently discarded
  const generationIdRef = useRef(0);
  // Cancels the in-flight HTTP fetch (Browser → ASP.NET) when user re-prompts
  const hiringPlanAbortRef = useRef<AbortController | null>(null);


  const [majors, setMajors] = useState<MajorDto[]>([]);
  const [categories, setCategories] = useState<CategoryOptionDto[]>([]);
  const [availableSkills, setAvailableSkills] = useState<SkillOptionDto[]>([]);
  const [isMajorsLoading, setIsMajorsLoading] = useState(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [isSkillsLoading, setIsSkillsLoading] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [skillNameById, setSkillNameById] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    const srcMap = initialJobData?.skillNameById || initialJobData?.skillNamesById || {};
    Object.entries(srcMap).forEach(([k, v]) => {
      initialMap[k.toLowerCase()] = v;
    });
    return initialMap;
  });

  const skillNameByIdRef = useRef(skillNameById);
  useEffect(() => {
    skillNameByIdRef.current = skillNameById;
  }, [skillNameById]);

  const [form, setForm] = useState<PostJobFormState>(() => initialFormFromState(initialJobData));
  const [questions, setQuestions] = useState<QuestionInput[]>(() => initialQuestionsFromState(initialJobData));
  const [milestonePlans, setMilestonePlans] = useState<JobPostMilestonePlanDto[]>(() =>
    withoutWorkBreakdownItems(initialJobData?.milestonePlans || []));
  const [attachments, setAttachments] = useState<JobPostAttachmentDto[]>(() => [...(initialJobData?.attachments || [])]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [milestoneErrors, setMilestoneErrors] = useState<Record<string, string>>({});
  const [expandedMilestones, setExpandedMilestones] = useState<number[]>(() =>
    initialJobData?.milestonePlans?.length ? [0] : [0]
  );
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(
    initialJobData?.milestonePlans?.length ? 0 : null
  );
  const milestonePlanTotal = useMemo(
    () => milestonePlans.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [milestonePlans]
  );

  const milestoneTotalWeeks = useMemo(
    () => milestonePlans.reduce((sum, milestone) => {
      const { value, unit } = parseJobDuration(milestone.estimatedDuration);
      return sum + durationToWeeks(value, unit);
    }, 0),
    [milestonePlans]
  );

  const expectedDurationWeeks = form.estimatedDurationValue
    ? durationToWeeks(form.estimatedDurationValue, form.estimatedDurationUnit)
    : 0;

  const isBudgetExceeded = shouldConfirmBudgetOverride(form.budget, milestonePlanTotal);
  const isDurationExceeded = shouldConfirmDurationOverride(milestoneTotalWeeks, expectedDurationWeeks);

  const questionsWithOrder = useMemo<OrderedQuestionInput[]>(
    () => questions.map((question, index) => ({ ...question, orderIndex: index })),
    [questions]
  );

  const hasSavableDraftContent = useMemo(() => {
    const visibility = Number(form.visibility);

    return !isDefaultDraftTitle(form.title) ||
      Boolean(form.description.trim()) ||
      Boolean(form.majorCategoryId) ||
      Boolean(form.budget) ||
      Boolean(form.currency.trim() && form.currency.trim().toUpperCase() !== GIGCOIN_CURRENCY_CODE) ||
      Boolean(form.estimatedDurationValue.trim()) ||
      Boolean(form.deadline) ||
      (!Number.isNaN(visibility) && visibility !== JobPostVisibility.Public) ||
      form.skillIds.length > 0 ||
      form.customSkillNames.length > 0 ||
      questions.some(question => Boolean(question.questionText.trim())) ||
      milestonePlans.length > 0 ||
      attachments.length > 0;
  }, [form, questions, milestonePlans, attachments.length]);

  const shouldBlockNavigation = (isDirty || autosaveStatus === 'saving' || autosaveStatus === 'error') &&
    !navigationAllowedRef.current &&
    !isDraftInitializing &&
    submitMode === null;

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        shouldBlockNavigation && currentLocation.pathname !== nextLocation.pathname,
      [shouldBlockNavigation]
    )
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setIsLeavePromptOpen(true);
    }
  }, [blocker.state]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (!shouldBlockNavigation) return;

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlockNavigation]);

  useEffect(() => {
    if (!isInstantJobMode) {
      setErrorMessage(null);
    }
  }, [isInstantJobMode]);

  // Milestone deadlines are fully derived: Milestone 1 starts the day after the job's
  // closing date (form.deadline), and each following milestone starts the day after the
  // previous milestone's computed deadline — work can't begin the same calendar day the
  // prior stage ends. This recalculates on every trigger that can affect it (duration
  // edits, add/remove/reorder, or form.deadline changing) since it's a plain memo over
  // the current milestonePlans/form.deadline, not a stateful effect.
  const milestonePlansWithDeadlines = useMemo<JobPostMilestonePlanDto[]>(() => {
    let nextStart = form.deadline ? addDaysToDateString(form.deadline, 1) : null;

    return milestonePlans.map(milestone => {
      const duration = parseJobDuration(milestone.estimatedDuration);
      const days = duration.value ? durationToDays(duration.value, duration.unit) : 0;

      if (!nextStart || days <= 0) {
        nextStart = null;
        return { ...milestone, dueDate: null };
      }

      // The start day itself counts as day 1 of the duration, so the deadline is
      // `days - 1` after the start (e.g. a 7-day span starting Aug 2 ends Aug 8).
      const newDueDate = addDaysToDateString(nextStart, days - 1);
      nextStart = addDaysToDateString(newDueDate, 1);
      return { ...milestone, dueDate: newDueDate };
    });
  }, [form.deadline, milestonePlans]);

  useEffect(() => {
    let isMounted = true;
    setIsMajorsLoading(true);
    setTaxonomyError(null);

    jobAPI.getMajors()
      .then(response => {
        if (!isMounted) return;
        if (!response.success || !response.data) {
          setMajors([]);
          setTaxonomyError(response.message || 'Unable to load majors.');
          return;
        }

        setMajors(response.data);
      })
      .finally(() => {
        if (isMounted) setIsMajorsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!initialJobPostId) {
      setIsDraftInitializing(false);
      return;
    }

    let isMounted = true;
    jobPostIdRef.current = initialJobPostId;
    setJobPostId(initialJobPostId);
    setIsDraftInitializing(true);
    setDraftError(null);

    Promise.all([
      jobAPI.getMyJobPostById(initialJobPostId),
      jobAPI.getJobPostQuestions(initialJobPostId),
    ])
      .then(([jobResponse, questionsResponse]) => {
        if (!isMounted) return;

        if (!jobResponse.success || !jobResponse.data) {
          const message = jobResponse.message || 'Draft JobPost could not be loaded.';
          setDraftError(message);
          setErrorMessage(message);
          return;
        }

        const job = jobResponse.data;
        const loadedForm = formFromJobDetail(job);

        setForm(current => ({
          ...loadedForm,
          // The route state contains the values that were just saved in step 1.
          // Keep its expected budget while the detail request hydrates step 2;
          // an older/null response must not make the value flash and disappear.
          budget: hasBudgetFromWizardNavigation ? current.budget : loadedForm.budget,
        }));
        setTaxonomyDisplayNames({
          majorName: job.majorName || '',
          categoryName: job.categoryName || '',
        });
        const activeBudget = Number(hasBudgetFromWizardNavigation ? form.budget : loadedForm.budget) || null;
        const activeWeeks = loadedForm.estimatedDurationValue ? durationToWeeks(loadedForm.estimatedDurationValue, loadedForm.estimatedDurationUnit) : 0;
        const hydratedPlans = withoutWorkBreakdownItems(job.milestonePlans || []);
        setMilestonePlans(clampMilestonesToExpectedTargets(hydratedPlans, activeBudget, activeWeeks));
        setAttachments(job.attachments || []);
        setExpandedMilestone(job.milestonePlans?.length ? 0 : null);
        setSkillNameById(prev => {
          const next = { ...prev };
          (job.skills || []).forEach(skill => {
            next[skill.skillsId.toLowerCase()] = skill.skillName;
          });
          return next;
        });

        if (questionsResponse.success && questionsResponse.data) {
          setQuestions(questionsFromDtos(questionsResponse.data));
        } else {
          setQuestions([emptyQuestion()]);
        }
      })
      .catch(error => {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Draft JobPost could not be loaded.';
        setDraftError(message);
        setErrorMessage(message);
      })
      .finally(() => {
        if (isMounted) setIsDraftInitializing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialJobPostId, draftRequestAttempt, hasBudgetFromWizardNavigation]);

  useEffect(() => {
    if (!form.majorId) {
      setCategories([]);
      return;
    }

    let isMounted = true;
    setIsCategoriesLoading(true);
    setTaxonomyError(null);

    jobAPI.getCategoriesByMajor(form.majorId)
      .then(response => {
        if (!isMounted) return;
        if (!response.success || !response.data) {
          setCategories([]);
          setTaxonomyError(response.message || 'Unable to load categories for the selected major.');
          return;
        }

        setCategories(response.data);
      })
      .finally(() => {
        if (isMounted) setIsCategoriesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [form.majorId]);

  useEffect(() => {
    if (!form.categoryId) {
      setAvailableSkills([]);
      setForm(prev => ({ ...prev, skillIds: [] }));
      return;
    }

    let isMounted = true;
    setIsSkillsLoading(true);
    setTaxonomyError(null);

    jobAPI.getSkillsByCategory(form.categoryId)
      .then(response => {
        if (!isMounted) return;
        if (!response.success || !response.data) {
          setAvailableSkills([]);
          setTaxonomyError(response.message || 'Unable to load skills for the selected category.');
          return;
        }

        const newSkills = response.data;
        setAvailableSkills(newSkills);
        setSkillNameById(prev => {
          const next = { ...prev };
          newSkills.forEach(skill => {
            next[skill.skillId.toLowerCase()] = skill.name;
          });
          return next;
        });

        // Filter selected official skills and convert mismatched ones to custom skills
        const newSkillIds = newSkills.map(s => s.skillId.toLowerCase());
        setForm(prev => {
          const preservedSkillIds: string[] = [];
          const convertedCustomNames: string[] = [];

          prev.skillIds.forEach(id => {
            const idLower = id.toLowerCase();
            if (newSkillIds.includes(idLower)) {
              preservedSkillIds.push(idLower);
            } else {
              const name = skillNameByIdRef.current[idLower] || newSkills.find(s => s.skillId.toLowerCase() === idLower)?.name || 'Unknown skill';
              if (name && name !== 'Unknown skill' && !prev.customSkillNames.includes(name)) {
                convertedCustomNames.push(name);
              }
            }
          });

          return {
            ...prev,
            skillIds: preservedSkillIds,
            customSkillNames: [...prev.customSkillNames, ...convertedCustomNames],
          };
        });
      })
      .finally(() => {
        if (isMounted) setIsSkillsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [form.categoryId]);

  const selectedOfficialSkills = useMemo(
    () => form.skillIds.map(skillId => ({
      skillId,
      name: skillNameById[skillId] || availableSkills.find(skill => skill.skillId === skillId)?.name || 'Unknown skill',
    })),
    [availableSkills, form.skillIds, skillNameById]
  );

  const remainingSkills = useMemo(
    () => availableSkills.filter(skill => !form.skillIds.includes(skill.skillId)),
    [availableSkills, form.skillIds]
  );

  const isSubmitting = submitMode !== null || leaveAction !== null;
  const isActionDisabled = isSubmitting || isDraftInitializing;
  const previewTitle = form.title.trim() || 'Untitled Job Post';
  const selectedMajorName = majors.find(major => major.majorId === form.majorId)?.name
    || taxonomyDisplayNames.majorName;
  const selectedCategoryName = categories.find(category => category.majorCategoryId === form.majorCategoryId)?.name
    || taxonomyDisplayNames.categoryName;

  const allowNextNavigation = (): void => {
    navigationAllowedRef.current = true;
  };

  const resetToNewDraft = (): void => {
    navigationAllowedRef.current = false;
    setJobPostId(null);
    jobPostIdRef.current = null;
    setAutosaveStatus('idle');
    setAutosaveError(null);
    setIsDirty(false);
    latestDraftSignatureRef.current = '';
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setDraftError(null);
    setErrorMessage(null);
    setSkillInput('');
    setAvailableSkills([]);
    setCategories([]);
    setSkillNameById({});
    setForm(initialFormFromState(null));
    setQuestions([emptyQuestion()]);
    setMilestonePlans([]);
    setAttachments([]);
    setAttachmentError(null);
    hiringPlanAbortRef.current?.abort('Draft reset');
    hiringPlanAbortRef.current = null;
    generationIdRef.current += 1;
    backgroundHiringPlanPromiseRef.current = null;
    setBackgroundHiringPlanStatus('idle');
    setBackgroundHiringPlanError(null);
  };

  const insertMarkdown = (before: string, after: string): void => {
    setForm(prev => ({ ...prev, description: prev.description + before + after }));
  };

  const handleMajorChange = (majorId: string): void => {
    setSkillInput('');
    setAvailableSkills([]);
    setTaxonomyDisplayNames({ majorName: '', categoryName: '' });
    setForm(prev => ({
      ...prev,
      majorId,
      majorCategoryId: '',
      categoryId: '',
      skillIds: [],
      customSkillNames: [],
    }));
  };

  const handleCategoryChange = (majorCategoryId: string): void => {
    const selectedCategory = categories.find(category => category.majorCategoryId === majorCategoryId);
    setTaxonomyDisplayNames(current => ({
      ...current,
      categoryName: selectedCategory?.name || '',
    }));
    setSkillInput('');
    setForm(prev => ({
      ...prev,
      majorCategoryId,
      categoryId: selectedCategory?.categoryId || '',
    }));
  };

  const addOfficialSkill = (skill: SkillOptionDto): void => {
    if (form.skillIds.length + form.customSkillNames.length >= 10) {
      toast.error(t('postJobWizard.validation.skillLimit'));
      return;
    }

    const skillIdLower = skill.skillId.toLowerCase();
    setSkillNameById(prev => ({ ...prev, [skillIdLower]: skill.name }));
    setForm(prev => {
      if (prev.skillIds.map(id => id.toLowerCase()).includes(skillIdLower)) {
        return prev;
      }

      return { ...prev, skillIds: [...prev.skillIds, skillIdLower] };
    });
  };

  const addSkill = (skillName: string): void => {
    const trimmedSkillName = skillName.trim();
    if (!trimmedSkillName) {
      return;
    }

    if (!form.categoryId) {
      toast.error(t('postJobWizard.validation.selectCategoryFirst'));
      return;
    }

    if (form.skillIds.length + form.customSkillNames.length >= 10) {
      toast.error(t('postJobWizard.validation.skillLimit'));
      return;
    }

    const officialSkill = availableSkills.find(
      skill => normalizeSkillName(skill.name) === normalizeSkillName(trimmedSkillName)
    );

    if (officialSkill) {
      addOfficialSkill(officialSkill);
      setSkillInput('');
      return;
    }

    setForm(prev => {
      const alreadyExists = prev.customSkillNames.some(
        customSkillName => normalizeSkillName(customSkillName) === normalizeSkillName(trimmedSkillName)
      );

      if (alreadyExists) {
        return prev;
      }

      return { ...prev, customSkillNames: [...prev.customSkillNames, trimmedSkillName] };
    });
    setSkillInput('');
  };

  const removeOfficialSkill = (skillId: string): void => {
    const skillIdLower = skillId.toLowerCase();
    setForm(prev => ({ ...prev, skillIds: prev.skillIds.filter(item => item.toLowerCase() !== skillIdLower) }));
  };

  const removeCustomSkill = (skillName: string): void => {
    const normalized = normalizeSkillName(skillName);
    setForm(prev => ({
      ...prev,
      customSkillNames: prev.customSkillNames.filter(item => normalizeSkillName(item) !== normalized),
    }));
  };

  const updateQuestion = (index: number, patch: Partial<QuestionInput>): void => {
    setQuestions(prev => prev.map((question, idx) => idx === index ? { ...question, ...patch } : question));
  };

  const handleDragStart = (event: DragEvent, index: number): void => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (event: DragEvent, index: number): void => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...questions];
    const item = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, item);
    setDraggedIndex(index);
    setQuestions(updated);
  };

  const handleDragEnd = (): void => {
    setDraggedIndex(null);
  };

  const handleGenerateInstantJob = async (prompt?: string) => {
    let promptText = typeof prompt === 'string' ? prompt.trim() : '';

    if (!promptText) {
      const textarea = document.getElementById('guide-prompt-textarea') as HTMLTextAreaElement | null;
      if (textarea && textarea.value.trim()) {
        promptText = textarea.value.trim();
      }
    }

    if (!promptText) {
      toast.error(t('postJobWizard.validation.aiPromptRequired'));
      return;
    }

    // Cancel any in-flight Flow 2 from a previous generation before starting a new Flow 1.
    // AbortController kills the HTTP leg (Browser → ASP.NET); generationIdRef discards
    // any result that somehow still arrives (Scenarios 2 & 3 where the LLM keeps running).
    hiringPlanAbortRef.current?.abort('User re-prompted AI');
    hiringPlanAbortRef.current = null;
    generationIdRef.current += 1;
    backgroundHiringPlanPromiseRef.current = null;
    setBackgroundHiringPlanStatus('idle');
    setIsHiringPlanGenerated(false);

    setErrorMessage(null);
    setIsGeneratingInstant(true);
    try {
      const response = await jobAPI.generateAIDetails({ clientPrompt: promptText });
      if (!response.success || !response.data) {
        const errorMsg = response.message || 'Job details could not be generated.';
        toast.error(errorMsg);
        setErrorMessage(errorMsg);
        return;
      }

      setAiClientPrompt(promptText);
      setPendingGeneratedDetails(response.data);
      // Open the lightweight success modal — user confirms before prefill + Flow 2 start
      setIsReviewModalOpen(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An error occurred during AI generation.';
      toast.error(errorMsg);
      setErrorMessage(errorMsg);
    } finally {
      setIsGeneratingInstant(false);
    }
  };

  const handleApproveDetails = async () => {
    if (!pendingGeneratedDetails) return;
    const generatedData = pendingGeneratedDetails;

    // Capture this generation's ID — used to detect stale results from Scenarios 2 & 3
    // where the LLM keeps generating even after the HTTP request was aborted.
    const myGenerationId = generationIdRef.current;

    setIsReviewModalOpen(false);
    setIsInstantJobMode(true);
    setIsHiringPlanGenerated(false);

    // Create a new AbortController for this generation's Flow 2 HTTP request.
    // Aborted on next re-prompt (handleGenerateInstantJob) or draft reset.
    const abortController = new AbortController();
    hiringPlanAbortRef.current = abortController;

    const promptText = aiClientPrompt;
    const jobTitle = generatedData.title;
    const jobDescription = generatedData.description;

    setBackgroundHiringPlanStatus('loading');
    setBackgroundHiringPlanError(null);

    const duration = parseJobDuration(generatedData.estimatedDuration);
    const durationDays = (duration.value ? Number(duration.value) * (duration.unit === 'months' ? 30 : duration.unit === 'years' ? 365 : 7) : 14) * 2;
    const computedDeadline = form.deadline || new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const promise = jobAPI.generateAIHiringPlan({
      clientPrompt: promptText,
      title: jobTitle || '',
      description: jobDescription || '',
      budgetMin: generatedData.budgetMin,
      budgetMax: generatedData.budgetMax,
      estimatedDuration: generatedData.estimatedDuration,
      proposalClosingDate: computedDeadline,
    }, abortController.signal).then(response => {
      // Guard: if user has re-prompted since this Flow 2 started, discard the result silently.
      // This handles Scenarios 2 & 3 where the LLM result still arrives despite the abort.
      if (myGenerationId !== generationIdRef.current) {
        return null;
      }

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to generate hiring plan.');
      }

      const planData = response.data;
      const rawMilestones = planData.milestones || (planData as any).milestonePlans || (planData as any).milestone_plans;
      const rawQuestions = planData.questionRecruitment || (planData as any).question_recruitment || (planData as any).questions;

      let nextMilestones: JobPostMilestonePlanDto[] = [];
      let nextQuestions: QuestionInput[] = [];

      if (rawMilestones && rawMilestones.length > 0) {
        const strippedMilestones = withoutWorkBreakdownItems(rawMilestones);
        const targetBudgetValue = generatedData.budgetMin ?? generatedData.budgetMax ?? (form.budget ? Number(form.budget) : null);
        const targetWeeksValue = duration.value ? durationToWeeks(duration.value, duration.unit) : expectedDurationWeeks;
        nextMilestones = clampMilestonesToExpectedTargets(strippedMilestones, targetBudgetValue, targetWeeksValue);
      }
      if (rawQuestions && rawQuestions.length > 0) {
        nextQuestions = rawQuestions.map((qText: string) => ({
          questionText: qText,
          isRequired: true,
        }));
      }

      setMilestonePlans(nextMilestones);
      setQuestions(nextQuestions);
      setIsHiringPlanGenerated(true);
      setBackgroundHiringPlanStatus('success');

      return { milestones: nextMilestones, questions: nextQuestions };
    }).catch(error => {
      // Intentional abort (user re-prompted) — do not show an error, just clean up silently.
      if (axios.isCancel(error) || (error instanceof Error && error.name === 'CanceledError')) {
        return null;
      }
      // Stale result guard (extra safety) — discard without error
      if (myGenerationId !== generationIdRef.current) {
        return null;
      }
      const planErrorMsg = error instanceof Error ? error.message : 'An error occurred generating hiring plan.';
      setBackgroundHiringPlanStatus('error');
      setBackgroundHiringPlanError(planErrorMsg);
      throw error;
    });

    backgroundHiringPlanPromiseRef.current = promise;

    try {
      const [categoriesResponse, skillsResponse] = await Promise.all([
        generatedData.majorId ? jobAPI.getCategoriesByMajor(generatedData.majorId) : null,
        generatedData.categoryId ? jobAPI.getSkillsByCategory(generatedData.categoryId) : null
      ]);

      if (categoriesResponse?.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data);
      }

      if (skillsResponse?.success && skillsResponse.data) {
        setAvailableSkills(skillsResponse.data);
        setSkillNameById(prev => {
          const next = { ...prev };
          skillsResponse.data?.forEach(skill => {
            next[skill.skillId.toLowerCase()] = skill.name;
          });
          return next;
        });
      }

      const generatedSkillIds = generatedData.skills.map(skill => skill.skillsId.toLowerCase());
      setSkillNameById(prev => {
        const next = { ...prev };
        generatedData.skills.forEach(skill => {
          next[skill.skillsId.toLowerCase()] = skill.name;
        });
        return next;
      });

      setTaxonomyDisplayNames({
        majorName: generatedData.majorName || '',
        categoryName: generatedData.categoryName || '',
      });

      setForm(prev => ({
        ...prev,
        title: generatedData.title || prev.title,
        majorId: generatedData.majorId || '',
        majorCategoryId: generatedData.majorCategoryId || '',
        categoryId: generatedData.categoryId || '',
        skillIds: generatedSkillIds,
        customSkillNames: generatedData.customSkills || [],
        description: generatedData.description || prev.description,
        budget: toStringValue(generatedData.budgetMin ?? generatedData.budgetMax) || prev.budget,
        currency: prev.currency || GIGCOIN_CURRENCY_CODE,
        estimatedDurationValue: duration.value || prev.estimatedDurationValue || '2',
        estimatedDurationUnit: duration.unit || prev.estimatedDurationUnit || 'weeks',
        visibility: String(JobPostVisibility.Public),
        deadline: computedDeadline,
        isAigenerated: true,
      }));

      setIsJobDetailsGenerated(true);
      setPendingGeneratedDetails(null);
      toast.success(t('postJobWizard.messages.aiGenerated'));
    } catch (e) {
      console.error(e);
      toast.error('Failed to prefill job post taxonomies.');
    }
  };

  const handleCancelDetails = () => {
    setIsReviewModalOpen(false);
    setPendingGeneratedDetails(null);
  };

  const validateForm = (): PostJobValidationIssue | null => {
    if (!form.title.trim()) return { message: t('postJobWizard.validation.titleRequired'), section: 'project', fieldSelector: '#job-title' };
    if (form.title.trim().length > 200) return { message: t('postJobWizard.validation.titleTooLong'), section: 'project', fieldSelector: '#job-title' };
    if (!form.majorId) return { message: t('postJobWizard.validation.majorRequired'), section: 'project', fieldSelector: '#job-major' };
    if (!form.majorCategoryId || !form.categoryId) return { message: t('postJobWizard.validation.categoryRequired'), section: 'project', fieldSelector: '#job-category' };
    if (!form.description.trim()) return { message: t('postJobWizard.validation.descriptionRequired'), section: 'project', fieldSelector: '#job-description' };

    const budgetValue = form.budget ? Number(form.budget) : null;
    if (budgetValue !== null && (Number.isNaN(budgetValue) || budgetValue < 0)) {
      return { message: t('postJobWizard.validation.budgetInvalid'), section: 'terms', fieldSelector: '#job-budget' };
    }
    if (!isValidJobDurationValue(form.estimatedDurationValue)) {
      return { message: t('postJobWizard.validation.durationInvalid'), section: 'terms', fieldSelector: '#job-duration' };
    }

    if (form.deadline) {
      const endDate = new Date(`${form.deadline}T23:59:59`);
      if (Number.isNaN(endDate.getTime()) || endDate <= new Date()) {
        return { message: t('postJobWizard.validation.deadlineInvalid'), section: 'terms', fieldSelector: '#job-deadline' };
      }
    }

    return null;
  };

  const validateQuestions = (): PostJobValidationIssue | null => {
    const nonEmptyQuestions = questionsWithOrder.filter(question => question.questionText.trim());
    const orderIndexes = nonEmptyQuestions.map(question => question.orderIndex);
    if (new Set(orderIndexes).size !== orderIndexes.length) {
      return { message: t('postJobWizard.validation.questionOrderUnique'), section: 'hiringPlan' };
    }

    for (const question of nonEmptyQuestions) {
      const fieldSelector = `[data-question-index="${question.orderIndex}"]`;
      if (question.questionText.length > MAX_QUESTION_LENGTH) {
        return { message: t('postJobWizard.validation.questionTooLong'), section: 'hiringPlan', fieldSelector };
      }
      if (!Number.isInteger(question.orderIndex) || question.orderIndex < 0) {
        return { message: t('postJobWizard.validation.questionOrderInvalid'), section: 'hiringPlan', fieldSelector };
      }
    }

    return null;
  };

  const validateMilestonePlans = (): PostJobValidationIssue | null => {
    if (milestonePlans.length > 0 && !form.deadline) {
      return {
        message: t('postJobWizard.validation.milestoneDeadlineRequiresClosingDate'),
        section: 'terms',
        fieldSelector: '#job-deadline',
      };
    }

    const errors: Record<string, string> = {};
    for (const [index, milestone] of milestonePlans.entries()) {
      if (!milestone.title?.trim()) errors[`${index}.title`] = t('postJobWizard.validation.milestoneTitleRequired');
      if (Number(milestone.amount) <= 0) errors[`${index}.amount`] = t('postJobWizard.validation.milestoneAmountInvalid');
      if (!/^\s*[1-9]\d*\s+(week|weeks|month|months|year|years)\s*$/i.test(milestone.estimatedDuration || '')) {
        errors[`${index}.estimatedDuration`] = t('postJobWizard.validation.milestoneDurationInvalid');
      }
      if (!milestone.deliverables?.trim()) errors[`${index}.deliverables`] = t('postJobWizard.validation.milestoneDeliverablesRequired');
      if (!milestone.acceptanceCriteria?.trim()) errors[`${index}.acceptanceCriteria`] = t('postJobWizard.validation.milestoneAcceptanceRequired');
    }

    const firstErrorKey = Object.keys(errors)[0];
    setMilestoneErrors(errors);
    if (firstErrorKey) {
      const [index, field] = firstErrorKey.split('.');
      setExpandedMilestone(Number(index));
      requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(`[data-milestone-field="${index}.${field}"]`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target?.focus();
      });
      return {
        message: t('postJobWizard.validation.milestoneIncomplete'),
        section: 'hiringPlan',
        fieldSelector: `[data-milestone-field="${index}.${field}"]`,
      };
    }

    return null;
  };

  const showValidationError = (message: string): void => {
    setErrorMessage(message);
    toast.error(message);
  };

  const focusValidationIssue = (issue: PostJobValidationIssue): void => {
    if (!issue.fieldSelector) return;
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(issue.fieldSelector!);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus();
    });
  };

  const buildDraftRequest = (overrides?: {
    questions?: QuestionInput[];
    milestonePlans?: JobPostMilestonePlanDto[];
  }): SaveDraftJobPostRequest => {
    // Confirmed overrides (milestone total / total duration) take precedence
    // over the current form values — the immediate post-confirm save runs in
    // the same tick as setForm, so the form fields would still hold the stale
    // expected values.
    const budgetValue = budgetOverrideRef.current !== null
      ? Number(budgetOverrideRef.current)
      : form.budget ? Number(form.budget) : null;
    const durationValue = durationOverrideRef.current ? String(milestoneTotalWeeks) : form.estimatedDurationValue;
    const durationUnit: JobDurationUnit = durationOverrideRef.current ? 'weeks' : form.estimatedDurationUnit;
    const finalQuestions = overrides?.questions || questions;
    const finalMilestones = overrides?.milestonePlans || milestonePlansWithDeadlines;
    const questionsWithOrderOverrides = finalQuestions.map((question, index) => ({ ...question, orderIndex: index }));

    return {
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      majorCategoryId: form.majorCategoryId || null,
      budgetMin: budgetValue !== null && Number.isNaN(budgetValue) ? null : budgetValue,
      budgetMax: budgetValue !== null && Number.isNaN(budgetValue) ? null : budgetValue,
      currency: form.currency.trim() || GIGCOIN_CURRENCY_CODE,
      estimatedDuration: formatJobDuration(durationValue, durationUnit),
      visibility: form.visibility ? Number(form.visibility) : JobPostVisibility.Public,
      endDate: form.deadline ? new Date(`${form.deadline}T23:59:59`).toISOString() : null,
      isAigenerated: form.isAigenerated,
      skillIds: form.skillIds,
      customSkillNames: form.customSkillNames,
      questions: questionsWithOrderOverrides
        .filter(question => question.questionText.trim())
        .map(question => ({
          questionText: question.questionText.trim(),
          orderIndex: question.orderIndex,
          isRequired: question.isRequired,
        })),
      milestonePlans: finalMilestones.map((milestone, orderIndex) => ({
        ...milestone,
        amount: Number(milestone.amount) || 0,
        orderIndex,
        workItems: [],
      })),
    };
  };

  const buildRouteJobData = (overrides?: {
    questions?: QuestionInput[];
    milestonePlans?: JobPostMilestonePlanDto[];
  }): PostJobRouteJobData => ({
    ...buildDraftRequest(overrides),
    majorId: form.majorId,
    majorName: selectedMajorName,
    categoryId: form.categoryId,
    categoryName: selectedCategoryName,
    deadline: form.deadline,
    skillNameById,
    interviewQuestions: (overrides?.questions || questions).map((question, index) => ({ ...question, orderIndex: index })),
    attachments,
  });

  const buildNavigationState = (currentJobPostId: string | null = jobPostId, overrides?: {
    questions?: QuestionInput[];
    milestonePlans?: JobPostMilestonePlanDto[];
  }): PostJobRouteState => ({
    jobPostId: currentJobPostId,
    jobData: buildRouteJobData(overrides),
  });

  const ensureDraftJobPostId = async (): Promise<string> => {
    if (jobPostIdRef.current) {
      return jobPostIdRef.current;
    }

    const createdJobPostId = await createDraftJobPostOnce();
    jobPostIdRef.current = createdJobPostId;
    setJobPostId(createdJobPostId);
    return createdJobPostId;
  };

  const uploadAttachment = async (file: File): Promise<void> => {
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedTypes.has(file.type)) {
      const message = t('postJobWizard.validation.attachmentType');
      setAttachmentError(message);
      toast.error(message);
      return;
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      const message = t('postJobWizard.validation.attachmentSize');
      setAttachmentError(message);
      toast.error(message);
      return;
    }
    if (attachments.length >= 5) {
      const message = t('postJobWizard.validation.attachmentLimit');
      setAttachmentError(message);
      toast.error(message);
      return;
    }

    setIsUploadingAttachment(true);
    setAttachmentError(null);
    try {
      const currentJobPostId = await ensureDraftJobPostId();
      const response = await jobAPI.uploadJobPostAttachment(currentJobPostId, file);
      if (!response.success || !response.data)
        throw new Error(response.message || t('postJobWizard.validation.attachmentUploadFailed'));
      setAttachments(current => [...current, response.data as JobPostAttachmentDto]);
      toast.success(t('postJobWizard.messages.attachmentUploaded'));
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : t('postJobWizard.validation.attachmentUploadFailed');
      setAttachmentError(message);
      toast.error(message);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const deleteAttachment = async (attachmentId: string): Promise<void> => {
    const currentJobPostId = jobPostIdRef.current;
    if (!currentJobPostId) return;

    setAttachmentError(null);
    try {
      const response = await jobAPI.deleteJobPostAttachment(currentJobPostId, attachmentId);
      if (!response.success)
        throw new Error(response.message || t('postJobWizard.validation.attachmentDeleteFailed'));
      setAttachments(current =>
        current.filter(item => item.jobPostAttachmentsId !== attachmentId));
      toast.success(t('postJobWizard.messages.attachmentDeleted'));
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : t('postJobWizard.validation.attachmentDeleteFailed');
      setAttachmentError(message);
      toast.error(message);
    }
  };

  const saveDraftPartial = async (overrides?: {
    questions?: QuestionInput[];
    milestonePlans?: JobPostMilestonePlanDto[];
  }): Promise<string> => {
    const payload = buildDraftRequest(overrides);
    const signature = JSON.stringify(payload);
    latestDraftSignatureRef.current = signature;
    setAutosaveStatus('saving');
    setAutosaveError(null);

    let savedJobPostId = jobPostId;
    const queuedSave = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        savedJobPostId = await ensureDraftJobPostId();
        const response = await jobAPI.saveDraftJobPost(savedJobPostId, payload);
        if (!response.success) {
          throw new Error(response.message || 'Draft JobPost could not be saved.');
        }
      });

    saveQueueRef.current = queuedSave.then(() => undefined, () => undefined);

    try {
      await queuedSave;
      if (latestDraftSignatureRef.current === signature) {
        setIsDirty(false);
        setAutosaveStatus('saved');
      }
      return savedJobPostId as string;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Draft JobPost could not be saved.';
      setAutosaveStatus('error');
      setAutosaveError(message);
      setIsDirty(true);
      throw error;
    }
  };

  const flushAutosave = async (): Promise<string | null> => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (!hasSavableDraftContent && !jobPostId) return null;
    return saveDraftPartial();
  };

  useEffect(() => {
    if (isDraftInitializing || !hasSavableDraftContent || submitMode !== null || leaveAction !== null) {
      return;
    }

    setIsDirty(true);
    setAutosaveStatus(current => current === 'error' ? current : 'idle');
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void saveDraftPartial().catch(() => undefined);
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [form, questions, milestonePlans, isDraftInitializing, hasSavableDraftContent]);

  const retryAutosave = async (): Promise<void> => {
    try {
      await flushAutosave();
    } catch {
      // Status and message are updated by saveDraftPartial.
    }
  };

  const navigateWizard = async (path: '/jobs/post' | '/jobs/post/plan' | '/jobs/post/review'): Promise<void> => {
    setErrorMessage(null);
    try {
      if (path === '/jobs/post/plan' && milestonePlans.length > 0) {
        const expectedBudgetVal = form.budget ? Number(form.budget) : null;
        const clamped = clampMilestonesToExpectedTargets(milestonePlans, expectedBudgetVal, expectedDurationWeeks);
        setMilestonePlans(clamped);
      }
      const currentJobPostId = await flushAutosave();
      allowNextNavigation();
      navigate(path, { state: buildNavigationState(currentJobPostId) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Draft JobPost could not be saved.';
      setErrorMessage(message);
      toast.error(message);
    }
  };

  const submitDraftFlow = async (mode: PostJobSubmitMode): Promise<PostJobSubmitResult> => {
    if (mode === 'plan' || mode === 'review' || mode === 'publish') {
      const detailValidationIssue = validateForm();
      if (detailValidationIssue) {
        showValidationError(detailValidationIssue.message);
        focusValidationIssue(detailValidationIssue);
        return {
          status: 'validation-error',
          section: detailValidationIssue.section,
          fieldSelector: detailValidationIssue.fieldSelector,
        };
      }
    }

    if (mode === 'review' || mode === 'publish') {
      const planValidationIssue = validateMilestonePlans();
      if (planValidationIssue) {
        showValidationError(planValidationIssue.message);
        return {
          status: 'validation-error',
          section: planValidationIssue.section,
          fieldSelector: planValidationIssue.fieldSelector,
        };
      }
    }

    if (mode === 'review' || mode === 'publish') {
      const questionValidationIssue = validateQuestions();
      if (questionValidationIssue) {
        showValidationError(questionValidationIssue.message);
        focusValidationIssue(questionValidationIssue);
        return {
          status: 'validation-error',
          section: questionValidationIssue.section,
          fieldSelector: questionValidationIssue.fieldSelector,
        };
      }
    }

    // When the milestone plan total exceeds the client's expected budget or
    // total duration, ask before saving so the job post fields are only
    // raised by explicit consent.
    const budgetNeedsConfirm = shouldConfirmBudgetOverride(form.budget, milestonePlanTotal)
      && budgetOverrideRef.current === null;
    const durationNeedsConfirm = shouldConfirmDurationOverride(milestoneTotalWeeks, expectedDurationWeeks)
      && !durationOverrideRef.current;
    if ((mode === 'review' || mode === 'publish') && (budgetNeedsConfirm || durationNeedsConfirm)) {
      setPendingBudgetSubmitMode(mode);
      setIsBudgetExceededPromptOpen(true);
      return { status: 'budget-exceeded' };
    }

    setSubmitMode(mode);
    setErrorMessage(null);

    try {
      if (mode === 'plan') {
        let finalMilestones = milestonePlans;
        let finalQuestions = questions;

        if (isInstantJobMode && !isHiringPlanGenerated) {
          // If the background promise failed previously, clear it to retry using fallback
          if (backgroundHiringPlanStatus === 'error') {
            backgroundHiringPlanPromiseRef.current = null;
          }

          if (backgroundHiringPlanPromiseRef.current) {
            setIsGeneratingPlan(true);
            try {
              const result = await backgroundHiringPlanPromiseRef.current;
              if (result) {
                finalMilestones = result.milestones;
                finalQuestions = result.questions;
              }
            } catch (planError) {
              backgroundHiringPlanPromiseRef.current = null;
              setBackgroundHiringPlanStatus('error');
              throw planError;
            } finally {
              setIsGeneratingPlan(false);
            }
          } else {
            setIsGeneratingPlan(true);
            try {
              const durationWeeks = form.estimatedDurationValue ? Number(form.estimatedDurationValue) * (form.estimatedDurationUnit === 'months' ? 4.333 : form.estimatedDurationUnit === 'years' ? 52 : 1) : 2;
              const durationDays = Math.ceil(durationWeeks * 7) * 2;
              const computedDeadline = form.deadline || new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

              if (!form.deadline) {
                setForm(prev => ({ ...prev, deadline: computedDeadline }));
              }

              const planResponse = await jobAPI.generateAIHiringPlan({
                clientPrompt: aiClientPrompt,
                title: form.title,
                description: form.description,
                budgetMin: form.budget ? Number(form.budget) : undefined,
                budgetMax: form.budget ? Number(form.budget) : undefined,
                estimatedDuration: form.estimatedDurationValue ? formatJobDuration(form.estimatedDurationValue, form.estimatedDurationUnit) || undefined : undefined,
                proposalClosingDate: computedDeadline,
              });

              if (!planResponse.success || !planResponse.data) {
                throw new Error(planResponse.message || 'Failed to generate hiring plan.');
              }

              const planData = planResponse.data;
              const rawMilestones = planData.milestones || (planData as any).milestonePlans || (planData as any).milestone_plans;
              const rawQuestions = planData.questionRecruitment || (planData as any).question_recruitment || (planData as any).questions;

              if (rawMilestones && rawMilestones.length > 0) {
                const mappedMilestones = withoutWorkBreakdownItems(rawMilestones);
                setMilestonePlans(mappedMilestones);
                finalMilestones = mappedMilestones;
              }
              if (rawQuestions && rawQuestions.length > 0) {
                const mappedQuestions = rawQuestions.map((qText: string) => ({
                  questionText: qText,
                  isRequired: true,
                }));
                setQuestions(mappedQuestions);
                finalQuestions = mappedQuestions;
              }
              setIsHiringPlanGenerated(true);
            } catch (planError) {
              const planErrorMsg = planError instanceof Error ? planError.message : 'An error occurred generating hiring plan.';
              toast.error(planErrorMsg);
              throw planError;
            } finally {
              setIsGeneratingPlan(false);
            }
          }
        }

        const currentJobPostId = await saveDraftPartial({
          milestonePlans: finalMilestones,
          questions: finalQuestions
        });
        const navigationState = buildNavigationState(currentJobPostId, {
          milestonePlans: finalMilestones,
          questions: finalQuestions
        });

        allowNextNavigation();
        navigate('/jobs/post/plan', {
          state: {
            ...navigationState,
            instantJobMode: isInstantJobMode,
            aiClientPrompt,
            hiringPlanGenerated: true
          }
        });
        return { status: 'success' };
      }

      const currentJobPostId = await saveDraftPartial();
      const navigationState = buildNavigationState(currentJobPostId);

      if (mode === 'review') {
        allowNextNavigation();
        navigate('/jobs/post/review', { state: navigationState });
        return { status: 'success' };
      }

      if (mode === 'publish') {
        const publishResponse = await jobAPI.updateJobPostStatus(currentJobPostId, { status: JobPostStatus.Open });
        if (!publishResponse.success) throw new Error(publishResponse.message || 'Project request could not be published.');
        toast.success(t('postJobWizard.messages.published'));
        allowNextNavigation();
        navigate('/jobs/my-jobs');
        return { status: 'success' };
      }

      toast.success(t('postJobWizard.messages.draftSaved'));
      allowNextNavigation();
      navigate('/jobs/my-jobs');
      return { status: 'success' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Project request could not be saved.';
      setErrorMessage(message);
      toast.error(message);
      return { status: 'error' };
    } finally {
      setSubmitMode(null);
      budgetOverrideRef.current = null;
      durationOverrideRef.current = false;
    }
  };

  const handleBudgetExceededConfirm = (): Promise<PostJobSubmitResult> => {
    if (shouldConfirmBudgetOverride(form.budget, milestonePlanTotal)) {
      budgetOverrideRef.current = String(milestonePlanTotal);
      setForm(current => ({
        ...current,
        budget: String(milestonePlanTotal),
      }));
    }
    if (shouldConfirmDurationOverride(milestoneTotalWeeks, expectedDurationWeeks)) {
      durationOverrideRef.current = true;
      setForm(current => ({
        ...current,
        estimatedDurationValue: String(milestoneTotalWeeks),
        estimatedDurationUnit: 'weeks',
      }));
    }
    setIsBudgetExceededPromptOpen(false);
    const mode = pendingBudgetSubmitMode;
    setPendingBudgetSubmitMode(null);
    return mode ? submitDraftFlow(mode) : Promise.resolve({ status: 'budget-exceeded' });
  };

  const handleBudgetExceededCancel = (): void => {
    setIsBudgetExceededPromptOpen(false);
    setPendingBudgetSubmitMode(null);
  };

  const continueBlockedNavigation = (): void => {
    setIsLeavePromptOpen(false);
    allowNextNavigation();
    blocker.proceed?.();
  };

  const cancelBlockedNavigation = (): void => {
    setIsLeavePromptOpen(false);
    setLeaveAction(null);
    blocker.reset?.();
  };

  const handleLeaveSaveDraft = async (): Promise<void> => {
    setLeaveAction('save');
    try {
      await saveDraftPartial();
      toast.success(t('postJobWizard.messages.draftSaved'));
      continueBlockedNavigation();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Draft JobPost could not be saved.';
      toast.error(message);
    } finally {
      setLeaveAction(null);
    }
  };

  const handleLeaveDiscardDraft = async (): Promise<void> => {
    setLeaveAction('discard');
    try {
      if (!jobPostId) {
        continueBlockedNavigation();
        return;
      }

      const response = await jobAPI.deleteEmptyDraftJobPost(jobPostId);
      if (response.success) {
        toast.success(t('postJobWizard.messages.emptyDraftDiscarded'));
        continueBlockedNavigation();
        return;
      }

      if (response.statusCode === 400) {
        toast.info(EMPTY_DRAFT_KEPT_MESSAGE);
        continueBlockedNavigation();
        return;
      }

      toast.error(response.message || 'Draft could not be discarded.');
    } finally {
      setLeaveAction(null);
    }
  };

  const renderSubmitLabel = (mode: PostJobSubmitMode, label: string): string => (
    submitMode === mode ? 'Submitting...' : label
  );

  return {
    form,
    setForm,
    jobPostId,
    autosaveStatus,
    autosaveError,
    isDirty,
    majors,
    categories,
    availableSkills,
    selectedOfficialSkills,
    skillInput,
    setSkillInput,
    remainingSkills,
    previewTitle,
    selectedMajorName,
    selectedCategoryName,
    errorMessage,
    isDraftInitializing,
    draftError,
    setDraftRequestAttempt,
    draggedIndex,
    questions,
    setQuestions,
    milestonePlans,
    milestonePlansWithDeadlines,
    attachments,
    isUploadingAttachment,
    attachmentError,
    milestonePlanTotal,
    milestoneTotalWeeks,
    expectedDurationWeeks,
    isBudgetExceeded,
    isDurationExceeded,
    setMilestonePlans,
    uploadAttachment,
    deleteAttachment,
    milestoneErrors,
    setMilestoneErrors,
    expandedMilestone,
    setExpandedMilestone,
    expandedMilestones,
    setExpandedMilestones,
    isActionDisabled,
    questionsWithOrder,
    taxonomyError,
    isMajorsLoading,
    isCategoriesLoading,
    isSkillsLoading,
    isLeavePromptOpen,
    leaveAction,
    resetToNewDraft,
    allowNextNavigation,
    insertMarkdown,
    handleMajorChange,
    handleCategoryChange,
    addOfficialSkill,
    addSkill,
    removeOfficialSkill,
    removeCustomSkill,
    updateQuestion,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleLeaveSaveDraft,
    handleLeaveDiscardDraft,
    cancelBlockedNavigation,
    submitDraftFlow,
    isBudgetExceededPromptOpen,
    handleBudgetExceededConfirm,
    handleBudgetExceededCancel,
    shouldConfirmBudgetOverride,
    shouldConfirmDurationOverride,
    navigateWizard,
    flushAutosave,
    retryAutosave,
    buildNavigationState,
    renderSubmitLabel,
    MAX_QUESTION_LENGTH,
    isInstantJobMode,
    setIsInstantJobMode,
    isJobDetailsGenerated,
    isGeneratingInstant,
    handleGenerateInstantJob,
    isReviewModalOpen,
    pendingGeneratedDetails,
    isGeneratingPlan,
    backgroundHiringPlanError,
    handleApproveDetails,
    handleCancelDetails,
  };
}
