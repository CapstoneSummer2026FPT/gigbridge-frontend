import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { EscalateReportToDisputeInput } from '../../../types/models/Dispute';
import { DisputeUrgency } from '../../../types/models/Dispute';
import {
  ContractReportIssueType,
  type ReportContract,
} from '../../../types/models/ReportContract';
import { CustomSelect, type SelectOption } from '../../../shared/components/CustomSelect';
import { FileTypeBadge } from '../../../shared/components/FileTypeBadge';
import { DisputeEvidenceFilePicker } from '../../disputes/components/DisputeEvidenceFilePicker';

const ISSUE_KEYS: Record<number, string> = {
  [ContractReportIssueType.PaymentIssue]: 'workspace.reportIssueTypePaymentIssue',
  [ContractReportIssueType.MilestoneIssue]: 'workspace.reportIssueTypeMilestoneIssue',
  [ContractReportIssueType.Delay]: 'workspace.reportIssueTypeDelay',
  [ContractReportIssueType.PoorQuality]: 'workspace.reportIssueTypePoorQuality',
  [ContractReportIssueType.CommunicationProblem]: 'workspace.reportIssueTypeCommunicationProblem',
  [ContractReportIssueType.ScopeChange]: 'workspace.reportIssueTypeScopeChange',
  [ContractReportIssueType.Other]: 'workspace.reportIssueTypeOther',
};

interface DisputeCreationModalProps {
  isOpen: boolean;
  report: ReportContract;
  contractTitle: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: EscalateReportToDisputeInput) => Promise<{
    success: boolean;
    message?: string;
    disputeId?: string;
  }>;
  onCreated: (disputeId: string) => void;
}

