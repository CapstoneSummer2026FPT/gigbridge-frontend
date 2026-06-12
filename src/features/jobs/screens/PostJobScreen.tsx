import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Bot, Sparkles, X, Plus, Globe, ChevronRight,
  Bold, Italic, Underline, List, ListOrdered, GripVertical, Edit2, Trash2, Check
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { jobHandlers } from '../../../mock_backend';
import '../styles/PostJobScreen.css';

const CATEGORIES = ['Web Development', 'Design', 'Data Science', 'Marketing', 'Writing', 'DevOps', 'Mobile', 'Video'];
const SKILLS_SUGGESTIONS: Record<string, string[]> = {
  'Web Development': ['React', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL', 'Vue.js', 'Angular'],
  'Design': ['Figma', 'UI/UX Design', 'Prototyping', 'Design Systems', 'After Effects', 'Sketch'],
  'Data Science': ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'SQL', 'Tableau'],
  'DevOps': ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux'],
  'Writing': ['Technical Writing', 'SEO', 'Content Strategy', 'Copywriting'],
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

  const [isGenerating, setIsGenerating] = useState(false);
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

  const suggestedSkills = SKILLS_SUGGESTIONS[form.category] || [];
  const remainingSkills = suggestedSkills.filter(s => !form.skills.includes(s));

  const insertMarkdown = (before: string, after: string) => {
    setForm(prev => ({
      ...prev,
      description: prev.description + before + after
    }));
  };

  const addSkill = (skill: string) => {
    if (!form.skills.includes(skill) && form.skills.length < 10) {
      setForm(prev => ({ ...prev, skills: [...prev.skills, skill] }));
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
        </div>

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

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Application Deadline *</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={e => setForm({ ...form, deadline: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground"
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

            </div>
          </div>

          {/* Right Column: Manual Interview Setup */}
          <div className="lg:col-span-5 flex flex-col gap-6 bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-2">
              <div className="flex items-center gap-2">
                <Bot className="text-[var(--gb-purple)]" size={20} />
                <h2 className="text-lg font-bold text-foreground">Interview Questions</h2>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="text-[var(--gb-cyan)] font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
              >
                <Plus size={14} /> Add Question
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
                  </div>
                ))
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
