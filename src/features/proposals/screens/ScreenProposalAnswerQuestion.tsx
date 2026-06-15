import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { ProposalStatus, type ProposalAnswerDto } from '../../../types/models/Proposal';
import type { JobPostQuestionDto } from '../../../types/models/Job';

type AnswerRouteState = {
  proposalId?: string;
  jobPostId?: string;
};

export default function ScreenProposalAnswerQuestion() {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobPostId: routeJobPostId } = useParams<{ jobPostId: string }>();
  const routeState = (location.state || {}) as AnswerRouteState;
  const search = new URLSearchParams(location.search);

  const proposalId = routeState.proposalId || search.get('proposalId') || '';
  const jobPostId = routeState.jobPostId || routeJobPostId || '';

  const [questions, setQuestions] = useState<JobPostQuestionDto[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.orderIndex - b.orderIndex),
    [questions]
  );

  useEffect(() => {
    const load = async () => {
      if (!proposalId || !jobPostId) {
        setError('Proposal or JobPost id is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const [questionsResponse, answersResponse] = await Promise.all([
          jobGetAPI.getJobPostQuestions(jobPostId),
          proposalGetAPI.getProposalAnswers(proposalId),
        ]);

        if (!questionsResponse.success) {
          setError(questionsResponse.message || 'Questions could not be loaded.');
          return;
        }

        const loadedQuestions = questionsResponse.data || [];
        setQuestions(loadedQuestions);

        const answerMap: Record<string, string> = {};
        if (answersResponse.success && answersResponse.data) {
          answersResponse.data.forEach((answer: ProposalAnswerDto) => {
            answerMap[answer.jobPostQuestionsId] = answer.answerText || '';
          });
        }
        loadedQuestions.forEach(question => {
          answerMap[question.jobPostQuestionsId] = answerMap[question.jobPostQuestionsId] || '';
        });
        setAnswers(answerMap);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [proposalId, jobPostId]);

  const validate = (requireAllRequired: boolean) => {
    for (const question of sortedQuestions) {
      const value = answers[question.jobPostQuestionsId] || '';
      if (value.length > 4000) {
        return 'Answers must not exceed 4000 characters.';
      }
      if (requireAllRequired && question.isRequired && !value.trim()) {
        return `Answer is required for question ${question.orderIndex}.`;
      }
    }
    return '';
  };

  const saveAnswers = async (submit: boolean) => {
    const validationMessage = validate(submit);
    if (validationMessage) {
      setError(validationMessage);
      return false;
    }

    const payloadAnswers = sortedQuestions
      .filter(question => {
        if (submit) return true;
        return Boolean((answers[question.jobPostQuestionsId] || '').trim());
      })
      .map(question => ({
        jobPostQuestionId: question.jobPostQuestionsId,
        answerText: answers[question.jobPostQuestionsId] || '',
      }));

    if (payloadAnswers.length === 0) {
      return true;
    }

    const response = await proposalPatchAPI.updateBulkProposalAnswers(proposalId, {
      answers: payloadAnswers,
    });

    if (!response.success) {
      setError(response.message || 'Answers could not be saved.');
      return false;
    }

    return true;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    const saved = await saveAnswers(false);
    setSaving(false);
    if (saved) {
      navigate('/proposals');
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    const saved = await saveAnswers(true);
    if (!saved) {
      setSaving(false);
      return;
    }

    const statusResponse = await proposalPatchAPI.updateProposalStatus(proposalId, {
      status: ProposalStatus.Pending,
    });

    setSaving(false);
    if (!statusResponse.success) {
      setError(statusResponse.message || 'Answers were saved, but proposal could not be submitted.');
      return;
    }

    navigate('/proposals');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-16 text-center text-muted-foreground">Loading questions...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="glass-card p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-primary">JobPost Questions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Save answers as draft or submit your proposal when required answers are complete.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {sortedQuestions.length === 0 ? (
            <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              This JobPost has no questions.
            </div>
          ) : (
            <div className="space-y-5">
              {sortedQuestions.map(question => (
                <label key={question.jobPostQuestionsId} className="block">
                  <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-foreground">
                    <span>
                      {question.orderIndex}. {question.questionText}
                    </span>
                    {question.isRequired && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500">
                        Required
                      </span>
                    )}
                  </span>
                  <textarea
                    rows={5}
                    value={answers[question.jobPostQuestionsId] || ''}
                    onChange={event => setAnswers(prev => ({
                      ...prev,
                      [question.jobPostQuestionsId]: event.target.value,
                    }))}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]"
                    placeholder="Write your answer..."
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {(answers[question.jobPostQuestionsId] || '').length}/4000 characters
                  </span>
                </label>
              ))}

              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted/20 disabled:opacity-60"
                >
                  <Save size={16} />
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="btn-cyan inline-flex items-center gap-2 px-5 py-2.5 text-sm"
                >
                  <Send size={16} />
                  Submit Proposal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
