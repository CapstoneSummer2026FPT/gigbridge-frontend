import { Edit3, FileQuestion, FileText, X } from 'lucide-react';
import type { UseProposalAnswersModalReturn } from '../hooks/useProposalAnswersModal';
import { canEditProposal, getStatusLabel } from '../utils/statusHelpers';
import { useTranslation } from '../../../hooks/useTranslation';

interface ProposalAnswersModalProps {
  modalState: UseProposalAnswersModalReturn;
}

export function ProposalAnswersModal({ modalState }: ProposalAnswersModalProps) {
  const { t } = useTranslation();
  const { isOpen, modalInfo, answers, loading, error, closeModal, handleEditAnswers } = modalState;

  if (!isOpen || !modalInfo) return null;

  const canEdit = modalInfo.proposalStatus !== undefined && canEditProposal(modalInfo.proposalStatus);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-[640px] max-h-[90dvh] sm:max-h-[85vh] rounded-2xl sm:rounded-3xl bg-card border border-border shadow-2xl p-4 sm:p-7 relative flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={closeModal}
          className="absolute top-3 sm:top-5 right-3 sm:right-5 h-8 w-8 rounded-xl bg-surface-muted/60 border border-border text-text-muted hover:text-text-primary hover:bg-surface-muted flex items-center justify-center cursor-pointer transition z-10"
        >
          <X size={16} />
        </button>

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5 pr-10 sm:pr-12">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-text-primary truncate">
              {t('proposalAnswers.title', { defaultValue: 'Câu trả lời câu hỏi sàng lọc' })}
            </h3>
            <p className="text-[11px] sm:text-xs text-text-muted font-semibold truncate">
              {modalInfo.jobTitle || t('proposalAnswers.proposal', { defaultValue: 'Đề xuất' })} ·{' '}
              {modalInfo.proposalStatus !== undefined ? getStatusLabel(modalInfo.proposalStatus) : ''}
            </p>
          </div>
        </div>

        {/* CONTENT BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-3">
          {loading ? (
            <div className="py-8 text-center text-text-muted text-xs sm:text-sm font-semibold animate-pulse">
              {t('proposalAnswers.loadingAnswers', { defaultValue: 'Đang tải danh sách câu trả lời...' })}
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs sm:text-sm font-semibold">
              {error}
            </div>
          ) : answers.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-2xl border border-border bg-surface-muted">
              <FileQuestion size={32} className="opacity-40 mx-auto mb-2 text-text-muted" />
              <p className="text-xs sm:text-sm text-text-muted font-semibold">
                {t('proposalAnswers.noAnswers', { defaultValue: 'Không có câu trả lời nào được tìm thấy.' })}
              </p>
            </div>
          ) : (
            answers.map(answer => (
              <div key={answer.jobPostQuestionsId} className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-surface-muted/30 space-y-2">
                <div className="flex items-start justify-between gap-2.5">
                  <h4 className="text-xs sm:text-sm font-extrabold text-text-primary leading-snug break-all [overflow-wrap:anywhere]">
                    {answer.orderIndex}. {answer.questionText}
                  </h4>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                    answer.isRequired
                      ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      : 'bg-surface-muted text-text-muted border border-border'
                  }`}>
                    {t(answer.isRequired ? 'proposalAnswers.required' : 'proposalAnswers.optional', { defaultValue: answer.isRequired ? 'Bắt buộc' : 'Tùy chọn' })}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-medium break-all [overflow-wrap:anywhere]">
                  {answer.answerText?.trim() || t('proposalAnswers.noAnswerProvided', { defaultValue: 'Chưa có câu trả lời.' })}
                </p>
              </div>
            ))
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-border">
          {canEdit && modalInfo.jobPostId && (
            <button
              type="button"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-white bg-brand hover:bg-brand-hover transition cursor-pointer"
              onClick={handleEditAnswers}
            >
              <Edit3 size={14} />
              <span>{t('proposalAnswers.editAnswers', { defaultValue: 'Chỉnh sửa câu trả lời' })}</span>
            </button>
          )}
          <button
            type="button"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-text-primary hover:bg-surface-muted transition cursor-pointer"
            onClick={closeModal}
          >
            {t('proposalAnswers.close', { defaultValue: 'Đóng' })}
          </button>
        </div>

      </div>
    </div>
  );
}
