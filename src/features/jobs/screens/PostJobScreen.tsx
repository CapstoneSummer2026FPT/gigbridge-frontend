import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Bot, Sparkles, X, Plus, ChevronRight,
  Bold, Italic, Underline, List, ListOrdered, Check, Save,
  GripVertical, Trash2, FileText, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { jobAPI } from '../../../api/jobAPI';
import { AppLayout } from '../../../shared/components/AppLayout';
import { JobPostVisibility, type GetMyJobPostDto } from '../../../types/models/Job';
import { usePostJob } from '../hooks/usePostJob';
import { JobPostGuide } from '../components/JobPostGuide';
import { PromptSectionModal } from '../components/PromptSectionModal';
import '../styles/PostJobScreen.css';

export default function PostJobScreen() {
  const navigate = useNavigate();
  const [isGuideActive, setIsGuideActive] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [drafts, setDrafts] = useState<GetMyJobPostDto[]>([]);
  const [isDraftsLoading, setIsDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const {
    form,
    majors,
    categories,
    skillInput,
    setSkillInput,
    remainingSkills,
    selectedOfficialSkills,
    previewTitle,
    errorMessage,
    isDraftInitializing,
    draftError,
    setDraftRequestAttempt,
    isInstantJobMode,
    setIsInstantJobMode,
    isJobDetailsGenerated,
    isGeneratingInstant,
    draggedIndex,
    questions,
    setQuestions,
    isActionDisabled,
    taxonomyError,
    isMajorsLoading,
    isCategoriesLoading,
    isSkillsLoading,
    isLeavePromptOpen,
    leaveAction,
    resetToNewDraft,
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
    handleLeaveSaveDraft,
    handleLeaveDiscardDraft,
    cancelBlockedNavigation,
    submitDraftFlow,
    renderSubmitLabel,
    MAX_QUESTION_LENGTH,
    setForm,
  } = usePostJob();

  const [detailsHeight, setDetailsHeight] = useState<number | null>(null);

  const loadDrafts = async () => {
    setIsDraftModalOpen(true);
    setIsDraftsLoading(true);
    setDraftsError(null);

    const response = await jobAPI.getMyDraftJobPosts();
    setIsDraftsLoading(false);

    if (!response.success || !response.data) {
      setDrafts([]);
      setDraftsError(response.message || 'Unable to load draft JobPosts.');
      return;
    }

    setDrafts(response.data);
  };

  const formatDraftDate = (value?: string | null) => {
    if (!value) return 'Not updated yet';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const handleContinueDraft = (draft: GetMyJobPostDto) => {
    setIsDraftModalOpen(false);
    navigate('/jobs/post', { state: { jobPostId: draft.jobPostsId } });
  };

  const handleCreateNewFromDraftModal = () => {
    setIsDraftModalOpen(false);
    resetToNewDraft();
    navigate('/jobs/post', { replace: true, state: null });
  };

  useEffect(() => {
    const detailsEl = document.getElementById('guide-job-details-panel');
    if (!detailsEl) return;

    const updateHeight = () => {
      if (window.innerWidth >= 1024) {
        setDetailsHeight(detailsEl.getBoundingClientRect().height);
      } else {
        setDetailsHeight(null);
      }
    };

    const observer = new ResizeObserver(updateHeight);
    observer.observe(detailsEl);
    window.addEventListener('resize', updateHeight);
    updateHeight();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-8 relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.02),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.02),transparent_50%)] opacity-50 pointer-events-none" />

        <div className="flex flex-col gap-6 items-center mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4 border-b border-border pb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground uppercase" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", letterSpacing: '0.05em' }}>Create New Job Post</h1>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={loadDrafts}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all shadow-sm cursor-pointer border border-border bg-background hover:bg-muted text-foreground"
              >
                <FileText size={14} />
                Continue Draft
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsInstantJobMode(!isInstantJobMode);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all shadow-md cursor-pointer border-none ${
                  isInstantJobMode
                    ? 'bg-gradient-to-r from-[var(--gb-purple)] to-[var(--gb-cyan)] text-white hover:opacity-95'
                    : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                }`}
              >
                <Sparkles size={14} className={isInstantJobMode ? 'animate-pulse' : ''} />
                Create instant Job Detail (Premium)
              </button>
              
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    if (isInstantJobMode) {
                      setIsGuideActive(true);
                    } else {
                      toast.info("Vui lòng kích hoạt 'Create instant Job Detail' trước khi xem hướng dẫn.");
                    }
                  }}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                    isInstantJobMode
                      ? 'border-[var(--gb-cyan)] bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)] shadow-[0_0_15px_rgba(0,119,255,0.4)] animate-pulse scale-105 font-extrabold'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  title="Xem hướng dẫn tính năng"
                >
                  ?
                </button>
                <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-xl p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs text-muted-foreground leading-relaxed text-left select-text">
                  <p className="font-bold text-foreground mb-1">Instant Job Detail (Premium)</p>
                  When enabled, a prompt input bar appears at the bottom. Describe your job requirements in the bar and click <strong>Generate Details</strong> to let AI automatically fill in the Job Title, Category, Description, and required Skills.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center w-full max-w-5xl mx-auto py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--gb-cyan)] text-white flex items-center justify-center shadow-md font-bold text-sm shrink-0">1</div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-[var(--gb-cyan)] uppercase tracking-wider font-bold">Step 1</span>
                <span className="text-xs text-foreground font-bold">Project Details</span>
              </div>
            </div>
            <div className="flex-grow mx-2 sm:mx-6 h-[2px] bg-border rounded-full opacity-50" />
            <div className="flex items-center gap-3 opacity-60">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm shrink-0">2</div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Step 2</span>
                <span className="text-xs text-muted-foreground font-bold">Contract Setup</span>
              </div>
            </div>
            <div className="flex-grow mx-2 sm:mx-6 h-[2px] bg-border rounded-full opacity-50" />
            <div className="flex items-center gap-3 opacity-60">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm shrink-0">3</div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Step 3</span>
                <span className="text-xs text-muted-foreground font-bold">E-Sign Contract</span>
              </div>
            </div>
            <div className="flex-grow mx-2 sm:mx-6 h-[2px] bg-border rounded-full opacity-50" />
            <div className="flex items-center gap-3 opacity-60">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm shrink-0">4</div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Step 4</span>
                <span className="text-xs text-muted-foreground font-bold">Setup Milestone</span>
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl px-4 py-3 text-sm font-semibold">
            {errorMessage}
          </div>
        )}

        {taxonomyError && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl px-4 py-3 text-sm font-semibold">
            {taxonomyError}
          </div>
        )}

        {isDraftInitializing && (
          <div className="mb-6 bg-[var(--gb-cyan)]/10 border border-[var(--gb-cyan)]/20 text-[var(--gb-cyan)] rounded-xl px-4 py-3 text-sm font-semibold">
            Loading draft...
          </div>
        )}

        {draftError && !isDraftInitializing && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl px-4 py-3 text-sm font-semibold flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <span>{draftError}</span>
            <button
              type="button"
              onClick={() => setDraftRequestAttempt(attempt => attempt + 1)}
              className="px-4 py-2 rounded-full font-bold text-xs bg-red-500 text-white hover:bg-red-600 transition-all cursor-pointer border-none"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start">
          <div
            className="lg:col-span-5 order-2 lg:order-1 flex flex-col gap-4 sm:gap-6 bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm"
            style={{ maxHeight: detailsHeight ? `${detailsHeight}px` : undefined }}
          >
            <div className="flex items-center justify-between border-b border-border pb-4 mb-2">
              <div className="flex items-center gap-2">
                <Bot className="text-[var(--gb-purple)]" size={20} />
                <h2 className="text-lg font-bold text-foreground">JobPost Questions</h2>
              </div>
            </div>

            <div className="space-y-3 lg:flex-grow lg:overflow-y-auto lg:min-h-0 lg:pr-1">
              {questions.map((question, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={e => handleDragStart(e, index)}
                  onDragOver={e => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`bg-background border rounded-xl p-4 transition-all duration-200 ${
                    draggedIndex === index
                      ? 'border-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 opacity-50 scale-[0.98]'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 select-none">
                    <div className="flex items-center gap-2">
                      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted flex items-center justify-center">
                        <GripVertical size={14} />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        Question {index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider cursor-pointer">
                        <input
                          type="checkbox"
                          checked={question.isRequired}
                          onChange={event => updateQuestion(index, { isRequired: event.target.checked })}
                          className="rounded border-border text-[var(--gb-cyan)] focus:ring-[var(--gb-cyan)]"
                        />
                        Required
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = questions.filter((_, idx) => idx !== index);
                          setQuestions(updated);
                        }}
                        className="text-muted-foreground hover:text-red-500 p-1 rounded hover:bg-muted transition-colors cursor-pointer bg-transparent border-none flex items-center justify-center"
                        title="Delete Question"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={question.questionText}
                    maxLength={MAX_QUESTION_LENGTH}
                    onChange={event => updateQuestion(index, { questionText: event.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-card focus:outline-none focus:ring-1 focus:ring-[var(--gb-cyan)] text-foreground"
                    rows={3}
                    placeholder="Enter a question applicants must answer..."
                  />
                  <div className="text-right mt-1 text-[10px] text-muted-foreground">
                    {question.questionText.length}/{MAX_QUESTION_LENGTH}
                  </div>
                </div>
              ))}

              {questions.length === 0 && (
                <div className="text-center py-8 border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                  No questions added. Click "Add Question" to add one.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <button
                type="button"
                onClick={() => setQuestions([...questions, { questionText: '', isRequired: true }])}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-border hover:border-[var(--gb-cyan)] hover:text-[var(--gb-cyan)] bg-background text-xs font-bold transition-all cursor-pointer"
              >
                <Plus size={14} /> Add Question
              </button>

            </div>
          </div>

          <div id="guide-job-details-panel" className="lg:col-span-7 order-1 lg:order-2 flex flex-col gap-4 sm:gap-6 bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold border-b border-border pb-4 mb-2 text-foreground">Job Details</h2>

            {isInstantJobMode && !isJobDetailsGenerated && (
              <div className="bg-gradient-to-r from-[var(--gb-purple)]/10 to-[var(--gb-cyan)]/10 border border-[var(--gb-purple)]/20 rounded-xl p-4 flex gap-3 items-start">
                <Sparkles className="text-[var(--gb-purple)] shrink-0 mt-0.5 animate-pulse" size={16} />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-foreground">Premium Feature Active</span>
                  <span className="text-[11px] text-muted-foreground leading-relaxed">
                    Please describe the job role in the prompt input bar at the bottom, then click <strong>Generate Details</strong>. The fields below will be auto-filled based on your prompt.
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={form.title}
                  onChange={event => setForm({ ...form, title: event.target.value })}
                  disabled={isInstantJobMode && !isJobDetailsGenerated}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Major *</label>
                  <select
                    value={form.majorId}
                    onChange={event => handleMajorChange(event.target.value)}
                    disabled={(isInstantJobMode && !isJobDetailsGenerated) || isMajorsLoading}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                  >
                    <option value="">{isMajorsLoading ? 'Loading majors...' : 'Select a major'}</option>
                    {majors.map(major => <option key={major.majorId} value={major.majorId}>{major.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category *</label>
                  <select
                    value={form.majorCategoryId}
                    onChange={event => handleCategoryChange(event.target.value)}
                    disabled={(isInstantJobMode && !isJobDetailsGenerated) || !form.majorId || isCategoriesLoading}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!form.majorId ? 'Select a major first' : isCategoriesLoading ? 'Loading categories...' : 'Select a category'}
                    </option>
                    {categories.map(category => (
                      <option key={category.majorCategoryId} value={category.majorCategoryId}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Visibility</label>
                  <select
                    value={form.visibility}
                    onChange={event => setForm({ ...form, visibility: event.target.value })}
                    disabled={isInstantJobMode && !isJobDetailsGenerated}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
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
                  {selectedOfficialSkills.map(skill => (
                    <span key={skill.skillId} className="bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      {skill.name}
                      <button
                        type="button"
                        onClick={() => removeOfficialSkill(skill.skillId)}
                        disabled={isInstantJobMode && !isJobDetailsGenerated}
                        className="hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0 flex items-center disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {form.customSkillNames.map((skill: string) => (
                    <span key={skill} className="bg-[var(--gb-purple)]/10 text-[var(--gb-purple)] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      {skill}
                      <span className="opacity-70">(custom)</span>
                      <button
                        type="button"
                        onClick={() => removeCustomSkill(skill)}
                        disabled={isInstantJobMode && !isJobDetailsGenerated}
                        className="hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0 flex items-center disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={form.categoryId ? 'Add a skill...' : 'Select a category first'}
                    value={skillInput}
                    onChange={event => setSkillInput(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        if (skillInput.trim()) addSkill(skillInput.trim());
                      }
                    }}
                    disabled={(isInstantJobMode && !isJobDetailsGenerated) || !form.categoryId}
                    className="flex-grow bg-transparent border-none focus:ring-0 px-2 py-1 text-sm min-w-[150px] outline-none text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => addSkill(skillInput)}
                    disabled={(isInstantJobMode && !isJobDetailsGenerated) || !form.categoryId || !skillInput.trim()}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--gb-cyan)] text-white border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                {isSkillsLoading && (
                  <p className="text-[10px] text-muted-foreground mt-1">Loading skills for the selected category...</p>
                )}
                {remainingSkills.length > 0 && (
                  <div className="mt-1">
                    <p className="text-[10px] text-muted-foreground mb-2">Available official skills:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {remainingSkills.slice(0, 5).map(skill => (
                        <button
                          key={skill.skillId}
                          type="button"
                          onClick={() => addOfficialSkill(skill)}
                          disabled={isInstantJobMode && !isJobDetailsGenerated}
                          className="flex items-center gap-1 tag-pill text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus size={10} /> {skill.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Job Description *</label>
                </div>
                <div className="border border-border rounded-xl overflow-hidden shadow-sm flex flex-col bg-background focus-within:ring-2 focus-within:ring-[var(--gb-cyan)]/25 focus-within:border-[var(--gb-cyan)] transition-all">
                  <div className="bg-muted/30 border-b border-border px-3 py-2 flex items-center gap-1.5">
                    <button disabled={isInstantJobMode && !isJobDetailsGenerated} className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors cursor-pointer bg-transparent border-none flex items-center disabled:opacity-40 disabled:cursor-not-allowed" type="button" onClick={() => insertMarkdown('**', '**')} title="Bold"><Bold size={14} /></button>
                    <button disabled={isInstantJobMode && !isJobDetailsGenerated} className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors cursor-pointer bg-transparent border-none flex items-center disabled:opacity-40 disabled:cursor-not-allowed" type="button" onClick={() => insertMarkdown('*', '*')} title="Italic"><Italic size={14} /></button>
                    <button disabled={isInstantJobMode && !isJobDetailsGenerated} className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors cursor-pointer bg-transparent border-none flex items-center disabled:opacity-40 disabled:cursor-not-allowed" type="button" onClick={() => insertMarkdown('<u>', '</u>')} title="Underline"><Underline size={14} /></button>
                    <div className="w-[1px] h-4 bg-border mx-1" />
                    <button disabled={isInstantJobMode && !isJobDetailsGenerated} className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors cursor-pointer bg-transparent border-none flex items-center disabled:opacity-40 disabled:cursor-not-allowed" type="button" onClick={() => insertMarkdown('\n- ', '')} title="Bullet List"><List size={14} /></button>
                    <button disabled={isInstantJobMode && !isJobDetailsGenerated} className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors cursor-pointer bg-transparent border-none flex items-center disabled:opacity-40 disabled:cursor-not-allowed" type="button" onClick={() => insertMarkdown('\n1. ', '')} title="Numbered List"><ListOrdered size={14} /></button>
                  </div>
                  <textarea
                    value={form.description}
                    onChange={event => setForm({ ...form, description: event.target.value })}
                    placeholder="Describe the role, responsibilities, and ideal candidate..."
                    rows={6}
                    disabled={isInstantJobMode && !isJobDetailsGenerated}
                    className="w-full bg-transparent border-none px-4 py-3 text-sm placeholder:text-muted-foreground focus:ring-0 resize-y min-h-[150px] outline-none leading-relaxed text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={isInstantJobMode && !isJobDetailsGenerated}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
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
                    disabled={isInstantJobMode && !isJobDetailsGenerated}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimated Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 2-4 weeks"
                    value={form.estimatedDuration}
                    onChange={event => setForm({ ...form, estimatedDuration: event.target.value })}
                    disabled={isInstantJobMode && !isJobDetailsGenerated}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={event => setForm({ ...form, deadline: event.target.value })}
                    disabled={isInstantJobMode && !isJobDetailsGenerated}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
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
              onClick={() => submitDraftFlow('draft')}
              disabled={isActionDisabled}
              className="px-6 py-3 rounded-full font-bold text-sm border border-border bg-background text-foreground hover:bg-muted transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <Save size={16} /> {renderSubmitLabel('draft', 'Save as Draft')}
            </button>
            <button
              type="button"
              onClick={() => submitDraftFlow('esign')}
              disabled={isActionDisabled}
              className="px-6 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer border-none group"
            >
              <Check size={16} />
              <span>{renderSubmitLabel('esign', 'Next: Contract Setup')}</span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
      <JobPostGuide isActive={isGuideActive} onClose={() => setIsGuideActive(false)} />

      {isDraftModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsDraftModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={event => event.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-foreground">Continue Draft</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  You currently have {drafts.length} unfinished JobPost draft{drafts.length === 1 ? '' : 's'}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDraftModalOpen(false)}
                className="w-8 h-8 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[52vh]">
              {isDraftsLoading && (
                <div className="text-sm text-muted-foreground py-8 text-center">Checking draft JobPosts...</div>
              )}

              {draftsError && !isDraftsLoading && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl px-4 py-3 text-sm font-semibold">
                  {draftsError}
                </div>
              )}

              {!isDraftsLoading && !draftsError && drafts.length === 0 && (
                <div className="border border-dashed border-border rounded-xl p-8 text-center">
                  <FileText className="mx-auto text-muted-foreground mb-3" size={28} />
                  <p className="text-sm font-bold text-foreground">No unfinished drafts found.</p>
                  <p className="text-xs text-muted-foreground mt-1">Start a new JobPost when you are ready.</p>
                </div>
              )}

              {!isDraftsLoading && drafts.length > 0 && (
                <div className="flex flex-col gap-3">
                  {drafts.map(draft => (
                    <div key={draft.jobPostsId} className="border border-border rounded-xl p-4 bg-background flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-foreground truncate">
                          {draft.title?.trim() && draft.title.trim() !== 'Untitled Job Post' ? draft.title : 'Untitled Draft'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} />
                            Updated {formatDraftDate(draft.updatedAt || draft.createdAt)}
                          </span>
                          {draft.categoryName && <span>{draft.categoryName}</span>}
                          {(draft.skills?.length || 0) + (draft.customSkillNames?.length || 0) > 0 && (
                            <span>{(draft.skills?.length || 0) + (draft.customSkillNames?.length || 0)} skill(s)</span>
                          )}
                        </div>
                        {draft.description?.trim() && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{draft.description}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleContinueDraft(draft)}
                        className="px-5 py-2.5 rounded-full font-bold text-xs bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 border-none cursor-pointer flex-shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-5 border-t border-border flex flex-col sm:flex-row justify-end gap-3 bg-muted/20">
              <button
                type="button"
                onClick={() => setIsDraftModalOpen(false)}
                className="px-5 py-2.5 rounded-full font-bold text-xs border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewFromDraftModal}
                className="px-5 py-2.5 rounded-full font-bold text-xs bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 border-none cursor-pointer"
              >
                Create New JobPost
              </button>
            </div>
          </div>
        </div>
      )}

      {isLeavePromptOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-extrabold text-foreground">Do you want to save this JobPost draft?</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Save keeps your current draft. Discard only removes it if the backend confirms it is still empty.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={handleLeaveSaveDraft}
                disabled={leaveAction !== null}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs bg-[var(--gb-cyan)] text-white border-none cursor-pointer disabled:opacity-50"
              >
                {leaveAction === 'save' ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={handleLeaveDiscardDraft}
                disabled={leaveAction !== null}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs bg-red-500 text-white border-none cursor-pointer disabled:opacity-50"
              >
                {leaveAction === 'discard' ? 'Discarding...' : 'Discard Draft'}
              </button>
              <button
                type="button"
                onClick={cancelBlockedNavigation}
                disabled={leaveAction !== null}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs border border-border bg-background hover:bg-muted text-foreground cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <PromptSectionModal
        isOpen={isInstantJobMode}
        onClose={() => setIsInstantJobMode(false)}
        onGenerate={handleGenerateInstantJob}
        isGenerating={isGeneratingInstant}
      />
    </AppLayout>
  );
}
