import {
  Brain,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  FileQuestion,
  FileText,
  Layers,
  MessageSquare,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { formatGigCoin, formatGigCoinToVnd } from '../../../shared/utils/gigcoin';
import {
  ProposalStatus,
  type ProposalAnswerDto,
  type ProposalDetailDto,
  type ProposalDto,
  type VettingEvaluationResponseDto,
  type ProposalMilestonePlanDto,
  type GradedQuestionDto,
} from '../../../types/models/Proposal';
import { AIProposalVerdictCard } from './AIProposalVerdictCard';
import { AISideBySideMilestoneMatrix } from './AISideBySideMilestoneMatrix';
import type { BusyAction } from '../hooks/useClientProposals';
import { getStatusLabel } from '../utils/statusHelpers';

export interface ProposalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeId: string | null;
  detail: ProposalDetailDto | null;
  detailLoading: boolean;
  detailError: string | null;
  proposals: ProposalDto[];
  detailMilestoneTotal: number;
  modalTab: 'userAnswers' | 'proposalDetails' | 'aiReport';
  setModalTab: (tab: 'userAnswers' | 'proposalDetails' | 'aiReport') => void;
  evalLoading: boolean;
  evalError: string | null;
  evalResult: VettingEvaluationResponseDto | null;
  rawAnswers: ProposalAnswerDto[];
  rejectProposalId: string | null;
  setRejectProposalId: (id: string | null) => void;
  selectedJobCanNegotiate: boolean;
  canClientAct: (status?: number) => boolean;
  isBusy: (id: string, action: BusyAction) => boolean;
  updateStatus: (id: string, status: ProposalStatus, actionKey: BusyAction) => void;
  acceptForNegotiation: (id: string) => void;
  openNegotiation: (id: string) => void;
  badgeClass: (status: number) => string;
  t: (key: string, options?: any) => string;
  showAiReportTab?: boolean;
}

const getScoreColorClass = (score?: number | null) => {
  if (typeof score !== 'number') return 'border-border text-text-muted bg-surface-muted';
  if (score >= 80) return 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 font-black';
  if (score >= 60) return 'border-amber-500/40 text-amber-600 bg-amber-500/10 dark:text-amber-400 font-black';
  return 'border-rose-500/40 text-rose-600 bg-rose-500/10 dark:text-rose-400 font-black';
};

const renderDetailSection = (title: string, text?: string | null) => {
  if (!text || !text.trim()) return null;
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-card/60 p-4.5 space-y-2 shadow-2xs">
      <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-brand" />
        {title}
      </h4>
      <p className="text-xs text-text-primary leading-relaxed font-medium whitespace-pre-wrap">{text.trim()}</p>
    </div>
  );
};

