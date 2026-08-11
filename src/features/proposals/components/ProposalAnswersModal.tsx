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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(10, 10, 15, 0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={closeModal}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '85vh',
          borderRadius: 24,
          background: 'var(--card, #ffffff)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
          padding: 28,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={closeModal}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingRight: 40 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(73,75,231,0.1)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              {t('proposalAnswers.title', { defaultValue: 'Câu trả lời câu hỏi sàng lọc' })}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
              {modalInfo.jobTitle || t('proposalAnswers.proposal', { defaultValue: 'Đề xuất' })} ·{' '}
              {modalInfo.proposalStatus !== undefined ? getStatusLabel(modalInfo.proposalStatus) : ''}
            </span>
          </div>
        </div>

        {/* CONTENT BODY */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }} className="animate-pulse">
              {t('proposalAnswers.loadingAnswers', { defaultValue: 'Đang tải danh sách câu trả lời...' })}
            </div>
          ) : error ? (
            <div style={{ padding: 16, borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          ) : answers.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface-muted)' }}>
              <FileQuestion size={32} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>
                {t('proposalAnswers.noAnswers', { defaultValue: 'Không có câu trả lời nào được tìm thấy.' })}
              </p>
            </div>
          ) : (
            answers.map(answer => (
              <div key={answer.jobPostQuestionsId} style={{ padding: 16, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface-muted, rgba(0,0,0,0.02))' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                    {answer.orderIndex}. {answer.questionText}
                  </h4>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, flexShrink: 0, background: answer.isRequired ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.1)', color: answer.isRequired ? '#ef4444' : 'var(--text-muted)', border: answer.isRequired ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--border)' }}>
                    {t(answer.isRequired ? 'proposalAnswers.required' : 'proposalAnswers.optional', { defaultValue: answer.isRequired ? 'Bắt buộc' : 'Tùy chọn' })}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                  {answer.answerText?.trim() || t('proposalAnswers.noAnswerProvided', { defaultValue: 'Chưa có câu trả lời.' })}
                </p>
              </div>
            ))
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--border)' }}>
          {canEdit && modalInfo.jobPostId && (
            <button
              type="button"
              className="cp-btn"
              onClick={handleEditAnswers}
              style={{ padding: '10px 18px', fontSize: 13 }}
            >
              <Edit3 size={15} />
              {t('proposalAnswers.editAnswers', { defaultValue: 'Chỉnh sửa câu trả lời' })}
            </button>
          )}
          <button
            type="button"
            className="cp-btn ghost"
            onClick={closeModal}
            style={{ padding: '10px 18px', fontSize: 13 }}
          >
            {t('proposalAnswers.close', { defaultValue: 'Đóng' })}
          </button>
        </div>

      </div>
    </div>
  );
}
