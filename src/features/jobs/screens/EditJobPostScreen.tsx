import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router';
import { ArrowLeft, AlertCircle, Check, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import { getErrorMessage } from '../../../shared/utils/errorUtils';
import { jobAPI } from '../../../api/jobAPI';
import type { ApiResponse } from '../../../types/common';
import type { CategoryOptionDto, MajorDto, SkillOptionDto } from '../../../types/models/Category';
import {
  JobPostStatus,
  JobPostVisibility,
  type SaveDraftJobPostRequest,
  type UpdateJobPostRequest,
} from '../../../types/models/Job';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  DEFAULT_JOB_DURATION_UNIT,
  formatJobDuration,
  isValidJobDurationValue,
  JOB_DURATION_UNITS,
  parseJobDuration,
  type JobDurationUnit,
} from '../utils/jobDuration';
import '../styles/edit-job-post-screen.css';
import { GIGCOIN_CURRENCY_CODE } from '../../../shared/utils/gigcoin';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { PostJobLeavePrompt } from '../components/PostJobLeavePrompt';

interface FormErrors {
  title?: string;
  description?: string;
  taxonomy?: string;
  budget?: string;
  duration?: string;
  endDate?: string;
  skills?: string;
  server?: string;
}

interface EditJobPostFormData {
  title: string;
  description: string;
  majorId: string;
  majorCategoryId: string;
  categoryId: string;
  budgetMin: string;
  budgetMax: string;
  currency: string;
  estimatedDurationValue: string;
  estimatedDurationUnit: JobDurationUnit;
  visibility: string;
  endDate: string;
  skillIds: string[];
  customSkillNames: string[];
}

const normalizeSkillName = (value: string) => value.trim().toLowerCase()
  .replaceAll('#', 'sharp').replaceAll('+', 'plus').replaceAll('&', 'and')
  .replace(/[^\p{L}\p{N}]/gu, '');
const EMPTY_DRAFT_KEPT_MESSAGE = 'This draft already contains information, so it was kept as a saved draft.';

const normalizeApiFieldErrors = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((message): message is string => typeof message === 'string' && message.trim().length > 0);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value];
  }

  return [];
};

const uniqueMessages = (messages: string[]): string[] => (
  Array.from(new Set(messages.map(message => message.trim()).filter(Boolean)))
);

const joinMessages = (messages: string[]): string => uniqueMessages(messages).join('\n');

const appendFormError = (target: FormErrors, field: keyof FormErrors, messages: string[]) => {
  const message = joinMessages(messages);
  if (!message) return;

  target[field] = target[field] ? `${target[field]}\n${message}` : message;
};

const mapApiErrorsToEditFormErrors = (response: ApiResponse<unknown>, fallback: string): FormErrors => {
  const mappedErrors: FormErrors = {};
  const serverMessages: string[] = [];

  Object.entries(response.errors ?? {}).forEach(([rawField, rawMessages]) => {
    const messages = normalizeApiFieldErrors(rawMessages);
    if (messages.length === 0) return;

    const field = rawField.toLowerCase();

    if (field.includes('title')) {
      appendFormError(mappedErrors, 'title', messages);
    } else if (field.includes('description') || field.includes('jobpostcontent')) {
      appendFormError(mappedErrors, 'description', messages);
    } else if (field.includes('major') || field.includes('category')) {
      appendFormError(mappedErrors, 'taxonomy', messages);
    } else if (field.includes('budget')) {
      appendFormError(mappedErrors, 'budget', messages);
    } else if (field.includes('estimatedduration') || field.includes('duration')) {
      appendFormError(mappedErrors, 'duration', messages);
    } else if (field.includes('enddate')) {
      appendFormError(mappedErrors, 'endDate', messages);
    } else if (field.includes('skill')) {
      appendFormError(mappedErrors, 'skills', messages);
    } else {
      serverMessages.push(...messages);
    }
  });

  const fallbackMessage = getErrorMessage({
    message: response.message || fallback,
    errors: response.errors,
  });

  mappedErrors.server = fallbackMessage || joinMessages(serverMessages) || fallback;

  return mappedErrors;
};

