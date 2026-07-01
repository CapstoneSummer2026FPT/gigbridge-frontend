import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Sparkles, X, Plus, ChevronRight,
  Bold, Italic, Underline, List, ListOrdered, Check, Save,
  GripVertical, Trash2, FileText, Clock,
  Lightbulb, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { jobAPI } from '../../../api/jobAPI';
import { AppLayout } from '../../../shared/components/AppLayout';
import { JobPostVisibility, type GetMyJobPostDto } from '../../../types/models/Job';
import { usePostJob } from '../hooks/usePostJob';
import { JOB_DURATION_UNITS, type JobDurationUnit } from '../utils/jobDuration';
import { JobPostGuide } from '../components/JobPostGuide';
import { PromptSectionModal } from '../components/PromptSectionModal';
import { AIGenJobGuide } from '../components/AIGenJobGuide';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { LiquidLoading } from '../../../shared/components/LiquidLoading';
import { PostJobLeavePrompt } from '../components/PostJobLeavePrompt';
import '../styles/PostJobScreen.css';

export default function PostJobScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [isGuideActive, setIsGuideActive] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [isBudgetGuideOpen, setIsBudgetGuideOpen] = useState(false);
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
      setDraftsError(response.message || t('postJob.noDrafts'));
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
    <AppLayout mainClassName={isInstantJobMode && !isJobDetailsGenerated ? 'ai-guide-active-layout' : ''}>
      <div className={`max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-8 relative ${
        isInstantJobMode && !isJobDetailsGenerated ? 'pb-[620px]' : ''
      }`}>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.02),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.02),transparent_50%)] opacity-50 pointer-events-none" />

        <div className="flex flex-col gap-6 items-center mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4 border-b border-border pb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground uppercase" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", letterSpacing: '0.05em' }}>{t('postJob.createNewJobPost')}</h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={loadDrafts}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all shadow-sm cursor-pointer border border-border bg-background hover:bg-muted text-foreground"
              >
                <FileText size={14} />
                {t('postJob.continueDraft')}
              </button>

              <button
                type="button"
                onClick={() => { setIsInstantJobMode(!isInstantJobMode); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all shadow-md cursor-pointer border-none ${
                  isInstantJobMode
                    ? 'bg-gradient-to-r from-[var(--gb-purple)] to-[var(--gb-cyan)] text-white hover:opacity-95'
                    : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                }`}
              >
                <Sparkles size={14} className={isInstantJobMode ? 'animate-pulse' : ''} />
                {t('postJob.createInstantJobDetail')}
              </button>

              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    if (isInstantJobMode) { setIsGuideActive(true); }
                    else { toast.info(t('postJob.activateInstantFirst')); }
                  }}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                    isInstantJobMode
                      ? 'border-[var(--gb-cyan)] bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)] shadow-[0_0_15px_rgba(0,119,255,0.4)] animate-pulse scale-105 font-extrabold'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  title={t('postJob.instantGuideTitle')}
                >
                  ?
                </button>
                <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-xl p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs text-muted-foreground leading-relaxed text-left select-text">
                  <p className="font-bold text-foreground mb-1">{t('postJob.instantGuideTitle')}</p>
                  <span dangerouslySetInnerHTML={{ __html: t('postJob.instantGuideDesc') }} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center w-full max-w-5xl mx-auto py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--gb-cyan)] text-white flex items-center justify-center shadow-md font-bold text-sm shrink-0">1</div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-[var(--gb-cyan)] uppercase tracking-wider font-bold">{t('postJob.step1')}</span>
                <span className="text-xs text-foreground font-bold">{t('postJob.step1Label')}</span>
              </div>
            </div>
            <div className="flex-grow mx-2 sm:mx-6 h-[2px] bg-border rounded-full opacity-50" />
            <div className="flex items-center gap-3 opacity-60">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm shrink-0">2</div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t('postJob.step2')}</span>
                <span className="text-xs text-muted-foreground font-bold">{t('postJob.step2Label')}</span>
              </div>
            </div>
            <div className="flex-grow mx-2 sm:mx-6 h-[2px] bg-border rounded-full opacity-50" />
            <div className="flex items-center gap-3 opacity-60">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm shrink-0">3</div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t('postJob.step3')}</span>
                <span className="text-xs text-muted-foreground font-bold">{t('postJob.step3Label')}</span>
              </div>
            </div>
            <div className="flex-grow mx-2 sm:mx-6 h-[2px] bg-border rounded-full opacity-50" />
            <div className="flex items-center gap-3 opacity-60">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm shrink-0">4</div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t('postJob.step4')}</span>
                <span className="text-xs text-muted-foreground font-bold">{t('postJob.step4Label')}</span>
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
            {t('postJob.loadingDraft')}
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
              {t('postJob.retry')}
            </button>
          </div>
        )}

        {/* AI Guide — extracted component, shown when instant job mode is active but not yet generated */}
        {isInstantJobMode && !isJobDetailsGenerated && (
          <AIGenJobGuide showMockBadge />
        )}

        {/* Main panels grid - hidden when instant job mode is active but not generated */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start ${
          isInstantJobMode && !isJobDetailsGenerated ? 'hidden' : ''
        }`}>
          {/* LEFT: Job Details (col-span-7) */}
          <div id="guide-job-details-panel" className={`lg:col-span-7 order-1 flex flex-col gap-4 sm:gap-6 bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm ${
            isJobDetailsGenerated ? 'panels-fade-in' : ''
          }`}>
            <h2 className="text-lg font-bold border-b border-border pb-4 mb-2 text-foreground">{t('postJob.step1Label')}</h2>

            {isInstantJobMode && !isJobDetailsGenerated && (
              <div className="bg-gradient-to-r from-[var(--gb-purple)]/10 to-[var(--gb-cyan)]/10 border border-[var(--gb-purple)]/20 rounded-xl p-4 flex gap-3 items-start">
                <Sparkles className="text-[var(--gb-purple)] shrink-0 mt-0.5 animate-pulse" size={16} />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-foreground">{t('postJob.premiumFeatureActive')}</span>
                  <span
                    className="text-[11px] text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: t('postJob.premiumFeatureDesc') }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('postJob.jobTitle')}</label>
                <input
                  type="text"
                  placeholder={t('postJob.jobTitlePlaceholder')}
                  value={form.title}
                  onChange={event => setForm({ ...form, title: event.target.value })}
                  disabled={isInstantJobMode && !isJobDetailsGenerated}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('postJob.major')}</label>
                  <select
                    value={form.majorId}
                    onChange={event => handleMajorChange(event.target.value)}
                    disabled={(isInstantJobMode && !isJobDetailsGenerated) || isMajorsLoading}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                  >
                    <option value="">{isMajorsLoading ? t('postJob.loadingMajors') : t('postJob.selectMajor')}</option>
                    {majors.map(major => <option key={major.majorId} value={major.majorId}>{major.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('postJob.category')}</label>
                  <select
                    value={form.majorCategoryId}
                    onChange={event => handleCategoryChange(event.target.value)}
                    disabled={(isInstantJobMode && !isJobDetailsGenerated) || !form.majorId || isCategoriesLoading}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!form.majorId ? t('postJob.selectMajorFirst') : isCategoriesLoading ? t('postJob.loadingCategories') : t('postJob.selectCategory')}
                    </option>
                    {categories.map(category => (
                      <option key={category.majorCategoryId} value={category.majorCategoryId}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('postJob.visibility')}</label>
                  <select
                    value={form.visibility}
                    onChange={event => setForm({ ...form, visibility: event.target.value })}
                    disabled={isInstantJobMode && !isJobDetailsGenerated}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                  >
                    <option value={JobPostVisibility.Public}>{t('postJob.public')}</option>
                    <option value={JobPostVisibility.Private}>{t('postJob.private')}</option>
                    <option value={JobPostVisibility.InviteOnly}>{t('postJob.inviteOnly')}</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('postJob.requiredSkills')}</label>
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
                    placeholder={form.categoryId ? t('postJob.addSkillPlaceholder') : t('postJob.selectCategoryFirst')}
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
                    {t('postJob.addSkill')}
                  </button>
                </div>
                {isSkillsLoading && (
                  <p className="text-[10px] text-muted-foreground mt-1">{t('postJob.loadingSkills')}</p>
                )}
                {remainingSkills.length > 0 && (
                  <div className="mt-1">
                    <p className="text-[10px] text-muted-foreground mb-2">{t('postJob.availableSkills')}</p>
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
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('postJob.jobDescription')}</label>
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
                    placeholder={t('postJob.jobDescPlaceholder')}
                    rows={6}
                    disabled={isInstantJobMode && !isJobDetailsGenerated}
                    className="w-full bg-transparent border-none px-4 py-3 text-sm placeholder:text-muted-foreground focus:ring-0 resize-y min-h-[150px] outline-none leading-relaxed text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('postJob.budgetMin')}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder={t('postJob.budgetMinPlaceholder')}
                    value={form.budgetMin}
                    onChange={event => setForm({ ...form, budgetMin: event.target.value })}
                    disabled={isInstantJobMode && !isJobDetailsGenerated}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('postJob.budgetMax')}</label>
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
                              {t('postJob.budgetGuideTitle')}
                            </h4>
                            <p
                              className="text-[11px] text-muted-foreground leading-relaxed mb-3"
                              dangerouslySetInnerHTML={{ __html: t('postJob.budgetGuideDesc') }}
                            />
                            
                            <div className="bg-muted/40 rounded-xl p-2.5 border border-border/60 flex items-center justify-between mb-3">
                              <div className="flex items-center gap-1.5">
                                <GigCoinLogo size={16} />
                                <span className="text-xs font-bold text-foreground">1 G-coin</span>
                              </div>
                              <span className="text-muted-foreground text-[10px] font-bold">⇄</span>
                              <span className="text-xs font-black text-brand">{t('postJob.budgetGuideRate')}</span>
                            </div>

                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {t('postJob.budgetGuideNote')}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder={t('postJob.budgetMaxPlaceholder')}
                    value={form.budgetMax}
                    onChange={event => setForm({ ...form, budgetMax: event.target.value })}
                    disabled={isInstantJobMode && !isJobDetailsGenerated}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('postJob.estimatedDuration')}</label>
                  <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-3">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder={t('postJob.estimatedDurationPlaceholder')}
                      value={form.estimatedDurationValue}
                      onChange={event => setForm({ ...form, estimatedDurationValue: event.target.value })}
                      disabled={isInstantJobMode && !isJobDetailsGenerated}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                    />
                    <select
                      value={form.estimatedDurationUnit}
                      onChange={event => setForm({ ...form, estimatedDurationUnit: event.target.value as JobDurationUnit })}
                      disabled={isInstantJobMode && !isJobDetailsGenerated}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                    >
                      {JOB_DURATION_UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('postJob.endDate')}</label>
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

          {/* RIGHT: Questions for Interview (col-span-5) */}
          <div
            className={`lg:col-span-5 order-2 flex flex-col gap-4 sm:gap-6 bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm ${
              isJobDetailsGenerated ? 'panels-fade-in-delay' : ''
            }`}
            style={{ maxHeight: detailsHeight ? `${detailsHeight}px` : undefined }}
          >
            <div className="flex items-center justify-between border-b border-border pb-4 mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-[var(--gb-purple)]" size={20} />
                <h2 className="text-lg font-bold text-foreground">{t('postJob.questionsForInterview')}</h2>
              </div>
            </div>

            {/* Interview Questions Guide */}
            <div className="rounded-xl border border-[var(--gb-purple)]/20 bg-gradient-to-br from-[var(--gb-purple)]/6 to-transparent p-4 -mt-2 mb-1">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[var(--gb-purple)]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Lightbulb className="text-[var(--gb-purple)]" size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground mb-1">{t('postJob.questionsGuideTitle')}</p>
                  <p
                    className="text-xs text-muted-foreground leading-relaxed mb-2"
                    dangerouslySetInnerHTML={{ __html: t('postJob.questionsGuideDesc') }}
                  />
                  <div className="flex flex-col gap-1">
                    {(['questionsExample1', 'questionsExample2', 'questionsExample3'] as const).map((key, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-[var(--gb-purple)] mt-0.5 shrink-0 font-black text-xs">›</span>
                        <span className="text-[11px] text-muted-foreground italic">{t(`postJob.${key}`)}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
                        {t('postJob.question', { number: index + 1 })}
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
                        {t('postJob.required')}
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = questions.filter((_, idx) => idx !== index);
                          setQuestions(updated);
                        }}
                        className="text-muted-foreground hover:text-red-500 p-1 rounded hover:bg-muted transition-colors cursor-pointer bg-transparent border-none flex items-center justify-center"
                        title={t('postJob.deleteQuestion')}
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
                    placeholder={t('postJob.questionPlaceholder')}
                  />
                  <div className="text-right mt-1 text-[10px] text-muted-foreground">
                    {question.questionText.length}/{MAX_QUESTION_LENGTH}
                  </div>
                </div>
              ))}

              {questions.length === 0 && (
                <div className="text-center py-8 border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                  {t('postJob.noQuestions')}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <button
                type="button"
                onClick={() => setQuestions([...questions, { questionText: '', isRequired: true }])}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-border hover:border-[var(--gb-cyan)] hover:text-[var(--gb-cyan)] bg-background text-xs font-bold transition-all cursor-pointer"
              >
                <Plus size={14} /> {t('postJob.addQuestion')}
              </button>
            </div>
          </div>
        </div>

        {/* New Job Post Preview bar — hidden in instant job guide mode */}
        {!(isInstantJobMode && !isJobDetailsGenerated) && (
          <div className="bg-card border border-border rounded-2xl p-6 mt-8 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-sm max-w-[1440px] mx-auto">
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t('postJob.jobPreviewLabel')}</span>
              <span className="text-xs font-bold text-foreground truncate max-w-md mt-0.5">{previewTitle}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => submitDraftFlow('draft')}
                disabled={isActionDisabled}
                className="px-6 py-3 rounded-full font-bold text-sm border border-border bg-background text-foreground hover:bg-muted transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <Save size={16} /> {renderSubmitLabel('draft', t('postJob.saveAsDraft'))}
              </button>
              <button
                type="button"
                onClick={() => submitDraftFlow('esign')}
                disabled={isActionDisabled}
                className="px-6 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer border-none group"
              >
                <Check size={16} />
                <span>{renderSubmitLabel('esign', t('postJob.nextContractSetup'))}</span>
                <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        )}
      </div>
      <JobPostGuide isActive={isGuideActive} onClose={() => setIsGuideActive(false)} />

      {isDraftModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsDraftModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={event => event.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-foreground">{t('postJob.continueDraftTitle')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('postJob.continueDraftDesc', { count: drafts.length })}
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
                <div className="text-sm text-muted-foreground py-8 text-center">{t('postJob.checkingDrafts')}</div>
              )}

              {draftsError && !isDraftsLoading && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl px-4 py-3 text-sm font-semibold">
                  {draftsError}
                </div>
              )}

              {!isDraftsLoading && !draftsError && drafts.length === 0 && (
                <div className="border border-dashed border-border rounded-xl p-8 text-center">
                  <FileText className="mx-auto text-muted-foreground mb-3" size={28} />
                  <p className="text-sm font-bold text-foreground">{t('postJob.noDrafts')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('postJob.noDraftsDesc')}</p>
                </div>
              )}

              {!isDraftsLoading && drafts.length > 0 && (
                <div className="flex flex-col gap-3">
                  {drafts.map(draft => (
                    <div key={draft.jobPostsId} className="border border-border rounded-xl p-4 bg-background flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-foreground truncate">
                          {draft.title?.trim() && draft.title.trim() !== 'Untitled Job Post' ? draft.title : t('postJob.untitledDraft')}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} />
                            {t('postJob.updatedAt', { date: formatDraftDate(draft.updatedAt || draft.createdAt) })}
                          </span>
                          {draft.categoryName && <span>{draft.categoryName}</span>}
                          {(draft.skills?.length || 0) + (draft.customSkillNames?.length || 0) > 0 && (
                            <span>{t('postJob.skills', { count: (draft.skills?.length || 0) + (draft.customSkillNames?.length || 0) })}</span>
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
                        {t('postJob.editDraft')}
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
                {t('postJob.cancel')}
              </button>
              <button
                type="button"
                onClick={handleCreateNewFromDraftModal}
                className="px-5 py-2.5 rounded-full font-bold text-xs bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 border-none cursor-pointer"
              >
                {t('postJob.createNewJobPost2')}
              </button>
            </div>
          </div>
        </div>
      )}

      <PostJobLeavePrompt
        isOpen={isLeavePromptOpen}
        leaveAction={leaveAction}
        onSaveDraft={handleLeaveSaveDraft}
        onDiscardDraft={handleLeaveDiscardDraft}
        onCancel={cancelBlockedNavigation}
      />
      <PromptSectionModal
        isOpen={isInstantJobMode}
        onClose={() => setIsInstantJobMode(false)}
        onGenerate={handleGenerateInstantJob}
        isGenerating={isGeneratingInstant}
        threshold={!isJobDetailsGenerated ? 700 : 150}
      />

      {isGeneratingInstant && (
        <LiquidLoading overlay message={t('postJob.aiGeneratingDetails')} />
      )}
    </AppLayout>
  );
}
