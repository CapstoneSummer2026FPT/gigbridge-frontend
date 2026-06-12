import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Bot, Sparkles, X, Plus, Globe, ChevronRight,
  Bold, Italic, Underline, List, ListOrdered, GripVertical, Edit2, Trash2, Check
} from 'lucide-react';
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
import { useApp } from '../../../app/providers/AppProvider';
import { jobHandlers } from '../../../mock_backend';
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

interface InterviewQuestion {
  id: string;
  question: string;
  type: 'Technical' | 'Experience' | 'Behavioral';
  isEditing?: boolean;
}

export default function PostJobScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();

  const initialJobData = location.state?.jobData;

  const location = useLocation();

  const [isGenerating, setIsGenerating] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const [form, setForm] = useState({
    title: initialJobData?.title || '',
    category: initialJobData?.category || 'Web Development',
    description: initialJobData?.description || '',
    skills: initialJobData?.skills || [] as string[],
    budgetMin: initialJobData?.budgetMin !== undefined ? String(initialJobData.budgetMin) : '',
    budgetMax: initialJobData?.budgetMax !== undefined ? String(initialJobData.budgetMax) : '',
    deadline: initialJobData?.deadline || '',
  });

  const [questions, setQuestions] = useState<InterviewQuestion[]>(
    initialJobData?.interviewQuestions || [
      { id: 'q1', type: 'Technical', question: 'Can you explain a time when you had to optimize a web application for performance? What specific metrics did you look at?' },
      { id: 'q2', type: 'Experience', question: 'Describe your process for managing state in a complex, large-scale React/TypeScript project.' },
      { id: 'q3', type: 'Behavioral', question: 'Tell me about a situation where you disagreed with a senior engineer or client. How did you handle it?' }
    ]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [canDrag, setCanDrag] = useState(false);
    title: '',
    category: '',
    description: '',
    skills: [] as string[],
    budgetMin: '',
    budgetMax: '',
    deadline: '',
    isRemote: true,
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

  const insertMarkdown = (before: string, after: string) => {
    setForm(prev => ({
      ...prev,
      description: prev.description + before + after
    }));
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
    setForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const generateDescription = async () => {
    if (!form.title || !form.category) return;
    setIsGenerating(true);
    const desc = await jobHandlers.generateAIDescription(form.title, form.category, form.skills);
    setForm(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  const handleAddQuestion = () => {
    const types: ('Technical' | 'Experience' | 'Behavioral')[] = ['Technical', 'Experience', 'Behavioral'];
    const randomType = types[questions.length % 3];
    const newQuestion: InterviewQuestion = {
      id: Date.now().toString(),
      type: randomType,
      question: '',
      isEditing: true,
    };
    setQuestions([...questions, newQuestion]);
    setEditingId(newQuestion.id);
    setEditText('');
  };

  const handleEditQuestion = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const handleSaveQuestion = (id: string) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, question: editText, isEditing: false } : q
    ));
    setEditingId(null);
    setEditText('');
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const updated = [...questions];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setQuestions(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setCanDrag(false);
  };

  const handleNextStep = () => {
    if (!form.title || !form.category || !form.description || !form.budgetMin || !form.deadline) {
      alert('Please fill in all required fields (Title, Category, Description, Price, and Deadline)');
      return;
    }
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

      // Enum BudgetType: 0=Fixed, 1=Hourly
      budgetType: form.jobType === 'hourly' ? 1 : 0,

      budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
      budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
      currency: 'USD',

      estimatedDuration: null,
      maxHires: 1,

      // Enum ExperienceLevel: 0=Entry, 1=Intermediate, 2=Expert
      experienceLevelRequired: experienceLevelMap[form.experienceLevel],

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

    const finalJobData = {
      clientId: user?.id || 'u_client_1',
      title: form.title,
      description: form.description,
      category: form.category,
      skills: form.skills,
      budgetMin: parseFloat(form.budgetMin) || 0,
      budgetMax: parseFloat(form.budgetMin) || 0,
      jobType: 'fixed' as const,
      deadline: form.deadline,
      isRemote: true,
      interviewQuestions: questions.filter(q => q.question.trim() !== '')
    };

    navigate('/jobs/post/contract', { state: { jobData: finalJobData } });
  };
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
      <div className="max-w-[1440px] mx-auto px-6 py-8 relative">
        {/* Background Mesh Gradient (Subtle) */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.02),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.02),transparent_50%)] opacity-50 pointer-events-none" />

        {/* Header & Stepper */}
        <div className="flex flex-col gap-6 items-center mb-8">
          <div className="flex justify-center w-full">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground text-center uppercase" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", letterSpacing: '0.05em' }}>Create New Job Post</h1>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center w-full max-w-3xl mx-auto py-4">
            {/* Step 1: Active */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--gb-cyan)] text-white flex items-center justify-center shadow-md font-bold text-sm">1</div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--gb-cyan)] uppercase tracking-wider font-bold">Step 1</span>
                <span className="text-xs text-foreground font-bold">Project Details</span>
              </div>
            </div>
            {/* Connector */}
            <div className="flex-grow mx-6 h-[2px] bg-border rounded-full opacity-50" />
            {/* Step 2: Next */}
            <div className="flex items-center gap-3 opacity-60">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm">2</div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Step 2</span>
                <span className="text-xs text-muted-foreground font-bold">Contract Signing</span>
              </div>
            </div>
          </div>
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

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Job Details Form */}
          <div className="lg:col-span-7 flex flex-col gap-6 bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold border-b border-border pb-4 mb-2 text-foreground">Job Details</h2>

            <div className="flex flex-col gap-6">
              {/* Job Title */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground"
                />
              </div>
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
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category *</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
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

              {/* Required Skills */}
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
                    placeholder="Add a skill..."
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (skillInput.trim()) addSkill(skillInput.trim());
                      }
                    }}
                    className="flex-grow bg-transparent border-none focus:ring-0 px-2 py-1 text-sm min-w-[150px] outline-none text-foreground"
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

              {/* Job Description */}
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
                        AI Generate Description
                      </>
                    )}
                  </button>
                </div>
                <div className="border border-border rounded-xl overflow-hidden shadow-sm flex flex-col bg-background focus-within:ring-2 focus-within:ring-[var(--gb-cyan)]/25 focus-within:border-[var(--gb-cyan)] transition-all">
                  {/* Toolbar */}
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
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the role, responsibilities, and ideal candidate..."
                    rows={6}
                    className="w-full bg-transparent border-none px-4 py-3 text-sm placeholder:text-muted-foreground focus:ring-0 resize-y min-h-[150px] outline-none leading-relaxed text-foreground"
                  />
                </div>
                {form.description && (
                  <div className="flex items-center gap-1.5 mt-1 text-[var(--gb-purple)]">
                    <Bot size={13} />
                    <p className="text-[10px] font-semibold">AI-generated description — review and customize as needed</p>
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

              {/* Budget & Deadline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fixed Price Budget ($) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">$</span>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={form.budgetMin}
                      onChange={e => setForm({ ...form, budgetMin: e.target.value, budgetMax: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground"
                    />
                  </div>
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

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Application Deadline *</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={e => setForm({ ...form, deadline: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground"
                  />
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

              {/* Attachments */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attachments</label>
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-background hover:bg-muted/10 hover:border-[var(--gb-cyan)]/50 transition-colors cursor-pointer">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-[var(--gb-cyan)]">
                    <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-foreground"><span className="font-semibold text-[var(--gb-cyan)]">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or ZIP (max. 10MB)</p>
                  </div>
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

          {/* Right Column: Manual Interview Setup */}
          <div className="lg:col-span-5 flex flex-col gap-6 bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-2">
              <div className="flex items-center gap-2">
                <Bot className="text-[var(--gb-purple)]" size={20} />
                <h2 className="text-lg font-bold text-foreground">Interview Questions</h2>
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
              <button
                type="button"
                onClick={handleAddQuestion}
                className="text-[var(--gb-cyan)] font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
              >
                <Plus size={14} /> Add Question

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

            <p className="text-xs text-muted-foreground leading-relaxed">
              Create and manage your interview questions manually. These will be used during the candidate screening process.
            </p>

            {/* Questions List */}
            <div className="space-y-3">
              {questions.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border rounded-xl bg-background/50">
                  <Bot size={40} className="text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No questions yet. Click "Add Question" to create one.</p>
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
              ) : (
                questions.map((q, idx) => (
                  <div
                    key={q.id}
                    draggable={canDrag}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`group relative bg-background border border-border hover:border-[var(--gb-cyan)]/30 hover:shadow-sm p-4 rounded-xl transition-all flex gap-2 items-start ${
                      draggedIndex === idx ? 'opacity-45 border-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5' : ''
                    }`}
                  >
                    <span 
                      onMouseDown={() => setCanDrag(true)}
                      onMouseUp={() => setCanDrag(false)}
                      className="text-muted-foreground/45 mt-0.5 cursor-grab group-active:cursor-grabbing flex-shrink-0"
                    >
                      <GripVertical size={16} />
                    </span>

                    <div className="flex-grow min-w-0">
                      {editingId === q.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-[var(--gb-cyan)] text-foreground"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveQuestion(q.id)}
                              disabled={!editText.trim()}
                              className="px-2.5 py-1 rounded bg-[var(--gb-cyan)] text-white text-[10px] font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer border-none"
                            >
                              <Check size={10} /> Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setEditText('');
                                if (!q.question) handleDeleteQuestion(q.id);
                              }}
                              className="px-2.5 py-1 rounded border border-border bg-background text-[10px] text-muted-foreground hover:bg-muted cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${q.type === 'Technical'
                              ? 'bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)]'
                              : q.type === 'Experience'
                                ? 'bg-[var(--gb-purple)]/10 text-[var(--gb-purple)]'
                                : 'bg-[var(--gb-green)]/10 text-[var(--gb-green)]'
                              }`}>
                              {q.type}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold">Question {idx + 1}</span>
                          </div>
                          <p className="text-xs text-foreground font-medium leading-relaxed">{q.question || '(Empty question)'}</p>

                          <div className="flex gap-3 mt-2">
                            <button
                              type="button"
                              onClick={() => handleEditQuestion(q.id, q.question)}
                              className="text-[10px] text-[var(--gb-cyan)] hover:underline flex items-center gap-0.5 cursor-pointer font-bold bg-transparent border-none p-0"
                            >
                              <Edit2 size={10} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5 cursor-pointer font-bold bg-transparent border-none p-0"
                            >
                              <Trash2 size={10} /> Delete
                            </button>
                          </div>
                        </div>
                      )}
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
                ))
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

        {/* Footer Actions (Card style, not sticky/floating) */}
        <div className="bg-card border border-border rounded-2xl p-6 mt-8 flex justify-between items-center shadow-sm max-w-[1440px] mx-auto">
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">New Job Post Preview</span>
            <span className="text-xs font-bold text-foreground truncate max-w-md mt-0.5">{form.title || 'Untitled Job Post'}</span>
          </div>
          <button 
            type="button"
            onClick={handleNextStep}
            disabled={!form.title || !form.category || !form.description || !form.budgetMin || !form.deadline}
            className="w-full md:w-auto px-10 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer border-none"
          >
            <span>Next: Create Contract</span>
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

      </div>
    </AppLayout>
  );
}
