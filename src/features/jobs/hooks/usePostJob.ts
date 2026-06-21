import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useBlocker, useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { jobAPI } from '../../../api/jobAPI';
import type { CategoryOptionDto, MajorDto, SkillOptionDto } from '../../../types/models/Category';
import {
  JobPostStatus,
  JobPostVisibility,
  type GetMyJobPostDetailDto,
  type JobPostQuestionDto,
  type SaveDraftJobPostRequest,
} from '../../../types/models/Job';

const MAX_QUESTION_LENGTH = 1000;
const DEFAULT_DRAFT_TITLE = 'Untitled Job Post';
const EMPTY_DRAFT_KEPT_MESSAGE = 'This draft already contains information, so it was kept as a saved draft.';

export interface QuestionInput {
  questionText: string;
  isRequired: boolean;
}

type SubmitMode = 'draft' | 'publish' | 'contract';
type LeaveAction = 'save' | 'discard' | null;

type PostJobFormState = {
  title: string;
  majorId: string;
  majorCategoryId: string;
  categoryId: string;
  description: string;
  skillIds: string[];
  customSkillNames: string[];
  budgetMin: string;
  budgetMax: string;
  currency: string;
  estimatedDuration: string;
  maxHires: string;
  location: string;
  visibility: string;
  deadline: string;
  isAigenerated: boolean;
};

let draftJobPostRequest: Promise<string> | null = null;

