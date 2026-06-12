import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  AlertCircle,
  Bot,
  Eye,
  Globe,
  Plus,
  Rocket,
  Save,
  Sparkles,
  X,
} from 'lucide-react';

import { AppLayout } from '../../../shared/components/AppLayout';
import { jobPostAPI, jobPutAPI, jobQuestionAPI } from '../../../api/jobAPI';
import {
  JobStatus,
  type CreateJobPostQuestionRequest,
  type CreateJobPostRequest,
} from '../../../types/models/Job';
import {
  clearStoredCreateJobQuestions,
  normalizeCreateJobQuestions,
  readStoredCreateJobQuestions,
} from '../utils/jobPostQuestionDraft';
import '../styles/PostJobScreen.css';

const CATEGORIES = [
  'Web Development',
  'Design',
  'Data Science',
  'Marketing',
  'Writing',
  'DevOps',
  'Mobile',
  'Video',
];

const SKILLS_SUGGESTIONS: Record<string, string[]> = {
  'Web Development': ['React', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL', 'Vue.js', 'Angular'],
  Design: ['Figma', 'UI/UX Design', 'Prototyping', 'Design Systems', 'After Effects', 'Sketch'],
  'Data Science': ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'SQL', 'Tableau'],
  DevOps: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux'],
  Writing: ['Technical Writing', 'SEO', 'Content Strategy', 'Copywriting'],
};

type SubmitIntent = 'draft' | 'publish';

type InitialJobData = {
  title?: string;
  category?: string;
  description?: string;
  skills?: string[];
  budgetMin?: number | string;
  budgetMax?: number | string;
  deadline?: string;
  location?: string;
  estimatedDuration?: string;
  maxHires?: number | string;
};

type PostJobLocationState = {
  questions?: CreateJobPostQuestionRequest[];
  jobData?: InitialJobData;
};

type JobFormState = {
  title: string;
  category: string;
  description: string;
  skills: string[];
  budgetMin: string;
  budgetMax: string;
  deadline: string;
  location: string;
  estimatedDuration: string;
  maxHires: string;
  visibility: '0' | '1' | '2';
};

const toFormString = (value: string | number | undefined): string =>
  value == null ? '' : String(value);

const parseOptionalNumber = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const parseOptionalInteger = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
};

