import { useNavigate } from 'react-router';
import { X, Sparkles, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface AuthInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function AuthInviteModal({
  isOpen,
  onClose,
  title,
  description,
}: AuthInviteModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose} 
      />

      {/* Glassmorphism Modal Dialog */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card border border-border/80 text-card-foreground p-7 shadow-2xl transition-all duration-300 animate-in zoom-in-95">
        {/* Glowing Ambient Glow */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/80"
        >
          <X className="size-4" />
        </button>

        {/* Header Badge & Title */}
        <div className="flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm mb-4">
            <Sparkles className="size-6" />
          </div>

          <h3 className="font-zentry text-2xl font-bold uppercase tracking-wide text-foreground">
            {title || t('auth.welcomeTitle', 'Tham gia GigBridge ngay')}
          </h3>

          <p className="mt-2 font-circular-web text-sm leading-relaxed text-muted-foreground">
            {description || t('auth.inviteDesc', 'Đăng nhập hoặc đăng ký tài khoản để khám phá hàng ngàn việc làm freelance và kết nối với nhân tài hàng đầu.')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => {
              onClose();
              navigate('/auth/login');
            }}
            className="group relative inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3.5 px-6 text-xs font-general uppercase tracking-widest text-background font-bold shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95"
          >
            <LogIn className="size-4" />
            <span>{t('auth.login', 'Đăng Nhập')}</span>
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => {
              onClose();
              navigate('/auth/signup');
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-3.5 px-6 text-xs font-general uppercase tracking-widest text-foreground font-semibold border border-border/80 shadow-sm transition-all duration-300 hover:bg-secondary/80 active:scale-95"
          >
            <UserPlus className="size-4 text-primary" />
            <span>{t('auth.register', 'Tạo Tài Khoản')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
