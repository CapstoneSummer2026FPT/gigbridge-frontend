import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Bot, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { jobAPI } from '../../../api/jobAPI';
import { AppLayout } from '../../../shared/components/AppLayout';
import type { PostJobRouteState } from '../hooks/usePostJob';
import { buildAIJobGenerateRequest, mapGeneratedJobDescriptionToJobData } from '../utils/postJobAI';
import '../styles/PostJobScreen.css';

const MAX_AI_PROMPT_LENGTH = 1000;

export function PostJobAIScreen() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (): Promise<void> => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError('Please enter what you want to hire for.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await jobAPI.generateAIDescription(buildAIJobGenerateRequest(trimmedPrompt));
      if (!response.success || !response.data) {
        const message = response.message || 'Job details could not be generated.';
        setError(message);
        toast.error(message);
        return;
      }

      const state = {
        jobData: mapGeneratedJobDescriptionToJobData(response.data),
      } satisfies PostJobRouteState;

      toast.success('Job details generated. Please review before continuing.');
      navigate('/jobs/post/details', { state });
    } catch (generationError) {
      const message = generationError instanceof Error ? generationError.message : 'An error occurred during AI generation.';
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8 relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.02),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.02),transparent_50%)] opacity-50 pointer-events-none" />

        <button
          type="button"
          onClick={() => navigate('/jobs/post')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--gb-cyan)] bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-4 border-b border-border pb-5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[var(--gb-purple)]/15 to-[var(--gb-cyan)]/15 text-[var(--gb-purple)] flex items-center justify-center relative shrink-0">
              <Bot size={22} />
              <Sparkles size={12} className="absolute right-2 top-2 text-[var(--gb-cyan)]" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">Create JobPost with AI</h1>
              <p className="text-sm text-muted-foreground mt-1">Describe the work you need done.</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl px-4 py-3 text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <label htmlFor="ai-job-requirement" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Requirement</label>
            <textarea
              id="ai-job-requirement"
              value={prompt}
              maxLength={MAX_AI_PROMPT_LENGTH}
              onChange={event => setPrompt(event.target.value)}
              placeholder="Tôi muốn thuê 1 người để cải thiện loadbalancer..."
              rows={7}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all text-foreground resize-y leading-relaxed"
            />
            <div className="flex justify-end text-[11px] text-muted-foreground">
              {prompt.length}/{MAX_AI_PROMPT_LENGTH}
            </div>
          </div>

          <div className="mt-7 flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/jobs/post/details', { state: null })}
              className="px-6 py-3 rounded-full font-bold text-sm border border-border bg-background text-foreground hover:bg-muted transition-all cursor-pointer"
            >
              Switch to Manual
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="px-8 py-3 rounded-full font-bold text-sm bg-gradient-to-r from-[var(--gb-purple)] to-[var(--gb-cyan)] text-white hover:opacity-95 shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed border-none cursor-pointer group"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Job Details
                  <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
