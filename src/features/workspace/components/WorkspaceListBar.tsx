import {
  PanelLeftClose,
  CheckCircle,
  Award,
  ShieldAlert,
  Layers,
  LockKeyhole,
  Briefcase
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { ContractStatus } from '../../../types/models/Contract';
import '../styles/workspace-list-bar.css';

export interface WorkspaceProjectItem {
  id: string;
  partnerUserId?: string | null;
  partnerName: string;
  partnerAvatar: string;
  online: boolean;
  time: string;
  title?: string;
  latestMessage: string;
  unread: boolean;
  status: ContractStatus;
}

export interface WorkspaceListBarProps {
  isLeftPanelCollapsed: boolean;
  toggleLeftPanel: () => void;
  workspaceStatusTab: 'active' | 'completed' | 'disputed' | 'all';
  setWorkspaceStatusTab: (tab: 'active' | 'completed' | 'disputed' | 'all') => void;
  activeProjectsCount: number;
  completedProjectsCount: number;
  disputedProjectsCount: number;
  allProjectsCount: number;
  filteredWorkspaceProjects: WorkspaceProjectItem[];
  activeProjectId: string;
  mobileTab: string;
  onSelectProject: (id: string) => void;
}

export function WorkspaceListBar({
  isLeftPanelCollapsed,
  toggleLeftPanel,
  workspaceStatusTab,
  setWorkspaceStatusTab,
  activeProjectsCount,
  completedProjectsCount,
  disputedProjectsCount,
  allProjectsCount,
  filteredWorkspaceProjects,
  activeProjectId,
  mobileTab,
  onSelectProject,
}: WorkspaceListBarProps) {
  const { t } = useTranslation();

  return (
    <aside
      className={`flex flex-col bg-card border border-[var(--brand)]/30 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 flex-shrink-0 workspace-list-bar relative ${
        isLeftPanelCollapsed
          ? 'w-0 min-w-0 max-w-0 opacity-0 border-none p-0 m-0 pointer-events-none'
          : 'w-80 lg:w-[28%] xl:w-[24%] 2xl:w-[20%] max-w-[380px] min-w-[280px] opacity-100'
      } ${mobileTab === 'list' ? 'flex flex-1 w-full' : 'hidden lg:flex'}`}
    >
      {/* Sidebar Header & Filter Tabs */}
      <div className="p-3 border-b border-border bg-card/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--gb-cyan)] animate-pulse" />
            <h2 className="font-headline-sm text-xs uppercase tracking-wider font-extrabold text-foreground">
              {t('workspace.myWorkspaces', { defaultValue: 'Không gian làm việc' })}
            </h2>
          </div>
          <button
            type="button"
            onClick={toggleLeftPanel}
            className="p-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer hidden lg:flex items-center justify-center shadow-2xs"
            title={t('workspace.collapseRecentWorkspace', { defaultValue: 'Thu gọn danh sách' })}
          >
            <PanelLeftClose size={15} />
          </button>
        </div>

        {/* 4 Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
          {/* Active Tab */}
          <button
            type="button"
            onClick={() => setWorkspaceStatusTab('active')}
            className={`flex-1 relative flex flex-col items-center justify-center rounded-lg transition-all duration-150 cursor-pointer text-center select-none py-1.5 px-1 ${
              workspaceStatusTab === 'active'
                ? 'bg-emerald-600 text-white font-black shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 font-bold'
            }`}
            title={t('workspace.tabActive', { defaultValue: 'Đang làm' })}
          >
            <div className="flex items-center justify-center gap-1 w-full">
              <CheckCircle size={11} className="shrink-0" />
              {activeProjectsCount > 0 && (
                <span className={`min-w-[13px] h-3 px-1 flex items-center justify-center text-[9px] font-black rounded-full leading-none shrink-0 ${
                  workspaceStatusTab === 'active' ? 'bg-white/25 text-white' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {activeProjectsCount}
                </span>
              )}
            </div>
            <span className="text-[9px] tracking-tight leading-tight mt-0.5 truncate max-w-full font-black uppercase">
              {t('workspace.tabActive', { defaultValue: 'Đang làm' })}
            </span>
          </button>

          {/* Completed Tab */}
          <button
            type="button"
            onClick={() => setWorkspaceStatusTab('completed')}
            className={`flex-1 relative flex flex-col items-center justify-center rounded-lg transition-all duration-150 cursor-pointer text-center select-none py-1.5 px-1 ${
              workspaceStatusTab === 'completed'
                ? 'bg-blue-600 text-white font-black shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 font-bold'
            }`}
            title={t('workspace.tabCompleted', { defaultValue: 'Hoàn thành' })}
          >
            <div className="flex items-center justify-center gap-1 w-full">
              <Award size={11} className="shrink-0" />
              {completedProjectsCount > 0 && (
                <span className={`min-w-[13px] h-3 px-1 flex items-center justify-center text-[9px] font-black rounded-full leading-none shrink-0 ${
                  workspaceStatusTab === 'completed' ? 'bg-white/25 text-white' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                }`}>
                  {completedProjectsCount}
                </span>
              )}
            </div>
            <span className="text-[9px] tracking-tight leading-tight mt-0.5 truncate max-w-full font-black uppercase">
              {t('workspace.tabCompleted', { defaultValue: 'Hoàn thành' })}
            </span>
          </button>

          {/* Disputed Tab */}
          <button
            type="button"
            onClick={() => setWorkspaceStatusTab('disputed')}
            className={`flex-1 relative flex flex-col items-center justify-center rounded-lg transition-all duration-150 cursor-pointer text-center select-none py-1.5 px-1 ${
              workspaceStatusTab === 'disputed'
                ? 'bg-amber-600 text-white font-black shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 font-bold'
            }`}
            title={t('workspace.tabDisputed', { defaultValue: 'Tranh chấp' })}
          >
            <div className="flex items-center justify-center gap-1 w-full">
              <ShieldAlert size={11} className="shrink-0" />
              {disputedProjectsCount > 0 && (
                <span className={`min-w-[13px] h-3 px-1 flex items-center justify-center text-[9px] font-black rounded-full leading-none shrink-0 ${
                  workspaceStatusTab === 'disputed' ? 'bg-white/25 text-white' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}>
                  {disputedProjectsCount}
                </span>
              )}
            </div>
            <span className="text-[9px] tracking-tight leading-tight mt-0.5 truncate max-w-full font-black uppercase">
              {t('workspace.tabDisputed', { defaultValue: 'Tranh chấp' })}
            </span>
          </button>

          {/* All Tab */}
          <button
            type="button"
            onClick={() => setWorkspaceStatusTab('all')}
            className={`flex-1 relative flex flex-col items-center justify-center rounded-lg transition-all duration-150 cursor-pointer text-center select-none py-1.5 px-1 ${
              workspaceStatusTab === 'all'
                ? 'bg-slate-700 text-white font-black shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 font-bold'
            }`}
            title={t('workspace.tabAll', { defaultValue: 'Tất cả' })}
          >
            <div className="flex items-center justify-center gap-1 w-full">
              <Layers size={11} className="shrink-0" />
              {allProjectsCount > 0 && (
                <span className={`min-w-[13px] h-3 px-1 flex items-center justify-center text-[9px] font-black rounded-full leading-none shrink-0 ${
                  workspaceStatusTab === 'all' ? 'bg-white/25 text-white' : 'bg-muted-foreground/20 text-muted-foreground'
                }`}>
                  {allProjectsCount}
                </span>
              )}
            </div>
            <span className="text-[9px] tracking-tight leading-tight mt-0.5 truncate max-w-full font-black uppercase">
              {t('workspace.tabAll', { defaultValue: 'Tất cả' })}
            </span>
          </button>
        </div>
      </div>

      {/* List Body Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-card relative z-10 p-2">
        {filteredWorkspaceProjects.length === 0 ? (
          <div className="p-8 text-center text-xs font-semibold text-muted-foreground space-y-2">
            <p>{t('workspace.noProjectsInTab', { defaultValue: 'Không có dự án nào thuộc nhóm này.' })}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredWorkspaceProjects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj.id)}
                  className={`relative rounded-xl p-3 border transition-all duration-150 cursor-pointer select-none ${
                    isActive
                      ? 'bg-card border border-[var(--brand)]/80 shadow-2xs'
                      : proj.unread
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-l-4 border-l-emerald-500 border-y-emerald-500/20 border-r-emerald-500/20 hover:bg-emerald-500/15'
                        : 'bg-card/40 hover:bg-muted/50 border-transparent hover:border-border/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* UserAvatar Component directly */}
                    <div className="shrink-0 mt-0.5">
                      <UserAvatar
                        name={proj.partnerName}
                        src={proj.partnerAvatar}
                        userId={proj.partnerUserId}
                        size="md"
                      />
                    </div>

                    {/* Info Column */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Top Row: Name + Unread Dot + Timestamp */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-xs md:text-sm truncate leading-tight ${
                            proj.unread
                              ? 'font-black text-foreground'
                              : isActive
                                ? 'font-extrabold text-[var(--brand)]'
                                : 'font-bold text-foreground/90'
                          }`}>
                            {proj.partnerName}
                          </span>
                          {proj.unread && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Tin nhắn mới" />
                          )}
                        </div>

                        <span className={`text-[10px] shrink-0 font-semibold ${
                          proj.unread
                            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                            : isActive
                              ? 'text-[var(--brand)] font-bold'
                              : 'text-muted-foreground'
                        }`}>
                          {proj.time}
                        </span>
                      </div>

                      {/* Job Title Tag Pill */}
                      {proj.title && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/80 border border-border/50 text-muted-foreground text-[10px] font-medium max-w-full truncate">
                          <Briefcase size={10} className="shrink-0 text-muted-foreground/80" />
                          <span className="truncate">{proj.title}</span>
                        </div>
                      )}

                      {/* Message Snippet & Status Badge */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <p className={`text-xs truncate leading-snug flex-1 ${
                          proj.unread
                            ? 'font-black text-foreground'
                            : isActive
                              ? 'font-bold text-foreground'
                              : 'font-medium text-muted-foreground'
                        }`}>
                          {proj.latestMessage}
                        </p>

                        {/* Solid Full Dark Background Status Badges */}
                        {proj.status === ContractStatus.Disputed ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-black shrink-0 shadow-2xs">
                            <LockKeyhole size={9} /> {t('workspace.disputedBadge', { defaultValue: 'Tranh chấp' })}
                          </span>
                        ) : proj.status === ContractStatus.Cancelled ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-600 text-white text-[9px] font-black shrink-0 shadow-2xs">
                            <LockKeyhole size={9} /> {t('workspace.disputeClosedBadge', { defaultValue: 'Đã đóng' })}
                          </span>
                        ) : proj.status === ContractStatus.Completed ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black shrink-0 shadow-2xs">
                            <Award size={9} /> {t('workspace.completedBadge', { defaultValue: 'Hoàn thành' })}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black shrink-0 shadow-2xs">
                            <CheckCircle size={9} /> {t('workspace.activeBadge', { defaultValue: 'Đang làm' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