const createDraftJobPostOnce = async (): Promise<string> => {
  if (!draftJobPostRequest) {
    draftJobPostRequest = jobAPI.createDraftJobPost()
      .then(response => {
        const data = response.data as any;
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
const normalizeSkillName = (value: string) => value.trim().toLowerCase();
const isDefaultDraftTitle = (value: string) => {
  const title = value.trim();
  return !title || title.toLowerCase() === DEFAULT_DRAFT_TITLE.toLowerCase() || title.toLowerCase() === 'untitled draft';
};

const initialQuestionsFromState = (initialJobData: any): QuestionInput[] => {
  const initialQuestions = initialJobData?.interviewQuestions?.map((question: any) => ({
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
      isRequired: question.isRequired,
    }));

  return mapped.length > 0 ? mapped : [emptyQuestion()];
};

const formFromJobDetail = (job: GetMyJobPostDetailDto): PostJobFormState => ({
  title: isDefaultDraftTitle(job.title || '') ? '' : job.title || '',
  description: job.description || '',
  majorId: job.majorId || '',
  majorCategoryId: job.majorCategoryId || '',
  categoryId: job.categoryId || '',
  skillIds: job.skills?.map(skill => skill.skillsId) || [],
  customSkillNames: job.customSkillNames || [],
  budgetMin: job.budgetMin !== undefined && job.budgetMin !== null ? String(job.budgetMin) : '',
  budgetMax: job.budgetMax !== undefined && job.budgetMax !== null ? String(job.budgetMax) : '',
  currency: job.currency || 'USD',
  estimatedDuration: job.estimatedDuration || '',
  maxHires: job.maxHires !== undefined && job.maxHires !== null ? String(job.maxHires) : '',
  location: job.location || '',
  visibility: String(job.visibility ?? JobPostVisibility.Public),
  deadline: job.endDate?.split?.('T')?.[0] || '',
  isAigenerated: false,
});

const initialFormFromState = (initialJobData: any): PostJobFormState => ({
  title: initialJobData?.title || '',
  majorId: initialJobData?.majorId || '',
  majorCategoryId: initialJobData?.majorCategoryId || '',
  categoryId: initialJobData?.categoryId || '',
  description: initialJobData?.description || '',
  skillIds: (initialJobData?.skillIds || []) as string[],
  customSkillNames: (initialJobData?.customSkillNames || initialJobData?.customSkills || []) as string[],
  budgetMin: initialJobData?.budgetMin !== undefined && initialJobData?.budgetMin !== null ? String(initialJobData.budgetMin) : '',
  budgetMax: initialJobData?.budgetMax !== undefined && initialJobData?.budgetMax !== null ? String(initialJobData.budgetMax) : '',
  currency: initialJobData?.currency || 'USD',
  estimatedDuration: initialJobData?.estimatedDuration || '',
  maxHires: initialJobData?.maxHires !== undefined && initialJobData?.maxHires !== null ? String(initialJobData.maxHires) : '',
  location: initialJobData?.location || '',
  visibility: String(initialJobData?.visibility ?? JobPostVisibility.Public),
  deadline: initialJobData?.deadline || initialJobData?.endDate?.split?.('T')?.[0] || '',
  isAigenerated: initialJobData?.isAigenerated ?? false,
});

export function usePostJob() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialJobData = location.state?.jobData;
  const initialJobPostId = location.state?.jobPostId ? String(location.state.jobPostId) : null;
  const navigationAllowedRef = useRef(false);

  const [skillInput, setSkillInput] = useState('');
  const [submitMode, setSubmitMode] = useState<SubmitMode | null>(null);
  const [leaveAction, setLeaveAction] = useState<LeaveAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobPostId, setJobPostId] = useState<string | null>(initialJobPostId);
  const [isDraftInitializing, setIsDraftInitializing] = useState(Boolean(initialJobPostId));
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftRequestAttempt, setDraftRequestAttempt] = useState(0);
  const [isLeavePromptOpen, setIsLeavePromptOpen] = useState(false);

  const [isInstantJobMode, setIsInstantJobMode] = useState(false);
  const [isJobDetailsGenerated, setIsJobDetailsGenerated] = useState(false);
  const [isGeneratingInstant, setIsGeneratingInstant] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [majors, setMajors] = useState<MajorDto[]>([]);
  const [categories, setCategories] = useState<CategoryOptionDto[]>([]);
  const [availableSkills, setAvailableSkills] = useState<SkillOptionDto[]>([]);
  const [isMajorsLoading, setIsMajorsLoading] = useState(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [isSkillsLoading, setIsSkillsLoading] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [skillNameById, setSkillNameById] = useState<Record<string, string>>(
    initialJobData?.skillNameById || initialJobData?.skillNamesById || {}
  );

  const [form, setForm] = useState<PostJobFormState>(() => initialFormFromState(initialJobData));
  const [questions, setQuestions] = useState<QuestionInput[]>(() => initialQuestionsFromState(initialJobData));

  const questionsWithOrder = useMemo(
    () => questions.map((question, index) => ({ ...question, orderIndex: index })),
    [questions]
  );

  const hasSavableDraftContent = useMemo(() => {
    const visibility = Number(form.visibility);

    return !isDefaultDraftTitle(form.title) ||
      Boolean(form.description.trim()) ||
      Boolean(form.majorCategoryId) ||
      Boolean(form.budgetMin) ||
      Boolean(form.budgetMax) ||
      Boolean(form.currency.trim() && form.currency.trim().toUpperCase() !== 'USD') ||
      Boolean(form.estimatedDuration.trim()) ||
      Boolean(form.maxHires) ||
      Boolean(form.location.trim()) ||
      Boolean(form.deadline) ||
      (!Number.isNaN(visibility) && visibility !== JobPostVisibility.Public) ||
      form.skillIds.length > 0 ||
      form.customSkillNames.length > 0 ||
      questions.some(question => Boolean(question.questionText.trim()));
  }, [form, questions]);

  const shouldBlockNavigation = (Boolean(jobPostId) || hasSavableDraftContent) &&
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
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldBlockNavigation) return;

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlockNavigation]);

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
        setForm(formFromJobDetail(job));
        setSkillNameById(prev => ({
          ...prev,
          ...Object.fromEntries((job.skills || []).map(skill => [skill.skillsId, skill.skillName])),
        }));

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
  }, [initialJobPostId, draftRequestAttempt]);

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

        setAvailableSkills(response.data);
        setSkillNameById(prev => {
          const next = { ...prev };
          response.data?.forEach(skill => {
            next[skill.skillId] = skill.name;
          });
          return next;
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
  const isActionDisabled = isSubmitting || isDraftInitializing || (isInstantJobMode && !isJobDetailsGenerated);
  const previewTitle = form.title.trim() || 'Untitled Job Post';

  const allowNextNavigation = () => {
    navigationAllowedRef.current = true;
  };

  const resetToNewDraft = () => {
    navigationAllowedRef.current = false;
    setJobPostId(null);
    setDraftError(null);
    setErrorMessage(null);
    setSkillInput('');
    setAvailableSkills([]);
    setCategories([]);
    setSkillNameById({});
    setForm(initialFormFromState(null));
    setQuestions([emptyQuestion()]);
    setIsInstantJobMode(false);
    setIsJobDetailsGenerated(false);
  };

  const insertMarkdown = (before: string, after: string) => {
    setForm(prev => ({ ...prev, description: prev.description + before + after }));
  };

  const handleMajorChange = (majorId: string) => {
    setSkillInput('');
    setAvailableSkills([]);
    setForm(prev => ({
      ...prev,
      majorId,
      majorCategoryId: '',
      categoryId: '',
      skillIds: [],
      customSkillNames: [],
    }));
  };

  const handleCategoryChange = (majorCategoryId: string) => {
    const selectedCategory = categories.find(category => category.majorCategoryId === majorCategoryId);
    setSkillInput('');
    setForm(prev => ({
      ...prev,
      majorCategoryId,
      categoryId: selectedCategory?.categoryId || '',
      skillIds: [],
      customSkillNames: [],
    }));
  };

  const addOfficialSkill = (skill: SkillOptionDto) => {
    setSkillNameById(prev => ({ ...prev, [skill.skillId]: skill.name }));
    setForm(prev => {
      if (prev.skillIds.includes(skill.skillId)) {
        return prev;
      }

      return { ...prev, skillIds: [...prev.skillIds, skill.skillId] };
    });
  };

  const addSkill = (skillName: string) => {
    const trimmedSkillName = skillName.trim();
    if (!trimmedSkillName) {
      return;
    }

    if (!form.categoryId) {
      toast.error('Please select a category before adding skills.');
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

  const removeOfficialSkill = (skillId: string) => {
    setForm(prev => ({ ...prev, skillIds: prev.skillIds.filter(item => item !== skillId) }));
  };

  const removeCustomSkill = (skillName: string) => {
    const normalized = normalizeSkillName(skillName);
    setForm(prev => ({
      ...prev,
      customSkillNames: prev.customSkillNames.filter(item => normalizeSkillName(item) !== normalized),
    }));
  };

  const updateQuestion = (index: number, patch: Partial<QuestionInput>) => {
    setQuestions(prev => prev.map((question, idx) => idx === index ? { ...question, ...patch } : question));
  };

  const handleDragStart = (event: DragEvent, index: number) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (event: DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...questions];
    const item = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, item);
    setDraggedIndex(index);
    setQuestions(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleGenerateInstantJob = async () => {
    const validQuestions = questions.filter(q => q.questionText.trim());
    if (validQuestions.length === 0) {
      toast.error('Please enter at least one question first.');
      return;
    }

    setIsGeneratingInstant(true);
    try {
      const response = await jobAPI.generateAIDescription(validQuestions.map(q => q.questionText.trim()));
      if (!response.success || !response.data) {
        toast.error(response.message || 'Job details could not be generated.');
        return;
      }

      const generatedSkillIds = response.data.skills.map(skill => skill.skillsId);
      setSkillNameById(prev => {
        const next = { ...prev };
        response.data?.skills.forEach(skill => {
          next[skill.skillsId] = skill.name;
        });
        return next;
      });

      setForm(prev => ({
        ...prev,
        title: response.data?.title || prev.title,
        majorId: response.data?.majorId || '',
        majorCategoryId: response.data?.majorCategoryId || '',
        categoryId: response.data?.categoryId || '',
        skillIds: generatedSkillIds,
        customSkillNames: response.data?.customSkills || [],
        description: response.data?.description || prev.description,
        currency: prev.currency || 'USD',
        estimatedDuration: prev.estimatedDuration || '2-4 weeks',
        maxHires: prev.maxHires || '1',
        location: prev.location || 'Remote',
        visibility: String(JobPostVisibility.Public),
        deadline: prev.deadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isAigenerated: true,
      }));

      setIsJobDetailsGenerated(true);
      toast.success('Job details generated successfully based on your questions.');
    } finally {
      setIsGeneratingInstant(false);
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) return 'Job title is required.';
    if (form.title.trim().length > 200) return 'Job title must not exceed 200 characters.';
    if (!form.majorId) return 'Major is required.';
    if (!form.majorCategoryId || !form.categoryId) return 'Category is required.';
    if (!form.description.trim()) return 'Job description is required.';

    const budgetMin = form.budgetMin ? Number(form.budgetMin) : null;
    const budgetMax = form.budgetMax ? Number(form.budgetMax) : null;

    if (budgetMin !== null && (Number.isNaN(budgetMin) || budgetMin < 0)) return 'Budget min must be greater than or equal to 0.';
    if (budgetMax !== null && (Number.isNaN(budgetMax) || budgetMax < 0)) return 'Budget max must be greater than or equal to 0.';
    if (budgetMin !== null && budgetMax !== null && budgetMax < budgetMin) return 'Budget max must be greater than or equal to budget min.';

    const maxHires = form.maxHires ? Number(form.maxHires) : null;
    if (maxHires !== null && (!Number.isInteger(maxHires) || maxHires <= 0)) return 'Max hires must be a positive whole number.';

    if (form.deadline) {
      const endDate = new Date(`${form.deadline}T23:59:59`);
      if (Number.isNaN(endDate.getTime()) || endDate <= new Date()) return 'End date must be in the future.';
    }

    const nonEmptyQuestions = questionsWithOrder.filter(question => question.questionText.trim());
    const orderIndexes = nonEmptyQuestions.map(question => question.orderIndex);
    if (new Set(orderIndexes).size !== orderIndexes.length) return 'Question order indexes must be unique.';

    for (const question of nonEmptyQuestions) {
      if (question.questionText.length > MAX_QUESTION_LENGTH) return 'Question text must not exceed 1000 characters.';
      if (!Number.isInteger(question.orderIndex) || question.orderIndex < 0) return 'Question order index must be valid.';
    }

    return null;
  };

  const buildDraftRequest = (): SaveDraftJobPostRequest => {
    const budgetMin = form.budgetMin ? Number(form.budgetMin) : null;
    const budgetMax = form.budgetMax ? Number(form.budgetMax) : null;
    const maxHires = form.maxHires ? Number(form.maxHires) : null;

    return {
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      majorCategoryId: form.majorCategoryId || null,
      budgetMin: Number.isNaN(budgetMin) ? null : budgetMin,
      budgetMax: Number.isNaN(budgetMax) ? null : budgetMax,
      currency: form.currency.trim() || 'USD',
      estimatedDuration: form.estimatedDuration.trim() || null,
      maxHires: Number.isNaN(maxHires) ? null : maxHires,
      location: form.location.trim() || null,
      visibility: form.visibility ? Number(form.visibility) : JobPostVisibility.Public,
      endDate: form.deadline ? new Date(`${form.deadline}T23:59:59`).toISOString() : null,
      isAigenerated: form.isAigenerated,
      skillIds: form.skillIds,
      customSkillNames: form.customSkillNames,
      questions: questionsWithOrder
        .filter(question => question.questionText.trim())
        .map(question => ({
          questionText: question.questionText.trim(),
          orderIndex: question.orderIndex,
          isRequired: question.isRequired,
        })),
    };
  };

  const ensureDraftJobPostId = async () => {
    if (jobPostId) {
      return jobPostId;
    }

    const createdJobPostId = await createDraftJobPostOnce();
    setJobPostId(createdJobPostId);
    return createdJobPostId;
  };

  const saveDraftPartial = async () => {
    const currentJobPostId = await ensureDraftJobPostId();
    const response = await jobAPI.saveDraftJobPost(currentJobPostId, buildDraftRequest());

    if (!response.success) {
      throw new Error(response.message || 'Draft JobPost could not be saved.');
    }

    return currentJobPostId;
  };

  const submitDraftFlow = async (mode: SubmitMode) => {
    if (mode !== 'draft') {
      const validationError = validateForm();
      if (validationError) {
        setErrorMessage(validationError);
        toast.error(validationError);
        return;
      }
    }

    setSubmitMode(mode);
    setErrorMessage(null);

    try {
      const currentJobPostId = await saveDraftPartial();

      if (mode === 'publish') {
        const publishResponse = await jobAPI.updateJobPostStatus(currentJobPostId, { status: JobPostStatus.Open });
        if (!publishResponse.success) {
          throw new Error('JobPost was saved, but publishing failed. Please publish it later from My Jobs.');
        }
      }

      if (mode === 'contract') {
        allowNextNavigation();
        navigate('/jobs/post/contract', {
          state: {
            jobPostId: currentJobPostId,
            jobData: {
              ...buildDraftRequest(),
              majorId: form.majorId,
              categoryId: form.categoryId,
              deadline: form.deadline,
              skillNameById,
              interviewQuestions: questionsWithOrder,
            },
          },
        });
        return;
      }

      toast.success(mode === 'publish' ? 'JobPost published successfully.' : 'JobPost saved as draft.');
      allowNextNavigation();
      navigate('/jobs/my-jobs');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'JobPost could not be saved.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSubmitMode(null);
    }
  };

  const continueBlockedNavigation = () => {
    setIsLeavePromptOpen(false);
    allowNextNavigation();
    blocker.proceed?.();
  };

  const cancelBlockedNavigation = () => {
    setIsLeavePromptOpen(false);
    setLeaveAction(null);
    blocker.reset?.();
  };

  const handleLeaveSaveDraft = async () => {
    setLeaveAction('save');
    try {
      await saveDraftPartial();
      toast.success('Draft saved.');
      continueBlockedNavigation();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Draft JobPost could not be saved.';
      toast.error(message);
    } finally {
      setLeaveAction(null);
    }
  };

  const handleLeaveDiscardDraft = async () => {
    setLeaveAction('discard');
    try {
      if (!jobPostId) {
        continueBlockedNavigation();
        return;
      }

      const response = await jobAPI.deleteEmptyDraftJobPost(jobPostId);
      if (response.success) {
        toast.success('Empty draft discarded.');
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

  const renderSubmitLabel = (mode: SubmitMode, label: string) => submitMode === mode ? 'Submitting...' : label;

  return {
    form,
    setForm,
    jobPostId,
    majors,
    categories,
    availableSkills,
    selectedOfficialSkills,
    skillInput,
    setSkillInput,
    remainingSkills,
    previewTitle,
    errorMessage,
    isDraftInitializing,
    draftError,
    setDraftRequestAttempt,
    isInstantJobMode,
    setIsInstantJobMode,
    isJobDetailsGenerated,
    setIsJobDetailsGenerated,
    isGeneratingInstant,
    draggedIndex,
    questions,
    setQuestions,
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
    handleGenerateInstantJob,
    handleLeaveSaveDraft,
    handleLeaveDiscardDraft,
    cancelBlockedNavigation,
    submitDraftFlow,
    renderSubmitLabel,
    MAX_QUESTION_LENGTH,
  };
}