export function ProposalDetailModal({
  isOpen,
  onClose,
  activeId,
  detail,
  detailLoading,
  detailError,
  proposals,
  detailMilestoneTotal: _detailMilestoneTotal,
  modalTab,
  setModalTab,
  evalLoading,
  evalError,
  evalResult,
  rawAnswers,
  rejectProposalId,
  setRejectProposalId,
  selectedJobCanNegotiate,
  canClientAct,
  isBusy,
  updateStatus,
  acceptForNegotiation,
  openNegotiation,
  badgeClass,
  t,
  showAiReportTab = true,
}: ProposalDetailModalProps) {
  if (!isOpen) return null;

  const activeProposal = proposals.find(p => p.proposalsId === activeId);
  const currentStatus = Number(detail?.status ?? activeProposal?.status);
  const freelancerName = detail?.freelancerName || activeProposal?.freelancerName || 'Freelancer';
  const freelancerUserId = detail?.freelancerUserId || activeProposal?.freelancerUserId;
  const proposedBudget = detail?.proposedBudget || activeProposal?.proposedBudget || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-review-title"
      onClick={e => {
        if (e.target === e.currentTarget && !rejectProposalId) onClose();
      }}
    >
      {/* Decorative ambient background blobs */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full blur-[120px] opacity-20 pointer-events-none bg-brand/30" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full blur-[150px] opacity-15 pointer-events-none bg-text-muted/20" />

      {/* Main Dialog Container matching Review Dialog style */}
      <div
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-6xl h-[88vh] max-h-[820px] min-h-[600px] rounded-[2rem] overflow-hidden flex flex-col lg:flex-row shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-border/50 bg-background/95 backdrop-blur-xl transition-all"
      >
        {/* ═══ LEFT COLUMN: Candidate Hero & Proposal Context (Matching Review Dialog) ═══════════ */}
        <div className="w-full lg:w-1/3 p-6 lg:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border/40 bg-surface-muted/40 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none" />

          {/* Top Header Eyebrow */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[11px] font-black uppercase tracking-widest mb-3">
              <Sparkles size={13} />
              Proposal Review
            </div>
            <h1 id="proposal-review-title" className="text-xl font-black text-text-primary tracking-tight">
              Candidate Evaluation
            </h1>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Review candidate offer details, screening answers & AI assessment.
            </p>
          </div>

          {/* Candidate Avatar Hero Section - Enlarged centered avatar with ambient glow */}
          <div className="relative z-10 flex flex-col items-center my-6 text-center">
            <div className="relative mb-4 flex-shrink-0 flex items-center justify-center">
              <div className="absolute -inset-4 rounded-full bg-brand/25 blur-2xl animate-pulse pointer-events-none" />
              <UserAvatar
                name={freelancerName}
                userId={freelancerUserId}
                size="xl"
                className="!w-32 !h-32 !text-4xl shadow-2xl relative z-10 ring-4 ring-brand/20"
              />
            </div>

            <h2 className="text-xl font-black text-text-primary tracking-tight">{freelancerName}</h2>
            <span className={`inline-flex rounded-full px-3.5 py-0.5 text-xs font-black mt-2 ${badgeClass(currentStatus)}`}>
              {getStatusLabel(currentStatus)}
            </span>
          </div>

          {/* Offer Summary Details Card */}
          <div className="relative z-10 rounded-2xl border border-border/60 bg-surface-card p-4 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand">
              <BriefcaseBusiness size={13} />
              Offer Breakdown
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-surface-muted/60 p-3 rounded-xl border border-border/40 text-center">
                <span className="block text-[10px] font-black uppercase text-text-muted">Giá đề xuất</span>
                <strong className="text-brand font-black text-base block mt-0.5">{formatGigCoin(proposedBudget)}</strong>
                <span className="block text-[11px] font-bold text-text-primary mt-0.5">≈ {formatGigCoinToVnd(proposedBudget)}</span>
              </div>
              <div className="bg-surface-muted/60 p-3 rounded-xl border border-border/40 text-center flex flex-col justify-center">
                <span className="block text-[10px] font-black uppercase text-text-muted">Thời gian</span>
                <strong className="text-text-primary font-black text-sm block mt-0.5">{detail?.proposedDuration || activeProposal?.proposedDuration || '—'}</strong>
              </div>
            </div>

            <p className="text-[10px] font-semibold text-text-muted text-center pt-1 border-t border-border/40">
              (1 G-coin = 1.000 VNĐ)
            </p>
          </div>

          {/* Close button (mobile) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-5 right-5 lg:hidden p-1.5 rounded-xl border border-border bg-background text-text-muted hover:text-text-primary cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ═══ RIGHT COLUMN: Interactive Tab Content & Actions ═════════ */}
        <div className="w-full lg:w-2/3 p-6 lg:p-8 bg-background flex flex-col justify-between relative min-w-0">
          {/* Desktop Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="hidden lg:flex absolute top-5 right-5 p-1.5 rounded-xl border border-border hover:bg-surface-muted text-text-muted hover:text-text-primary transition cursor-pointer"
          >
            <X size={16} />
          </button>

          {/* Top Segmented Tab Switcher Navigation (1. Proposal | 2. Q&A | 3. AI Report) */}
          <div className="flex items-center rounded-2xl border border-border/80 bg-surface-muted/60 p-1 text-xs font-bold shadow-xs shrink-0 max-w-md">
            <button
              type="button"
              onClick={() => setModalTab('proposalDetails')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 font-black transition-all cursor-pointer ${
                modalTab === 'proposalDetails'
                  ? 'bg-brand text-white shadow-md'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <FileText size={14} /> Proposal
            </button>
            <button
              type="button"
              onClick={() => setModalTab('userAnswers')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 font-black transition-all cursor-pointer ${
                modalTab === 'userAnswers'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <FileQuestion size={14} /> Q&A
            </button>
            {showAiReportTab && (
              <button
                type="button"
                onClick={() => setModalTab('aiReport')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 font-black transition-all cursor-pointer ${
                  modalTab === 'aiReport'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Brain size={14} /> AI Report
              </button>
            )}
          </div>

          {/* Tab Content Box (Fixed Height Scrollable Content Area) */}
          <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-4 custom-scrollbar min-h-0">
            {/* TAB 1: PROPOSAL DETAILS */}
            {modalTab === 'proposalDetails' && (
              <div className="space-y-4">
                {detailLoading ? (
                  <div className="py-20 text-center text-xs text-text-muted">
                    <LemniscateBloomLoader label="Đang tải chi tiết proposal..." size={48} />
                  </div>
                ) : detailError ? (
                  <div role="alert" className="py-12 text-center text-xs font-bold text-rose-600 dark:text-rose-400">{detailError}</div>
                ) : !detail ? (
                  <div className="py-12 text-center text-xs font-semibold text-text-muted">Không có thông tin proposal.</div>
                ) : (
                  <>
                    {renderDetailSection('Giới thiệu & Tổng quan', detail.coverLetter)}
                    {renderDetailSection('Phân tích vấn đề', detail.analysisSummary)}
                    {renderDetailSection('Giải pháp & Hướng tiếp cận kỹ thuật', detail.solutionApproach)}
                    {renderDetailSection('Sản phẩm bàn giao', detail.deliverables)}
                    {renderDetailSection('Giả định dự án', detail.assumptions)}
                    {renderDetailSection('Các hạng mục ngoài phạm vi', detail.outOfScope)}

                    <section className="space-y-3 pt-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                        <Layers size={14} className="text-brand" />
                        Kế hoạch Milestone đề xuất
                      </h4>
                      <div className="space-y-3">
                        {detail.milestonePlans?.length ? detail.milestonePlans.map((item: ProposalMilestonePlanDto, index: number) => (
                          <div key={item.id || index} className="rounded-2xl border border-border/80 bg-surface-card/60 p-4 text-xs space-y-3 shadow-2xs">
                            <div className="flex justify-between items-center gap-3 border-b border-border/60 pb-2">
                              <strong className="text-xs font-bold text-text-primary">{index + 1}. {item.title || 'Mốc chưa đặt tên'}</strong>
                              <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">{formatGigCoin(item.amount)}</span>
                            </div>
                            {item.estimatedDuration && (
                              <div className="text-xs text-text-muted">
                                <strong>Thời gian:</strong> {item.estimatedDuration}
                              </div>
                            )}
                            {item.dueDate && (
                              <div className="text-xs text-text-muted">
                                <strong>Hạn hoàn thành:</strong> {item.dueDate}
                              </div>
                            )}
                            {item.description && (
                              <div className="space-y-1">
                                <span className="block text-[10px] font-black uppercase text-text-muted tracking-wider">Mô tả</span>
                                <p className="leading-relaxed whitespace-pre-wrap bg-surface-muted/40 p-3 rounded-xl border border-border/50 text-text-primary">{item.description}</p>
                              </div>
                            )}
                          </div>
                        )) : <p className="text-xs text-text-muted italic">Proposal không kèm kế hoạch milestone cụ thể.</p>}
                      </div>
                    </section>
                  </>
                )}
              </div>
            )}

            {/* TAB 2: INTERVIEW ANSWERS (Q&A) */}
            {modalTab === 'userAnswers' && (
              <>
                {evalLoading && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <LemniscateBloomLoader label="Đang tải câu trả lời phỏng vấn..." size={48} />
                  </div>
                )}

                {!evalLoading && (
                  rawAnswers.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <h4 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                          <FileQuestion size={15} className="text-amber-500" />
                          <span>Câu hỏi sàng lọc & Câu trả lời</span>
                        </h4>
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                          {rawAnswers.length} câu hỏi
                        </span>
                      </div>

                      {rawAnswers.slice().sort((a, b) => a.orderIndex - b.orderIndex).map((ans: ProposalAnswerDto, idx: number) => (
                        <div key={ans.proposalAnswersId || idx} className="rounded-2xl border border-border/80 bg-surface-card/60 p-4 space-y-3 shadow-2xs">
                          <div className="flex items-start justify-between gap-3">
                            <h5 className="text-xs font-black text-text-primary leading-snug">
                              {ans.orderIndex || idx + 1}. {ans.questionText}
                            </h5>
                            {ans.isRequired && (
                              <span className="shrink-0 rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-rose-500">
                                Bắt buộc
                              </span>
                            )}
                          </div>

                          <div className="rounded-xl bg-surface-muted/50 border border-border/60 p-3 text-xs space-y-1">
                            <span className="block text-[10px] font-black uppercase text-text-muted tracking-wider">
                              Câu trả lời của ứng viên
                            </span>
                            <p className="text-text-primary whitespace-pre-wrap leading-relaxed font-medium">
                              {ans.answerText?.trim() || t('proposalAnswers.noAnswerProvided', 'Ứng viên chưa nhập câu trả lời.')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border bg-surface-muted/20 p-12 text-center text-xs text-text-muted space-y-2">
                      <FileQuestion size={38} className="mx-auto text-text-muted/40" />
                      <p className="font-bold text-text-primary text-sm">Không có câu trả lời phỏng vấn nào.</p>
                    </div>
                  )
                )}
              </>
            )}

            {/* TAB 3: AI EVALUATION REPORT */}
            {modalTab === 'aiReport' && showAiReportTab && (
              <>
                {evalLoading && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <LemniscateBloomLoader label="Đang tải Báo cáo AI..." size={48} />
                  </div>
                )}

                {evalError && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-center text-rose-500 text-xs font-bold">
                    {evalError}
                  </div>
                )}

                {!evalLoading && !evalResult && (
                  <div className="rounded-2xl border border-border bg-surface-muted/20 p-12 text-center text-xs text-muted-foreground space-y-3">
                    <Brain size={38} className="mx-auto text-purple-500/60" />
                    <div>
                      <p className="font-bold text-foreground text-sm">Chưa có Báo cáo Đánh giá AI cho proposal này.</p>
                      {rawAnswers.length > 0 && rawAnswers.some(ans => ans.answerText?.trim()) && (
                        <p className="text-muted-foreground mt-1">Proposal này chưa được AI chấm điểm phỏng vấn.</p>
                      )}
                    </div>
                  </div>
                )}

                {(!evalLoading && (evalResult || activeProposal?.aiTechnicalQualityScore)) && (
                  <div className="space-y-5">
                    {/* Render AI Candidate Evaluation Engine Verdict Card */}
                    {activeProposal && (
                      <AIProposalVerdictCard proposal={activeProposal} />
                    )}

                    {/* Render Side-by-Side Comparative Milestone Matrix */}
                    <AISideBySideMilestoneMatrix
                      detail={detail}
                      fullEvaluationJson={activeProposal?.aiFullEvaluationJson}
                    />

                    {/* Summary Card */}
                    {evalResult && (
                      <div className="rounded-2xl border border-purple-500/25 bg-purple-500/5 p-5 space-y-4 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-purple-500/15 pb-4">
                        {/* Overall Score Circle */}
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/15 border-2 border-purple-500/30 shrink-0 shadow-xs">
                            <span className="text-xl font-black text-purple-600 dark:text-purple-400">{evalResult.score}</span>
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted">{t('proposalAnswers.overallScore', 'Điểm số tổng thể')}</h4>
                            <p className="text-xs font-extrabold">{t('proposalAnswers.aiScore', { score: evalResult.score, defaultValue: `${evalResult.score} / 100 điểm` })}</p>
                          </div>
                        </div>

                        {/* Recommendation Badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted font-bold">{t('proposalAnswers.recommendation', 'Khuyến nghị')}:</span>
                          {evalResult.recommendedHire ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={13} /> {t('proposalAnswers.recommended', 'Khuyên dùng tuyển dụng')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-3.5 py-1 text-xs font-black text-rose-500">
                              <XCircle size={13} /> {t('proposalAnswers.notRecommended', 'Cần cân nhắc thêm')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* AI Authenticity & Detection Summary Card */}
                      {(() => {
                        const isAi = evalResult.isAiGenerated || (evalResult.aiConfidenceScore ?? 0) >= 0.5;
                        const confPercent = Math.round((evalResult.aiConfidenceScore ?? (isAi ? 0.75 : 0.15)) * 100);
                        const defaultSummary = isAi
                          ? 'Một số câu trả lời của ứng viên mang dấu hiệu liệt kê hoặc diễn đạt chuẩn mẫu từ mô hình AI.'
                          : 'Các câu trả lời phỏng vấn được đánh giá là chân thực với văn phong tự nhiên của ứng viên.';
                        const summaryText = evalResult.aiDetectionSummary || defaultSummary;

                        return (
                          <div className={`rounded-xl border p-3.5 space-y-1.5 text-xs shadow-2xs ${
                            isAi
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                          }`}>
                            <div className="flex items-center justify-between font-black uppercase tracking-wider text-[10px]">
                              <span className={`flex items-center gap-1.5 ${isAi ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                <Sparkles size={13} /> Đánh giá tính xác thực tổng thể (Authenticity Assessment)
                              </span>
                              <span className="rounded-full px-2.5 py-0.5 bg-background/80 border border-border text-[10px] font-black">
                                {confPercent}% AI Confidence
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed font-medium pt-1">
                              {summaryText}
                            </p>
                          </div>
                        );
                      })()}

                      {/* Summary */}
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-text-muted mb-1.5">{t('proposalAnswers.summary', 'Tóm tắt đánh giá của AI')}</h4>
                        <p className="text-xs leading-relaxed text-text-primary font-medium whitespace-pre-wrap bg-purple-500/5 p-3.5 rounded-xl border border-purple-500/10">{evalResult.summary}</p>
                      </div>

                      {/* Holistic Adjustment */}
                      {(evalResult.holisticAdjustment !== 0 || evalResult.holisticAdjustmentReason) && (
                        <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-xs space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider text-[10px]">Hiệu chỉnh bổ sung:</span>
                            <span className={`font-black px-2 py-0.5 rounded-full text-[10px] ${evalResult.holisticAdjustment > 0 ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600'}`}>
                              {evalResult.holisticAdjustment > 0 ? `+${evalResult.holisticAdjustment}` : evalResult.holisticAdjustment}
                            </span>
                          </div>
                          {evalResult.holisticAdjustmentReason && (
                            <p className="text-text-primary leading-relaxed font-medium mt-1">{evalResult.holisticAdjustmentReason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Questions Breakdown */}
                  {evalResult?.gradedQuestions && evalResult.gradedQuestions.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-text-primary uppercase tracking-wider border-b border-border/60 pb-2">
                          {t('proposalAnswers.questionBreakdown', 'Chi tiết điểm từng câu hỏi')}
                        </h4>

                        {evalResult.gradedQuestions.map((q: GradedQuestionDto, idx: number) => (
                          <div key={idx} className="rounded-2xl border border-border/80 p-4 space-y-3 bg-surface-card/60 shadow-2xs">
                            <div className="flex justify-between items-start gap-4">
                              <h5 className="text-xs font-black text-text-primary leading-snug">
                                {q.questionIndex + 1}. {q.questionText}
                              </h5>
                              <span className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-black ${getScoreColorClass(q.score)}`}>
                                {q.score}/100
                              </span>
                            </div>

                            <div className="rounded-xl bg-surface-muted/50 border border-border/60 p-3 text-xs space-y-1">
                              <span className="block text-[10px] font-black uppercase text-text-muted tracking-wider">Câu trả lời ứng viên</span>
                              <p className="text-text-primary whitespace-pre-wrap leading-relaxed font-medium">{q.candidateAnswer || t('proposalAnswers.noAnswerProvided', 'Không có câu trả lời')}</p>
                            </div>

                            {/* Always display AI Authenticity Assessment for each question */}
                            {(() => {
                              const isAi = q.isAiGenerated || (q.aiConfidenceScore ?? 0) >= 0.5;
                              const confPercent = Math.round((q.aiConfidenceScore ?? (isAi ? 0.75 : 0.15)) * 100);
                              const defaultReason = isAi
                                ? 'Cấu trúc câu trả lời và cách trình bày mang đặc trưng liệt kê mẫu của mô hình AI.'
                                : 'Câu trả lời mang phong cách diễn đạt tự nhiên, trình bày trực tiếp kinh nghiệm thực tế của ứng viên.';
                              const reasonText = q.aiDetectionReason || defaultReason;

                              return (
                                <div className={`rounded-xl border p-3 text-xs space-y-1 ${
                                  isAi
                                    ? 'bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-200'
                                    : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-900 dark:text-emerald-200'
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <span className={`font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 ${
                                      isAi ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                                    }`}>
                                      <Sparkles size={12} /> Đánh giá tính xác thực AI
                                    </span>
                                    <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-background/80 border border-border">
                                      {confPercent}% AI Confidence
                                    </span>
                                  </div>
                                  <p className="text-text-primary text-xs leading-relaxed font-medium mt-0.5">
                                    {reasonText}
                                  </p>
                                </div>
                              );
                            })()}

                            <div className="rounded-xl bg-purple-500/5 border border-purple-500/15 p-3 text-xs space-y-1">
                              <span className="block text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">Phản hồi của AI</span>
                              <p className="text-text-primary leading-relaxed font-medium">{q.feedback}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Actions Row - Buttons aligned to the right */}
          <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-3 shrink-0">
            {activeId && !selectedJobCanNegotiate && (
              <span className="text-xs font-extrabold text-amber-600 mr-auto">
                Dự án này đã đóng nhận proposal.
              </span>
            )}
            {activeId && canClientAct(currentStatus) && selectedJobCanNegotiate && (
              <button
                type="button"
                disabled={isBusy(activeId, 'shortlist')}
                onClick={() => updateStatus(activeId, ProposalStatus.Shortlisted, 'shortlist')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2.5 text-xs font-black text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 disabled:opacity-50 cursor-pointer transition-all"
              >
                <Check size={14} /> Shortlist
              </button>
            )}
            {activeId && canClientAct(currentStatus) && selectedJobCanNegotiate && (
              <>
                <button
                  type="button"
                  disabled={isBusy(activeId, 'reject')}
                  onClick={() => setRejectProposalId(activeId)}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 disabled:opacity-50 cursor-pointer transition-all"
                >
                  <X size={14} /> Từ chối
                </button>
                <button
                  type="button"
                  disabled={isBusy(activeId, 'accept')}
                  onClick={() => acceptForNegotiation(activeId)}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-black text-white transition-all shadow-md hover:bg-brand-hover cursor-pointer"
                >
                  <MessageSquare size={14} /> Bắt đầu đàm phán
                </button>
              </>
            )}
            {activeId && currentStatus === ProposalStatus.Accepted && selectedJobCanNegotiate && (
              <button
                type="button"
                disabled={isBusy(activeId, 'open')}
                onClick={() => openNegotiation(activeId)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50 cursor-pointer shadow-md hover:bg-emerald-700 transition-all"
              >
                <MessageSquare size={14} /> Vào Phòng Đàm phán
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
