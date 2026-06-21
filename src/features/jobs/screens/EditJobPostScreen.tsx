import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, AlertCircle, Check, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobAPI } from '../../../api/jobAPI';
import type { CategoryOptionDto, MajorDto, SkillOptionDto } from '../../../types/models/Category';
import { JobPostVisibility, type UpdateJobPostRequest } from '../../../types/models/Job';
import '../styles/edit-job-post-screen.css';

interface FormErrors {
  title?: string;
  description?: string;
  taxonomy?: string;
  budget?: string;
  duration?: string;
}

const normalizeSkillName = (value: string) => value.trim().toLowerCase();

export default function EditJobPostScreen() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    majorId: '',
    majorCategoryId: '',
    categoryId: '',
    budgetMin: '',
    budgetMax: '',
    currency: 'USD',
    estimatedDuration: '',
    maxHires: '',
    location: '',
    visibility: String(JobPostVisibility.Public),
    endDate: '',
    skillIds: [] as string[],
    customSkillNames: [] as string[],
  });

  const [majors, setMajors] = useState<MajorDto[]>([]);
  const [categories, setCategories] = useState<CategoryOptionDto[]>([]);
  const [availableSkills, setAvailableSkills] = useState<SkillOptionDto[]>([]);
  const [skillNameById, setSkillNameById] = useState<Record<string, string>>({});
  const [skillInput, setSkillInput] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isTaxonomyLoading, setIsTaxonomyLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
        setFormData({
          title: job.title || '',
          description: job.description || '',
          majorId: job.majorId || '',
          majorCategoryId: job.majorCategoryId || '',
          categoryId: job.categoryId || '',
          budgetMin: job.budgetMin !== undefined && job.budgetMin !== null ? String(job.budgetMin) : '',
          budgetMax: job.budgetMax !== undefined && job.budgetMax !== null ? String(job.budgetMax) : '',
          currency: job.currency || 'USD',
          estimatedDuration: job.estimatedDuration || '',
          maxHires: job.maxHires !== undefined && job.maxHires !== null ? String(job.maxHires) : '',
          location: job.location || '',
          visibility: String(job.visibility ?? JobPostVisibility.Public),
          endDate: job.endDate?.split('T')?.[0] || '',
          skillIds: job.skills?.map(skill => skill.skillsId) || [],
          customSkillNames: job.customSkillNames || [],
        });
        setSkillNameById(
          Object.fromEntries((job.skills || []).map(skill => [skill.skillsId, skill.skillName]))
        );
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
            next[skill.skillId] = skill.name;
          });
          return next;
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleMajorChange = (majorId: string) => {
    setSkillInput('');
    setAvailableSkills([]);
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
    setFormData(prev => ({
      ...prev,
      majorCategoryId,
      categoryId: selectedCategory?.categoryId || '',
      skillIds: [],
      customSkillNames: [],
    }));
  };

  const addOfficialSkill = (skill: SkillOptionDto) => {
    setSkillNameById(prev => ({ ...prev, [skill.skillId]: skill.name }));
    setFormData(prev => {
      if (prev.skillIds.includes(skill.skillId)) return prev;
      return { ...prev, skillIds: [...prev.skillIds, skill.skillId] };
    });
  };

  const addTypedSkill = () => {
    const trimmedSkillName = skillInput.trim();
    if (!trimmedSkillName) return;

    if (!formData.categoryId) {
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = (): UpdateJobPostRequest => ({
    title: formData.title.trim(),
    description: formData.description.trim(),
    majorCategoryId: formData.majorCategoryId || null,
    budgetMin: formData.budgetMin ? Number(formData.budgetMin) : null,
    budgetMax: formData.budgetMax ? Number(formData.budgetMax) : null,
    currency: formData.currency.trim() || 'USD',
    estimatedDuration: formData.estimatedDuration.trim() || null,
    maxHires: formData.maxHires ? Number(formData.maxHires) : null,
    location: formData.location.trim() || null,
    visibility: Number(formData.visibility),
    endDate: formData.endDate ? new Date(`${formData.endDate}T23:59:59`).toISOString() : null,
    skillIds: formData.skillIds,
    customSkillNames: formData.customSkillNames,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !validateForm()) return;

    setIsSubmitting(true);
    const response = await jobAPI.updateJobPost(id, buildPayload());
    setIsSubmitting(false);

    if (!response.success) {
      toast.error(response.message || 'Job post could not be updated.');
      return;
    }

    setSuccessMessage(true);
    toast.success('Job post updated.');
    setTimeout(() => {
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
            <ArrowLeft size={18} />
            Back to Jobs
          </button>
          <h1 className="edit-job-title">Edit Job Post</h1>
        </div>

        <form onSubmit={handleSubmit} className="edit-job-form glass-card">
          <div className="form-group">
            <label className="form-label">Job Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Build E-Commerce Platform"
              className={`form-input ${errors.title ? 'error' : ''}`}
            />
            {errors.title && <div className="form-error"><AlertCircle size={14} />{errors.title}</div>}
            <div className="form-hint">{formData.title.length}/200 characters</div>
          </div>

          <div className="form-group">
            <label className="form-label">Job Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the job in detail..."
              rows={8}
              className={`form-textarea ${errors.description ? 'error' : ''}`}
            />
            {errors.description && <div className="form-error"><AlertCircle size={14} />{errors.description}</div>}
          </div>

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
          {errors.taxonomy && <div className="form-error"><AlertCircle size={14} />{errors.taxonomy}</div>}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Budget Min</label>
              <input
                type="number"
                min="0"
                value={formData.budgetMin}
                onChange={(e) => handleInputChange('budgetMin', e.target.value)}
                className={`form-input ${errors.budget ? 'error' : ''}`}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Budget Max</label>
              <input
                type="number"
                min="0"
                value={formData.budgetMax}
                onChange={(e) => handleInputChange('budgetMax', e.target.value)}
                className={`form-input ${errors.budget ? 'error' : ''}`}
              />
            </div>
          </div>
          {errors.budget && <div className="form-error"><AlertCircle size={14} />{errors.budget}</div>}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Project Duration</label>
              <input
                value={formData.estimatedDuration}
                onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                placeholder="e.g. 2-4 weeks"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Required Skills</label>
            <div className="skills-display">
              {selectedOfficialSkills.map(skill => (
                <div key={skill.skillId} className="skill-tag">
                  {skill.name}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      skillIds: prev.skillIds.filter(skillId => skillId !== skill.skillId),
                    }))}
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
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      customSkillNames: prev.customSkillNames.filter(item => normalizeSkillName(item) !== normalizeSkillName(skillName)),
                    }))}
                    className="skill-remove"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className="form-row" style={{ marginTop: 12 }}>
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
              />
              <button type="button" onClick={addTypedSkill} disabled={!formData.categoryId || !skillInput.trim()} className="btn-save">
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
          </div>

          <div className="edit-job-info-box">
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
            <button type="submit" disabled={isSubmitting || successMessage} className="btn-save">
              {successMessage ? (
                <>
                  <Check size={18} />
                  Saved!
                </>
              ) : isSubmitting ? (
                'Updating...'
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
