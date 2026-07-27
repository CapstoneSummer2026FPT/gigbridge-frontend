import { useState } from 'react';
import { Bold, ChevronRight, Italic, List, ListOrdered, Plus, Save, Underline, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { JobPostVisibility } from '../../../types/models/Job';
import { PostJobLeavePrompt } from '../components/PostJobLeavePrompt';
import { usePostJob } from '../hooks/usePostJob';
import { JOB_DURATION_UNITS, type JobDurationUnit } from '../utils/jobDuration';
import '../styles/PostJobScreen.css';

export function PostJobDetailsScreen() {
  const {
    form,
    setForm,
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
    isActionDisabled,
    taxonomyError,
    isMajorsLoading,
    isCategoriesLoading,
    isSkillsLoading,
    isLeavePromptOpen,
    leaveAction,
    insertMarkdown,
    handleMajorChange,
    handleCategoryChange,
    addOfficialSkill,
    addSkill,
    removeOfficialSkill,
    removeCustomSkill,
    handleLeaveSaveDraft,
    handleLeaveDiscardDraft,
    cancelBlockedNavigation,
    submitDraftFlow,
    renderSubmitLabel,
  } = usePostJob();

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <AppLayout>
      <div className="max-w-[1180px] mx-auto px-6 py-8 relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.02),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.02),transparent_50%)] opacity-50 pointer-events-none" />

        <div className="flex flex-col items-center mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4 border-b border-border pb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground uppercase" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", letterSpacing: '0.05em' }}>
              Create Project Request
            </h1>
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

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold border-b border-border pb-4 mb-6 text-foreground">Project Requirement</h2>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project Title *</label>
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
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Major *</label>
                <select
                  value={form.majorId}
                  onChange={event => handleMajorChange(event.target.value)}
                  disabled={isMajorsLoading}
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
                  disabled={!form.majorId || isCategoriesLoading}
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
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Helpful Skills</label>
              <div className="border border-border rounded-xl p-3 bg-background shadow-sm flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-[var(--gb-cyan)]/25 focus-within:border-[var(--gb-cyan)] transition-all">
                {selectedOfficialSkills.map(skill => (
                  <span key={skill.skillId} className="bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    {skill.name}
                    <button
                      type="button"
                      onClick={() => removeOfficialSkill(skill.skillId)}
                      className="hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0 flex items-center"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {form.customSkillNames.map(skill => (
                  <span key={skill} className="bg-[var(--gb-purple)]/10 text-[var(--gb-purple)] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    {skill}
                    <span className="opacity-70">(custom)</span>
                    <button
                      type="button"
                      onClick={() => removeCustomSkill(skill)}
                      className="hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0 flex items-center"
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
                  disabled={!form.categoryId}
                  className="flex-grow bg-transparent border-none focus:ring-0 px-2 py-1 text-sm min-w-[150px] outline-none text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => addSkill(skillInput)}
                  disabled={!form.categoryId || !skillInput.trim()}
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
                        className="flex items-center gap-1 tag-pill text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer border-none"
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
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Requirement Details *</label>
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
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expected Budget</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={form.budget}
                  onChange={event => setForm({ ...form, budget: event.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimated Duration</label>
                <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-3">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 3"
                    value={form.estimatedDurationValue}
                    onChange={event => setForm({ ...form, estimatedDurationValue: event.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm text-foreground"
                  />
                  <select
                    value={form.estimatedDurationUnit}
                    onChange={event => setForm({ ...form, estimatedDurationUnit: event.target.value as JobDurationUnit })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all shadow-sm cursor-pointer text-foreground"
                  >
                    {JOB_DURATION_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div className="border border-border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(current => !current)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors bg-card cursor-pointer border-none"
              >
                <span>Advanced Settings</span>
                <ChevronRight size={14} className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 pt-2 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
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
              )}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mt-8 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-sm">
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Project Request Preview</span>
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
              onClick={() => submitDraftFlow('questions')}
              disabled={isActionDisabled}
              className="px-6 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer border-none group"
            >
              <span>{renderSubmitLabel('questions', 'Next: Clarifying Questions')}</span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      <PostJobLeavePrompt
        isOpen={isLeavePromptOpen}
        leaveAction={leaveAction}
        onSaveDraft={handleLeaveSaveDraft}
        onDiscardDraft={handleLeaveDiscardDraft}
        onCancel={cancelBlockedNavigation}
      />
    </AppLayout>
  );
}
