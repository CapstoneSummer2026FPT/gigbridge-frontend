import { useState } from 'react';
import { useNavigate } from 'react-router';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import type { ProposalAnswerDto } from '../../../types/models/Proposal';
import { useTranslation } from '../../../hooks/useTranslation';

export interface ProposalAnswersModalInfo {
  proposalId: string;
  jobPostId?: string;
  jobTitle?: string;
  proposalStatus?: number;
}

export function useProposalAnswersModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [modalInfo, setModalInfo] = useState<ProposalAnswersModalInfo | null>(null);
  const [answers, setAnswers] = useState<ProposalAnswerDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openModal = async (
    proposalId: string,
    jobTitle?: string,
    proposalStatus?: number,
    jobPostId?: string
  ) => {
    if (!proposalId) return;

    setModalInfo({ proposalId, jobTitle, proposalStatus, jobPostId });
    setIsOpen(true);
    setLoading(true);
    setError('');

    try {
      const response = await proposalGetAPI.getProposalAnswers(proposalId);
      if (response.success && response.data) {
        setAnswers([...response.data].sort((a, b) => a.orderIndex - b.orderIndex));
      } else {
        setError(
          response.message ||
            t('proposalAnswers.answersLoadFailed', {
              defaultValue: 'Không thể tải danh sách câu trả lời.',
            })
        );
      }
    } catch {
      setError(
        t('proposalAnswers.answersLoadFailed', {
          defaultValue: 'Không thể tải danh sách câu trả lời.',
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setModalInfo(null);
    setAnswers([]);
    setError('');
  };

  const handleEditAnswers = () => {
    if (!modalInfo?.proposalId || !modalInfo?.jobPostId) return;
    closeModal();
    navigate(`/proposals/create/${modalInfo.jobPostId}/questions`, {
      state: { proposalId: modalInfo.proposalId, jobPostId: modalInfo.jobPostId },
    });
  };

  return {
    isOpen,
    modalInfo,
    answers,
    loading,
    error,
    openModal,
    closeModal,
    handleEditAnswers,
  };
}

export type UseProposalAnswersModalReturn = ReturnType<typeof useProposalAnswersModal>;
