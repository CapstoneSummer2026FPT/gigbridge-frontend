import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobQuestionAPI } from '../../../api/jobAPI';
import {
  JobStatus,
  type CreateJobPostQuestionRequest,
  type JobPostQuestionDto,
} from '../../../types/models/Job';
import '../styles/PostJobScreen.css';

type LocationState = {
  status?: number | null;
  title?: string;
};

const statusLabels: Record<number, string> = {
  [JobStatus.Draft]: 'Draft',
  [JobStatus.Open]: 'Open',
  [JobStatus.Closed]: 'Closed',
  [JobStatus.Cancelled]: 'Cancelled',
};

const sortQuestions = (questions: JobPostQuestionDto[]) =>
  [...questions].sort((a, b) => a.orderIndex - b.orderIndex);

const getQuestionErrorMessage = (
  statusCode: number | null | undefined,
  message: string | undefined,
  fallback: string
) => {
  const text = message || fallback;

  if (statusCode === 400 && text.toLowerCase().includes('draft')) {
    return 'Only draft job posts can update questions.';
  }

  return text;
};

export default function ManageJobPostQuestionsScreen() {
  const { jobPostId } = useParams<{ jobPostId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const knownStatus = typeof locationState?.status === 'number' ? locationState.status : null;
  const isReadOnly = knownStatus !== null && knownStatus !== JobStatus.Draft;

  const [originalQuestions, setOriginalQuestions] = useState<JobPostQuestionDto[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<JobPostQuestionDto[]>([]);
  const [newQuestion, setNewQuestion] = useState<CreateJobPostQuestionRequest>({
    questionText: '',
    orderIndex: 1,
    isRequired: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [updatingRequiredId, setUpdatingRequiredId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadQuestions = useCallback(async () => {
    if (!jobPostId) {
      setError('JobPost id is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await jobQuestionAPI.getJobPostQuestions(jobPostId);

      if (!response.success) {
        setError(response.message || 'Failed to load questions.');
        return;
      }

      const sorted = sortQuestions(response.data || []);
      setOriginalQuestions(sorted);
      setCurrentQuestions(sorted);
      setNewQuestion(prev => ({
        ...prev,
        orderIndex: sorted.length
          ? Math.max(...sorted.map(question => question.orderIndex)) + 1
          : 1,
      }));
    } catch (loadError) {
      console.error('Failed to load questions:', loadError);
      setError('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }, [jobPostId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const orderIndexes = new Set<number>();

    currentQuestions.forEach((question, index) => {
      const label = `Question ${index + 1}`;

      if (!question.questionText.trim()) {
        errors.push(`${label} is required.`);
      }

      if (question.questionText.length > 1000) {
        errors.push(`${label} must not exceed 1000 characters.`);
      }

      if (question.orderIndex < 0) {
        errors.push(`${label} order must be greater than or equal to 0.`);
      }

      if (orderIndexes.has(question.orderIndex)) {
        errors.push('Question order indexes must be unique.');
      }

      orderIndexes.add(question.orderIndex);
    });

    return errors;
  }, [currentQuestions]);

  const changedQuestions = useMemo(() => {
    return currentQuestions.filter(question => {
      const original = originalQuestions.find(
        item => item.jobPostQuestionsId === question.jobPostQuestionsId
      );

      if (!original) return false;

      return (
        question.questionText.trim() !== original.questionText ||
        question.orderIndex !== original.orderIndex ||
        question.isRequired !== original.isRequired
      );
    });
  }, [currentQuestions, originalQuestions]);

  const canSaveChanges =
    !isReadOnly &&
    changedQuestions.length > 0 &&
    validationErrors.length === 0 &&
    !saving;

  const updateCurrentQuestion = (
    questionId: string,
    patch: Partial<JobPostQuestionDto>
  ) => {
    setCurrentQuestions(prev =>
      prev.map(question =>
        question.jobPostQuestionsId === questionId ? { ...question, ...patch } : question
      )
    );
  };

  const handleSaveChanges = async () => {
    if (!jobPostId || !canSaveChanges) return;

    try {
      setSaving(true);
      setError('');

      const response = await jobQuestionAPI.updateBulkJobPostQuestions(jobPostId, {
        questions: changedQuestions.map(question => ({
          jobPostQuestionsId: question.jobPostQuestionsId,
          questionText: question.questionText.trim(),
          orderIndex: question.orderIndex,
          isRequired: question.isRequired,
        })),
      });

      if (!response.success) {
        setError(getQuestionErrorMessage(
          response.statusCode,
          response.message,
          'Failed to update questions.'
        ));
        return;
      }

      const sorted = sortQuestions(response.data || currentQuestions);
      setOriginalQuestions(sorted);
      setCurrentQuestions(sorted);
      toast.success('Questions updated successfully.');
    } catch (saveError) {
      console.error('Failed to save questions:', saveError);
      setError('Failed to update questions.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequiredToggle = async (question: JobPostQuestionDto, isRequired: boolean) => {
    if (!jobPostId || isReadOnly) return;

    try {
      setUpdatingRequiredId(question.jobPostQuestionsId);
      setError('');

      const response = await jobQuestionAPI.updateJobPostQuestionRequired(
        jobPostId,
        question.jobPostQuestionsId,
        { isRequired }
      );

      if (!response.success) {
        setError(getQuestionErrorMessage(
          response.statusCode,
          response.message,
          'Failed to update required flag.'
        ));
        return;
      }

      setOriginalQuestions(prev =>
        prev.map(item =>
          item.jobPostQuestionsId === question.jobPostQuestionsId
            ? { ...(response.data || item), isRequired }
            : item
        )
      );
      setCurrentQuestions(prev =>
        prev.map(item =>
          item.jobPostQuestionsId === question.jobPostQuestionsId
            ? {
                ...item,
                isRequired,
                updatedAt: response.data?.updatedAt ?? item.updatedAt,
              }
            : item
        )
      );
      toast.success('Question requirement updated.');
    } catch (toggleError) {
      console.error('Failed to update question requirement:', toggleError);
      setError('Failed to update required flag.');
    } finally {
      setUpdatingRequiredId(null);
    }
  };

  const handleAddQuestion = async () => {
    if (!jobPostId || isReadOnly || adding) return;

    const trimmedText = newQuestion.questionText.trim();

    if (!trimmedText) {
      setError('QuestionText is required.');
      return;
    }

    if (trimmedText.length > 1000) {
      setError('QuestionText must not exceed 1000 characters.');
      return;
    }

    if (newQuestion.orderIndex < 0) {
      setError('OrderIndex must be greater than or equal to 0.');
      return;
    }

    if (currentQuestions.some(question => question.orderIndex === newQuestion.orderIndex)) {
      setError('Question order indexes must be unique.');
      return;
    }

    try {
      setAdding(true);
      setError('');

      const response = await jobQuestionAPI.createJobPostQuestion(jobPostId, {
        questionText: trimmedText,
        orderIndex: newQuestion.orderIndex,
        isRequired: newQuestion.isRequired,
      });

      if (!response.success || !response.data) {
        setError(getQuestionErrorMessage(
          response.statusCode,
          response.message,
          'Failed to add question.'
        ));
        return;
      }

      const sorted = sortQuestions([...currentQuestions, response.data]);
      setOriginalQuestions(sorted);
      setCurrentQuestions(sorted);
      setNewQuestion({
        questionText: '',
        orderIndex: Math.max(...sorted.map(question => question.orderIndex)) + 1,
        isRequired: true,
      });
      toast.success('Question added successfully.');
    } catch (addError) {
      console.error('Failed to add question:', addError);
      setError('Failed to add question.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteQuestion = async (question: JobPostQuestionDto) => {
    if (!jobPostId || isReadOnly || deletingId) return;

    const confirmed = window.confirm('Delete this question? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setDeletingId(question.jobPostQuestionsId);
      setError('');

      const response = await jobQuestionAPI.deleteJobPostQuestion(
        jobPostId,
        question.jobPostQuestionsId
      );

      if (!response.success) {
        setError(getQuestionErrorMessage(
          response.statusCode,
          response.message,
          'Failed to delete question.'
        ));
        return;
      }

      setOriginalQuestions(prev =>
        prev.filter(item => item.jobPostQuestionsId !== question.jobPostQuestionsId)
      );
      setCurrentQuestions(prev =>
        prev.filter(item => item.jobPostQuestionsId !== question.jobPostQuestionsId)
      );
      toast.success('Question deleted successfully.');
    } catch (deleteError) {
      console.error('Failed to delete question:', deleteError);
      setError('Failed to delete question.');
    } finally {
      setDeletingId(null);
    }
  };

  const statusLabel = knownStatus === null ? 'Unknown' : statusLabels[knownStatus] || 'Unknown';

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate('/jobs/my-jobs')}
            className="btn-ghost-cyan px-4 py-2 text-xs flex items-center gap-2 mb-4"
          >
            <ArrowLeft size={14} />
            Back to My Jobs
          </button>

          <p className="post-job-header-subtitle text-sm mb-1">Client JobPost Questions</p>
          <h1 className="post-job-header text-3xl font-black text-primary">
            Manage Questions
          </h1>
          <p className="post-job-header-description mt-2">
            {locationState?.title || 'Edit screening questions for this JobPost.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {error && (
              <div className="glass-card p-4">
                <p className="text-sm text-red">{error}</p>
              </div>
            )}

            {isReadOnly && (
              <div className="glass-card p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-primary">Read-only questions</p>
                  <p className="text-xs text-secondary mt-1">
                    Only draft job posts can update questions.
                  </p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="glass-card p-12 text-center">
                <RefreshCw size={36} className="mx-auto mb-4 text-muted animate-spin" />
                <p className="text-lg font-semibold text-primary mb-2">
                  Loading questions...
                </p>
                <p className="text-sm text-secondary">
                  Please wait while we fetch the JobPost questions.
                </p>
              </div>
            ) : (
              <div className="glass-card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-primary font-semibold">
                      Questions ({currentQuestions.length})
                    </h2>
                    <p className="input-hint">
                      Save Changes sends only rows that changed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    disabled={!canSaveChanges}
                    className="btn-cyan px-4 py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <Save size={14} />
                    {saving ? 'Saving...' : `Save Changes (${changedQuestions.length})`}
                  </button>
                </div>

                {validationErrors.length > 0 && (
                  <div className="bg-red/10 border border-red/20 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-primary mb-2">
                      Fix validation errors before saving
                    </p>
                    <ul className="space-y-1 text-xs text-red">
                      {validationErrors.slice(0, 4).map(validationError => (
                        <li key={validationError}>{validationError}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentQuestions.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle size={42} className="mx-auto mb-3 text-muted opacity-40" />
                    <p className="text-primary font-semibold mb-2">No questions yet</p>
                    <p className="text-sm text-secondary">
                      Add the first question below while this JobPost is Draft.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentQuestions.map((question, index) => (
                      <div key={question.jobPostQuestionsId} className="p-4 rounded-xl glass-button border border-border">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
                          <div>
                            <label className="text-primary text-sm font-semibold block mb-2">
                              Question {index + 1}
                            </label>
                            <textarea
                              value={question.questionText}
                              onChange={event =>
                                updateCurrentQuestion(question.jobPostQuestionsId, {
                                  questionText: event.target.value,
                                })
                              }
                              disabled={isReadOnly}
                              rows={3}
                              className="input-gb w-full px-4 py-3 resize-none text-sm leading-relaxed disabled:opacity-60"
                            />
                          </div>
                          <div>
                            <label className="text-primary text-sm font-semibold block mb-2">
                              Order
                            </label>
                            <input
                              type="number"
                              value={question.orderIndex}
                              onChange={event =>
                                updateCurrentQuestion(question.jobPostQuestionsId, {
                                  orderIndex: Number(event.target.value),
                                })
                              }
                              disabled={isReadOnly}
                              className="input-gb w-full px-4 py-3 disabled:opacity-60"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                          <label className="flex items-center gap-2 text-xs text-secondary">
                            <input
                              type="checkbox"
                              checked={question.isRequired}
                              disabled={isReadOnly || updatingRequiredId === question.jobPostQuestionsId}
                              onChange={event => handleRequiredToggle(question, event.target.checked)}
                            />
                            Required answer
                          </label>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(question)}
                            disabled={isReadOnly || deletingId === question.jobPostQuestionsId}
                            className="btn-ghost-red px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                            {deletingId === question.jobPostQuestionsId ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="glass-card p-5">
              <p className="text-xs font-semibold text-muted mb-3">JOBPOST STATE</p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Status</span>
                  <span className="text-primary font-semibold">{statusLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Editable</span>
                  <span className="text-primary font-semibold">
                    {isReadOnly ? 'No' : 'Yes'}
                  </span>
                </div>
              </div>
              {knownStatus === null && (
                <p className="input-hint mt-4">
                  Status was not returned by the current JobPost list API, so updates will rely on backend validation.
                </p>
              )}
            </div>

            <div className="glass-card p-5">
              <p className="text-primary text-sm font-semibold mb-3">Add question</p>
              <div className="space-y-3">
                <textarea
                  value={newQuestion.questionText}
                  onChange={event =>
                    setNewQuestion(prev => ({ ...prev, questionText: event.target.value }))
                  }
                  disabled={isReadOnly}
                  placeholder="Enter a new question..."
                  rows={4}
                  className="input-gb w-full px-4 py-3 resize-none text-sm disabled:opacity-60"
                />
                <input
                  type="number"
                  value={newQuestion.orderIndex}
                  onChange={event =>
                    setNewQuestion(prev => ({ ...prev, orderIndex: Number(event.target.value) }))
                  }
                  disabled={isReadOnly}
                  className="input-gb w-full px-4 py-3 disabled:opacity-60"
                />
                <label className="flex items-center gap-2 text-xs text-secondary">
                  <input
                    type="checkbox"
                    checked={newQuestion.isRequired}
                    disabled={isReadOnly}
                    onChange={event =>
                      setNewQuestion(prev => ({ ...prev, isRequired: event.target.checked }))
                    }
                  />
                  Required answer
                </label>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  disabled={isReadOnly || adding}
                  className="btn-cyan w-full px-4 py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Plus size={14} />
                  {adding ? 'Adding...' : 'Add Question'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={loadQuestions}
              disabled={loading}
              className="btn-ghost-cyan w-full px-4 py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <RefreshCw size={14} />
              Refresh Questions
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
