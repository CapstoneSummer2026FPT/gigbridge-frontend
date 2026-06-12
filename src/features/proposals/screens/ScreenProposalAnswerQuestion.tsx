import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, FileText, HelpCircle, Save } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobQuestionAPI } from '../../../api/jobAPI';
import { proposalAnswerAPI } from '../../../api/proposalAPI/ANSWERS';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import { proposalPutAPI } from '../../../api/proposalAPI/PUT';
import type { JobPostQuestionDto } from '../../../types/models/Job';
import { ProposalStatus } from '../../../types/models/Proposal';
import { buildProposalPayload, type ProposalAnswerFlowState } from '../utils/proposalDraft';
import '../styles/create-proposal-screen.css';

type AnswerMap = Record<string, string>;

const getQuestionId = (question: JobPostQuestionDto) => question.jobPostQuestionsId;

export default function ScreenProposalAnswerQuestion() {
  const { jobPostId } = useParams<{ jobPostId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const flowState = location.state as ProposalAnswerFlowState | null;

  const [questions, setQuestions] = useState<JobPostQuestionDto[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const currentJobPostId = jobPostId || flowState?.jobPostId || '';

  useEffect(() => {
    const loadQuestions = async () => {
      if (!currentJobPostId) return;

      try {
        setLoading(true);
        setError('');

        const response = await jobQuestionAPI.getJobPostQuestions(currentJobPostId);

        if (!response.success) {
          setError(response.message || 'Failed to load JobPost questions.');
          setQuestions([]);
          return;
        }

        const sortedQuestions = [...(response.data || [])].sort((a, b) => a.orderIndex - b.orderIndex);
        setQuestions(sortedQuestions);
        setAnswers(
          sortedQuestions.reduce<AnswerMap>((accumulator, question) => {
            accumulator[getQuestionId(question)] = '';
            return accumulator;
          }, {})
        );
      } catch (loadError) {
        console.error('Failed to load JobPost questions:', loadError);
        setError('Failed to load JobPost questions.');
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [currentJobPostId]);

  const requiredQuestionCount = useMemo(
    () => questions.filter(question => question.isRequired).length,
    [questions]
  );

  const validateRequiredAnswers = () => {
    const unansweredRequired = questions.filter(question =>
      question.isRequired && !answers[getQuestionId(question)]?.trim()
    );

    if (unansweredRequired.length > 0) {
      setValidationError('Please answer all required questions before submitting.');
      return false;
    }

    setValidationError('');
    return true;
  };

  const saveProposal = async (status: ProposalStatus) => {
    if (!flowState?.form || !currentJobPostId) {
      throw new Error('Proposal form data is missing. Please start the proposal again.');
    }

    const payload = buildProposalPayload(currentJobPostId, flowState.form);

    if (flowState.proposalId) {
      const response = await proposalPutAPI.updateProposal(flowState.proposalId, {
        coverLetter: payload.coverLetter,
        proposedBudget: payload.proposedBudget,
        proposedDuration: payload.proposedDuration,
        status,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to update proposal.');
      }

      return flowState.proposalId;
    }

    const response = await proposalPostAPI.createProposal(payload);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create proposal.');
    }

    return response.data;
  };

  const saveAnswers = async (proposalId: string) => {
    const response = await proposalAnswerAPI.updateBulkProposalAnswers(proposalId, {
      answers: questions.map(question => ({
        jobPostQuestionId: getQuestionId(question),
        answerText: answers[getQuestionId(question)]?.trim() || null,
      })),
    });

    if (!response.success) {
      throw new Error(response.message || 'Proposal was saved, but answers could not be saved.');
    }
  };

  const handleSaveDraft = async () => {
    setError('');
    setValidationError('');

    try {
      setSaving(true);
      const proposalId = await saveProposal(ProposalStatus.Draft);
      await saveAnswers(proposalId);
      toast.success('Proposal draft saved successfully.');
      navigate('/proposals', {
        state: { successMessage: 'Proposal draft saved successfully.' },
      });
    } catch (saveError) {
      console.error('Failed to save proposal draft answers:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to save proposal draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitProposal = async () => {
    setError('');
    if (!validateRequiredAnswers()) return;

    try {
      setSubmitting(true);
      const proposalId = await saveProposal(ProposalStatus.Pending);
      await saveAnswers(proposalId);
      toast.success('Proposal submitted successfully.');
      navigate('/proposals', {
        state: { successMessage: 'Proposal submitted successfully.' },
      });
    } catch (submitError) {
      console.error('Failed to submit proposal answers:', submitError);
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!flowState?.form || !currentJobPostId) {
    return <Navigate to={currentJobPostId ? `/proposals/create/${currentJobPostId}` : '/jobs/browse'} replace />;
  }

  return (
    <AppLayout>
      <div className="create-proposal-page">
        <div className="create-proposal-header">
          <button className="create-proposal-back" type="button" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <p>Proposal Questions</p>
            <h1>Answer JobPost Questions</h1>
          </div>
        </div>

        <div className="create-proposal-layout">
          <section className="create-proposal-form glass-card">
            <div className="create-proposal-form-title">
              <HelpCircle size={18} />
              <div>
                <h2>Question Answers</h2>
                <p>Required questions must be answered before submitting. Drafts can be saved anytime.</p>
              </div>
            </div>

            {loading && <div className="create-proposal-loading">Loading questions...</div>}
            {error && <div className="create-proposal-alert">{error}</div>}
            {validationError && <div className="create-proposal-alert">{validationError}</div>}

            {!loading && questions.length === 0 && (
              <div className="proposal-answer-empty">
                <FileText size={30} />
                <p>No JobPost questions were found.</p>
              </div>
            )}

            {!loading && questions.length > 0 && (
              <div className="proposal-answer-list">
                {questions.map((question, index) => {
                  const questionId = getQuestionId(question);

                  return (
                    <label key={questionId} className="proposal-answer-question-card">
                      <span>
                        Question {index + 1}
                        {question.isRequired ? <em>Required</em> : <i>Optional</i>}
                      </span>
                      <strong>{question.questionText}</strong>
                      <textarea
                        value={answers[questionId] || ''}
                        onChange={event => {
                          setAnswers(prev => ({ ...prev, [questionId]: event.target.value }));
                          setValidationError('');
                        }}
                        placeholder="Write your answer..."
                        className="input-gb"
                        rows={5}
                        maxLength={4000}
                        disabled={saving || submitting}
                      />
                      <small>{(answers[questionId] || '').length}/4000 characters</small>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="create-proposal-actions">
              <button
                type="button"
                className="create-proposal-secondary"
                onClick={() => navigate(`/proposals/create/${currentJobPostId}`)}
                disabled={saving || submitting}
              >
                Back
              </button>
              <button
                type="button"
                className="create-proposal-secondary"
                onClick={handleSaveDraft}
                disabled={loading || saving || submitting}
              >
                <Save size={15} />
                {saving ? 'Saving Draft...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                className="btn-cyan create-proposal-submit"
                onClick={handleSubmitProposal}
                disabled={loading || saving || submitting}
              >
                <CheckCircle size={15} />
                {submitting ? 'Submitting...' : 'Submit Proposal'}
              </button>
            </div>
          </section>

          <aside className="create-proposal-summary glass-card">
            <div className="create-proposal-summary-title">
              <FileText size={18} />
              <h2>Answer Summary</h2>
            </div>
            <div className="create-proposal-summary-row">
              <span>Total questions</span>
              <strong>{questions.length}</strong>
            </div>
            <div className="create-proposal-summary-row">
              <span>Required</span>
              <strong>{requiredQuestionCount}</strong>
            </div>
            <div className="create-proposal-summary-row">
              <span>Answered</span>
              <strong>{Object.values(answers).filter(answer => answer.trim()).length}</strong>
            </div>
            <p className="proposal-answer-note">
              Save as Draft keeps the proposal editable. Submit Proposal sends it as Pending.
            </p>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
