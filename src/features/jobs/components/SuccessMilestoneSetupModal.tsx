import { Sparkles } from 'lucide-react';

interface SuccessMilestoneSetupModalProps {
  isOpen: boolean;
  onClose: () => void; // Setup sau / Close
  onSetup: () => void; // Setup milestone
}

export function SuccessMilestoneSetupModal({ isOpen, onClose, onSetup }: SuccessMilestoneSetupModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center gap-6 relative animate-[fadeIn_0.2s_ease-out]">
        
        {/* Decorative background lights */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--gb-cyan)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[var(--gb-purple)]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon container with gradient */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[var(--gb-purple)] to-[var(--gb-cyan)] flex items-center justify-center shadow-lg shadow-[var(--gb-cyan)]/25">
          <Sparkles className="text-white w-8 h-8" />
        </div>

        {/* Text details */}
        <div className="flex flex-col gap-2.5">
          <h3 className="text-xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif" }}>
            Đăng tuyển dụng thành công!
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bạn đã thiết lập job thành công, chỉ còn 1 bước nữa thôi, hãy vào setup Milestone cho dự án.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-5 py-3 rounded-full font-semibold text-xs border border-border bg-background text-muted-foreground hover:bg-muted transition-all cursor-pointer"
          >
            Setup sau
          </button>
          
          <button
            type="button"
            onClick={onSetup}
            className="flex-1 px-6 py-3 rounded-full font-bold text-xs bg-gradient-to-r from-[var(--gb-purple)] to-[var(--gb-cyan)] text-white hover:opacity-95 shadow-md shadow-[var(--gb-cyan)]/10 hover:shadow-lg transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
          >
            Setup milestone
          </button>
        </div>

      </div>
    </div>
  );
}
