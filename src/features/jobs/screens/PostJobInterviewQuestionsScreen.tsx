import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Bot, Sparkles, Plus, X, Edit2, Check, ArrowRight, ArrowLeft, Wand2 } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../styles/PostJobScreen.css';

interface JobFormData {
  title: string;
  category: string;
  description: string;
  skills: string[];
  budgetMin: string;
  budgetMax: string;
  jobType?: 'fixed';
  deadline: string;
  isRemote: boolean;
}

interface InterviewQuestion {
  id: string;
  question: string;
  isEditing?: boolean;
}

const QUESTION_COUNTS = [3, 5, 7, 10];

export default function PostJobInterviewQuestionsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const jobData = location.state?.jobData as JobFormData;

  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Redirect if no job data
  useEffect(() => {
    if (!jobData) {
      navigate('/jobs/post');
    }
  }, [jobData, navigate]);

  // Auto-generate questions on mount
  useEffect(() => {
    if (jobData && questions.length === 0) {
      generateQuestions(5);
    }
  }, [jobData]);

  const generateQuestions = async (count: number) => {
    if (!jobData) return;

    setIsGenerating(true);

    // Simulate AI generation
    await new Promise(r => setTimeout(r, 2000));

    // Generate questions based on job data
    const generatedQuestions: InterviewQuestion[] = [
      {
        id: '1',
        question: `What experience do you have with ${jobData.skills[0] || 'the required technologies'}?`
      },
      {
        id: '2',
        question: `Can you describe a ${jobData.category} project you've completed that's similar to this one?`
      },
      {
        id: '3',
        question: `How would you approach ${jobData.title.toLowerCase()}?`
      },
      {
        id: '4',
        question: `What is your availability for this ${jobData.jobType === 'fixed' ? 'project' : 'ongoing work'}?`
      },
      {
        id: '5',
        question: `What tools and methodologies do you typically use for ${jobData.category.toLowerCase()} projects?`
      },
      {
        id: '6',
        question: `Have you worked with remote clients before? How do you ensure effective communication?`
      },
      {
        id: '7',
        question: `Can you provide examples of your previous work in ${jobData.category}?`
      },
      {
        id: '8',
        question: `How do you handle project revisions and feedback?`
      },
      {
        id: '9',
        question: `What sets you apart from other freelancers in ${jobData.category}?`
      },
      {
        id: '10',
        question: `How do you manage deadlines and ensure timely delivery?`
      },
    ].slice(0, count);

    setQuestions(generatedQuestions);
    setIsGenerating(false);
  };

  const handleRegenerateQuestions = () => {
    generateQuestions(questionCount);
  };

  const handleQuestionCountChange = (count: number) => {
    setQuestionCount(count);
    generateQuestions(count);
  };

  const handleAddQuestion = () => {
    const newQuestion: InterviewQuestion = {
      id: Date.now().toString(),
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

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Save job with interview questions
    const finalJobData = {
      ...jobData,
      interviewQuestions: questions.filter(q => q.question.trim() !== ''),
    };

    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));

    setIsSubmitting(false);
    navigate('/client/dashboard');
  };

  const validQuestions = questions.filter(q => q.question.trim() !== '');

  if (!jobData) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green/20 border-2 border-green flex items-center justify-center">
                <Check size={16} className="text-green" />
              </div>
              <span className="text-xs text-green font-semibold">Project Details</span>
            </div>
            <div className="flex-1 h-0.5 bg-cyan" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan/20 border-2 border-cyan flex items-center justify-center">
                <span className="text-xs font-bold text-cyan">2</span>
              </div>
              <span className="text-xs text-cyan font-semibold">AI Interview</span>
            </div>
            <div className="flex-1 h-0.5 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-surface border-2 border-border flex items-center justify-center">
                <span className="text-xs font-bold text-muted">3</span>
              </div>
              <span className="text-xs text-muted">Post Job</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="text-purple" size={24} />
            <span className="badge-purple text-xs">AI Interview Setup</span>
          </div>
          <h1 className="text-3xl font-black text-primary mb-2">Create Interview Questions</h1>
          <p className="text-secondary">
            Our AI will automatically interview freelancers based on these questions to find the best match for your project
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* AI Generate Section */}
            <div className="glass-card p-6" style={{ background: 'linear-gradient(135deg, rgba(159,75,255,0.06), rgba(0,240,255,0.04))', border: '1px solid rgba(159,75,255,0.2)' }}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple to-cyan flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} style={{ color: '#0A0F1C' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-primary font-semibold mb-1">AI-Generated Questions</h3>
                  <p className="text-xs text-secondary">
                    Questions are automatically generated based on your job description and requirements
                  </p>
                </div>
              </div>

              {/* Question Count Selector */}
              <div className="mb-4">
                <label className="text-primary text-sm font-semibold block mb-3">Number of Questions</label>
                <div className="flex gap-2">
                  {QUESTION_COUNTS.map(count => (
                    <button
                      key={count}
                      onClick={() => handleQuestionCountChange(count)}
                      disabled={isGenerating}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        questionCount === count
                          ? 'bg-purple/20 text-purple border-2 border-purple'
                          : 'glass-button text-secondary hover:bg-white/5'
                      } disabled:opacity-50`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleRegenerateQuestions}
                disabled={isGenerating}
                className="btn-ghost-cyan w-full py-2 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Regenerate All Questions
                  </>
                )}
              </button>
            </div>

            {/* Questions List */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-primary font-semibold">Interview Questions ({validQuestions.length})</h3>
                <button
                  onClick={handleAddQuestion}
                  className="btn-ghost-cyan px-3 py-1.5 text-xs flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add Question
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-12">
                  <Bot size={48} className="text-muted mx-auto mb-3 opacity-30" />
                  <p className="text-secondary text-sm">No questions yet. Click "Generate" to create questions.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, index) => (
                    <div key={q.id} className="p-4 rounded-xl glass-button border border-border">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-purple">{index + 1}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          {editingId === q.id ? (
                            <div>
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                placeholder="Enter your question..."
                                className="input-gb w-full px-3 py-2 text-sm resize-none"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleSaveQuestion(q.id)}
                                  disabled={!editText.trim()}
                                  className="btn-cyan px-3 py-1 text-xs flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Check size={12} />
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditText('');
                                    if (!q.question) {
                                      handleDeleteQuestion(q.id);
                                    }
                                  }}
                                  className="btn-ghost-cyan px-3 py-1 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-primary leading-relaxed">{q.question}</p>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleEditQuestion(q.id, q.question)}
                                  className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1"
                                >
                                  <Edit2 size={12} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                >
                                  <X size={12} />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-5">
            {/* Job Summary */}
            <div className="glass-card p-5 sticky top-24">
              <p className="text-xs font-semibold text-muted mb-3">JOB SUMMARY</p>
              <h3 className="text-primary font-semibold mb-2 text-sm">{jobData.title}</h3>
              <span className="badge-cyan text-xs mb-3 inline-block">{jobData.category}</span>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-secondary">Budget</span>
                  <span className="text-primary font-semibold">
                    {jobData.budgetMin && `${jobData.budgetMin}–${jobData.budgetMax}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Type</span>
                  <span className="text-primary font-semibold capitalize">{jobData.jobType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Skills</span>
                  <span className="text-primary font-semibold">{jobData.skills.length}</span>
                </div>
              </div>
            </div>

            {/* AI Info */}
            <div className="glass-card p-5">
              <p className="text-primary text-sm font-semibold mb-3">🤖 How AI Interview Works</p>
              <div className="space-y-3">
                {[
                  'Freelancers answer these questions',
                  'AI analyzes responses for quality',
                  'Best matches are ranked for you',
                  'Save time on initial screening',
                ].map((tip, i) => (
                  <div key={i} className="flex gap-2">
                    <Check size={14} className="text-green flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-secondary">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || validQuestions.length === 0}
                className="btn-green w-full px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Posting Job...
                  </>
                ) : (
                  <>
                    Post Job — AI Matching Will Begin
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                onClick={() => navigate(-1)}
                className="btn-ghost-cyan w-full px-6 py-2 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Back to Project Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
