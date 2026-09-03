import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import type { Milestone } from '../../../types/models/Contract';
import { ContractReportIssueType } from '../../../types/models/ReportContract';
import { CustomSelect, type SelectOption } from '../../../shared/components/CustomSelect';
import { FileTypeBadge } from '../../../shared/components/FileTypeBadge';
import { showValidationToast } from '../../../shared/utils/validationToast';

interface RaiseIssueModalProps {
  contractId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: {
    issueType: number;
    description: string;
    desiredResolution: string;
    milestoneId?: string | null;
    attachments?: File[];
  }) => Promise<{
    success: boolean;
    message?: string;
    statusCode?: number;
    errors?: Record<string, string[]>;
  }>;
  isSubmitting: boolean;
}

export function RaiseIssueModal({
  contractId,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: RaiseIssueModalProps) {
  const { t } = useTranslation();
  const [issueType, setIssueType] = useState<number>(ContractReportIssueType.PaymentIssue);
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [desiredResolution, setDesiredResolution] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonesLoaded, setMilestonesLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const resolutionRef = useRef<HTMLTextAreaElement>(null);

  const loadMilestones = async () => {
    if (milestonesLoaded) return;
    try {
      const response = await contractGetAPI.getMilestonesByContract(contractId);
      if (response.success && response.data) {
        setMilestones(response.data);
      }
      setMilestonesLoaded(true);
    } catch {
      // Silently fail - milestone field is optional
      setMilestonesLoaded(true);
    }
  };

  useEffect(() => {
    if (isOpen && !milestonesLoaded) {
      void loadMilestones();
    }
  }, [isOpen, milestonesLoaded]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    if (selectedFiles.length > 0) {
      setAttachments(prev => [...prev, ...selectedFiles]);
    }
    event.currentTarget.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setIssueType(ContractReportIssueType.PaymentIssue);
    setMilestoneId('');
    setDescription('');
    setDesiredResolution('');
    setAttachments([]);
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedDescription = description.trim();
    const trimmedDesiredResolution = desiredResolution.trim();
    const validationMessages: string[] = [];

    if (!trimmedDescription) {
      validationMessages.push(t('workspace.reportDescriptionRequired') || 'Vui lòng nhập mô tả sự cố.');
    }

    if (!trimmedDesiredResolution) {
      validationMessages.push(t('workspace.reportDesiredResolutionRequired') || 'Vui lòng nhập giải pháp đề xuất.');
    }

    if (trimmedDescription.length > 5000) {
      validationMessages.push(t('workspace.reportDescriptionMaxLength') || 'Mô tả không vượt quá 5000 ký tự.');
    }

    if (trimmedDesiredResolution.length > 5000) {
      validationMessages.push(t('workspace.reportDesiredResolutionMaxLength') || 'Giải pháp đề xuất không vượt quá 5000 ký tự.');
    }

    if (validationMessages.length > 0) {
      showValidationToast(validationMessages, { fallback: t('workspace.failedSubmitReportError') });
      if (!trimmedDescription || trimmedDescription.length > 5000) descriptionRef.current?.focus();
      else resolutionRef.current?.focus();
      return;
    }

    const result = await onSubmit({
      issueType,
      description: trimmedDescription,
      desiredResolution: trimmedDesiredResolution,
      milestoneId: milestoneId || null,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (result.success) {
      resetForm();
      onClose();
    } else {
      const fallback = result.message || t('workspace.failedSubmitReportError') || 'Không thể gửi báo cáo.';
      if ([400, 409, 422].includes(result.statusCode ?? 0) || result.errors) {
        showValidationToast(result, { fallback });
      } else {
        setError(fallback);
      }
    }
  };

  const issueTypes = [
    { value: ContractReportIssueType.PaymentIssue, label: t('workspace.reportIssueTypePaymentIssue', { defaultValue: 'Vấn đề thanh toán / Ký quỹ' }) },
    { value: ContractReportIssueType.MilestoneIssue, label: t('workspace.reportIssueTypeMilestoneIssue', { defaultValue: 'Vấn đề Cột mốc (Milestone)' }) },
    { value: ContractReportIssueType.Delay, label: t('workspace.reportIssueTypeDelay', { defaultValue: 'Trì hoãn tiến độ bàn giao' }) },
    { value: ContractReportIssueType.PoorQuality, label: t('workspace.reportIssueTypePoorQuality', { defaultValue: 'Chất lượng công việc không đạt' }) },
    { value: ContractReportIssueType.CommunicationProblem, label: t('workspace.reportIssueTypeCommunicationProblem', { defaultValue: 'Vấn đề giao tiếp / Mất liên lạc' }) },
    { value: ContractReportIssueType.ScopeChange, label: t('workspace.reportIssueTypeScopeChange', { defaultValue: 'Thay đổi phạm vi công việc' }) },
    { value: ContractReportIssueType.Other, label: t('workspace.reportIssueTypeOther', { defaultValue: 'Sự cố khác' }) },
  ];

  const issueTypeSelectOptions: SelectOption[] = issueTypes.map(item => ({
    value: String(item.value),
    label: item.label,
  }));

  const milestoneSelectOptions: SelectOption[] = [
    { value: '', label: t('workspace.reportMilestoneNone', { defaultValue: 'Không thuộc mốc cụ thể (Toàn bộ hợp đồng)' }) },
    ...milestones.map(ms => ({
      value: ms.id,
      label: ms.title,
    })),
  ];

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={handleClose}
    >
      {/* Decorative background blur blobs */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full blur-[120px] opacity-20 pointer-events-none bg-brand/30" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full blur-[150px] opacity-15 pointer-events-none bg-text-muted/20" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rc-raise-issue-title"
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-5xl h-[92dvh] lg:h-[85vh] max-h-[92dvh] lg:max-h-[820px] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col lg:flex-row shadow-2xl border border-border/80 bg-background text-text-primary backdrop-blur-2xl my-auto"
      >
        {/* ═══ LEFT COLUMN: Context Hero ═══════════════════════════════════ */}
        <div className="w-full lg:w-5/12 p-4 sm:p-6 lg:p-9 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border/60 bg-surface-card/50 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none" />

          <div className="relative z-10 pr-8 lg:pr-0">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-2 sm:mb-4 lg:mb-8">
              <ShieldCheck size={13} />
              {t('workspace.reportCategoryBadge', { defaultValue: 'Báo Cáo Sự Cố' })}
            </div>

            <h1 id="rc-raise-issue-title" className="text-base sm:text-xl lg:text-2xl font-black text-text-primary mb-1 sm:mb-2 tracking-tight">
              {t('workspace.reportCreateTitle', { defaultValue: 'Tạo Yêu Cầu Xử Lý Sự Cố' })}
            </h1>
            <p className="text-[11px] sm:text-xs lg:text-sm font-semibold text-text-muted leading-relaxed line-clamp-2 sm:line-clamp-none">
              {t('workspace.reportCreatedDesc', { defaultValue: 'Gửi báo cáo vấn đề trực tiếp đến đối phương và bộ phận hỗ trợ GigBridge để bảo vệ quyền lợi.' })}
            </p>
          </div>

          {/* Center Simple Site Logo Icon Box - Desktop only */}
          <div className="relative z-10 hidden lg:flex flex-col items-center my-6 lg:my-8 text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-background border border-border flex items-center justify-center p-3.5 shadow-md">
              <img src="/img/logo.png" alt="GigBridge Logo" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-black text-text-primary">
                {t('workspace.escrowProtectionTitle', { defaultValue: 'Bảo Chứng An Toàn GigBridge' })}
              </h2>
              <p className="text-[11px] font-medium text-text-muted max-w-xs leading-normal">
                {t('workspace.escrowProtectionDesc', { defaultValue: 'Tiền ký quỹ sẽ được tạm khóa cho tới khi hai bên thống nhất cách giải quyết.' })}
              </p>
            </div>
          </div>

          {/* Project Details Card */}
          <div className="relative z-10 hidden sm:block rounded-2xl border border-border/70 bg-surface-card p-3 sm:p-4 space-y-1 mt-2 lg:mt-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand">
              <BriefcaseBusiness size={13} />
              <span>Contract ID</span>
            </div>
            <p className="text-xs font-extrabold text-text-primary font-mono truncate">{contractId}</p>
          </div>

          {/* Close button (Mobile) */}
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label={t('common.close', { defaultValue: 'Đóng' })}
            className="absolute top-4 right-4 lg:hidden p-1.5 rounded-lg border border-border hover:bg-surface-hover text-text-muted cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ═══ RIGHT COLUMN: Interactive Form ════════════════════════════ */}
        <div className="w-full lg:w-7/12 flex-1 min-h-0 p-4 sm:p-6 lg:p-10 bg-background relative overflow-y-auto custom-scrollbar flex flex-col justify-between">
          {/* Close button (Desktop) */}
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label={t('common.close', { defaultValue: 'Đóng' })}
            className="hidden lg:flex absolute top-5 right-5 p-1.5 rounded-lg border border-border hover:bg-surface-hover text-text-muted cursor-pointer"
          >
            <X size={16} />
          </button>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 sm:gap-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-extrabold flex items-center gap-2.5 shadow-xs" role="alert">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Issue Type CustomSelect */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                {t('workspace.reportIssueType', { defaultValue: 'Phân loại sự cố' })} <span className="text-destructive">*</span>
              </label>
              <CustomSelect
                value={String(issueType)}
                onChange={val => setIssueType(Number(val))}
                options={issueTypeSelectOptions}
                disabled={isSubmitting}
                searchable={false}
                placeholder="Chọn loại sự cố..."
                ariaLabel="Phân loại sự cố"
              />
            </div>

            {/* Related Milestone CustomSelect */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                {t('workspace.reportRelatedMilestone', { defaultValue: 'Cột mốc liên quan' })}
              </label>
              <CustomSelect
                value={milestoneId}
                onChange={val => setMilestoneId(val)}
                options={milestoneSelectOptions}
                disabled={isSubmitting}
                searchable={milestones.length > 5}
                placeholder="Chọn cột mốc liên quan (không bắt buộc)..."
                ariaLabel="Cột mốc liên quan"
              />
            </div>

            {/* Description Textarea Wrapper (Review Dialog style) */}
            <div className="relative group space-y-1">
              <div className="flex items-center justify-between px-1">
                <label htmlFor="rc-description" className="block text-xs font-black uppercase tracking-wider text-text-muted">
                  {t('workspace.reportDescriptionLabel', { defaultValue: 'Mô tả chi tiết sự cố' })} <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] font-bold text-text-muted">{description.length}/5000</span>
              </div>
              <div className="relative bg-surface-card rounded-2xl border border-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all shadow-xs">
                <textarea
                  ref={descriptionRef}
                  id="rc-description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={5000}
                  rows={3}
                  placeholder={t('workspace.reportDescriptionPlaceholder', { defaultValue: 'Mô tả chi tiết nội dung sự cố xảy ra, các mốc thời gian và bối cảnh...' })}
                  disabled={isSubmitting}
                  className="w-full bg-transparent border-none resize-none p-4 text-xs font-bold text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            {/* Desired Resolution Textarea Wrapper */}
            <div className="relative group space-y-1">
              <div className="flex items-center justify-between px-1">
                <label htmlFor="rc-desired-resolution" className="block text-xs font-black uppercase tracking-wider text-text-muted">
                  {t('workspace.reportDesiredResolution', { defaultValue: 'Mong muốn giải quyết' })} <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] font-bold text-text-muted">{desiredResolution.length}/5000</span>
              </div>
              <div className="relative bg-surface-card rounded-2xl border border-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all shadow-xs">
                <textarea
                  ref={resolutionRef}
                  id="rc-desired-resolution"
                  value={desiredResolution}
                  onChange={e => setDesiredResolution(e.target.value)}
                  maxLength={5000}
                  rows={2}
                  placeholder={t('workspace.reportDesiredResolutionPlaceholder', { defaultValue: 'Đề xuất hướng giải quyết bạn mong muốn (ví dụ: Gia hạn thêm 3 ngày, hoàn tiền mốc 1...)' })}
                  disabled={isSubmitting}
                  className="w-full bg-transparent border-none resize-none p-4 text-xs font-bold text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            {/* File Attachments Upload Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                  {t('workspace.reportEvidence', { defaultValue: 'Bằng chứng / Tệp đính kèm' })}
                </label>
                <div className="flex items-center gap-1 text-[11px] text-text-muted font-semibold">
                  <ShieldCheck size={13} className="text-brand" />
                  <span>{t('workspace.confidentialNotice', { defaultValue: 'Bảo mật 100%' })}</span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                id="rc-evidence-files"
                onChange={handleFileSelect}
                disabled={isSubmitting}
                multiple
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border hover:border-brand/40 bg-surface-muted/40 hover:bg-surface-muted transition-all text-xs font-bold text-text-primary cursor-pointer disabled:opacity-50"
              >
                <Upload size={15} className="text-brand" />
                <span>{t('workspace.reportChooseFiles', { defaultValue: 'Chọn hoặc đính kèm tệp' })}</span>
              </button>

              {attachments.length > 0 && (
                <div className="space-y-2 pt-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 p-2 rounded-xl border border-border/70 bg-surface-card">
                      <FileTypeBadge
                        fileName={file.name}
                        fileSize={file.size}
                        compact
                      />
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        disabled={isSubmitting}
                        className="p-1 rounded-lg text-text-muted hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                        title="Xóa tệp"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions Footer Buttons (Exact match to ProjectReviewDialog) */}
            <div className="flex items-center gap-3 pt-3 mt-auto">
              <button
                type="button"
                className="w-1/3 px-6 py-3.5 rounded-xl text-xs font-black text-brand bg-brand/10 hover:bg-brand/15 border border-brand/20 transition-all duration-200 cursor-pointer disabled:opacity-50"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                {t('common.cancel', { defaultValue: 'Hủy' })}
              </button>

              <button
                type="submit"
                className="w-2/3 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black text-brand-foreground bg-brand hover:bg-brand-hover shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer group disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {t('workspace.reportSubmit', { defaultValue: 'Gửi Báo Cáo Sự Cố' })}
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
