import { useNavigate } from 'react-router';
import {
  FileText,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Unlock,
  CreditCard,
  FolderOpen,
} from 'lucide-react';
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

  // 1. Detect if this system message is specifically about Contract Signatures / Plan confirmation (Needs "Go to Contract" button)
  const isContractDocMessage =
    lowerContent.includes('contract plan') ||
    lowerContent.includes('contract details') ||
    lowerContent.includes('ready for signatures') ||
    lowerContent.includes('ready for freelancer review') ||
    lowerContent.includes('final offer accepted') ||
    lowerContent.includes('kế hoạch hợp đồng') ||
    lowerContent.includes('ký hợp đồng') ||
    lowerContent.includes('chốt hợp đồng') ||
    lowerContent.includes('e-sign');

  // 2. Detect categories for icon & colors
  const isProductMaterials =
    lowerContent.includes('product materials') ||
    lowerContent.includes('materials') ||
    lowerContent.includes('tài liệu sản phẩm') ||
    lowerContent.includes('tài liệu dự án') ||
    lowerContent.includes('files sent');

  const isMilestoneUnlock =
    lowerContent.includes('milestone unlock') ||
    lowerContent.includes('unlock') ||
    lowerContent.includes('mở khóa milestone') ||
    lowerContent.includes('mở khóa g-coin') ||
    lowerContent.includes('yêu cầu giải ngân');

  const isPaymentRelease =
    lowerContent.includes('payment released') ||
    lowerContent.includes('fund') ||
    lowerContent.includes('escrow') ||
    lowerContent.includes('thanh toán') ||
    lowerContent.includes('nạp quỹ');

  const isSuccessTone =
    lowerContent.includes('accepted') ||
    lowerContent.includes('confirmed') ||
    lowerContent.includes('signed') ||
    lowerContent.includes('completed') ||
    lowerContent.includes('thành công') ||
    lowerContent.includes('hoàn tất') ||
    lowerContent.includes('approved');

  // Resolve Icon & Color Styling
  const getBannerConfig = () => {
    if (isProductMaterials) {
      return {
        icon: <FolderOpen size={18} />,
        bgClass: 'bg-indigo-600 text-white',
        borderClass: 'border-indigo-500/30',
      };
    }
    if (isMilestoneUnlock) {
      return {
        icon: <Unlock size={18} />,
        bgClass: 'bg-amber-500 text-white',
        borderClass: 'border-amber-500/30',
      };
    }
    if (isPaymentRelease) {
      return {
        icon: <CreditCard size={18} />,
        bgClass: 'bg-emerald-600 text-white',
        borderClass: 'border-emerald-500/30',
      };
    }
    if (isContractDocMessage) {
      return {
        icon: <FileText size={18} />,
        bgClass: 'bg-[var(--brand)] text-white',
        borderClass: 'border-[var(--brand)]/30',
      };
    }
    if (isSuccessTone) {
      return {
        icon: <CheckCircle2 size={18} />,
        bgClass: 'bg-emerald-600 text-white',
        borderClass: 'border-emerald-500/30',
      };
    }

    return {
      icon: <Sparkles size={18} />,
      bgClass: 'bg-cyan-600 text-white',
      borderClass: 'border-cyan-500/30',
    };
  };

  const config = getBannerConfig();

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

  if (isProductMaterials) {
    return (
      <div className="flex justify-center my-3 w-full min-w-0 px-1">
        <div className="w-[min(560px,100%)] max-w-full rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all overflow-hidden">
          <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
            {/* Glowing Emerald Icon Box */}
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 shrink-0 mt-0.5">
              <FolderOpen size={20} />
            </div>

            {/* Body Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black tracking-wide uppercase shadow-2xs shrink-0">
                  <FolderOpen size={10} /> {isVi ? 'Tư liệu sản phẩm' : 'Product Materials'}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold shrink-0">
                  {isVi ? 'Đã đính kèm' : 'Attached'}
                </span>
              </div>

              <p className="text-xs font-bold text-foreground leading-relaxed pt-0.5 break-words [overflow-wrap:anywhere] min-w-0">
                {content}
              </p>

              <div className="pt-1 flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold min-w-0">
                <Sparkles size={12} className="shrink-0 animate-pulse" />
                <span className="truncate min-w-0">{isVi ? 'Tất cả file đã tự động lưu vào tab "File chung"' : 'All files saved to "Shared Files" tab'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center my-2.5 w-full min-w-0 px-1">
      <div className={`w-[min(540px,100%)] max-w-full rounded-2xl border bg-card p-3.5 px-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden ${config.borderClass}`}>
        {/* Content Side */}
        <div className="flex items-center gap-3 min-w-0 max-w-full">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${config.bgClass}`}
          >
            {config.icon}
          </div>
          <p className="text-xs font-bold text-foreground leading-relaxed break-words [overflow-wrap:anywhere] min-w-0">
            {content}
          </p>
        </div>

        {/* Action Button Side: ONLY for Contract E-Sign / Contract Plan Confirmation Messages */}
        {isContractDocMessage && (
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
