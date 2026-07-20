import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useBlocker, useLocation, useNavigate } from 'react-router';
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
} from '../../../types/models/Job';
import {
  formatJobDuration,
  isValidJobDurationValue,
  parseJobDuration,
  type JobDurationUnit,
} from '../utils/jobDuration';

const MAX_QUESTION_LENGTH = 1000;
const DEFAULT_DRAFT_TITLE = 'Untitled Job Post';
const EMPTY_DRAFT_KEPT_MESSAGE = 'This draft already contains information, so it was kept as a saved draft.';

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
  budgetMin: string;
  budgetMax: string;
  currency: string;
  estimatedDurationValue: string;
  estimatedDurationUnit: JobDurationUnit;
  location: string;
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
  majorCategoryId?: string | null;
  categoryId?: string | null;
  description?: string | null;
  skillIds?: readonly string[] | null;
  customSkillNames?: readonly string[] | null;
  customSkills?: readonly string[] | null;
  budgetMin?: string | number | null;
  budgetMax?: string | number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  location?: string | null;
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

type SubmitMode = 'draft' | 'questions' | 'publish';
type LeaveAction = 'save' | 'discard' | null;

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

const emptyQuestion = (): QuestionInput => ({ questionText: '', isRequired: false });

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
    isRequired: question.isRequired ?? false,
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
  budgetMin: toStringValue(job.budgetMin),
  budgetMax: toStringValue(job.budgetMax),
  currency: job.currency || GIGCOIN_CURRENCY_CODE,
  location: job.location || '',
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
    budgetMin: toStringValue(initialJobData?.budgetMin),
    budgetMax: toStringValue(initialJobData?.budgetMax),
    currency: initialJobData?.currency || GIGCOIN_CURRENCY_CODE,
    estimatedDurationValue: duration.value,
    estimatedDurationUnit: duration.unit,
    location: initialJobData?.location || '',
    visibility: String(initialJobData?.visibility ?? JobPostVisibility.Public),
    deadline: initialJobData?.deadline || initialJobData?.endDate?.split?.('T')?.[0] || '',
    isAigenerated: initialJobData?.isAigenerated ?? false,
  };
};