export default function PostJobScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as PostJobLocationState | null;
  const initialJobData = routeState?.jobData;

  const [form, setForm] = useState<JobFormState>({
    title: initialJobData?.title || '',
    category: initialJobData?.category || 'Web Development',
    description: initialJobData?.description || '',
    skills: initialJobData?.skills || [],
    budgetMin: toFormString(initialJobData?.budgetMin),
    budgetMax: toFormString(initialJobData?.budgetMax),
    deadline: initialJobData?.deadline || '',
    location: initialJobData?.location || 'Remote',
    estimatedDuration: initialJobData?.estimatedDuration || '',
    maxHires: toFormString(initialJobData?.maxHires || 1),
    visibility: '0',
  });
  const [skillInput, setSkillInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const pendingQuestions = useMemo(() => {
    if (Array.isArray(routeState?.questions) && routeState.questions.length > 0) {
      return routeState.questions;
    }

    return readStoredCreateJobQuestions();
  }, [routeState?.questions]);

  const isSubmitting = submitIntent !== null;
  const suggestedSkills = SKILLS_SUGGESTIONS[form.category] || [];
  const remainingSkills = suggestedSkills.filter(skill => !form.skills.includes(skill));

  useEffect(() => {
    if (pendingQuestions.length === 0) {
      navigate('/jobs/post/questions', { replace: true });
    }
  }, [navigate, pendingQuestions.length]);

  const setSubmissionError = (message: string) => {
    setSubmitError(message);
    toast.error(message);
  };

  const addSkill = (skill: string) => {
    const value = skill.trim();
    if (!value || form.skills.includes(value) || form.skills.length >= 10) return;

    setForm(prev => ({
      ...prev,
      skills: [...prev.skills, value],
    }));
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.filter(item => item !== skill),
    }));
  };

  const generateDescription = async () => {
    if (!form.title || !form.category) return;

    try {
      setIsGenerating(true);
      const response = await jobPostAPI.generateAIDescription();
      setSubmissionError(response.message || 'AI job description generation is not available yet.');
    } catch (error) {
      console.error('Failed to generate description:', error);
      setSubmissionError('AI job description generation is not available yet.');
    } finally {
      setIsGenerating(false);
    }
  };

  const buildCreateJobPostRequest = (): CreateJobPostRequest => {
    const endDate = form.deadline
      ? new Date(`${form.deadline}T00:00:00`).toISOString()
      : null;

    return {
      title: form.title.trim(),
      description: form.description.trim(),
      categoryId: null,
      budgetMin: parseOptionalNumber(form.budgetMin),
      budgetMax: parseOptionalNumber(form.budgetMax),
      currency: 'USD',
      estimatedDuration: form.estimatedDuration.trim() || null,
      maxHires: parseOptionalInteger(form.maxHires),
      location: form.location.trim() || null,
      visibility: Number(form.visibility),
      endDate,
      skillIds: [],
    };
  };

  const validateForm = () => {
    if (!form.title.trim() || !form.category || !form.description.trim()) {
      setSubmissionError('Please fill in title, category, and description.');
      return false;
    }

    const budgetMin = parseOptionalNumber(form.budgetMin);
    const budgetMax = parseOptionalNumber(form.budgetMax);
    const maxHires = parseOptionalInteger(form.maxHires);

    if (Number.isNaN(budgetMin)) {
      setSubmissionError('Budget min is invalid.');
      return false;
    }

    if (Number.isNaN(budgetMax)) {
      setSubmissionError('Budget max is invalid.');
      return false;
    }

    if (Number.isNaN(maxHires)) {
      setSubmissionError('Max hires must be a positive whole number.');
      return false;
    }

    if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
      setSubmissionError('Budget min must be less than or equal to budget max.');
      return false;
    }

    if (![6, 8, 10].includes(pendingQuestions.length)) {
      setSubmissionError('Please create 6, 8, or 10 questions before continuing.');
      return false;
    }

    const normalizedQuestions = normalizeCreateJobQuestions(pendingQuestions);

    if (normalizedQuestions.some(question => !question.questionText)) {
      setSubmissionError('All JobPost questions must be filled.');
      return false;
    }

    if (normalizedQuestions.some(question => question.questionText.length > 1000)) {
      setSubmissionError('QuestionText must not exceed 1000 characters.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (intent: SubmitIntent) => {
    if (!validateForm()) return;

    const normalizedQuestions = normalizeCreateJobQuestions(pendingQuestions);

    try {
      setSubmitIntent(intent);
      setSubmitError('');

      const response = await jobPostAPI.createJobPost(buildCreateJobPostRequest());

      if (!response.success || !response.data) {
        setSubmissionError(response.message || 'Failed to create JobPost.');
        return;
      }

      const jobPostId = response.data;
      const questionsResponse = await jobQuestionAPI.createBulkJobPostQuestions(jobPostId, {
        questions: normalizedQuestions,
      });

      if (!questionsResponse.success) {
        setSubmissionError(
          questionsResponse.message
            || 'JobPost was created, but questions could not be saved. You can manage questions from My Jobs.'
        );
        return;
      }

      if (intent === 'publish') {
        const publishResponse = await jobPutAPI.updateJobPostStatus(jobPostId, {
          status: JobStatus.Open,
        });

        if (!publishResponse.success) {
          setSubmissionError(
            publishResponse.message
              || 'JobPost and questions were created, but publishing failed. The JobPost may still be in Draft status.'
          );
          return;
        }
      }

      clearStoredCreateJobQuestions();
      toast.success(intent === 'publish'
        ? 'JobPost published successfully.'
        : 'JobPost saved as draft successfully.');
      navigate('/jobs/my-jobs');
    } catch (error) {
      console.error('Failed to create job post:', error);
      setSubmissionError('Failed to create JobPost.');
    } finally {
      setSubmitIntent(null);
    }
  };

  if (pendingQuestions.length === 0) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="post-job-header-subtitle text-sm mb-1">Step 2 of 2</p>
          <h1 className="post-job-header text-3xl font-black text-primary">
            Describe Your Project
          </h1>
          <p className="post-job-header-description mt-2">
            Complete the JobPost details, then save it as Draft or publish it after questions are saved.
          </p>
        </div>

        {submitError && (
          <div className="glass-card p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={18} className="text-red flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red">{submitError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="glass-card p-5">
              <label className="text-primary text-sm font-semibold block mb-2">
                Job Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Senior React Developer for E-commerce Platform"
                value={form.title}
                onChange={event => setForm({ ...form, title: event.target.value })}
                className="input-gb w-full px-4 py-3"
              />
              <p className="input-hint text-xs mt-2">
                Be specific so the right freelancers can find the work.
              </p>
            </div>

            <div className="glass-card p-5">
              <label className="text-primary text-sm font-semibold block mb-3">
                Category *
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setForm({ ...form, category })}
                    className={`category-chip px-3 py-2 rounded-xl text-sm transition-all ${
                      form.category === category ? 'active' : ''
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="text-primary text-sm font-semibold">
                  Description *
                </label>
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={isGenerating || !form.title || !form.category}
                  className="btn-ghost-cyan px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-40"
                >
                  <Sparkles size={14} />
                  {isGenerating ? 'Checking...' : 'AI Assist'}
                </button>
              </div>
              <textarea
                value={form.description}
                onChange={event => setForm({ ...form, description: event.target.value })}
                placeholder="Describe the goals, deliverables, timeline, and collaboration expectations."
                rows={10}
                className="input-gb w-full px-4 py-3 resize-none text-sm leading-relaxed"
              />
            </div>

            <div className="glass-card p-5">
              <label className="text-primary text-sm font-semibold block mb-3">
                Skills
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {form.skills.map(skill => (
                  <span key={skill} className="tag-pill text-xs flex items-center gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="bg-transparent border-none p-0 cursor-pointer text-current"
                      aria-label={`Remove ${skill}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={event => setSkillInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addSkill(skillInput);
                    }
                  }}
                  placeholder="Add a skill"
                  className="input-gb flex-1 px-4 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => addSkill(skillInput)}
                  className="btn-ghost-cyan px-4 py-2.5 flex items-center gap-1 text-sm"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
              {remainingSkills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {remainingSkills.slice(0, 8).map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => addSkill(skill)}
                      className="tag-pill text-xs cursor-pointer"
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-5">
              <label className="text-primary text-sm font-semibold block mb-3">
                Budget
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  value={form.budgetMin}
                  onChange={event => setForm({ ...form, budgetMin: event.target.value })}
                  placeholder="Min budget"
                  className="input-gb px-4 py-3 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  value={form.budgetMax}
                  onChange={event => setForm({ ...form, budgetMax: event.target.value })}
                  placeholder="Max budget"
                  className="input-gb px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="glass-card p-5">
              <label className="text-primary text-sm font-semibold block mb-3">
                Timeline and Hiring
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={form.estimatedDuration}
                  onChange={event => setForm({ ...form, estimatedDuration: event.target.value })}
                  placeholder="Estimated duration"
                  className="input-gb px-4 py-3 text-sm"
                />
                <input
                  type="number"
                  min="1"
                  value={form.maxHires}
                  onChange={event => setForm({ ...form, maxHires: event.target.value })}
                  placeholder="Max hires"
                  className="input-gb px-4 py-3 text-sm"
                />
                <input
                  type="date"
                  value={form.deadline}
                  onChange={event => setForm({ ...form, deadline: event.target.value })}
                  className="input-gb px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="glass-card p-5">
              <label className="text-primary text-sm font-semibold block mb-3">
                Location and Visibility
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={event => setForm({ ...form, location: event.target.value })}
                    placeholder="Remote, Hanoi, Hybrid..."
                    className="input-gb w-full py-3 text-sm"
                    style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                  />
                </div>
                <select
                  value={form.visibility}
                  onChange={event =>
                    setForm({ ...form, visibility: event.target.value as JobFormState['visibility'] })
                  }
                  className="input-gb px-4 py-3 text-sm cursor-pointer"
                >
                  <option value="0">Public</option>
                  <option value="1">Private</option>
                  <option value="2">Invite Only</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                disabled={isSubmitting}
                className="preview-btn flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm transition-all disabled:opacity-40"
              >
                <Eye size={16} />
                Preview
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={isSubmitting || !form.title || !form.category || !form.description}
                className="btn-ghost-cyan flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Save size={16} />
                {submitIntent === 'draft' ? 'Saving Draft...' : 'Save as Draft'}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('publish')}
                disabled={isSubmitting || !form.title || !form.category || !form.description}
                className="btn-cyan flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Rocket size={16} />
                {submitIntent === 'publish' ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <div className="glass-card p-5">
              <p className="preview-label text-xs font-semibold mb-3">
                QUESTIONS READY
              </p>
              <p className="text-2xl font-black text-primary mb-1">
                {pendingQuestions.length}
              </p>
              <p className="text-xs text-secondary mb-4">
                Questions will be created immediately after the JobPost is saved.
              </p>
              <button
                type="button"
                onClick={() => navigate('/jobs/post/questions')}
                disabled={isSubmitting}
                className="btn-ghost-cyan w-full py-2 text-sm disabled:opacity-40"
              >
                Edit Questions
              </button>
            </div>

            <div className="ai-orb-card glass-card p-5 text-center">
              <button
                type="button"
                className="ai-orb w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center animate-orb cursor-pointer border-none"
                onClick={generateDescription}
                disabled={isGenerating || !form.title || !form.category}
              >
                <Bot size={32} />
              </button>
              <p className="text-primary font-semibold mb-1">
                AI Job Generator
              </p>
              <p className="ai-orb-description text-xs mb-4">
                This backend endpoint is not exposed yet, so the action reports availability.
              </p>
              <button
                type="button"
                onClick={generateDescription}
                disabled={isGenerating || !form.title || !form.category}
                className="btn-cyan w-full py-2 text-sm disabled:opacity-40"
              >
                {isGenerating ? 'Checking...' : 'Check AI Assist'}
              </button>
            </div>

            {showPreview && (
              <div className="glass-card p-5">
                <p className="preview-label text-xs font-semibold mb-3">
                  PREVIEW
                </p>
                <h3 className="text-primary font-semibold mb-2">
                  {form.title || 'Job Title'}
                </h3>
                <span className="badge-cyan text-xs mb-3 inline-block">
                  {form.category}
                </span>
                {(form.budgetMin || form.budgetMax) && (
                  <p className="preview-budget text-sm text-primary mb-2 font-medium">
                    ${Number(form.budgetMin || 0).toLocaleString()} - ${Number(form.budgetMax || 0).toLocaleString()}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mb-3">
                  {form.skills.map(skill => (
                    <span key={skill} className="tag-pill text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
                {form.description && (
                  <p className="preview-description text-xs leading-relaxed line-clamp-4">
                    {form.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