export function DisputeCreationModal({
  isOpen,
  report,
  contractTitle,
  isSubmitting,
  onClose,
  onSubmit,
  onCreated,
}: DisputeCreationModalProps) {
  const { t } = useTranslation();
  const defaultTitle = `${t('workspace.disputeTitlePrefix', { defaultValue: 'Tranh Chấp' })}: ${contractTitle}`;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [claimedAmount, setClaimedAmount] = useState('');
  const [requestedResolution, setRequestedResolution] = useState('');
  const [urgency, setUrgency] = useState<string>('');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(defaultTitle);
    setDescription(report.description);
    setClaimedAmount('');
    setRequestedResolution(report.desiredResolution);
    setUrgency(String(DisputeUrgency.Normal));
    setDeclarationAccepted(false);
    setEvidenceFiles([]);
    setError(null);
  }, [defaultTitle, isOpen, report.description, report.desiredResolution]);

  if (!isOpen) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(claimedAmount);
    const requiresPositiveAmount =
      report.issueType === ContractReportIssueType.PaymentIssue ||
      report.issueType === ContractReportIssueType.MilestoneIssue;

    if (!title.trim()) {
      return setError(t('workspace.disputeTitleRequired', { defaultValue: 'Vui lòng nhập tiêu đề tranh chấp.' }));
    }
    if (!description.trim()) {
      return setError(t('workspace.disputeDescriptionRequired', { defaultValue: 'Vui lòng nhập mô tả chi tiết.' }));
    }
    if (!claimedAmount.trim() || !Number.isFinite(amount) || amount < 0) {
      return setError(t('workspace.disputeClaimedAmountRequired', { defaultValue: 'Vui lòng nhập số tiền yêu cầu bồi thường hợp lệ.' }));
    }
    if (requiresPositiveAmount && amount <= 0) {
      return setError(t('workspace.disputeClaimedAmountPositive', { defaultValue: 'Số tiền bồi thường phải lớn hơn 0.' }));
    }
    if (!requestedResolution.trim()) {
      return setError(
        t('workspace.disputeRequestedResolutionRequired', { defaultValue: 'Vui lòng nhập đề xuất giải pháp cho Admin.' })
      );
    }
    if (urgency === '') {
      return setError(t('workspace.disputeUrgencyRequired', { defaultValue: 'Vui lòng chọn mức độ khẩn cấp.' }));
    }
    if (!declarationAccepted) {
      return setError(
        t('workspace.disputeDeclarationRequired', { defaultValue: 'Vui lòng xác nhận cam kết thông tin là sự thật.' })
      );
    }

    setError(null);
    const result = await onSubmit({
      title: title.trim(),
      description: description.trim(),
      claimedAmount: amount,
      requestedResolution: requestedResolution.trim(),
      urgency: Number(urgency) as DisputeUrgency,
      declarationAccepted,
      evidenceFiles,
    });
    if (!result.success || !result.disputeId) {
      setError(result.message || t('workspace.disputeEscalationFailed', { defaultValue: 'Không thể tạo hồ sơ tranh chấp.' }));
      return;
    }
    onCreated(result.disputeId);
  };

  const urgencyOptions: SelectOption[] = [
    { value: String(DisputeUrgency.Normal), label: t('workspace.disputeUrgencyNormal', { defaultValue: 'Bình thường (Normal)' }) },
    { value: String(DisputeUrgency.High), label: t('workspace.disputeUrgencyHigh', { defaultValue: 'Cao (High)' }) },
    { value: String(DisputeUrgency.Critical), label: t('workspace.disputeUrgencyCritical', { defaultValue: 'Khẩn cấp (Critical)' }) },
  ];

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full blur-[120px] opacity-20 pointer-events-none bg-brand/30" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full blur-[150px] opacity-15 pointer-events-none bg-text-muted/20" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rc-dispute-creation-title"
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-4xl lg:max-w-5xl h-[92dvh] lg:h-[80vh] max-h-[92dvh] lg:max-h-[720px] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col lg:flex-row shadow-2xl border border-border/80 bg-background text-text-primary backdrop-blur-2xl my-auto"
      >
        {/* ═══ LEFT COLUMN: Context Hero & Summary ════════════════════════ */}
        <div className="w-full lg:w-5/12 p-4 sm:p-6 lg:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border/30 bg-surface-muted/40 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none" />

          <div className="relative z-10 pr-8 lg:pr-0">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-2 sm:mb-4 lg:mb-6">
              <ShieldAlert size={13} />
              {t('workspace.disputeCreationKicker', { defaultValue: 'Tranh Chấp Trực Tuyến' })}
            </div>

            <h1 id="rc-dispute-creation-title" className="text-base sm:text-xl lg:text-2xl font-black text-text-primary mb-1 sm:mb-2 tracking-tight">
              {t('workspace.disputeCreationTitle', { defaultValue: 'Nộp Hồ Sơ Tranh Chấp Admin' })}
            </h1>
            <p className="text-[11px] sm:text-xs lg:text-sm font-semibold text-text-muted leading-relaxed line-clamp-2 sm:line-clamp-none">
              {t('workspace.disputeCreationSubtitle', {
                defaultValue: 'Cung cấp thông tin và bằng chứng chi tiết để Bộ phận Quản trị GigBridge đưa ra quyết định xử lý khách quan nhất.',
              })}
            </p>
          </div>

          {/* Contract & Report Summary Grid */}
          <div className="relative z-10 hidden sm:block rounded-2xl border border-border/60 bg-background/60 p-3 sm:p-4 space-y-2 sm:space-y-3 my-2 lg:my-4 text-xs">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand border-b border-border/50 pb-2">
              <BriefcaseBusiness size={14} />
              <span>{t('workspace.disputeSummaryHeader', { defaultValue: 'Tóm Tắt Sự Cố' })}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between gap-2">
                <span className="text-text-muted font-bold">{t('workspace.disputeContract', { defaultValue: 'Hợp đồng' })}:</span>
                <span className="font-black text-text-primary truncate max-w-[160px]">{contractTitle}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-text-muted font-bold">{t('workspace.reportReporter', { defaultValue: 'Người báo cáo' })}:</span>
                <span className="font-black text-text-primary">{report.reporter.name || t('common.unknown')}</span>
              </div>
              {report.respondent && (
                <div className="flex justify-between gap-2">
                  <span className="text-text-muted font-bold">{t('workspace.reportRespondent', { defaultValue: 'Đối phương' })}:</span>
                  <span className="font-black text-text-primary">{report.respondent.name || t('common.unknown')}</span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-text-muted font-bold">{t('workspace.disputeType', { defaultValue: 'Phân loại sự cố' })}:</span>
                <span className="font-black text-brand">{t(ISSUE_KEYS[report.issueType] || 'workspace.reportIssueTypeOther')}</span>
              </div>
            </div>
          </div>

          {/* Footer Security Pill */}
          <div className="relative z-10 flex items-center gap-2 text-[11px] font-semibold text-text-muted pt-2 border-t border-border/40">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span>{t('workspace.disputeReviewGuarantee', { defaultValue: 'GigBridge cam kết thẩm định minh bạch 100%' })}</span>
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t('common.close', { defaultValue: 'Đóng' })}
            className="absolute top-5 right-5 lg:hidden p-1.5 rounded-lg border border-border hover:bg-surface-hover text-text-muted cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ═══ RIGHT COLUMN: Interactive Dispute Form ════════════════════ */}
        <div className="w-full lg:w-7/12 h-full p-6 sm:p-8 lg:p-10 bg-background relative overflow-y-auto custom-scrollbar flex flex-col justify-between">
          {/* Desktop Close */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t('common.close', { defaultValue: 'Đóng' })}
            className="hidden lg:flex absolute top-5 right-5 p-1.5 rounded-lg border border-border hover:bg-surface-hover text-text-muted cursor-pointer z-20"
          >
            <X size={16} />
          </button>

          <form onSubmit={submit} className="flex flex-col gap-5 h-full">
            {error && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-extrabold flex items-center gap-2.5 shadow-xs" role="alert">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Title Field */}
            <div className="relative group space-y-1">
              <label htmlFor="dispute-title-input" className="block text-xs font-black uppercase tracking-wider text-text-muted">
                {t('workspace.disputeTitle', { defaultValue: 'Tiêu đề hồ sơ tranh chấp' })} <span className="text-destructive">*</span>
              </label>
              <div className="relative bg-background rounded-xl border border-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all shadow-xs">
                <input
                  id="dispute-title-input"
                  value={title}
                  maxLength={200}
                  onChange={e => setTitle(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-transparent border-none p-3.5 text-xs font-bold text-text-primary outline-none"
                />
              </div>
            </div>

            {/* Description Field */}
            <div className="relative group space-y-1">
              <div className="flex items-center justify-between px-1">
                <label htmlFor="dispute-desc-textarea" className="block text-xs font-black uppercase tracking-wider text-text-muted">
                  {t('workspace.disputeDescription', { defaultValue: 'Mô tả nguyên nhân tranh chấp' })} <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] font-bold text-text-muted">{description.length}/5000</span>
              </div>
              <div className="relative bg-background rounded-xl border border-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all shadow-xs">
                <textarea
                  id="dispute-desc-textarea"
                  value={description}
                  maxLength={5000}
                  rows={3}
                  onChange={e => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={t('workspace.disputeDescPlaceholder', { defaultValue: 'Trình bày chi tiết lý do không thể đạt được thỏa thuận và các diễn biến...' })}
                  className="w-full bg-transparent border-none resize-none p-3.5 text-xs font-bold text-text-primary placeholder:text-text-muted/50 outline-none"
                />
              </div>
            </div>

            {/* Claimed Amount & Urgency Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="dispute-amount-input" className="block text-xs font-black uppercase tracking-wider text-text-muted">
                  {t('workspace.disputeClaimedAmount', { defaultValue: 'Số tiền yêu cầu bồi hoàn (G-coin)' })} <span className="text-destructive">*</span>
                </label>
                <div className="relative bg-background rounded-xl border border-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all shadow-xs">
                  <input
                    id="dispute-amount-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={claimedAmount}
                    onChange={e => setClaimedAmount(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="0.00"
                    className="w-full bg-transparent border-none p-3.5 text-xs font-bold text-text-primary outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                  {t('workspace.disputeUrgency', { defaultValue: 'Mức độ khẩn cấp' })} <span className="text-destructive">*</span>
                </label>
                <CustomSelect
                  value={urgency}
                  onChange={val => setUrgency(val)}
                  options={urgencyOptions}
                  disabled={isSubmitting}
                  searchable={false}
                  placeholder={t('workspace.disputeSelectUrgency', { defaultValue: 'Chọn độ khẩn cấp...' })}
                  ariaLabel="Mức độ khẩn cấp"
                />
              </div>
            </div>

            {/* Requested Resolution Textarea */}
            <div className="relative group space-y-1">
              <div className="flex items-center justify-between px-1">
                <label htmlFor="dispute-resolution-textarea" className="block text-xs font-black uppercase tracking-wider text-text-muted">
                  {t('workspace.disputeRequestedResolution', { defaultValue: 'Yêu cầu Admin quyết định' })} <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] font-bold text-text-muted">{requestedResolution.length}/2000</span>
              </div>
              <div className="relative bg-background rounded-xl border border-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all shadow-xs">
                <textarea
                  id="dispute-resolution-textarea"
                  value={requestedResolution}
                  maxLength={2000}
                  rows={2}
                  onChange={e => setRequestedResolution(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={t('workspace.disputeResolutionPlaceholder', { defaultValue: 'Nêu rõ phán quyết bạn mong muốn Admin đưa ra (ví dụ: Hoàn lại 100% tiền ký quỹ...)' })}
                  className="w-full bg-transparent border-none resize-none p-3.5 text-xs font-bold text-text-primary placeholder:text-text-muted/50 outline-none"
                />
              </div>
            </div>

            {/* Existing Evidence List */}
            {report.attachments.length > 0 && (
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                  {t('workspace.disputeExistingEvidence', { defaultValue: 'Minh chứng sẵn có từ báo cáo' })} ({report.attachments.length})
                </label>
                <div className="space-y-2">
                  {report.attachments.map(attachment => (
                    <div
                      key={attachment.reportContractAttachmentId}
                      className="p-2.5 rounded-xl border border-border/70 bg-surface-card flex items-center justify-between"
                    >
                      <FileTypeBadge
                        fileName={attachment.fileName}
                        fileSize={attachment.fileSize}
                        compact
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Evidence File Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                {t('workspace.disputeAdditionalEvidence', { defaultValue: 'Bổ sung thêm bằng chứng mới' })}
              </label>
              <DisputeEvidenceFilePicker
                files={evidenceFiles}
                disabled={isSubmitting}
                onChange={setEvidenceFiles}
                onError={setError}
              />
            </div>

            {/* Truth Declaration Checkbox */}
            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60 cursor-pointer text-xs font-bold text-text-primary hover:border-brand/30 transition">
              <input
                type="checkbox"
                checked={declarationAccepted}
                onChange={e => setDeclarationAccepted(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 rounded text-brand focus:ring-brand"
              />
              <span className="leading-relaxed">
                {t('workspace.disputeDeclaration', {
                  defaultValue: 'Tôi xin cam đoan các thông tin và bằng chứng cung cấp trên đây hoàn toàn là sự thật và chịu trách nhiệm trước pháp luật.',
                })}
              </span>
            </label>

            {/* Modal Actions Footer Buttons */}
            <div className="flex items-center gap-3 pt-3 mt-auto">
              <button
                type="button"
                className="w-1/3 px-6 py-3.5 rounded-xl text-xs font-black text-brand bg-brand/10 hover:bg-brand/15 border border-brand/20 transition-all cursor-pointer disabled:opacity-50"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t('common.cancel', { defaultValue: 'Hủy' })}
              </button>

              <button
                type="submit"
                className="w-2/3 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black text-brand-foreground bg-brand hover:bg-brand-hover shadow-md hover:shadow-lg transition-all cursor-pointer group disabled:opacity-50"
                disabled={isSubmitting || !declarationAccepted}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    {t('workspace.submitDispute', { defaultValue: 'Nộp Hồ Sơ Tranh Chấp' })}
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
