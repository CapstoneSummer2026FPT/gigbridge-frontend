import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Bot, Sparkles, X, Plus, ChevronRight,
  Bold, Italic, Underline, List, ListOrdered, Check, Save, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobAPI } from '../../../api/jobAPI';
import { JobPostStatus, JobPostVisibility, type CreateJobPostRequest } from '../../../types/models/Job';
import '../styles/PostJobScreen.css';

const CATEGORIES = ['Web Development', 'Design', 'Data Science', 'Marketing', 'Writing', 'DevOps', 'Mobile', 'Video'];
const QUESTION_COUNTS = [6, 8, 10] as const;
const MAX_QUESTION_LENGTH = 1000;

const SKILLS_SUGGESTIONS: Record<string, string[]> = {
  'Web Development': ['React', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL', 'Vue.js', 'Angular'],
  Design: ['Figma', 'UI/UX Design', 'Prototyping', 'Design Systems', 'After Effects', 'Sketch'],
  'Data Science': ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'SQL', 'Tableau'],
  DevOps: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux'],
  Writing: ['Technical Writing', 'SEO', 'Content Strategy', 'Copywriting'],
};

type SubmitMode = 'draft' | 'publish' | 'contract';

interface QuestionInput {
  questionText: string;
  isRequired: boolean;
}

const createEmptyQuestions = (count: number, existing: QuestionInput[] = []): QuestionInput[] =>
  Array.from({ length: count }, (_, index) => existing[index] ?? { questionText: '', isRequired: true });

