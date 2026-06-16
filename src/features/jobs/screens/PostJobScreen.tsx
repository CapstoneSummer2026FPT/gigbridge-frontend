import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  Bot,
  Sparkles,
  X,
  Plus,
  Calendar,
  Globe,
  Upload,
  Eye,
  Save,
  Rocket,
  AlertCircle,
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

const experienceLevelMap = {
  entry: 0,
  intermediate: 1,
  expert: 2,
} as const;

type SubmitIntent = 'draft' | 'publish';

type PostJobLocationState = {
  questions?: CreateJobPostQuestionRequest[];
};

export default function PostJobScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isGenerating, setIsGenerating] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const [form, setForm] = useState({
    title: '',
    category: 'Web Development',
    description: '',
    skills: [] as string[],
    budgetMin: '',
    budgetMax: '',
    deadline: '',
    jobType: 'fixed' as 'fixed' | 'hourly',
    isRemote: true,
    experienceLevel: 'intermediate' as 'entry' | 'intermediate' | 'expert',
  });

  const pendingQuestions = useMemo(() => {
    const routeQuestions = (location.state as PostJobLocationState | null)?.questions;

    if (Array.isArray(routeQuestions) && routeQuestions.length > 0) {
      return routeQuestions;
    }

    return readStoredCreateJobQuestions();
  }, [location.state]);

  const isSubmitting = submitIntent !== null;

  useEffect(() => {
    if (pendingQuestions.length === 0) {
      navigate('/jobs/post/questions', { replace: true });
    }
  }, [navigate, pendingQuestions.length]);

  const suggestedSkills = SKILLS_SUGGESTIONS[form.category] || [];
  const remainingSkills = suggestedSkills.filter(skill => !form.skills.includes(skill));

  const generateDescription = async () => {
    if (!form.title || !form.category) return;

    setIsGenerating(true);

    try {
      const response = await jobPostAPI.generateAIDescription();

      if (!response.success) {
        alert(response.message || 'AI job description generation is not available yet.');
      }
    } catch (error) {
      console.error('Failed to generate description:', error);
      alert('AI job description generation is not available yet.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addSkill = (skill: string) => {
    const value = skill.trim();

    if (!value) return;

    if (!form.skills.includes(value) && form.skills.length < 10) {
      setForm(prev => ({
        ...prev,
        skills: [...prev.skills, value],
      }));
    }

    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.filter(item => item !== skill),
    }));
  };

  const buildCreateJobPostRequest = (): CreateJobPostRequest => {
    return {
      title: form.title.trim(),
      description: form.description.trim(),

      // Backend currently expects Guid? CategoryId.
      // Current UI only has category name, so send null for now.
      categoryId: null,

      budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
      budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
      currency: 'USD',

      estimatedDuration: null,
      maxHires: 1,

      // Enum LocationType: 0=Remote, 1=OnSite, 2=Hybrid
      locationType: form.isRemote ? 0 : 1,
      location: form.isRemote ? 'Remote' : 'Onsite',

      // Enum JobPostVisibility: 0=Public, 1=Private, 2=InviteOnly
      visibility: 0,

      endDate: form.deadline
        ? new Date(form.deadline).toISOString()
        : null,

      // Backend expects Guid[] SkillIds.
      // Current UI only stores skill names, so send empty array for now.
      skillIds: [],
    };
  };

  const setSubmissionError = (message: string) => {
    setSubmitError(message);
    toast.error(message);
  };

  const validateForm = () => {
    if (!form.title || !form.category || !form.description) {
      setSubmissionError('Please fill in all required fields.');
      return false;
    }

    const budgetMin = form.budgetMin ? Number(form.budgetMin) : null;
    const budgetMax = form.budgetMax ? Number(form.budgetMax) : null;

    if (budgetMin !== null && Number.isNaN(budgetMin)) {
      setSubmissionError('Budget min is invalid.');
      return false;
    }

    if (budgetMax !== null && Number.isNaN(budgetMax)) {
      setSubmissionError('Budget max is invalid.');
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

      const request = buildCreateJobPostRequest();
      const response = await jobPostAPI.createJobPost(request);

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
        {/* Header */}
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
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Job Title */}
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
                Be specific — better titles attract better candidates
              </p>
            </div>

            {/* Category */}
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
                    className={`category-btn px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      form.category === category ? 'active' : ''
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="glass-card p-5">
              <label className="text-primary text-sm font-semibold block mb-3">
                Required Skills
              </label>

              <div className="flex flex-wrap gap-2 mb-3">
                {form.skills.map(skill => (
                  <span key={skill} className="flex items-center gap-1 badge-cyan">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:opacity-70"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}

                <div className="relative">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={event => setSkillInput(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && skillInput.trim()) {
                        event.preventDefault();
                        addSkill(skillInput);
                      }
                    }}
                    placeholder="+ Add skill"
                    className="input-gb px-3 py-1 text-sm w-28"
                  />
                </div>
              </div>

              {remainingSkills.length > 0 && (
                <div>
                  <p className="input-hint text-xs mb-2">
                    Suggested for {form.category}:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {remainingSkills.slice(0, 5).map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => addSkill(skill)}
                        className="flex items-center gap-1 tag-pill text-xs"
                      >
                        <Plus size={10} />
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description with AI Generator */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-primary text-sm font-semibold">
                  Job Description *
                </label>

                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={isGenerating || !form.title || !form.category}
                  className="ai-generate-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                >
                  {isGenerating ? (
                    <>
                      <div className="ai-generate-spinner w-4 h-4 rounded-full border-2 border-[#0077FF] border-t-transparent animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Bot size={14} />
                      <Sparkles size={12} />
                      AI Generate
                    </>
                  )}
                </button>
              </div>

              <textarea
                value={form.description}
                onChange={event => setForm({ ...form, description: event.target.value })}
                placeholder="Describe your project requirements, deliverables, and expectations..."
                rows={12}
                className="input-gb w-full px-4 py-3 resize-none text-sm leading-relaxed"
              />

              {form.description && (
                <div className="ai-generated-indicator flex items-center gap-2 mt-2">
                  <Bot size={12} />
                  <p className="text-xs">
                    AI-generated description — review and customize as needed
                  </p>
                </div>
              )}
            </div>

            {/* Budget */}
            <div className="glass-card p-5">
              <label className="text-primary text-sm font-semibold block mb-3">
                Budget
              </label>

              <div className="flex gap-3 mb-4">
                {(['fixed', 'hourly'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, jobType: type })}
                    className={`budget-type-btn flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                      form.jobType === type ? 'active' : ''
                    }`}
                  >
                    {type === 'fixed' ? '💰 Fixed Price' : '⏱️ Hourly Rate'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    placeholder="Min"
                    value={form.budgetMin}
                    onChange={event => setForm({ ...form, budgetMin: event.target.value })}
                    className="input-gb w-full px-4 py-3"
                  />
                </div>

                <div>
                  <input
                    type="number"
                    placeholder="Max"
                    value={form.budgetMax}
                    onChange={event => setForm({ ...form, budgetMax: event.target.value })}
                    className="input-gb w-full px-4 py-3"
                  />
                </div>
              </div>
            </div>

            {/* Deadline & Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-5">
                <label className="text-primary text-sm font-semibold block mb-3">
                  Deadline
                </label>

                <div>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={event => setForm({ ...form, deadline: event.target.value })}
                    className="input-gb w-full px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="glass-card p-5">
                <label className="text-primary text-sm font-semibold block mb-3">
                  Work Type
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isRemote: true })}
                    className={`work-type-btn flex-1 py-2 rounded-xl text-sm transition-all ${
                      form.isRemote ? 'active' : ''
                    }`}
                  >
                    <Globe size={12} className="inline mr-1" />
                    Remote
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isRemote: false })}
                    className={`work-type-btn flex-1 py-2 rounded-xl text-sm transition-all ${
                      !form.isRemote ? 'active' : ''
                    }`}
                  >
                    Onsite
                  </button>
                </div>
              </div>
            </div>

            {/* Experience Level */}
            <div className="glass-card p-5">
              <label className="text-primary text-sm font-semibold block mb-3">
                Experience Level
              </label>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'entry', label: 'Entry', sub: '$10–$40/hr', emoji: '🌱' },
                  { value: 'intermediate', label: 'Mid-Level', sub: '$40–$80/hr', emoji: '⚡' },
                  { value: 'expert', label: 'Expert', sub: '$80–$200/hr', emoji: '🚀' },
                ].map(level => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        experienceLevel: level.value as 'entry' | 'intermediate' | 'expert',
                      })
                    }
                    className={`experience-level-btn p-3 rounded-xl text-center transition-all ${
                      form.experienceLevel === level.value ? 'active' : ''
                    }`}
                  >
                    <span className="experience-level-emoji text-xl mb-1 block">
                      {level.emoji}
                    </span>
                    <p className="text-primary text-sm font-medium">
                      {level.label}
                    </p>
                    <p className="experience-level-sub text-xs">
                      {level.sub}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Attachments */}
            <div className="glass-card p-5">
              <label className="text-primary text-sm font-semibold block mb-3">
                Attachments <span className="input-hint">(optional)</span>
              </label>

              <div className="upload-zone">
                <Upload size={24} className="upload-icon mx-auto mb-2" />
                <p className="upload-text text-sm font-medium text-primary">
                  Drop files here or click to upload
                </p>
                <p className="upload-hint text-xs mt-1">
                  PDF, DOC, PNG, ZIP · Max 50MB
                </p>
              </div>
            </div>

            {/* Submit */}
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
                disabled={
                  isSubmitting ||
                  !form.title ||
                  !form.category ||
                  !form.description
                }
                className="btn-ghost-cyan flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Save size={16} />
                {submitIntent === 'draft' ? 'Saving Draft...' : 'Save as Draft'}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('publish')}
                disabled={
                  isSubmitting ||
                  !form.title ||
                  !form.category ||
                  !form.description
                }
                className="btn-cyan flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Rocket size={16} />
                {submitIntent === 'publish' ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>

          {/* Right Panel: Live Preview + AI Orb */}
          <div className="space-y-5">
            <div className="glass-card p-5">
              <p className="preview-label text-xs font-semibold mb-3">
                QUESTIONS READY
              </p>
              <p className="text-2xl font-black text-primary mb-1">
                {pendingQuestions.length}
              </p>
              <p className="text-xs text-secondary mb-4">
                Questions will be created immediately after the JobPost is saved as Draft.
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

            {/* Floating AI Orb */}
            <div className="ai-orb-card glass-card p-5 text-center">
              <div
                className="ai-orb w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center animate-orb cursor-pointer"
                onClick={generateDescription}
              >
                <Bot size={32} />
              </div>

              <p className="text-primary font-semibold mb-1">
                AI Job Generator
              </p>

              <p className="ai-orb-description text-xs mb-4">
                Fill in title & category, then click the orb to generate a professional job description
              </p>

              <button
                type="button"
                onClick={generateDescription}
                disabled={isGenerating || !form.title || !form.category}
                className="btn-cyan w-full py-2 text-sm disabled:opacity-40"
              >
                {isGenerating ? 'Generating...' : '✨ Generate Description'}
              </button>
            </div>

            {/* Job Preview */}
            {showPreview && form.title && (
              <div className="glass-card p-5">
                <p className="preview-label text-xs font-semibold mb-3">
                  PREVIEW
                </p>

                <h3 className="text-primary font-semibold mb-2">
                  {form.title || 'Job Title'}
                </h3>

                {form.category && (
                  <span className="badge-cyan text-xs mb-3 inline-block">
                    {form.category}
                  </span>
                )}

                {form.budgetMin && (
                  <p className="preview-budget text-sm text-primary mb-2 font-medium">
                    ${parseInt(form.budgetMin).toLocaleString()}–
                    ${parseInt(form.budgetMax || '0').toLocaleString()} · {form.jobType}
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
                    {form.description.split('\n')[0]}...
                  </p>
                )}
              </div>
            )}

            {/* Tips */}
            <div className="glass-card p-5">
              <p className="text-primary text-sm font-semibold mb-3">
                💡 Pro Tips
              </p>

              <div className="space-y-3">
                {[
                  'Specific titles get 2x more proposals',
                  'Jobs with 5+ skills attract senior talent',
                  'Clear budgets increase proposal quality',
                  'AI-generated descriptions get 60% more applicants',
                ].map((tip, index) => (
                  <div key={index} className="tips-item flex items-start gap-2">
                    <div className="tips-bullet w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="tips-text text-xs">
                      {tip}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget Estimator */}
            <div className="glass-card p-5">
              <p className="text-primary text-sm font-semibold mb-3">
                💰 Market Rate
              </p>

              {form.category ? (
                <div>
                  <p className="market-rate-hint text-xs mb-2">
                    Average for {form.category}:
                  </p>
                  <p className="market-rate-value text-xl font-black">
                    $50–$120/hr
                  </p>
                  <p className="market-rate-hint text-xs mt-1">
                    Based on 2,847 recent projects
                  </p>
                </div>
              ) : (
                <p className="market-rate-hint text-xs">
                  Select a category to see market rates
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
