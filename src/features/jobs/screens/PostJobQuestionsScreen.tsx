import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Bot, Check, ChevronRight, GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { PostJobLeavePrompt } from '../components/PostJobLeavePrompt';
import { usePostJob, type PostJobRouteState } from '../hooks/usePostJob';
import '../styles/PostJobScreen.css';

export function PostJobQuestionsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as PostJobRouteState | null;
  const {
    previewTitle,
    errorMessage,
    isDraftInitializing,
    draftError,
    setDraftRequestAttempt,
    draggedIndex,
    questions,
    setQuestions,
    isActionDisabled,
    isLeavePromptOpen,
    leaveAction,
    updateQuestion,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleLeaveSaveDraft,
    handleLeaveDiscardDraft,
    cancelBlockedNavigation,
    submitDraftFlow,
    navigateBackToDetails,
    renderSubmitLabel,
    MAX_QUESTION_LENGTH,
  } = usePostJob();

  useEffect(() => {
    if (!routeState?.jobPostId && !routeState?.jobData) {
      navigate('/jobs/post/details', { replace: true });
    }
  }, [navigate, routeState]);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-6 py-8 relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.02),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.02),transparent_50%)] opacity-50 pointer-events-none" />

        <div className="flex flex-col items-center mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4 border-b border-border pb-6">
            <button
              type="button"
              onClick={navigateBackToDetails}
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--gb-cyan)] bg-transparent border-none cursor-pointer mr-auto"
            >
              <ArrowLeft size={16} /> Back to Project Requirement
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground uppercase text-center md:absolute md:left-1/2 md:-translate-x-1/2" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", letterSpacing: '0.05em' }}>
              Clarifying Questions
            </h1>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl px-4 py-3 text-sm font-semibold">
            {errorMessage}
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
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <div className="flex items-center gap-2">
              <Bot className="text-[var(--gb-purple)]" size={20} />
              <h2 className="text-lg font-bold text-foreground">Clarifying Questions</h2>
            </div>
          </div>

          <div className="space-y-3">
            {questions.map((question, index) => (
              <div
                key={index}
                draggable
                onDragStart={event => handleDragStart(event, index)}
                onDragOver={event => handleDragOver(event, index)}
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
                      Required answer
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
                  placeholder="Optional question freelancers may answer to clarify their proposal..."
                />
                <div className="text-right mt-1 text-[10px] text-muted-foreground">
                  {question.questionText.length}/{MAX_QUESTION_LENGTH}
                </div>
              </div>
            ))}

            {questions.length === 0 && (
              <div className="text-center py-8 border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                No clarifying questions added. You can publish without questions.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setQuestions([...questions, { questionText: '', isRequired: false }])}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-border hover:border-[var(--gb-cyan)] hover:text-[var(--gb-cyan)] bg-background text-xs font-bold transition-all cursor-pointer"
          >
            <Plus size={14} /> Add Clarifying Question
          </button>
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
              onClick={() => submitDraftFlow('publish')}
              disabled={isActionDisabled}
              className="px-6 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer border-none group"
            >
              <Check size={16} />
              <span>{renderSubmitLabel('publish', 'Publish Project Request')}</span>
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
