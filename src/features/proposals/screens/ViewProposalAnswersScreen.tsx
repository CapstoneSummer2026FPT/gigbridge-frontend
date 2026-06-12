import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Save } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { proposalAnswerAPI } from '../../../api/proposalAPI/ANSWERS';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import type { ProposalAnswerDto, ProposalDetailDto } from '../../../types/models/Proposal';
import { ProposalStatus } from '../../../types/models/Proposal';
import { UserRole } from '../../../types/models/User';
import { getStatusLabel } from '../utils/statusHelpers';
import '../styles/create-proposal-screen.css';

type AnswerMap = Record<string, string>;

export default function ViewProposalAnswersScreen() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();
  const { role } = useApp();

  const [proposal, setProposal] = useState<ProposalDetailDto | null>(null);
  const [answers, setAnswers] = useState<ProposalAnswerDto[]>([]);
  const [editableAnswers, setEditableAnswers] = useState<AnswerMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const loadAnswers = async () => {
      if (!proposalId) return;

      try {
        setLoading(true);
        setError('');

        const [proposalResponse, answersResponse] = await Promise.all([
          proposalGetAPI.getProposalDetail(proposalId),
          proposalAnswerAPI.getProposalAnswers(proposalId),
        ]);

        if (!proposalResponse.success || !proposalResponse.data) {
          setError(proposalResponse.message || 'Failed to load proposal.');
          return;
        }

        if (!answersResponse.success) {
          setError(answersResponse.message || 'Failed to load proposal answers.');
          return;
        }

        const sortedAnswers = [...(answersResponse.data || [])].sort((a, b) => a.orderIndex - b.orderIndex);
        setProposal(proposalResponse.data);
        setAnswers(sortedAnswers);
        setEditableAnswers(
          sortedAnswers.reduce<AnswerMap>((accumulator, answer) => {
            accumulator[answer.jobPostQuestionsId] = answer.answerText || '';
            return accumulator;
          }, {})
        );
      } catch (loadError) {
        console.error('Failed to load proposal answers:', loadError);
        setError('Failed to load proposal answers.');
      } finally {
        setLoading(false);
      }
    };

    loadAnswers();
  }, [proposalId]);

  const canEdit = useMemo(
    () => role === UserRole.Freelancer && Number(proposal?.status) === ProposalStatus.Draft,
    [proposal?.status, role]
  );

  const validateDraftAnswers = () => {
    const unansweredRequired = answers.filter(answer =>
      answer.isRequired && !editableAnswers[answer.jobPostQuestionsId]?.trim()
    );

    if (unansweredRequired.length > 0) {
      setValidationError('Please answer all required questions before saving.');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleSaveAnswers = async () => {
    if (!proposalId || !validateDraftAnswers()) return;

    try {
      setSaving(true);
      setError('');

      const response = await proposalAnswerAPI.updateBulkProposalAnswers(proposalId, {
        answers: answers.map(answer => ({
          jobPostQuestionId: answer.jobPostQuestionsId,
          answerText: editableAnswers[answer.jobPostQuestionsId]?.trim() || null,
        })),
      });

      if (!response.success) {
        setError(response.message || 'Failed to save draft answers.');
        return;
      }

      const sortedAnswers = [...(response.data || [])].sort((a, b) => a.orderIndex - b.orderIndex);
      if (sortedAnswers.length > 0) {
        setAnswers(sortedAnswers);
      }

      toast.success('Draft answers saved successfully.');
    } catch (saveError) {
      console.error('Failed to save draft answers:', saveError);
      setError('Failed to save draft answers.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="create-proposal-page">
        <div className="create-proposal-header">
          <button className="create-proposal-back" type="button" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <p>{canEdit ? 'Edit Draft Answers' : 'Proposal Answers'}</p>
            <h1>{proposal?.jobPostTitle || 'Proposal Questions'}</h1>
          </div>
        </div>

        <section className="create-proposal-form glass-card">
          <div className="create-proposal-form-title">
            <FileText size={18} />
            <div>
              <h2>Question Answers</h2>
              <p>
                {proposal
                  ? `${getStatusLabel(proposal.status)} proposal`
                  : 'Loading proposal status...'}
              </p>
            </div>
          </div>

          {loading && <div className="create-proposal-loading">Loading answers...</div>}
          {error && <div className="create-proposal-alert">{error}</div>}
          {validationError && <div className="create-proposal-alert">{validationError}</div>}

          {!loading && answers.length === 0 && (
            <div className="proposal-answer-empty">
              <FileText size={30} />
              <p>No answers are available for this proposal.</p>
            </div>
          )}

          {!loading && answers.length > 0 && (
            <div className="proposal-answer-list">
              {answers.map((answer, index) => (
                <div key={answer.jobPostQuestionsId} className="proposal-answer-question-card">
                  <span>
                    Question {index + 1}
                    {answer.isRequired ? <em>Required</em> : <i>Optional</i>}
                  </span>
                  <strong>{answer.questionText}</strong>

                  {canEdit ? (
                    <>
                      <textarea
                        value={editableAnswers[answer.jobPostQuestionsId] || ''}
                        onChange={event => {
                          setEditableAnswers(prev => ({
                            ...prev,
                            [answer.jobPostQuestionsId]: event.target.value,
                          }));
                          setValidationError('');
                        }}
                        className="input-gb"
                        rows={5}
                        maxLength={4000}
                        disabled={saving}
                      />
                      <small>{(editableAnswers[answer.jobPostQuestionsId] || '').length}/4000 characters</small>
                    </>
                  ) : (
                    <p className="proposal-answer-readonly">
                      {answer.answerText?.trim() || 'No answer provided.'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="create-proposal-actions">
            <button type="button" className="create-proposal-secondary" onClick={() => navigate('/proposals')}>
              Back to Proposals
            </button>
            {canEdit && (
              <button
                type="button"
                className="btn-cyan create-proposal-submit"
                onClick={handleSaveAnswers}
                disabled={saving}
              >
                <Save size={15} />
                {saving ? 'Saving...' : 'Save Draft Answers'}
              </button>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
