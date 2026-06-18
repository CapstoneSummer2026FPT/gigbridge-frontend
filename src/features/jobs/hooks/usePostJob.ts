import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { jobAPI } from '../../../api/jobAPI';
import { JobPostStatus, JobPostVisibility, type UpdateJobPostRequest } from '../../../types/models/Job';

const CATEGORIES = ['Web Development', 'Design', 'Data Science', 'Marketing', 'Writing', 'DevOps', 'Mobile', 'Video'];
const MAX_QUESTION_LENGTH = 1000;

export interface QuestionInput {
  questionText: string;
  isRequired: boolean;
}

type SubmitMode = 'draft' | 'publish' | 'contract';

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

  const [form, setForm] = useState({
    title: initialJobData?.title || '',
    category: initialJobData?.category || 'Web Development',
    description: initialJobData?.description || '',
    skills: (initialJobData?.skills || []) as string[],
    budgetMin: initialJobData?.budgetMin !== undefined ? String(initialJobData.budgetMin) : '',
    budgetMax: initialJobData?.budgetMax !== undefined ? String(initialJobData.budgetMax) : '',
    currency: initialJobData?.currency || 'USD',
    estimatedDuration: initialJobData?.estimatedDuration || '',
    maxHires: initialJobData?.maxHires !== undefined ? String(initialJobData.maxHires) : '',
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

  const remainingSkills = useMemo(() => {
    const SUGGESTIONS: Record<string, string[]> = {
      'Web Development': ['React', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL', 'Vue.js', 'Angular'],
      Design: ['Figma', 'UI/UX Design', 'Prototyping', 'Design Systems', 'After Effects', 'Sketch'],
      'Data Science': ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'SQL', 'Tableau'],
      DevOps: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux'],
      Writing: ['Technical Writing', 'SEO', 'Content Strategy', 'Copywriting'],
    };
    const suggestedSkills = SUGGESTIONS[form.category] || [];
    return suggestedSkills.filter(skill => !form.skills.includes(skill));
  }, [form.category, form.skills]);

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

  const addSkill = (skill: string) => {
    if (!form.skills.includes(skill) && form.skills.length < 10) {
      setForm(prev => ({ ...prev, skills: [...prev.skills, skill] }));
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setForm(prev => ({ ...prev, skills: prev.skills.filter(item => item !== skill) }));
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
    await new Promise(resolve => setTimeout(resolve, 1500));

    const questionsText = validQuestions.map(q => q.questionText).join(' ').toLowerCase();

    let title = 'Software Engineer';
    let category = 'Web Development';
    let skills = ['React', 'TypeScript', 'Node.js'];
    let description = '';
    let budgetMin = '1500';
    let budgetMax = '4000';

    if (questionsText.includes('design') || questionsText.includes('figma') || questionsText.includes('ui') || questionsText.includes('ux') || questionsText.includes('prototype') || questionsText.includes('color') || questionsText.includes('mockup')) {
      title = 'Senior UI/UX Product Designer';
      category = 'Design';
      skills = ['Figma', 'UI/UX Design', 'Prototyping', 'Design Systems', 'Sketch'];
      description = `### Job Description\nWe are looking for a Senior UI/UX Product Designer to help craft intuitive, user-friendly interfaces and high-quality experiences for our flagship web and mobile products. You will work closely with product managers and engineers to turn ideas into wireframes, mockups, and interactive prototypes.\n\n### Responsibilities\n- Create user flows, wireframes, prototypes, and high-fidelity mockups.\n- Develop and maintain our design system.\n- Collaborate with engineering to ensure implementation matches design vision.\n- Conduct user research and integrate feedback into product iterations.\n\n### Requirements\n- 3+ years of experience as a UI/UX designer.\n- Excellent proficiency with Figma.\n- Strong portfolio demonstrating complex web/mobile application designs.`;
      budgetMin = '2500';
      budgetMax = '5500';
    } else if (questionsText.includes('react') || questionsText.includes('vue') || questionsText.includes('frontend') || questionsText.includes('css') || questionsText.includes('next.js') || questionsText.includes('javascript') || questionsText.includes('typescript') || questionsText.includes('html')) {
      title = 'Senior Frontend Engineer (React/TypeScript)';
      category = 'Web Development';
      skills = ['React', 'TypeScript', 'Next.js', 'Vue.js', 'TailwindCSS'];
      description = `### Job Description\nWe are seeking a skilled Frontend Engineer with a passion for building beautiful, responsive, and highly-performant web user interfaces. You will lead the development of our dashboard and web application components.\n\n### Responsibilities\n- Architect and develop high-quality, reusable components using React and TypeScript.\n- Implement responsive styles and layout designs.\n- Optimize web application performance and loading speeds.\n- Integrate REST/GraphQL API endpoints.\n\n### Requirements\n- Strong proficiency in React, TypeScript, and modern state management.\n- Experience with CSS frameworks (Tailwind, Vanilla CSS).\n- Knowledge of Next.js and server-side rendering is a plus.`;
      budgetMin = '3000';
      budgetMax = '6000';
    } else if (questionsText.includes('backend') || questionsText.includes('node') || questionsText.includes('python') || questionsText.includes('database') || questionsText.includes('sql') || questionsText.includes('api') || questionsText.includes('aws') || questionsText.includes('docker') || questionsText.includes('devops')) {
      title = 'Backend Developer (Node.js/AWS)';
      category = 'Web Development';
      skills = ['Node.js', 'TypeScript', 'SQL', 'AWS', 'Docker', 'Kubernetes'];
      description = `### Job Description\nWe are looking for a Backend Engineer to build robust, scalable services and manage database schemas for our platform. You will be responsible for defining APIs and managing server deployment pipelines.\n\n### Responsibilities\n- Design and build RESTful and GraphQL APIs using Node.js/Express.\n- Optimize database queries and schema designs.\n- Manage CI/CD pipelines and cloud infrastructure on AWS.\n- Ensure data security, integrity, and authorization standards.\n\n### Requirements\n- 3+ years of experience in backend development.\n- Strong experience with Node.js and relational databases (PostgreSQL/MySQL).\n- Proficiency with AWS cloud services.`;
      budgetMin = '3500';
      budgetMax = '7000';
    } else if (questionsText.includes('data') || questionsText.includes('machine learning') || questionsText.includes('ml') || questionsText.includes('tensor') || questionsText.includes('pytorch') || questionsText.includes('analytics') || questionsText.includes('model')) {
      title = 'Data Scientist & ML Engineer';
      category = 'Data Science';
      skills = ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'SQL', 'Tableau'];
      description = `### Job Description\nWe are seeking a Data Scientist and Machine Learning Engineer to analyze data streams, build predictive models, and implement AI search algorithms.\n\n### Responsibilities\n- Build, train, and validate ML models for recommendation engines.\n- Write data preprocessing and ETL pipelines.\n- Visualize findings and communicate insights to the product team.\n- Optimize model latency for production services.\n\n### Requirements\n- Proficiency in Python, Pandas, NumPy, and SQL.\n- Strong foundation in ML frameworks (PyTorch or TensorFlow).\n- Experience with data visualization tools.`;
      budgetMin = '4000';
      budgetMax = '8000';
    } else if (questionsText.includes('kubernetes') || questionsText.includes('ci/cd') || questionsText.includes('linux') || questionsText.includes('terraform') || questionsText.includes('pipeline')) {
      title = 'DevOps & Infrastructure Engineer';
      category = 'DevOps';
      skills = ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux'];
      description = `### Job Description\nWe are seeking an Infrastructure Engineer to scale our cloud platforms and build reliable delivery pipelines.\n\n### Responsibilities\n- Maintain infrastructure-as-code deployments.\n- Build and monitor CI/CD build scripts.\n- Ensure zero-downtime rolling updates.\n\n### Requirements\n- AWS or GCP certifications.\n- Strong bash scripting and infrastructure management experience.`;
      budgetMin = '4000';
      budgetMax = '7500';
    } else if (questionsText.includes('write') || questionsText.includes('content') || questionsText.includes('seo') || questionsText.includes('copy') || questionsText.includes('article') || questionsText.includes('blog')) {
      title = 'Technical & Content Writer';
      category = 'Writing';
      skills = ['Technical Writing', 'SEO', 'Content Strategy', 'Copywriting'];
      description = `### Job Description\nWe are looking for a freelance technical content writer to draft technical documentation, blog posts, and copy for our developer portal.\n\n### Responsibilities\n- Research and write engaging technical tutorials.\n- Optimize articles for SEO rankings.\n- Proofread and edit user-facing manuals.\n\n### Requirements\n- Strong written English.\n- Basic understanding of programming concepts (to explain them to developers).\n- SEO keyword research tools experience.`;
      budgetMin = '800';
      budgetMax = '2000';
    } else {
      title = 'Full Stack Web Developer';
      category = 'Web Development';
      skills = ['React', 'TypeScript', 'Node.js', 'SQL'];
      description = `### Job Description\nWe are looking for a versatile Full Stack Developer to help build and maintain web applications. You will work on both front-end layouts and back-end integration tasks.\n\n### Responsibilities\n- Build web components and backend APIs.\n- Write unit and integration tests.\n- Participate in product planning.\n\n### Requirements\n- Experience in both client and server development.\n- Strong knowledge of Javascript/TypeScript.`;
      budgetMin = '2000';
      budgetMax = '5000';
    }

    setForm({
      title,
      category,
      skills,
      description,
      budgetMin,
      budgetMax,
      currency: 'USD',
      estimatedDuration: '2-4 weeks',
      maxHires: '1',
      location: 'Remote',
      visibility: String(JobPostVisibility.Public),
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    setIsGeneratingInstant(false);
    setIsJobDetailsGenerated(true);
    toast.success('Job details generated successfully based on your questions!');
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

  const buildUpdateRequest = (): UpdateJobPostRequest => ({
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

  return {
    form,
    setForm,
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
    insertMarkdown,
    addSkill,
    removeSkill,
    updateQuestion,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleGenerateInstantJob,
    submitDraftFlow,
    renderSubmitLabel,
    CATEGORIES,
    MAX_QUESTION_LENGTH,
  };
}