import { useNavigate } from 'react-router';
import { FileText, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

export interface ChatSystemBannerProps {
  content: string;
  contractId?: string | null;
  proposalId?: string | null;
  onNavigateContract?: (contractId: string) => void;
}

export function ChatSystemBanner({
  content,
  contractId,
  proposalId: _proposalId,
  onNavigateContract,
}: ChatSystemBannerProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isVi = i18n.language === 'vi';

  const lowerContent = content.toLowerCase();

  // Detect if this system message is related to contract / e-sign / plan review
  const isContractRelated =
    Boolean(contractId) ||
    lowerContent.includes('contract') ||
    lowerContent.includes('hợp đồng') ||
    lowerContent.includes('freelancer review') ||
    lowerContent.includes('ready for signatures') ||
    lowerContent.includes('milestone schedule') ||
    lowerContent.includes('e-sign') ||
    lowerContent.includes('project plan');

  // Detect tone/icon
  const isSuccessTone =
    lowerContent.includes('accepted') ||
    lowerContent.includes('confirmed') ||
    lowerContent.includes('signed') ||
    lowerContent.includes('completed') ||
    lowerContent.includes('thành công') ||
    lowerContent.includes('hoàn tất');

  const handleAction = () => {
    if (contractId) {
      if (onNavigateContract) {
        onNavigateContract(contractId);
      } else {
        navigate(`/contracts/${contractId}`);
      }
      return;
    }
    navigate('/contracts');
  };

  return (
    <div className="flex justify-center my-2.5 w-full">
      <div className="w-[min(540px,90vw)] rounded-2xl border border-border/80 bg-card p-3.5 px-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Content Side */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isSuccessTone
                ? 'bg-emerald-600 text-white'
                : isContractRelated
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-cyan-600 text-white'
            }`}
          >
            {isSuccessTone ? (
              <CheckCircle2 size={18} />
            ) : isContractRelated ? (
              <FileText size={18} />
            ) : (
              <Sparkles size={18} />
            )}
          </div>
          <p className="text-xs font-bold text-foreground leading-relaxed">
            {content}
          </p>
        </div>

        {/* Action Button Side */}
        {isContractRelated && (
          <button
            type="button"
            onClick={handleAction}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-black shadow-xs transition-all cursor-pointer border-none active:scale-[0.98]"
          >
            <span>{isVi ? 'Đi tới Hợp đồng' : 'Go to Contract'}</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
