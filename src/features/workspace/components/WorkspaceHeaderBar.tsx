import {
  ArrowLeft,
  Briefcase,
  ExternalLink,
  AlertTriangle,
  ShieldAlert,
  FileText,
  CheckCircle,
  Award,
  LockKeyhole,
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { ContractStatus } from '../../../types/models/Contract';
import '../styles/workspace-header-bar.css';

export interface WorkspaceHeaderBarProps {
  titleLong: string;
  jobId?: string;
  isClient: boolean;
  activeContractStatus?: ContractStatus;
  workspaceContractId?: string;
  unreadReportCount?: number;
  onNavigateBack: () => void;
  onNavigateJobDetail: () => void;
  onRaiseIssue: () => void;
  onOpenReportList: () => void;
  onNavigateContract?: () => void;
}

export function WorkspaceHeaderBar({
  titleLong,
  activeContractStatus,
  workspaceContractId,
  unreadReportCount = 0,
  onNavigateBack,
  onNavigateJobDetail,
  onRaiseIssue,
  onOpenReportList,
  onNavigateContract,
}: WorkspaceHeaderBarProps) {
  const { t } = useTranslation();

  return (
    <header className="workspace-header-bar px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0 relative z-30 shadow-sm border border-[var(--brand)]/30 rounded-2xl transition-all overflow-hidden">
      {/* Left Column: Back button + Job title info */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onNavigateBack}
          className="p-2 sm:p-2.5 rounded-xl border border-border/80 bg-background/60 hover:bg-brand/10 hover:border-brand/40 text-muted-foreground hover:text-brand transition-all cursor-pointer shrink-0 shadow-2xs hover:scale-105 active:scale-95 group"
          title={t('workspace.recentWorkspace', { defaultValue: 'Danh sách dự án' })}
        >
          <ArrowLeft size={17} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* Project Branding Icon */}
        <div className="hidden md:flex w-9 h-9 rounded-xl bg-gradient-to-br from-brand/15 via-brand/5 to-transparent border border-brand/20 items-center justify-center text-brand shrink-0 shadow-2xs">
          <Briefcase size={18} />
        </div>

        {/* Title & Job Detail Link */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base text-foreground tracking-tight truncate">
              {titleLong}
            </h1>

            {/* Status Pill Badge in Header */}
            {activeContractStatus === ContractStatus.Disputed ? (
              <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-black shrink-0 shadow-2xs uppercase">
                <LockKeyhole size={9} /> {t('workspace.disputedBadge', { defaultValue: 'Tranh chấp' })}
              </span>
            ) : activeContractStatus === ContractStatus.Cancelled ? (
              <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-600 text-white text-[9px] font-black shrink-0 shadow-2xs uppercase">
                <LockKeyhole size={9} /> {t('workspace.disputeClosedBadge', { defaultValue: 'Đã đóng' })}
              </span>
            ) : activeContractStatus === ContractStatus.Completed ? (
              <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black shrink-0 shadow-2xs uppercase">
                <Award size={9} /> {t('workspace.completedBadge', { defaultValue: 'Hoàn thành' })}
              </span>
            ) : activeContractStatus === ContractStatus.Active ? (
              <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black shrink-0 shadow-2xs uppercase">
                <CheckCircle size={9} /> {t('workspace.activeBadge', { defaultValue: 'Đang làm' })}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onNavigateJobDetail}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--gb-cyan)] hover:text-brand hover:underline tracking-tight text-left mt-0.5 cursor-pointer truncate transition-colors group/link w-fit"
          >
            <span>{t('workspace.viewJobDetail', { defaultValue: 'Xem chi tiết công việc' })}</span>
            <ExternalLink size={10} className="opacity-70 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Right Column: Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {activeContractStatus === ContractStatus.Active && workspaceContractId && (
          <>
            {/* Raise Issue Button */}
            <button
              type="button"
              onClick={onRaiseIssue}
              className="workspace-header-action-btn workspace-raise-issue-btn"
              title={t('workspace.raiseIssue', { defaultValue: 'Báo cáo sự cố' })}
            >
              <AlertTriangle size={14} className="text-white shrink-0" />
              <span className="hidden sm:inline">{t('workspace.raiseIssue', { defaultValue: 'Báo cáo sự cố' })}</span>
            </button>

            {/* Issue Reports List Button */}
            <button
              type="button"
              onClick={onOpenReportList}
              className="workspace-header-action-btn workspace-report-list-btn relative"
              title={t('workspace.reportListTitle', { defaultValue: 'Danh sách sự cố' })}
            >
              <ShieldAlert size={14} className="text-white shrink-0" />
              <span className="hidden sm:inline">{t('workspace.reportListTitle', { defaultValue: 'Danh sách sự cố' })}</span>
              {unreadReportCount > 0 && (
                <span className="workspace-report-badge">
                  {unreadReportCount}
                </span>
              )}
            </button>
          </>
        )}

        {/* View Contract Button */}
        {onNavigateContract && (
          <button
            type="button"
            onClick={onNavigateContract}
            className="workspace-header-contract-btn"
            title={t('workspace.viewContract', { defaultValue: 'Xem hợp đồng' })}
          >
            <FileText size={14} className="shrink-0" />
            <span className="hidden sm:inline">{t('workspace.viewContract', { defaultValue: 'Xem hợp đồng' })}</span>
          </button>
        )}
      </div>
    </header>
  );
}