export default function PostJobScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialJobData = location.state?.jobData;

  const [isGenerating, setIsGenerating] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [submitMode, setSubmitMode] = useState<SubmitMode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: initialJobData?.title || '',
    category: initialJobData?.category || 'Web Development',
    description: initialJobData?.description || '',
    skills: initialJobData?.skills || [] as string[],
    budgetMin: initialJobData?.budgetMin !== undefined ? String(initialJobData.budgetMin) : '',
    budgetMax: initialJobData?.budgetMax !== undefined ? String(initialJobData.budgetMax) : '',
    currency: initialJobData?.currency || 'USD',
    estimatedDuration: initialJobData?.estimatedDuration || '',
    maxHires: initialJobData?.maxHires !== undefined ? String(initialJobData.maxHires) : '',
    location: initialJobData?.location || '',
    visibility: String(initialJobData?.visibility ?? JobPostVisibility.Public),
    deadline: initialJobData?.deadline || initialJobData?.endDate?.split?.('T')?.[0] || '',
  });

  const [questionCount, setQuestionCount] = useState<(typeof QUESTION_COUNTS)[number]>(6);
  const [questions, setQuestions] = useState<QuestionInput[]>(() => {
    const initialQuestions = initialJobData?.interviewQuestions?.map((question: any) => ({
      questionText: question.questionText || question.question || '',
      isRequired: question.isRequired ?? true,
    })) || [];
    return createEmptyQuestions(6, initialQuestions);
  });

  const suggestedSkills = SKILLS_SUGGESTIONS[form.category] || [];
  const remainingSkills = suggestedSkills.filter(skill => !form.skills.includes(skill));
  const isSubmitting = submitMode !== null;

  const previewTitle = form.title.trim() || 'Untitled Job Post';
  const questionsWithOrder = useMemo(
    () => questions.map((question, index) => ({ ...question, orderIndex: index })),
    [questions]
  );

  const insertMarkdown = (before: string, after: string) => {
    setForm(prev => ({ ...prev, description: prev.description + before + after }));
  };

  const addSkill = (skill: string) => {
    if (!form.skills.includes(skill) && form.skills.length < 10) {
      setForm(prev => ({ ...prev, skills: [...prev.skills, skill] }));
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setForm(prev => ({ ...prev, skills: prev.skills.filter(item => item !== skill) }));
  };

  const generateDescription = async () => {
    if (!form.title || !form.category) return;

    setIsGenerating(true);
    const skillsText = form.skills.length > 0 ? ` Required skills: ${form.skills.join(', ')}.` : '';
    setForm(prev => ({
      ...prev,
      description: `We are looking for a skilled ${form.category.toLowerCase()} professional for ${form.title}. Describe your relevant experience, delivery approach, timeline expectations, and examples of similar work.${skillsText}`,
    }));
    setIsGenerating(false);
  };

  const handleQuestionCountChange = (count: (typeof QUESTION_COUNTS)[number]) => {
    setQuestionCount(count);
    setQuestions(prev => createEmptyQuestions(count, prev));
  };

  const updateQuestion = (index: number, patch: Partial<QuestionInput>) => {
    setQuestions(prev => prev.map((question, idx) => idx === index ? { ...question, ...patch } : question));
  };

  const validateForm = () => {
    if (!form.title.trim()) return 'Job title is required.';
    if (form.title.trim().length > 200) return 'Job title must not exceed 200 characters.';
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

  const buildCreateRequest = (): CreateJobPostRequest => ({
    title: form.title.trim(),
    description: form.description.trim(),
    categoryId: null,
    budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
    budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
    currency: form.currency.trim() || 'USD',
    estimatedDuration: form.estimatedDuration.trim() || null,
    maxHires: form.maxHires ? Number(form.maxHires) : null,
    location: form.location.trim() || null,
    visibility: Number(form.visibility),
    endDate: form.deadline ? new Date(`${form.deadline}T23:59:59`).toISOString() : null,
    skillIds: [],
  });

  const submitCreateFlow = async (mode: SubmitMode) => {
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      toast.error(validationError);
      return;
    }

    setSubmitMode(mode);
    setErrorMessage(null);

    const createResponse = await jobAPI.createJobPost(buildCreateRequest());
    if (!createResponse.success || !createResponse.data) {
      const message = createResponse.message || 'JobPost could not be created.';
      setErrorMessage(message);
      toast.error(message);
      setSubmitMode(null);
      return;
    }

    const jobPostId = String(createResponse.data);
    const questionsResponse = await jobAPI.createBulkJobPostQuestions(jobPostId, {
      questions: questionsWithOrder.map(question => ({
        questionText: question.questionText.trim(),
        orderIndex: question.orderIndex,
        isRequired: question.isRequired,
      })),
    });

    if (!questionsResponse.success) {
      const message = 'JobPost was created, but questions could not be saved. Please manage questions from My Jobs.';
      setErrorMessage(message);
      toast.error(message);
      setSubmitMode(null);
      return;
    }

    if (mode === 'publish') {
      const publishResponse = await jobAPI.updateJobPostStatus(jobPostId, { status: JobPostStatus.Open });
      if (!publishResponse.success) {
        const message = 'JobPost and questions were created, but publishing failed. Please publish it later from My Jobs.';
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
            ...buildCreateRequest(),
            category: form.category,
            skills: form.skills,
            deadline: form.deadline,
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

  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto px-6 py-8 relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.02),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.02),transparent_50%)] opacity-50 pointer-events-none" />

        <div className="flex flex-col gap-6 items-center mb-8">
          <div className="flex justify-center w-full">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground text-center uppercase" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", letterSpacing: '0.05em' }}>Create New Job Post</h1>
          </div>

          <div className="flex items-center justify-center w-full max-w-3xl mx-auto py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--gb-cyan)] text-white flex items-center justify-center shadow-md font-bold text-sm">1</div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--gb-cyan)] uppercase tracking-wider font-bold">Step 1</span>
                <span className="text-xs text-foreground font-bold">Project Details</span>
              </div>
            </div>
            <div className="flex-grow mx-6 h-[2px] bg-border rounded-full opacity-50" />
            <div className="flex items-center gap-3 opacity-60">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm">2</div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Step 2</span>
                <span className="text-xs text-muted-foreground font-bold">Contract Setup</span>
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl px-4 py-3 text-sm font-semibold">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 flex flex-col gap-6 bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold border-b border-border pb-4 mb-2 text-foreground">Job Details</h2>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={form.title}
                  onChange={event => setForm({ ...form, title: event.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                  <select
                    value={form.category}
                    onChange={event => setForm({ ...form, category: event.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground"
                  >
                    {CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <p className="text-[10px] text-muted-foreground">Category is shown locally until category IDs are exposed by the backend.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Visibility</label>
                  <select
                    value={form.visibility}
                    onChange={event => setForm({ ...form, visibility: event.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground"
                  >
                    <option value={JobPostVisibility.Public}>Public</option>
                    <option value={JobPostVisibility.Private}>Private</option>
                    <option value={JobPostVisibility.InviteOnly}>Invite Only</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Required Skills</label>
                <div className="border border-border rounded-xl p-3 bg-background shadow-sm flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-[var(--gb-cyan)]/25 focus-within:border-[var(--gb-cyan)] transition-all">
                  {form.skills.map(skill => (
                    <span key={skill} className="bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)} className="hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0 flex items-center">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add a skill..."
                    value={skillInput}
                    onChange={event => setSkillInput(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        if (skillInput.trim()) addSkill(skillInput.trim());
                      }
                    }}
                    className="flex-grow bg-transparent border-none focus:ring-0 px-2 py-1 text-sm min-w-[150px] outline-none text-foreground"
                  />
                </div>
                {remainingSkills.length > 0 && (
                  <div className="mt-1">
                    <p className="text-[10px] text-muted-foreground mb-2">Suggested for {form.category}:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {remainingSkills.slice(0, 5).map(skill => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => addSkill(skill)}
                          className="flex items-center gap-1 tag-pill text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer border-none"
                        >
                          <Plus size={10} /> {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Job Description *</label>
                  <button
                    type="button"
                    onClick={generateDescription}
                    disabled={isGenerating || !form.title || !form.category}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)] border border-[var(--gb-cyan)]/20 hover:bg-[var(--gb-cyan)]/20 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--gb-cyan)] border-t-transparent animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Bot size={13} />
                        <Sparkles size={11} />
                        Draft Description
                      </>
                    )}
                  </button>
                </div>
                <div className="border border-border rounded-xl overflow-hidden shadow-sm flex flex-col bg-background focus-within:ring-2 focus-within:ring-[var(--gb-cyan)]/25 focus-within:border-[var(--gb-cyan)] transition-all">
                  <div className="bg-muted/30 border-b border-border px-3 py-2 flex items-center gap-1.5">
                    <button className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors cursor-pointer bg-transparent border-none flex items-center" type="button" onClick={() => insertMarkdown('**', '**')} title="Bold"><Bold size={14} /></button>
                    <button className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors cursor-pointer bg-transparent border-none flex items-center" type="button" onClick={() => insertMarkdown('*', '*')} title="Italic"><Italic size={14} /></button>
                    <button className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors cursor-pointer bg-transparent border-none flex items-center" type="button" onClick={() => insertMarkdown('<u>', '</u>')} title="Underline"><Underline size={14} /></button>
                    <div className="w-[1px] h-4 bg-border mx-1" />
                    <button className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors cursor-pointer bg-transparent border-none flex items-center" type="button" onClick={() => insertMarkdown('\n- ', '')} title="Bullet List"><List size={14} /></button>
                    <button className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors cursor-pointer bg-transparent border-none flex items-center" type="button" onClick={() => insertMarkdown('\n1. ', '')} title="Numbered List"><ListOrdered size={14} /></button>
                  </div>
                  <textarea
                    value={form.description}
                    onChange={event => setForm({ ...form, description: event.target.value })}
                    placeholder="Describe the role, responsibilities, and ideal candidate..."
                    rows={6}
                    className="w-full bg-transparent border-none px-4 py-3 text-sm placeholder:text-muted-foreground focus:ring-0 resize-y min-h-[150px] outline-none leading-relaxed text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget Min</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Minimum budget"
                    value={form.budgetMin}
                    onChange={event => setForm({ ...form, budgetMin: event.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget Max</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Maximum budget"
                    value={form.budgetMax}
                    onChange={event => setForm({ ...form, budgetMax: event.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Currency</label>
                  <input
                    type="text"
                    value={form.currency}
                    onChange={event => setForm({ ...form, currency: event.target.value.toUpperCase().slice(0, 3) })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimated Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 2-4 weeks"
                    value={form.estimatedDuration}
                    onChange={event => setForm({ ...form, estimatedDuration: event.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Max Hires</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={form.maxHires}
                    onChange={event => setForm({ ...form, maxHires: event.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</label>
                  <input
                    type="text"
                    placeholder="Remote, Ho Chi Minh City, ..."
                    value={form.location}
                    onChange={event => setForm({ ...form, location: event.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={event => setForm({ ...form, deadline: event.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6 bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-2">
              <div className="flex items-center gap-2">
                <Bot className="text-[var(--gb-purple)]" size={20} />
                <h2 className="text-lg font-bold text-foreground">JobPost Questions</h2>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUESTION_COUNTS.map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleQuestionCountChange(count)}
                  className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    questionCount === count
                      ? 'bg-[var(--gb-cyan)] text-white border-[var(--gb-cyan)]'
                      : 'bg-background text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {count} Questions
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {questionsWithOrder.map((question, index) => (
                <div key={index} className="bg-background border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Question {index + 1} · Order {question.orderIndex}</span>
                    <label className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={question.isRequired}
                        onChange={event => updateQuestion(index, { isRequired: event.target.checked })}
                      />
                      Required
                    </label>
                  </div>
                  <textarea
                    value={question.questionText}
                    maxLength={MAX_QUESTION_LENGTH}
                    onChange={event => updateQuestion(index, { questionText: event.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-card focus:outline-none focus:ring-1 focus:ring-[var(--gb-cyan)] text-foreground"
                    rows={3}
                    placeholder="Enter a question applicants must answer..."
                  />
                  <div className="text-right mt-1 text-[10px] text-muted-foreground">{question.questionText.length}/{MAX_QUESTION_LENGTH}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mt-8 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-sm max-w-[1440px] mx-auto">
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">New Job Post Preview</span>
            <span className="text-xs font-bold text-foreground truncate max-w-md mt-0.5">{previewTitle}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => submitCreateFlow('draft')}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-full font-bold text-sm border border-border bg-background text-foreground hover:bg-muted transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <Save size={16} /> {renderSubmitLabel('draft', 'Save as Draft')}
            </button>
            <button
              type="button"
              onClick={() => submitCreateFlow('publish')}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-full font-bold text-sm bg-[var(--gb-purple)] text-white hover:bg-[var(--gb-purple)]/90 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer border-none"
            >
              <Send size={16} /> {renderSubmitLabel('publish', 'Publish')}
            </button>
            <button
              type="button"
              onClick={() => submitCreateFlow('contract')}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer border-none group"
            >
              <Check size={16} />
              <span>{renderSubmitLabel('contract', 'Next: Create Contract')}</span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