export default function EditJobPostScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [isBudgetGuideOpen, setIsBudgetGuideOpen] = useState(false);
  const navigationAllowedRef = useRef(false);

  const [formData, setFormData] = useState<EditJobPostFormData>({
    title: '',
    description: '',
    majorId: '',
    majorCategoryId: '',
    categoryId: '',
    budgetMin: '',
    budgetMax: '',
    currency: GIGCOIN_CURRENCY_CODE,
    estimatedDurationValue: '',
    estimatedDurationUnit: DEFAULT_JOB_DURATION_UNIT,
    visibility: String(JobPostVisibility.Public),
    endDate: '',
    skillIds: [],
    customSkillNames: [],
  });

  const [majors, setMajors] = useState<MajorDto[]>([]);
  const [categories, setCategories] = useState<CategoryOptionDto[]>([]);
  const [availableSkills, setAvailableSkills] = useState<SkillOptionDto[]>([]);
  const [skillNameById, setSkillNameById] = useState<Record<string, string>>({});
  const skillNameByIdRef = useRef(skillNameById);
  useEffect(() => {
    skillNameByIdRef.current = skillNameById;
  }, [skillNameById]);

  const [skillInput, setSkillInput] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isTaxonomyLoading, setIsTaxonomyLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDraftJob, setIsDraftJob] = useState(false);
  const [isLeavePromptOpen, setIsLeavePromptOpen] = useState(false);
  const [leaveAction, setLeaveAction] = useState<'save' | 'discard' | null>(null);

  const shouldBlockNavigation = isDraftJob
    && !navigationAllowedRef.current
    && !isSubmitting
    && !isLoading;

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        shouldBlockNavigation && currentLocation.pathname !== nextLocation.pathname,
      [shouldBlockNavigation]
    )
  );

  const isLocked = formData.visibility === '3';

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

    jobAPI.getMajors().then(response => {
      if (!isMounted) return;
      if (response.success && response.data) {
        setMajors(response.data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!id) {
      setLoadError('Job post id is missing.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    jobAPI.getMyJobPostById(id)
      .then(response => {
        if (!isMounted) return;
        if (!response.success || !response.data) {
          setLoadError(response.message || 'Unable to load job post.');
          return;
        }

        const job = response.data;
        const duration = parseJobDuration(job.estimatedDuration);
        setIsDraftJob(Number(job.status) === JobPostStatus.Draft);
        setFormData({
          title: job.title || '',
          description: job.description || '',
          majorId: job.majorId || '',
          majorCategoryId: job.majorCategoryId || '',
          categoryId: job.categoryId || '',
          budgetMin: job.budgetMin !== undefined && job.budgetMin !== null ? String(job.budgetMin) : '',
          budgetMax: job.budgetMax !== undefined && job.budgetMax !== null ? String(job.budgetMax) : '',
          currency: job.currency || GIGCOIN_CURRENCY_CODE,
          estimatedDurationValue: duration.value,
          estimatedDurationUnit: duration.unit,
          visibility: String(job.visibility ?? JobPostVisibility.Public),
          endDate: job.endDate?.split('T')?.[0] || '',
          skillIds: job.skills?.map(skill => skill.skillsId.toLowerCase()) || [],
          customSkillNames: job.customSkillNames || [],
        });
        setSkillNameById(prev => {
          const next = { ...prev };
          (job.skills || []).forEach(skill => {
            next[skill.skillsId.toLowerCase()] = skill.skillName;
          });
          return next;
        });
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!formData.majorId) {
      setCategories([]);
      return;
    }

    let isMounted = true;
    setIsTaxonomyLoading(true);

    jobAPI.getCategoriesByMajor(formData.majorId)
      .then(response => {
        if (!isMounted) return;
        setCategories(response.success && response.data ? response.data : []);
      })
      .finally(() => {
        if (isMounted) setIsTaxonomyLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [formData.majorId]);

  useEffect(() => {
    if (!formData.categoryId) {
      setAvailableSkills([]);
      setFormData(prev => ({ ...prev, skillIds: [] }));
      return;
    }

    let isMounted = true;

    jobAPI.getSkillsByCategory(formData.categoryId)
      .then(response => {
        if (!isMounted) return;
        const skills = response.success && response.data ? response.data : [];
        setAvailableSkills(skills);
        setSkillNameById(prev => {
          const next = { ...prev };
          skills.forEach(skill => {
            next[skill.skillId.toLowerCase()] = skill.name;
          });
          return next;
        });

        // Filter selected official skills and convert mismatched ones to custom skills
        const newSkillIds = skills.map(s => s.skillId.toLowerCase());
        setFormData(prev => {
          const preservedSkillIds: string[] = [];
          const convertedCustomNames: string[] = [];

          prev.skillIds.forEach(id => {
            const idLower = id.toLowerCase();
            if (newSkillIds.includes(idLower)) {
              preservedSkillIds.push(idLower);
            } else {
              const name = skillNameByIdRef.current[idLower] || skills.find(s => s.skillId.toLowerCase() === idLower)?.name || 'Unknown skill';
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
      });

    return () => {
      isMounted = false;
    };
  }, [formData.categoryId]);

  const selectedOfficialSkills = useMemo(
    () => formData.skillIds.map(skillId => ({
      skillId,
      name: skillNameById[skillId] || availableSkills.find(skill => skill.skillId === skillId)?.name || 'Unknown skill',
    })),
    [availableSkills, formData.skillIds, skillNameById]
  );

  const remainingSkills = useMemo(
    () => availableSkills.filter(skill => !formData.skillIds.includes(skill.skillId)),
    [availableSkills, formData.skillIds]
  );

  const clearFormErrors = (...fields: (keyof FormErrors)[]) => {
    setErrors(prev => {
      const next = { ...prev, server: undefined };
      fields.forEach(field => {
        next[field] = undefined;
      });
      return next;
    });
  };

  const handleInputChange = <Field extends keyof EditJobPostFormData>(
    field: Field,
    value: EditJobPostFormData[Field]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'title') {
      clearFormErrors('title');
    } else if (field === 'description') {
      clearFormErrors('description');
    } else if (field === 'budgetMin' || field === 'budgetMax') {
      clearFormErrors('budget');
    } else if (field === 'endDate') {
      clearFormErrors('endDate');
    } else {
      clearFormErrors();
    }

    if (field === 'estimatedDurationValue' || field === 'estimatedDurationUnit') {
      clearFormErrors('duration');
    }
  };

  const handleMajorChange = (majorId: string) => {
    setSkillInput('');
    setAvailableSkills([]);
    clearFormErrors('taxonomy', 'skills');
    setFormData(prev => ({
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
    clearFormErrors('taxonomy', 'skills');
    setFormData(prev => ({
      ...prev,
      majorCategoryId,
      categoryId: selectedCategory?.categoryId || '',
    }));
  };

  const addOfficialSkill = (skill: SkillOptionDto) => {
    if (formData.skillIds.length + formData.customSkillNames.length >= 10) {
      toast.error('You can select up to 10 skills in total.');
      return;
    }
    clearFormErrors('skills');
    const skillIdLower = skill.skillId.toLowerCase();
    setSkillNameById(prev => ({ ...prev, [skillIdLower]: skill.name }));
    setFormData(prev => {
      if (prev.skillIds.map(id => id.toLowerCase()).includes(skillIdLower)) return prev;
      return { ...prev, skillIds: [...prev.skillIds, skillIdLower] };
    });
  };

  const addTypedSkill = () => {
    const trimmedSkillName = skillInput.trim();
    if (!trimmedSkillName) return;

    if (!formData.categoryId) {
      toast.error('Please select a category before adding skills.');
      return;
    }

    if (formData.skillIds.length + formData.customSkillNames.length >= 10) {
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

    clearFormErrors('skills');
    setFormData(prev => {
      const exists = prev.customSkillNames.some(
        skillName => normalizeSkillName(skillName) === normalizeSkillName(trimmedSkillName)
      );

      if (exists) return prev;
      return { ...prev, customSkillNames: [...prev.customSkillNames, trimmedSkillName] };
    });
    setSkillInput('');
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required.';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must not exceed 200 characters.';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required.';
    }

    if (!formData.majorId || !formData.majorCategoryId || !formData.categoryId) {
      newErrors.taxonomy = 'Major and category are required.';
    }

    const budgetMin = formData.budgetMin ? Number(formData.budgetMin) : null;
    const budgetMax = formData.budgetMax ? Number(formData.budgetMax) : null;
    if (budgetMin !== null && (Number.isNaN(budgetMin) || budgetMin < 0)) {
      newErrors.budget = 'Budget min must be greater than or equal to 0.';
    } else if (budgetMax !== null && (Number.isNaN(budgetMax) || budgetMax < 0)) {
      newErrors.budget = 'Budget max must be greater than or equal to 0.';
    } else if (budgetMin !== null && budgetMax !== null && budgetMax < budgetMin) {
      newErrors.budget = 'Budget max must be greater than or equal to budget min.';
    }

    if (!isValidJobDurationValue(formData.estimatedDurationValue)) {
      newErrors.duration = 'Project duration must be a positive whole number.';
    }

    if (formData.endDate) {
      const endDate = new Date(`${formData.endDate}T23:59:59`);
      if (Number.isNaN(endDate.getTime()) || endDate <= new Date()) {
        newErrors.endDate = 'End date must be in the future.';
      }
    }

    const firstError = Object.values(newErrors).find(Boolean);
    if (firstError) {
      newErrors.server = firstError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = (): UpdateJobPostRequest => ({
    title: formData.title.trim(),
    description: formData.description.trim(),
    majorCategoryId: formData.majorCategoryId || null,
    budgetMin: formData.budgetMin ? Number(formData.budgetMin) : null,
    budgetMax: formData.budgetMax ? Number(formData.budgetMax) : null,
    currency: formData.currency.trim() || GIGCOIN_CURRENCY_CODE,
    estimatedDuration: formatJobDuration(formData.estimatedDurationValue, formData.estimatedDurationUnit),
    visibility: Number(formData.visibility),
    endDate: formData.endDate ? new Date(`${formData.endDate}T23:59:59`).toISOString() : null,
    skillIds: formData.skillIds,
    customSkillNames: formData.customSkillNames,
  });

  const buildDraftPayload = (): SaveDraftJobPostRequest => ({
    title: formData.title.trim() || null,
    description: formData.description.trim() || null,
    majorCategoryId: formData.majorCategoryId || null,
    budgetMin: formData.budgetMin ? Number(formData.budgetMin) : null,
    budgetMax: formData.budgetMax ? Number(formData.budgetMax) : null,
    currency: formData.currency.trim() || GIGCOIN_CURRENCY_CODE,
    estimatedDuration: formatJobDuration(formData.estimatedDurationValue, formData.estimatedDurationUnit),
    visibility: Number(formData.visibility),
    endDate: formData.endDate ? new Date(`${formData.endDate}T23:59:59`).toISOString() : null,
    skillIds: formData.skillIds,
    customSkillNames: formData.customSkillNames,
    questions: null,
  });

  const allowNextNavigation = () => {
    navigationAllowedRef.current = true;
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
    if (!id) return;
    setLeaveAction('save');
    const response = await jobAPI.saveDraftJobPost(id, buildDraftPayload());
    setLeaveAction(null);

    if (!response.success) {
      const formErrors = mapApiErrorsToEditFormErrors(response, 'Draft JobPost could not be saved.');
      setErrors(formErrors);
      toast.error(formErrors.server || 'Draft JobPost could not be saved.');
      return;
    }

    toast.success('Draft saved.');
    continueBlockedNavigation();
  };

  const handleLeaveDiscardDraft = async () => {
    if (!id) return;
    setLeaveAction('discard');
    const response = await jobAPI.deleteEmptyDraftJobPost(id);
    setLeaveAction(null);

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
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !validateForm()) return;

    setIsSubmitting(true);
    const response = await jobAPI.updateJobPost(id, buildPayload());
    setIsSubmitting(false);

    if (!response.success) {
      const formErrors = mapApiErrorsToEditFormErrors(response, 'Job post could not be updated.');
      setErrors(formErrors);
      toast.error(formErrors.server || 'Job post could not be updated.');
      return;
    }

    setSuccessMessage(true);
    toast.success('Job post updated.');
    setTimeout(() => {
      allowNextNavigation();
      navigate('/jobs/my-jobs');
    }, 800);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="edit-job-wrapper">
          <div className="edit-job-form glass-card">Loading job post...</div>
        </div>
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout>
        <div className="edit-job-wrapper">
          <div className="edit-job-form glass-card">
            <div className="form-error"><AlertCircle size={14} />{loadError}</div>
            <button onClick={() => navigate('/jobs/my-jobs')} className="btn-cancel">Back to Jobs</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="edit-job-wrapper">
        <div className="edit-job-header">
          <button onClick={() => navigate(-1)} className="edit-job-back-btn">
            <ArrowLeft size={16} />
            Back to Jobs
          </button>
          <h1 className="edit-job-title">
            Edit <span className="text-blue-600 dark:text-cyan-400 italic font-light">Job</span> Post
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="edit-job-form">
          {isLocked && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-red-500" />
              <div>
                <p className="font-bold text-sm text-red-500">This job post is locked by an admin.</p>
                <p className="text-xs text-red-500/80 mt-1">
                  Updates, status changes, and visibility adjustments are disabled. Please contact support if you believe this is an error.
                </p>
              </div>
            </div>
          )}

          {errors.server && (
            <div className="form-error edit-job-server-error" role="alert">
              <AlertCircle size={16} />
              <span>{errors.server}</span>
            </div>
          )}

          {/* Section 1: Job Details */}
          <div className="edit-job-section">
            <h2 className="edit-job-section-title">Job Details</h2>
            <div className="space-y-5">
              <div className="form-group">
                <label className="form-label">Job Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Build E-Commerce Platform"
                  className={`form-input ${errors.title ? 'error' : ''}`}
                />
                {errors.title && <div className="form-error"><AlertCircle size={14} /><span>{errors.title}</span></div>}
                <div className="form-hint">{formData.title.length}/200 characters</div>
              </div>

              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label className="form-label">Job Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the job in detail..."
                  rows={8}
                  className={`form-textarea ${errors.description ? 'error' : ''}`}
                />
                {errors.description && <div className="form-error"><AlertCircle size={14} /><span>{errors.description}</span></div>}
              </div>
            </div>
          </div>

          {/* Section 2: Classification & Skills */}
          <div className="edit-job-section" style={{ marginTop: '1rem' }}>
            <h2 className="edit-job-section-title">Classification & Skills</h2>
            <div className="space-y-5">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Major *</label>
                  <select
                    value={formData.majorId}
                    onChange={(e) => handleMajorChange(e.target.value)}
                    className={`form-select ${errors.taxonomy ? 'error' : ''}`}
                  >
                    <option value="">Select major</option>
                    {majors.map(major => <option key={major.majorId} value={major.majorId}>{major.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    value={formData.majorCategoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    disabled={!formData.majorId || isTaxonomyLoading}
                    className={`form-select ${errors.taxonomy ? 'error' : ''}`}
                  >
                    <option value="">{!formData.majorId ? 'Select a major first' : 'Select category'}</option>
                    {categories.map(category => (
                      <option key={category.majorCategoryId} value={category.majorCategoryId}>{category.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {errors.taxonomy && <div className="form-error" style={{ marginTop: '0.5rem' }}><AlertCircle size={14} /><span>{errors.taxonomy}</span></div>}

              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label className="form-label">Required Skills</label>
                <div className="skills-display">
                  {selectedOfficialSkills.map(skill => (
                    <div key={skill.skillId} className="skill-tag">
                      {skill.name}
                      <button
                        type="button"
                        onClick={() => {
                          clearFormErrors('skills');
                          setFormData(prev => ({
                            ...prev,
                            skillIds: prev.skillIds.filter(skillId => skillId.toLowerCase() !== skill.skillId.toLowerCase()),
                          }));
                        }}
                        className="skill-remove"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {formData.customSkillNames.map(skillName => (
                    <div key={skillName} className="skill-tag">
                      {skillName} (custom)
                      <button
                        type="button"
                        onClick={() => {
                          clearFormErrors('skills');
                          setFormData(prev => ({
                            ...prev,
                            customSkillNames: prev.customSkillNames.filter(item => normalizeSkillName(item) !== normalizeSkillName(skillName)),
                          }));
                        }}
                        className="skill-remove"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {selectedOfficialSkills.length === 0 && formData.customSkillNames.length === 0 && (
                    <span className="text-xs text-muted-foreground">No skills selected yet.</span>
                  )}
                </div>

                <div className="flex gap-3" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <input
                    value={skillInput}
                    onChange={event => setSkillInput(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addTypedSkill();
                      }
                    }}
                    disabled={!formData.categoryId}
                    placeholder={formData.categoryId ? 'Type a skill and click Add' : 'Select a category first'}
                    className="form-input"
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={addTypedSkill} disabled={!formData.categoryId || !skillInput.trim()} className="btn-add-skill">
                    <Plus size={16} /> Add
                  </button>
                </div>

                {remainingSkills.length > 0 && (
                  <div className="skills-display" style={{ marginTop: 12 }}>
                    {remainingSkills.slice(0, 8).map(skill => (
                      <button key={skill.skillId} type="button" onClick={() => addOfficialSkill(skill)} className="skill-tag">
                        <Plus size={12} /> {skill.name}
                      </button>
                    ))}
                  </div>
                )}
                {errors.skills && <div className="form-error" style={{ marginTop: '0.5rem' }}><AlertCircle size={14} /><span>{errors.skills}</span></div>}
              </div>
            </div>
          </div>

          {/* Section 3: Budget & Logistics */}
          <div className="edit-job-section" style={{ marginTop: '1rem' }}>
            <h2 className="edit-job-section-title">Budget & Logistics</h2>
            <div className="space-y-5">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Budget Min (G-coin)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.budgetMin}
                    onChange={(e) => handleInputChange('budgetMin', e.target.value)}
                    placeholder="e.g. 500"
                    className={`form-input ${errors.budget ? 'error' : ''}`}
                  />
                </div>
                <div className="form-group">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="form-label !mb-0">Budget Max (G-coin)</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBudgetGuideOpen(!isBudgetGuideOpen)}
                        className="w-5 h-5 rounded-full bg-[var(--gb-cyan)]/20 border border-[var(--gb-cyan)]/40 text-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)] hover:text-white flex items-center justify-center text-xs font-extrabold transition-all cursor-pointer shadow-[0_0_10px_rgba(0,119,255,0.2)]"
                        title="Currency guide"
                      >
                        ?
                      </button>
                      {isBudgetGuideOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsBudgetGuideOpen(false)} />
                          <div className="absolute right-0 bottom-7 w-72 bg-card border border-border rounded-2xl p-4 shadow-2xl z-50 text-left select-text">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--gb-purple)] to-[var(--gb-cyan)]" />
                            <h4 className="text-xs font-extrabold text-foreground mb-1.5 flex items-center gap-1.5">
                              <span className="w-4.5 h-4.5 rounded-full bg-[var(--gb-cyan)]/15 text-[var(--gb-cyan)] flex items-center justify-center text-[10px] font-black">?</span>
                              {t('jobs.budgetGuideTitle')}
                            </h4>
                            <p 
                              className="text-[11px] text-muted-foreground leading-relaxed mb-3"
                              dangerouslySetInnerHTML={{ __html: t('jobs.budgetGuideDesc') }}
                            />
                            
                            <div className="bg-muted/40 rounded-xl p-2.5 border border-border/60 flex items-center justify-between mb-3">
                              <div className="flex items-center gap-1.5">
                                <GigCoinLogo size={16} />
                                <span className="text-xs font-bold text-foreground">1 G-coin</span>
                              </div>
                              <span className="text-muted-foreground text-[10px] font-bold">⇄</span>
                              <span className="text-xs font-black text-brand">1,000 VND</span>
                            </div>

                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {t('jobs.budgetGuideNote')}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formData.budgetMax}
                    onChange={(e) => handleInputChange('budgetMax', e.target.value)}
                    placeholder="e.g. 2000"
                    className={`form-input ${errors.budget ? 'error' : ''}`}
                  />
                </div>
              </div>
              {errors.budget && <div className="form-error" style={{ marginTop: '0.5rem' }}><AlertCircle size={14} /><span>{errors.budget}</span></div>}

              <div className="form-row" style={{ marginTop: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Project Duration</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.estimatedDurationValue}
                      onChange={(e) => handleInputChange('estimatedDurationValue', e.target.value)}
                      placeholder="e.g. 3"
                      className={`form-input ${errors.duration ? 'error' : ''}`}
                      style={{ flex: 1 }}
                    />
                    <select
                      value={formData.estimatedDurationUnit}
                      onChange={(e) => handleInputChange('estimatedDurationUnit', e.target.value as JobDurationUnit)}
                      className="form-select"
                      style={{ width: '120px' }}
                    >
                      {JOB_DURATION_UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                  {errors.duration && <div className="form-error" style={{ marginTop: '0.5rem' }}><AlertCircle size={14} /><span>{errors.duration}</span></div>}
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className={`form-input ${errors.endDate ? 'error' : ''}`}
                  />
                  {errors.endDate && <div className="form-error" style={{ marginTop: '0.5rem' }}><AlertCircle size={14} /><span>{errors.endDate}</span></div>}
                </div>
              </div>
            </div>
          </div>

          <div className="edit-job-info-box" style={{ marginTop: '1.5rem' }}>
            <div className="info-box-content">
              <AlertCircle size={20} className="info-icon" />
              <div>
                <p className="info-title">Before you save:</p>
                <ul className="info-list">
                  <li>Major/category selection controls the official skill list.</li>
                  <li>Typed skills matching official skills are saved as official skill IDs.</li>
                  <li>Custom skills are saved only when no official match exists in the selected category.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate(-1)} className="btn-cancel">Cancel</button>
            <button type="submit" disabled={isSubmitting || successMessage || isLocked} className="btn-save">
              {successMessage ? (
                <>
                  <Check size={18} />
                  Saved!
                </>
              ) : isSubmitting ? (
                'Updating...'
              ) : (
                <>
                  <Check size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <PostJobLeavePrompt
        isOpen={isLeavePromptOpen}
        leaveAction={leaveAction}
        onSaveDraft={handleLeaveSaveDraft}
        onDiscardDraft={handleLeaveDiscardDraft}
        onCancel={cancelBlockedNavigation}
      />
    </AppLayout>
  );
}
