import { useEffect, useState } from 'react';
import { Sparkles, ShieldCheck, Clock, Layers, FileText } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

export function WorkspaceSkeletonScreen() {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(18);

  const steps = [
    {
      label: t('workspace.loadingStep1', { defaultValue: 'Đang kết nối không gian làm việc an toàn...' }),
      icon: Layers,
    },
    {
      label: t('workspace.loadingStep2', { defaultValue: 'Đang đồng bộ hợp đồng & tiến độ các cột mốc...' }),
      icon: Clock,
    },
    {
      label: t('workspace.loadingStep3', { defaultValue: 'Đang chuẩn bị dữ liệu trao đổi & tệp dự án...' }),
      icon: FileText,
    },
    {
      label: t('workspace.loadingStep4', { defaultValue: 'Đang xác thực ký quỹ Escrow & mở giao diện...' }),
      icon: ShieldCheck,
    },
  ];

  useEffect(() => {
    // Stepper timer
    const t1 = setTimeout(() => {
      setStepIndex(1);
      setProgressPercent(48);
    }, 1200);

    const t2 = setTimeout(() => {
      setStepIndex(2);
      setProgressPercent(76);
    }, 2800);

    const t3 = setTimeout(() => {
      setStepIndex(3);
      setProgressPercent(92);
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const CurrentIcon = steps[stepIndex]?.icon || Sparkles;

  return (
    <div className="flex-1 flex flex-col bg-card/60 rounded-2xl border border-border/80 overflow-hidden relative shadow-sm min-w-0 animate-in fade-in duration-300">
      {/* Dynamic Floating Stepper Banner at Top */}
      <div className="px-4 py-3 bg-brand/5 dark:bg-brand/10 border-b border-brand/20 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
          <div className="w-7 h-7 rounded-lg bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shrink-0 animate-pulse">
            <CurrentIcon size={14} className="text-brand animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-wider text-brand">
              <Sparkles size={10} />
              <span>GIGBRIDGE SMART WORKSPACE</span>
            </div>
            <p className="text-xs font-bold text-foreground tracking-tight truncate transition-all duration-300">
              {steps[stepIndex]?.label}
            </p>
          </div>
        </div>

        {/* Micro Progress Bar */}
        <div className="flex items-center gap-2 w-full sm:w-48 shrink-0">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand via-[var(--gb-cyan)] to-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-black text-brand tabular-nums">{progressPercent}%</span>
        </div>
      </div>

      {/* Skeleton Shimmer Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar">
        {/* Header Skeleton Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-3 relative overflow-hidden animate-pulse">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
              <div className="space-y-1.5">
                <div className="w-36 sm:w-48 h-4 rounded-md bg-muted" />
                <div className="w-24 sm:w-32 h-3 rounded-md bg-muted/80" />
              </div>
            </div>
            <div className="w-20 h-7 rounded-xl bg-muted shrink-0" />
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex justify-between items-center text-[10px]">
              <div className="w-24 h-3 rounded bg-muted" />
              <div className="w-12 h-3 rounded bg-muted" />
            </div>
            <div className="w-full h-2 rounded-full bg-muted" />
          </div>
        </div>

        {/* Milestone 1 Skeleton (In Progress) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-brand/20 shadow-xs space-y-3.5 relative overflow-hidden animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <div className="w-40 sm:w-56 h-4 rounded-md bg-muted" />
                <div className="w-28 sm:w-36 h-3 rounded-md bg-muted/70" />
              </div>
            </div>
            <div className="w-24 h-6 rounded-full bg-brand/10 shrink-0" />
          </div>

          {/* Sub tasks checklist skeleton */}
          <div className="space-y-2 pl-4 border-l-2 border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded bg-muted" />
              <div className="w-48 sm:w-64 h-3.5 rounded bg-muted/80" />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded bg-muted" />
              <div className="w-36 sm:w-52 h-3.5 rounded bg-muted/80" />
            </div>
          </div>
        </div>

        {/* Milestone 2 Skeleton (Pending) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card/60 border border-border/60 shadow-xs space-y-3.5 relative overflow-hidden opacity-75 animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/60 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <div className="w-32 sm:w-44 h-4 rounded-md bg-muted" />
                <div className="w-20 sm:w-28 h-3 rounded-md bg-muted/70" />
              </div>
            </div>
            <div className="w-20 h-6 rounded-full bg-muted/60 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
