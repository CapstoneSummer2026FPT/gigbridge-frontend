import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Check, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobAPI } from '../../../api/jobAPI';
import type { JobPostQuestionDto } from '../../../types/models/Job';
import '../styles/PostJobScreen.css';
import { useTranslation } from '../../../hooks/useTranslation';

const DRAFT_RULE_MESSAGE = 'Only draft job posts can update questions.';

type QuestionDraft = JobPostQuestionDto & {
  isNew?: boolean;
};

const orderQuestions = (questions: JobPostQuestionDto[]) =>
  [...questions].sort((a, b) => a.orderIndex - b.orderIndex);

const toDraft = (question: JobPostQuestionDto): QuestionDraft => ({ ...question });

const isDraftRuleFailure = (message?: string) =>
  (message || '').toLowerCase().includes('questions can only be modified');

export default function ManageJobPostQuestionsScreen() {
  const { t } = useTranslation();
  const { jobPostId = '' } = useParams();
  const DRAFT_RULE_MESSAGE = t('manageQuestions.draftRuleMessage');
  const navigate = useNavigate();
  const [originalQuestions, setOriginalQuestions] = useState<JobPostQuestionDto[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<QuestionDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = async () => {
    if (!jobPostId) return;

    setIsLoading(true);
    setError(null);

    const response = await jobAPI.getJobPostQuestions(jobPostId);

    if (!response.success || !response.data) {
      setError(response.message || t('manageQuestions.unableToLoad'));
      setIsLoading(false);
      return;
    }

    const ordered = orderQuestions(response.data);
    setOriginalQuestions(ordered);
    setCurrentQuestions(ordered.map(toDraft));
    setIsLoading(false);
  };

  useEffect(() => {
    loadQuestions();
  }, [jobPostId]);

  const changedExistingQuestions = useMemo(() => {
    const originalById = new Map(originalQuestions.map(question => [question.jobPostQuestionsId, question]));

    return currentQuestions.filter(question => {
      if (question.isNew) return false;

      const original = originalById.get(question.jobPostQuestionsId);
      if (!original) return false;

      return (
        original.questionText !== question.questionText ||
        original.orderIndex !== question.orderIndex ||
        original.isRequired !== question.isRequired
      );
    });
  }, [currentQuestions, originalQuestions]);

  const updateQuestion = (questionId: string, patch: Partial<QuestionDraft>) => {
    setCurrentQuestions(prev =>
      prev.map(question =>
        question.jobPostQuestionsId === questionId ? { ...question, ...patch } : question
      )
    );
  };

  const normalizeDraftOrder = (questions: QuestionDraft[]) =>
    questions.map((question, index) => ({ ...question, orderIndex: index }));

  const handleAddQuestion = () => {
    const id = `new-${Date.now()}`;
    setCurrentQuestions(prev =>
      normalizeDraftOrder([
        ...prev,
        {
          jobPostQuestionsId: id,
          jobPostsId: jobPostId,
          questionText: '',
          orderIndex: prev.length,
          isRequired: true,
          createdAt: new Date().toISOString(),
          updatedAt: null,
          isNew: true,
        },
      ])
    );
  };

  const handleDeleteQuestion = async (question: QuestionDraft) => {
    if (!window.confirm(t('manageQuestions.deleteQuestion'))) return;

    if (question.isNew) {
      setCurrentQuestions(prev =>
        normalizeDraftOrder(prev.filter(item => item.jobPostQuestionsId !== question.jobPostQuestionsId))
      );
      return;
    }

    const response = await jobAPI.deleteJobPostQuestion(jobPostId, question.jobPostQuestionsId);
    if (!response.success) {
      toast.error(isDraftRuleFailure(response.message) ? DRAFT_RULE_MESSAGE : response.message || t('manageQuestions.unableToDelete'));
      return;
    }

    toast.success(t('manageQuestions.questionDeleted'));
    await loadQuestions();
  };

  const handleToggleRequired = async (question: QuestionDraft, isRequired: boolean) => {
    updateQuestion(question.jobPostQuestionsId, { isRequired });

    if (question.isNew) return;

    const response = await jobAPI.updateJobPostQuestionRequired(jobPostId, question.jobPostQuestionsId, { isRequired });
    if (!response.success || !response.data) {
      updateQuestion(question.jobPostQuestionsId, { isRequired: question.isRequired });
      toast.error(isDraftRuleFailure(response.message) ? DRAFT_RULE_MESSAGE : response.message || t('manageQuestions.unableToUpdateRequired'));
      return;
    }

    updateQuestion(question.jobPostQuestionsId, response.data);
    setOriginalQuestions(prev =>
      prev.map(item => item.jobPostQuestionsId === response.data?.jobPostQuestionsId ? response.data : item)
    );
  };

  const validateQuestion = (question: QuestionDraft) => {
    if (!question.questionText.trim()) return t('manageQuestions.textRequired');
    if (question.questionText.length > 1000) return t('manageQuestions.textMaxLength');
    if (question.orderIndex < 0) return t('manageQuestions.invalidOrder');
    return null;
  };

  const handleSave = async () => {
    const ordered = normalizeDraftOrder(currentQuestions);
    const validationError = ordered.map(validateQuestion).find(Boolean);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);

    const newQuestions = ordered.filter(question => question.isNew);
    for (const question of newQuestions) {
      const response = await jobAPI.createJobPostQuestion(jobPostId, {
        questionText: question.questionText.trim(),
        orderIndex: question.orderIndex,
        isRequired: question.isRequired,
      });

      if (!response.success) {
        setIsSaving(false);
        toast.error(isDraftRuleFailure(response.message) ? DRAFT_RULE_MESSAGE : response.message || t('manageQuestions.unableToUpdateRequired'));
        return;
      }
    }

    const changed = changedExistingQuestions.map(question => ({
      jobPostQuestionsId: question.jobPostQuestionsId,
      questionText: question.questionText.trim(),
      orderIndex: question.orderIndex,
      isRequired: question.isRequired,
    }));

    if (changed.length > 0) {
      const response = await jobAPI.updateBulkJobPostQuestions(jobPostId, { questions: changed });
      if (!response.success) {
        setIsSaving(false);
        toast.error(isDraftRuleFailure(response.message) ? DRAFT_RULE_MESSAGE : response.message || t('manageQuestions.bulkUpdateFailed'));
        return;
      }
    }

    if (newQuestions.length === 0 && changed.length === 0) {
      toast.info(t('manageQuestions.noChanges'));
      setIsSaving(false);
      return;
    }

    toast.success(t('manageQuestions.savedSuccess'));
    await loadQuestions();
    setIsSaving(false);
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button
          type="button"
          onClick={() => navigate('/jobs/my-jobs')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--gb-cyan)] bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={16} /> {t('manageQuestions.backToMyJobs')}
        </button>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">{t('manageQuestions.title')}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t('manageQuestions.subtitle')}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleAddQuestion} className="btn-ghost-cyan px-4 py-2 text-sm flex items-center gap-2">
                <Plus size={16} /> {t('manageQuestions.addQuestion')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="btn-cyan px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={16} /> {isSaving ? t('manageQuestions.saving') : t('manageQuestions.saveChanges')}
              </button>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('manageQuestions.loadingQuestions')}</p>
          ) : error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : currentQuestions.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-xl">
              <p className="text-sm text-muted-foreground mb-4">{t('manageQuestions.noQuestions')}</p>
              <button type="button" onClick={handleAddQuestion} className="btn-cyan px-4 py-2 text-sm">
                {t('manageQuestions.addFirstQuestion')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {normalizeDraftOrder(currentQuestions).map((question, index) => (
                <div key={question.jobPostQuestionsId} className="bg-background border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('manageQuestions.questionNum', { num: index + 1 })}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        <input
                           type="checkbox"
                          checked={question.isRequired}
                          onChange={event => handleToggleRequired(question, event.target.checked)}
                        />
                        {t('manageQuestions.required')}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(question)}
                        className="text-red-500 bg-transparent border-none cursor-pointer flex items-center"
                        title="Delete question"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={question.questionText}
                    onChange={event => updateQuestion(question.jobPostQuestionsId, { questionText: event.target.value, orderIndex: index })}
                    rows={3}
                    maxLength={1000}
                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25"
                    placeholder={t('manageQuestions.placeholder')}
                  />
                  <div className="flex justify-between mt-2 text-[11px] text-muted-foreground">
                    <span>{t('manageQuestions.orderIndex', { index })}</span>
                    <span>{t('manageQuestions.charCount', { count: question.questionText.length })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && currentQuestions.length > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="btn-cyan px-5 py-3 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Check size={16} /> {isSaving ? t('manageQuestions.saving') : t('manageQuestions.saveQuestions')}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
