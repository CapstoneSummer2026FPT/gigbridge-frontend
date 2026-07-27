import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Sparkles, X, Plus, ChevronRight,
  Bold, Italic, Underline, List, ListOrdered, Check, Save,
  FileText, Clock,
  MessageSquare, Crown
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
import { LiquidLoading } from '../../../shared/components/LiquidLoading';
import { PostJobLeavePrompt } from '../components/PostJobLeavePrompt';
import '../styles/PostJobScreen.css';
import { useApp } from '../../../app/providers/AppProvider';
import { usePremiumStatus } from '../../premium/hooks';
import { NestedMilestonePlanEditor, type EditableMilestonePlan } from '../../../shared/components/NestedMilestonePlanEditor';

export default function PostJobScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { role } = useApp();
  const premiumStatus = usePremiumStatus(role);
  const [isGuideActive, setIsGuideActive] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
    milestonePlans,
    setMilestonePlans,
    milestoneErrors,
    setMilestoneErrors,
    expandedMilestone,
    setExpandedMilestone,
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
    handleGenerateInstantJob,
    handleLeaveSaveDraft,
    handleLeaveDiscardDraft,
    cancelBlockedNavigation,
    submitDraftFlow,
    renderSubmitLabel,
    setForm,
  } = usePostJob();

  useEffect(() => {
    if (!premiumStatus.loading && !premiumStatus.isPremium && isInstantJobMode) {
      setIsInstantJobMode(false);
    }
  }, [isInstantJobMode, premiumStatus.isPremium, premiumStatus.loading, setIsInstantJobMode]);


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
                onClick={() => {
                  if (!premiumStatus.isPremium) {
                    navigate('/premium/client/pricing');
                    return;
                  }
                  setIsInstantJobMode(!isInstantJobMode);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all shadow-md cursor-pointer border-none ${
                  isInstantJobMode
                    ? 'bg-gradient-to-r from-[var(--gb-purple)] to-[var(--gb-cyan)] text-white hover:opacity-95'
                    : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                }`}
              >
                <Sparkles size={14} className={isInstantJobMode ? 'animate-pulse' : ''} />
                {t('postJob.createInstantJobDetail')}
                {!premiumStatus.isPremium && <Crown size={13} />}
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
          <AIGenJobGuide />
        )}

        {/* Main panels grid - hidden when instant job mode is active but not generated */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start ${
          isInstantJobMode && !isJobDetailsGenerated ? 'hidden' : ''
        }`}>
          {/* LEFT: Project Requirement (col-span-7) */}
          <div id="guide-job-details-panel" className={`lg:col-span-12 order-1 flex flex-col gap-4 sm:gap-6 bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm ${
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('postJob.expectedBudget')}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder={t('postJob.budgetPlaceholder')}
                    value={form.budget}
                    onChange={event => setForm({ ...form, budget: event.target.value })}
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

              {/* Advanced Settings (collapsible) */}
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer bg-transparent border-none"
                >
                  <span>{t('postJob.advancedSettings')}</span>
                  <ChevronRight size={14} className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                </button>
                {showAdvanced && (
                  <div className="px-4 pb-4 pt-2 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('postJob.location')}</label>
                      <input
                        type="text"
                        placeholder={t('postJob.locationPlaceholder')}
                        value={form.location}
                        onChange={event => setForm({ ...form, location: event.target.value })}
                        disabled={isInstantJobMode && !isJobDetailsGenerated}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground disabled:opacity-50 disabled:bg-muted/30 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>



        {!(isInstantJobMode && !isJobDetailsGenerated) && (
          <div className="mx-auto mt-8 max-w-[1440px] rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <NestedMilestonePlanEditor
              value={milestonePlans as EditableMilestonePlan[]}
              onChange={plans => {
                setMilestonePlans(plans);
                setMilestoneErrors({});
              }}
              optional
              showDueDate
              simplified
              title="Baseline milestone and Work Breakdown Structure"
              description="Give freelancers a starting plan. They can review and propose changes in their proposal before any contract is created."
              expandedIndex={expandedMilestone}
              onExpandedChange={setExpandedMilestone}
              errors={milestoneErrors}
              durationUnits={JOB_DURATION_UNITS.map(unit => ({
                value: unit,
                label: t(`postJob.durationUnits.${unit}`),
              }))}
              fieldHints={{
                fixedProjectBudget: t('postJob.baselineBudgetHint'),
                milestoneTitle: t('postJob.baselineMilestoneTitleHint'),
                amount: t('postJob.baselineAmountHint'),
                duration: t('postJob.baselineDurationHint'),
                deadline: t('postJob.baselineDeadlineHint'),
                description: t('postJob.baselineDescriptionHint'),
                deliverables: t('postJob.baselineDeliverablesHint'),
                acceptanceCriteria: t('postJob.baselineAcceptanceCriteriaHint'),
                workBreakdown: t('postJob.baselineWorkBreakdownHint'),
                workItemTitle: t('postJob.baselineWorkItemTitleHint'),
                workItemDuration: t('postJob.baselineWorkItemDurationHint'),
                workItemDescription: t('postJob.baselineWorkItemDescriptionHint'),
                workItemDeliverables: t('postJob.baselineWorkItemDeliverablesHint'),
              }}
              fieldPlaceholders={{
                milestoneTitle: t('postJob.baselineMilestoneTitlePlaceholder'),
                amount: t('postJob.baselineAmountPlaceholder'),
                duration: t('postJob.baselineDurationPlaceholder'),
                description: t('postJob.baselineDescriptionPlaceholder'),
                deliverables: t('postJob.baselineDeliverablesPlaceholder'),
                acceptanceCriteria: t('postJob.baselineAcceptanceCriteriaPlaceholder'),
                workItemTitle: t('postJob.baselineWorkItemTitlePlaceholder'),
                workItemDuration: t('postJob.baselineWorkItemDurationPlaceholder'),
                workItemDescription: t('postJob.baselineWorkItemDescriptionPlaceholder'),
                workItemDeliverables: t('postJob.baselineWorkItemDeliverablesPlaceholder'),
              }}
            />
          </div>
        )}

        {/* Project Request Preview bar - hidden in instant job guide mode */}
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
                onClick={() => submitDraftFlow('questions')}
                disabled={isActionDisabled}
                className="px-6 py-3 rounded-full font-bold text-sm border border-[var(--gb-purple)] text-[var(--gb-purple)] hover:bg-[var(--gb-purple)]/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <MessageSquare size={16} /> {t('postJob.clarifyingQuestions')}
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => submitDraftFlow('publish')}
                disabled={isActionDisabled}
                className="px-6 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer border-none group"
              >
                <Check size={16} />
                <span>{renderSubmitLabel('publish', t('postJob.publishProjectRequest'))}</span>
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