export function usePostJob() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as PostJobRouteState | null;
  const initialJobData = routeState?.jobData ?? null;
  const initialJobPostId = routeState?.jobPostId ? String(routeState.jobPostId) : null;
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

  const [isInstantJobMode, setIsInstantJobMode] = useState(() => {
    return (location.state as any)?.instantJobMode ?? false;
  });
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
  const [milestonePlans, setMilestonePlans] = useState<JobPostMilestonePlanDto[]>(() => initialJobData?.milestonePlans || []);
  const milestonePlanTotal = useMemo(
    () => milestonePlans.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [milestonePlans]
  );

  useEffect(() => {
    if (milestonePlans.length === 0) return;
    const fixedBudget = milestonePlanTotal > 0 ? String(milestonePlanTotal) : '';
    setForm(current => current.budgetMin === fixedBudget && current.budgetMax === fixedBudget
      ? current
      : { ...current, budgetMin: fixedBudget, budgetMax: fixedBudget });
  }, [milestonePlanTotal, milestonePlans.length]);

  const questionsWithOrder = useMemo<OrderedQuestionInput[]>(
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
      Boolean(form.currency.trim() && form.currency.trim().toUpperCase() !== GIGCOIN_CURRENCY_CODE) ||
      Boolean(form.estimatedDurationValue.trim()) ||
      Boolean(form.location.trim()) ||
      Boolean(form.deadline) ||
      (!Number.isNaN(visibility) && visibility !== JobPostVisibility.Public) ||
      form.skillIds.length > 0 ||
      form.customSkillNames.length > 0 ||
      questions.some(question => Boolean(question.questionText.trim())) ||
      milestonePlans.length > 0;
  }, [form, questions, milestonePlans]);

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
        setMilestonePlans(job.milestonePlans || []);
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

  const allowNextNavigation = (): void => {
    navigationAllowedRef.current = true;
  };

  const resetToNewDraft = (): void => {
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
    setMilestonePlans([]);
  };

  const insertMarkdown = (before: string, after: string): void => {
    setForm(prev => ({ ...prev, description: prev.description + before + after }));
  };

  const handleMajorChange = (majorId: string): void => {
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

  const handleCategoryChange = (majorCategoryId: string): void => {
    const selectedCategory = categories.find(category => category.majorCategoryId === majorCategoryId);
    setSkillInput('');
    setForm(prev => ({
      ...prev,
      majorCategoryId,
      categoryId: selectedCategory?.categoryId || '',
    }));
  };

  const addOfficialSkill = (skill: SkillOptionDto): void => {
    if (form.skillIds.length + form.customSkillNames.length >= 10) {
      toast.error('You can select up to 10 skills in total.');
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
      toast.error('Please select a category before adding skills.');
      return;
    }

    if (form.skillIds.length + form.customSkillNames.length >= 10) {
      toast.error('You can select up to 10 skills in total.');
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
      toast.error('Vui lòng nhập mô tả yêu cầu tuyển dụng để AI bắt đầu sinh tin.');
      return;
    }

    setErrorMessage(null);
    setIsGeneratingInstant(true);
    try {
      const response = await jobAPI.generateAIDescription({ clientPrompt: promptText });
      if (!response.success || !response.data) {
        const errorMsg = response.message || 'Job details could not be generated.';
        toast.error(errorMsg);
        setErrorMessage(errorMsg);
        return;
      }

      const generatedData = response.data;

      // 1. Fetch categories and skills in parallel based on AI recommendations
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

      // 2. Add AI system skills name map entries so they display as selected chips/badges
      const generatedSkillIds = generatedData.skills.map(skill => skill.skillsId.toLowerCase());
      setSkillNameById(prev => {
        const next = { ...prev };
        generatedData.skills.forEach(skill => {
          next[skill.skillsId.toLowerCase()] = skill.name;
        });
        return next;
      });

      // 3. Update the form state with all AI recommendations
      setForm(prev => ({
        ...prev,
        title: generatedData.title || prev.title,
        majorId: generatedData.majorId || '',
        majorCategoryId: generatedData.majorCategoryId || '',
        categoryId: generatedData.categoryId || '',
        skillIds: generatedSkillIds,
        customSkillNames: generatedData.customSkills || [],
        description: generatedData.description || prev.description,
        currency: prev.currency || GIGCOIN_CURRENCY_CODE,
        estimatedDuration: prev.estimatedDuration || '2-4 weeks',
        location: prev.location || 'Remote',
        visibility: String(JobPostVisibility.Public),
        deadline: prev.deadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isAigenerated: true,
      }));

      // 4. Update the questions state with generated recruitment questions
      if (generatedData.questionRecruitment && generatedData.questionRecruitment.length > 0) {
        setQuestions(
          generatedData.questionRecruitment.map(qText => ({
            questionText: qText,
            isRequired: false,
          }))
        );
      }

      setIsJobDetailsGenerated(true);
      toast.success('Job details generated successfully based on your prompt.');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An error occurred during AI generation.';
      toast.error(errorMsg);
      setErrorMessage(errorMsg);
    } finally {
      setIsGeneratingInstant(false);
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) return 'Project title is required.';
    if (form.title.trim().length > 200) return 'Project title must not exceed 200 characters.';
    if (!form.majorId) return 'Major is required.';
    if (!form.majorCategoryId || !form.categoryId) return 'Category is required.';
    if (!form.description.trim()) return 'Requirement details are required.';

    const budgetMin = form.budgetMin ? Number(form.budgetMin) : null;
    const budgetMax = form.budgetMax ? Number(form.budgetMax) : null;

    if (budgetMin !== null && (Number.isNaN(budgetMin) || budgetMin < 0)) return 'Budget min must be greater than or equal to 0.';
    if (budgetMax !== null && (Number.isNaN(budgetMax) || budgetMax < 0)) return 'Budget max must be greater than or equal to 0.';
    if (budgetMin !== null && budgetMax !== null && budgetMax < budgetMin) return 'Budget max must be greater than or equal to budget min.';
    if (!isValidJobDurationValue(form.estimatedDurationValue)) return 'Estimated duration must be a positive whole number.';

    if (form.deadline) {
      const endDate = new Date(`${form.deadline}T23:59:59`);
      if (Number.isNaN(endDate.getTime()) || endDate <= new Date()) return 'End date must be in the future.';
    }

    return null;
  };

  const validateQuestions = (): string | null => {
    const nonEmptyQuestions = questionsWithOrder.filter(question => question.questionText.trim());
    const orderIndexes = nonEmptyQuestions.map(question => question.orderIndex);
    if (new Set(orderIndexes).size !== orderIndexes.length) return 'Question order indexes must be unique.';

    for (const question of nonEmptyQuestions) {
      if (question.questionText.length > MAX_QUESTION_LENGTH) return 'Question text must not exceed 1000 characters.';
      if (!Number.isInteger(question.orderIndex) || question.orderIndex < 0) return 'Question order index must be valid.';
    }

    return null;
  };

  const validateMilestonePlans = (): string | null => {
    for (const [index, milestone] of milestonePlans.entries()) {
      if (!milestone.title?.trim() || Number(milestone.amount) <= 0 || !milestone.deliverables?.trim() || !milestone.acceptanceCriteria?.trim()) {
        return `Milestone ${index + 1} requires title, positive amount, deliverables and acceptance criteria.`;
      }
      if ((milestone.workItems || []).some(item => !item.title?.trim() || !item.description?.trim())) {
        return `Every work item in milestone ${index + 1} requires title and description.`;
      }
    }
    return null;
  };

  const showValidationError = (message: string): void => {
    setErrorMessage(message);
    toast.error(message);
  };

  const buildDraftRequest = (): SaveDraftJobPostRequest => {
    const budgetMin = form.budgetMin ? Number(form.budgetMin) : null;
    const budgetMax = form.budgetMax ? Number(form.budgetMax) : null;

    return {
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      majorCategoryId: form.majorCategoryId || null,
      budgetMin: budgetMin !== null && Number.isNaN(budgetMin) ? null : budgetMin,
      budgetMax: budgetMax !== null && Number.isNaN(budgetMax) ? null : budgetMax,
      currency: form.currency.trim() || GIGCOIN_CURRENCY_CODE,
      estimatedDuration: formatJobDuration(form.estimatedDurationValue, form.estimatedDurationUnit),
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
      milestonePlans: milestonePlans.map((milestone, orderIndex) => ({
        ...milestone,
        amount: Number(milestone.amount) || 0,
        orderIndex,
        workItems: (milestone.workItems || []).map((workItem, workIndex) => ({ ...workItem, orderIndex: workIndex })),
      })),
    };
  };

  const buildRouteJobData = (): PostJobRouteJobData => ({
    ...buildDraftRequest(),
    majorId: form.majorId,
    categoryId: form.categoryId,
    deadline: form.deadline,
    skillNameById,
    interviewQuestions: questionsWithOrder,
  });

  const buildNavigationState = (currentJobPostId: string | null = jobPostId): PostJobRouteState => ({
    jobPostId: currentJobPostId,
    jobData: buildRouteJobData(),
  });

  const ensureDraftJobPostId = async (): Promise<string> => {
    if (jobPostId) {
      return jobPostId;
    }

    const createdJobPostId = await createDraftJobPostOnce();
    setJobPostId(createdJobPostId);
    return createdJobPostId;
  };

  const saveDraftPartial = async (): Promise<string> => {
    const currentJobPostId = await ensureDraftJobPostId();
    const response = await jobAPI.saveDraftJobPost(currentJobPostId, buildDraftRequest());

    if (!response.success) {
      throw new Error(response.message || 'Draft JobPost could not be saved.');
    }

    return currentJobPostId;
  };

  const submitDraftFlow = async (mode: SubmitMode): Promise<void> => {
    if (mode === 'questions' || mode === 'publish') {
      const detailValidationError = validateForm();
      if (detailValidationError) {
        showValidationError(detailValidationError);
        return;
      }
    }

    if (mode === 'publish') {
      const questionValidationError = validateQuestions();
      if (questionValidationError) {
        showValidationError(questionValidationError);
        return;
      }
      const planValidationError = validateMilestonePlans();
      if (planValidationError) {
        showValidationError(planValidationError);
        return;
      }
    }

    setSubmitMode(mode);
    setErrorMessage(null);

    try {
      const currentJobPostId = await saveDraftPartial();
      const navigationState = buildNavigationState(currentJobPostId);

      if (mode === 'questions') {
        allowNextNavigation();
        navigate('/jobs/post/questions', { state: navigationState });
        return;
      }

      if (mode === 'publish') {
        const publishResponse = await jobAPI.updateJobPostStatus(currentJobPostId, { status: JobPostStatus.Open });
        if (!publishResponse.success) throw new Error(publishResponse.message || 'Project request could not be published.');
        toast.success('Project request published.');
        allowNextNavigation();
        navigate('/jobs/my-jobs');
        return;
      }

      toast.success('Project request saved as draft.');
      allowNextNavigation();
      navigate('/jobs/my-jobs');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Project request could not be saved.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSubmitMode(null);
    }
  };

  const navigateBackToDetails = (): void => {
    allowNextNavigation();
    navigate('/jobs/post/details', { state: buildNavigationState() });
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
      toast.success('Draft saved.');
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

  const renderSubmitLabel = (mode: SubmitMode, label: string): string => (
    submitMode === mode ? 'Submitting...' : label
  );

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
    draggedIndex,
    questions,
    setQuestions,
    milestonePlans,
    setMilestonePlans,
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
    navigateBackToDetails,
    buildNavigationState,
    renderSubmitLabel,
    MAX_QUESTION_LENGTH,
    isInstantJobMode,
    setIsInstantJobMode,
    isJobDetailsGenerated,
    isGeneratingInstant,
    handleGenerateInstantJob,
  };
}
