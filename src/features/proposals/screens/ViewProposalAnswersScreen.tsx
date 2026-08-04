import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Edit3, FileQuestion } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import type { ProposalAnswerDto, ProposalDetailDto } from '../../../types/models/Proposal';
import { canEditProposal, getStatusLabel } from '../utils/statusHelpers';
import { useTranslation } from '../../../hooks/useTranslation';

export default function ViewProposalAnswersScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { proposalId } = useParams<{ proposalId: string }>();
  const [proposal, setProposal] = useState<ProposalDetailDto | null>(null);
  const [answers, setAnswers] = useState<ProposalAnswerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sortedAnswers = useMemo(
    () => [...answers].sort((a, b) => a.orderIndex - b.orderIndex),
    [answers]
  );

  useEffect(() => {
    const load = async () => {
      if (!proposalId) {
        setError(t('proposalAnswers.proposalIdMissing'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const [proposalResponse, answersResponse] = await Promise.all([
          proposalGetAPI.getProposalDetail(proposalId),
          proposalGetAPI.getProposalAnswers(proposalId),
        ]);

        if (!proposalResponse.success || !proposalResponse.data) {
          setError(proposalResponse.message || t('proposalAnswers.proposalLoadFailed'));
          return;
        }

        setProposal(proposalResponse.data);

        if (!answersResponse.success) {
          setError(answersResponse.message || t('proposalAnswers.answersLoadFailed'));
          return;
        }

        setAnswers(answersResponse.data || []);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [proposalId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-16 text-center text-muted-foreground">{t('proposalAnswers.loadingAnswers')}</div>
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
          {t('proposalAnswers.back')}
        </button>

        <div className="glass-card p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">{t('proposalAnswers.title')}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {proposal?.jobPostTitle || t('proposalAnswers.proposal')} · {proposal ? getStatusLabel(proposal.status) : t('proposalAnswers.unknown')}
              </p>
            </div>

            {proposal && proposalId && canEditProposal(proposal.status) && (
              <button
                type="button"
                onClick={() => navigate(`/proposals/create/${proposal.jobPostId}/questions`, {
                  state: { proposalId, jobPostId: proposal.jobPostId },
                })}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/20"
              >
                <Edit3 size={15} />
                {t('proposalAnswers.editAnswers')}
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {sortedAnswers.length === 0 ? (
            <div className="rounded-lg border border-border bg-background p-6 text-center text-sm text-muted-foreground">
              <FileQuestion size={30} className="mx-auto mb-2 opacity-40" />
              {t('proposalAnswers.noAnswers')}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedAnswers.map(answer => (
                <div key={answer.jobPostQuestionsId} className="rounded-xl border border-border bg-background p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h2 className="text-sm font-bold text-foreground">
                      {answer.orderIndex}. {answer.questionText}
                    </h2>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${answer.isRequired ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'}`}>
                      {t(answer.isRequired ? 'proposalAnswers.required' : 'proposalAnswers.optional')}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {answer.answerText?.trim() || t('proposalAnswers.noAnswerProvided')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
