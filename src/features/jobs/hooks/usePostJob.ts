import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { jobAPI } from '../../../api/jobAPI';
import type { CategoryOptionDto, MajorDto, SkillOptionDto } from '../../../types/models/Category';
import { JobPostStatus, JobPostVisibility, type UpdateJobPostRequest } from '../../../types/models/Job';

const MAX_QUESTION_LENGTH = 1000;

export interface QuestionInput {
  questionText: string;
  isRequired: boolean;
}

type SubmitMode = 'draft' | 'publish' | 'contract';

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

const normalizeSkillName = (value: string) => value.trim().toLowerCase();

export function usePostJob() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialJobData = location.state?.jobData;
  const initialJobPostId = location.state?.jobPostId ? String(location.state.jobPostId) : null;

  const [skillInput, setSkillInput] = useState('');
  const [submitMode, setSubmitMode] = useState<SubmitMode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobPostId, setJobPostId] = useState<string | null>(initialJobPostId);
  const [isDraftInitializing, setIsDraftInitializing] = useState(!initialJobPostId);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftRequestAttempt, setDraftRequestAttempt] = useState(0);

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

  const [form, setForm] = useState<PostJobFormState>({
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
  });

  const [questions, setQuestions] = useState<QuestionInput[]>(() => {
    const initialQuestions = initialJobData?.interviewQuestions?.map((question: any) => ({
      questionText: question.questionText || question.question || '',
      isRequired: question.isRequired ?? true,
    })) || [];
    return initialQuestions.length > 0 ? initialQuestions : [{ questionText: '', isRequired: true }];
  });

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

  const isSubmitting = submitMode !== null;
  const isActionDisabled = isSubmitting || isDraftInitializing || !jobPostId || (isInstantJobMode && !isJobDetailsGenerated);

  const previewTitle = form.title.trim() || 'Untitled Job Post';
  const questionsWithOrder = useMemo(
    () => questions.map((question, index) => ({ ...question, orderIndex: index })),
    [questions]
  );

  useEffect(() => {
    if (jobPostId) {
      setIsDraftInitializing(false);
      return;
    }

    let isMounted = true;
    setIsDraftInitializing(true);
    setDraftError(null);

    createDraftJobPostOnce()
      .then(createdJobPostId => {
        if (!isMounted) return;
        setJobPostId(createdJobPostId);
        setErrorMessage(null);
      })
      .catch(error => {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Draft JobPost could not be created.';
        setDraftError(message);
        setErrorMessage(message);
      })
      .finally(() => {
        if (isMounted) {
          setIsDraftInitializing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [jobPostId, draftRequestAttempt]);

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
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

    const orderIndexes = questionsWithOrder.map(question => question.orderIndex);
    if (new Set(orderIndexes).size !== orderIndexes.length) return 'Question order indexes must be unique.';

    for (const question of questionsWithOrder) {
      if (!question.questionText.trim()) return 'Every question must have non-empty text.';
      if (question.questionText.length > MAX_QUESTION_LENGTH) return 'Question text must not exceed 1000 characters.';
      if (!Number.isInteger(question.orderIndex) || question.orderIndex < 0) return 'Question order index must be valid.';
    }

    return null;
  };

  const buildUpdateRequest = (): UpdateJobPostRequest => ({
    title: form.title.trim(),
    description: form.description.trim(),
    majorCategoryId: form.majorCategoryId || null,
    budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
    budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
    currency: form.currency.trim() || 'USD',
    estimatedDuration: form.estimatedDuration.trim() || null,
    maxHires: form.maxHires ? Number(form.maxHires) : null,
    location: form.location.trim() || null,
    visibility: Number(form.visibility),
    endDate: form.deadline ? new Date(`${form.deadline}T23:59:59`).toISOString() : null,
    skillIds: form.skillIds,
    customSkillNames: form.customSkillNames,
  });

  const saveQuestions = async (currentJobPostId: string) => {
    return jobAPI.createBulkJobPostQuestions(currentJobPostId, {
      questions: questionsWithOrder.map(question => ({
        questionText: question.questionText.trim(),
        orderIndex: question.orderIndex,
        isRequired: question.isRequired,
      })),
    });
  };

  const submitDraftFlow = async (mode: SubmitMode) => {
    if (!jobPostId) {
      const message = 'Draft JobPost is not ready yet.';
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      toast.error(validationError);
      return;
    }

    setSubmitMode(mode);
    setErrorMessage(null);

    const updateRequest = buildUpdateRequest();
    const updateResponse = await jobAPI.updateJobPost(jobPostId, updateRequest);
    if (!updateResponse.success) {
      const message = updateResponse.message || 'JobPost could not be saved.';
      setErrorMessage(message);
      toast.error(message);
      setSubmitMode(null);
      return;
    }

    const questionsResponse = await saveQuestions(jobPostId);
    if (!questionsResponse.success) {
      const message = 'JobPost was saved, but questions could not be saved. Please manage questions from My Jobs.';
      setErrorMessage(message);
      toast.error(message);
      setSubmitMode(null);
      return;
    }

    if (mode === 'publish') {
      const publishResponse = await jobAPI.updateJobPostStatus(jobPostId, { status: JobPostStatus.Open });
      if (!publishResponse.success) {
        const message = 'JobPost and questions were saved, but publishing failed. Please publish it later from My Jobs.';
        setErrorMessage(message);
        toast.error(message);
        setSubmitMode(null);
        return;
      }
    }

    if (mode === 'contract') {
      navigate('/jobs/post/contract', {
        state: {
          jobPostId,
          jobData: {
            ...updateRequest,
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
    navigate('/jobs/my-jobs');
  };

  const renderSubmitLabel = (mode: SubmitMode, label: string) => submitMode === mode ? 'Submitting...' : label;

  return {
    form,
    setForm,
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
    submitDraftFlow,
    renderSubmitLabel,
    MAX_QUESTION_LENGTH,
  };
}
