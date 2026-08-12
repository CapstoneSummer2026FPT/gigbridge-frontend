import { AlertTriangle, ArrowRight, Loader2, MessageSquare, ShieldAlert, X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

interface DisputeEscalationModalProps {
  isOpen: boolean;
  isEscalating: boolean;
  error?: string | null;
  onClose: () => void;
  onEscalate: () => void;
}

export function DisputeEscalationModal({
  isOpen,
  isEscalating,
  error,
  onClose,
  onEscalate,
}: DisputeEscalationModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      {/* Decorative background blur blobs */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full blur-[120px] opacity-20 pointer-events-none bg-brand/30" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full blur-[150px] opacity-15 pointer-events-none bg-text-muted/20" />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rc-escalation-title"
        onClick={event => event.stopPropagation()}
        className="relative z-10 w-full max-w-lg rounded-[2rem] overflow-hidden p-6 sm:p-8 lg:p-10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.45)] border border-border/50 my-auto text-center space-y-6"
        style={{
          background: 'rgba(var(--background-rgb, 255,255,255), 0.9)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isEscalating}
          aria-label={t('common.close', { defaultValue: 'Đóng' })}
          className="absolute top-5 right-5 p-1.5 rounded-lg border border-border hover:bg-surface-hover text-text-muted cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Center Alert Icon Badge */}
        <div className="mx-auto w-20 h-20 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand relative shadow-lg">
          <div className="absolute -inset-2 rounded-full bg-brand/10 blur-xl animate-pulse pointer-events-none" />
          <AlertTriangle size={36} className="relative z-10" />
        </div>

        <div className="space-y-2">
          <h3 id="rc-escalation-title" className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
            {t('workspace.disputeEscalationTitle', { defaultValue: 'Không thể đi đến thống nhất?' })}
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-text-muted leading-relaxed">
            {t('workspace.disputeEscalationDescription', {
              defaultValue:
                'Bạn có thể gửi toàn bộ thông tin sự cố lên Bộ phận Quản trị GigBridge để được tư vấn và giải quyết theo đúng quy trình bảo chứng ký quỹ.',
            })}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-muted/60 border border-border/80 text-text-primary text-xs font-semibold text-left flex items-start gap-3">
          <ShieldAlert size={18} className="shrink-0 mt-0.5 text-brand" />
          <span className="leading-relaxed">
            {t('workspace.disputeEscalationWarning', {
              defaultValue:
                'Lưu ý: Khi tạo hồ sơ tranh chấp, đội ngũ Admin GigBridge sẽ xem xét lại lịch sử làm việc, tin nhắn và minh chứng để đưa ra phán quyết ràng buộc cho cả hai bên.',
            })}
          </span>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isEscalating}
            className="w-1/2 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-border bg-surface-muted hover:bg-border text-text-primary font-black text-xs transition cursor-pointer disabled:opacity-50"
          >
            <MessageSquare size={15} />
            <span>{t('workspace.continueNegotiation', { defaultValue: 'Tiếp tục thương lượng' })}</span>
          </button>

          <button
            type="button"
            onClick={onEscalate}
            disabled={isEscalating}
            className="w-1/2 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-foreground font-black text-xs shadow-md transition cursor-pointer disabled:opacity-50 group"
          >
            {isEscalating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>{t('workspace.createDispute', { defaultValue: 'Tạo Hồ Sơ Tranh Chấp' })}</span>
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
