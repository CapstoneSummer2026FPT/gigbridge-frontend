import { useState, useMemo, useEffect } from 'react';
import {
  Scale,
  UserCheck,
  Briefcase,
  Coins,
  FileSignature,
  AlertCircle,
  ArrowRight,
  Shield,
  Award,
  ShieldCheck,
  Lock,
  MessageSquare,
  Copy,
  Check,
  CheckCircle,
  Eye,
  Code2,
  FileText,
} from 'lucide-react';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { AdminUserDto } from '../../../../types/models/User';
import {
  type AuditLog,
  safeParseJson,
  formatActionTitle,
  formatResourceText,
  formatFieldLabel,
  isUuidString,
} from '../../utils/systemTrackingUtils';

export interface AuditActivityDetailViewProps {
  log: AuditLog;
  globalViewMode: 'visual' | 'json';
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  userMap?: Map<string, AdminUserDto>;
}

const formatLogDetails = (log: AuditLog, t: (key: string, fallback?: string) => string): string => {
  if (!log.details) return `Ghi nhận hoạt động ${formatActionTitle(log.action, t)} thành công.`;

  // If details is backend raw technical Before/After string
  if (log.details.includes('Before:') && log.details.includes('After:')) {
    const act = log.action.toLowerCase();
    if (act.includes('retry')) {
      return `Yêu cầu xử lý lại thao tác (${formatActionTitle(log.action, t)}) cho ${formatResourceText(log, t)} đã được gửi đến cổng thanh toán/ngân hàng.`;
    }
    if (act.includes('withdrawal')) {
      return `Thao tác quản trị trên lệnh rút tiền (${formatActionTitle(log.action, t)}) cho ${formatResourceText(log, t)} đã được thực hiện.`;
    }
    if (act.includes('approve') || act.includes('approved')) {
      return `Phê duyệt yêu cầu ${formatResourceText(log, t)} thành công bởi quản trị viên.`;
    }
    if (act.includes('reject') || act.includes('rejected')) {
      return `Từ chối yêu cầu ${formatResourceText(log, t)} bởi quản trị viên.`;
    }
    return `Hoạt động ${formatActionTitle(log.action, t)} cho đối tượng ${formatResourceText(log, t)} đã được ghi nhận vào nhật ký kiểm toán hệ thống.`;
  }

  return log.details;
};

export function AuditActivityDetailView({
  log,
  globalViewMode,
  onCopy,
  copiedId,
  userMap,
}: AuditActivityDetailViewProps) {
  const { t } = useTranslation(['admin', 'common']);
  const [localViewMode, setLocalViewMode] = useState<'visual' | 'json'>(globalViewMode);

  useEffect(() => {
    setLocalViewMode(globalViewMode);
  }, [globalViewMode]);

  const { parsedNew, parsedOld } = useMemo(() => {
    let newObj = safeParseJson(log.newValues);
    let oldObj = safeParseJson(log.oldValues);

    if (!newObj && log.details) {
      const afterIdx = log.details.indexOf('After: ');
      if (afterIdx !== -1) {
        let afterStr = log.details.substring(afterIdx + 7);
        const corrIdx = afterStr.indexOf(' · Correlation:');
        if (corrIdx !== -1) {
          afterStr = afterStr.substring(0, corrIdx);
        }
        afterStr = afterStr.trim();
        if (afterStr !== 'none' && afterStr !== 'null') {
          newObj = safeParseJson(afterStr);
        }
      }
    }

    if (!oldObj && log.details) {
      const beforeIdx = log.details.indexOf('Before: ');
      if (beforeIdx !== -1) {
        let beforeStr = log.details.substring(beforeIdx + 8);
        const afterIdx = beforeStr.indexOf(' · After:');
        if (afterIdx !== -1) {
          beforeStr = beforeStr.substring(0, afterIdx);
        }
        beforeStr = beforeStr.trim();
        if (beforeStr !== 'none' && beforeStr !== 'null') {
          oldObj = safeParseJson(beforeStr);
        }
      }
    }

    return { parsedNew: newObj, parsedOld: oldObj };
  }, [log.newValues, log.oldValues, log.details]);

  const renderVisualBody = () => {
    const act = log.action.toLowerCase();
    const entity = (log.entityType || '').toLowerCase();

    // 1. INVESTIGATION & REPORT ACTIONS
    if (act.includes('investigation') || act.includes('report') || entity.includes('report')) {
      const contractId = parsedNew?.contractId || parsedNew?.ContractId;
      const reporterId = parsedNew?.reporterId || parsedNew?.ReporterId;
      const respondentId = parsedNew?.respondentId || parsedNew?.RespondentId;
      const messageCount = parsedNew?.messageCount ?? parsedNew?.MessageCount;
      const reportReason = parsedNew?.reason || parsedNew?.Reason || parsedNew?.description;

      const reporterUser = reporterId && userMap ? userMap.get(String(reporterId).toLowerCase()) : null;
      const reporterName = reporterUser?.fullName || (reporterId ? `Người dùng #${String(reporterId).slice(0, 8)}` : 'Người gửi báo cáo');
      const reporterEmail = reporterUser?.email;
      const reporterRole = reporterUser?.role === 1 ? 'Freelancer' : reporterUser?.role === 0 ? 'Client' : reporterUser?.role === 2 ? 'Admin' : null;

      const respondentUser = respondentId && userMap ? userMap.get(String(respondentId).toLowerCase()) : null;
      const respondentName = respondentUser?.fullName || (respondentId ? `Người dùng #${String(respondentId).slice(0, 8)}` : 'Người bị báo cáo');
      const respondentEmail = respondentUser?.email;
      const respondentRole = respondentUser?.role === 1 ? 'Freelancer' : respondentUser?.role === 0 ? 'Client' : respondentUser?.role === 2 ? 'Admin' : null;

      return (
        <div className="activity-visual-box space-y-3">
          {/* Header Dossier */}
          <div className="p-3.5 bg-surface rounded-lg border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-600 text-white shadow-sm">
                <AlertCircle size={18} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-primary">
                  {formatActionTitle(log.action, t)}
                </h4>
                <p className="text-[11px] text-muted">
                  {formatResourceText(log, t)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-600 text-white shadow-sm">
                {t('adminSystemTracking.entityTypes.ReportContract', 'Hồ sơ điều tra vi phạm')}
              </span>
            </div>
          </div>

          {/* Parties & Contract Linked Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {contractId && (
              <div className="p-3 rounded-lg bg-surface border border-border flex flex-col justify-between gap-1.5">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{t('adminSystemTracking.contractAction', 'Hợp đồng liên quan')}</span>
                <div className="flex items-center justify-between gap-1 bg-surface-muted px-2 py-1 rounded font-mono text-xs">
                  <code className="text-brand font-bold truncate max-w-[140px]" title={contractId}>
                    #{contractId.slice(0, 8)}...
                  </code>
                  <button
                    onClick={() => onCopy(contractId, `cnt_${log.id}`)}
                    className="p-1 text-muted hover:text-primary transition-colors flex-shrink-0"
                    title="Sao chép mã hợp đồng"
                  >
                    {copiedId === `cnt_${log.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            )}

            {reporterId && (
              <div className="p-3 rounded-lg bg-surface border border-border flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{t('adminSystemTracking.reporterLabel', 'Người gửi báo cáo (Reporter)')}</span>
                  {reporterRole && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm ${reporterRole === 'Freelancer' ? 'bg-sky-600' : 'bg-amber-600'}`}>
                      {reporterRole}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <UserAvatar name={reporterName || 'Reporter'} src={reporterUser?.avatar} userId={reporterId} size="sm" className="!w-8 !h-8 !text-xs flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-primary truncate" title={reporterName}>
                      {reporterName}
                    </div>
                    {reporterEmail && (
                      <div className="text-[11px] text-secondary truncate" title={reporterEmail}>
                        {reporterEmail}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-1 font-mono text-[10px] text-muted mt-0.5">
                      <span title={reporterId}>#{reporterId.slice(0, 8)}...</span>
                      <button
                        onClick={() => onCopy(reporterId, `rep_${log.id}`)}
                        className="p-0.5 text-muted hover:text-primary transition-colors flex-shrink-0"
                        title="Sao chép ID"
                      >
                        {copiedId === `rep_${log.id}` ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {respondentId && (
              <div className="p-3 rounded-lg bg-surface border border-border flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{t('adminSystemTracking.respondentLabel', 'Người bị báo cáo (Respondent)')}</span>
                  {respondentRole && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm ${respondentRole === 'Freelancer' ? 'bg-sky-600' : 'bg-amber-600'}`}>
                      {respondentRole}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <UserAvatar name={respondentName || 'Respondent'} src={respondentUser?.avatar} userId={respondentId} size="sm" className="!w-8 !h-8 !text-xs flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-primary truncate" title={respondentName}>
                      {respondentName}
                    </div>
                    {respondentEmail && (
                      <div className="text-[11px] text-secondary truncate" title={respondentEmail}>
                        {respondentEmail}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-1 font-mono text-[10px] text-muted mt-0.5">
                      <span title={respondentId}>#{respondentId.slice(0, 8)}...</span>
                      <button
                        onClick={() => onCopy(respondentId, `res_${log.id}`)}
                        className="p-0.5 text-muted hover:text-primary transition-colors flex-shrink-0"
                        title="Sao chép ID"
                      >
                        {copiedId === `res_${log.id}` ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Evidence Messages Stat */}
          {messageCount != null && (
            <div className="p-3 bg-brand/5 border border-brand/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <MessageSquare size={16} className="text-brand flex-shrink-0" />
                <span>Số lượng tin nhắn hội thoại đã điều tra đối soát:</span>
              </div>
              <span className="px-3 py-1 bg-brand text-white text-xs font-extrabold rounded-full shadow-sm">
                {messageCount} tin nhắn
              </span>
            </div>
          )}

          {reportReason && (
            <div className="p-3 rounded-lg bg-surface border-l-4 border-l-amber-500 border-border text-xs text-secondary italic">
              &ldquo;{reportReason}&rdquo;
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-surface-muted/60 border border-border text-xs text-secondary leading-relaxed">
            Admin đã truy cập và kiểm tra toàn bộ dữ liệu điều tra, tin nhắn trao đổi và bằng chứng liên quan đến báo cáo hợp đồng này.
          </div>
        </div>
      );
    }

    // 2. DISPUTES
    if (act.includes('dispute')) {
      const resolution = parsedNew?.resolution || parsedNew?.Resolution;
      const resolutionNote = parsedNew?.resolutionNote || parsedNew?.ResolutionNote;
      const freelancerAward = parsedNew?.totalFreelancerAward ?? parsedNew?.TotalFreelancerAward;
      const clientRefund = parsedNew?.totalClientRefund ?? parsedNew?.TotalClientRefund;
      const contractAction = parsedNew?.contractAction || parsedNew?.ContractAction;
      const escrowBefore = parsedNew?.escrowBefore ?? parsedNew?.EscrowBefore;
      const escrowAfter = parsedNew?.escrowAfter ?? parsedNew?.EscrowAfter;
      const clientViolation = parsedNew?.clientViolation || parsedNew?.ClientViolation;

      const resolutionDisplay =
        resolution === 'FreelancerFavored' ? { label: t('adminSystemTracking.verdictFreelancerFavored', 'Freelancer Thắng (Freelancer Favored)'), icon: <Award size={15} className="text-white" />, badgeBg: 'bg-emerald-600 text-white shadow-sm' } :
        resolution === 'ClientFavored' ? { label: t('adminSystemTracking.verdictClientFavored', 'Khách Hàng Thắng (Client Favored)'), icon: <ShieldCheck size={15} className="text-white" />, badgeBg: 'bg-sky-600 text-white shadow-sm' } :
        resolution === 'Split' ? { label: t('adminSystemTracking.verdictSplit', 'Hòa Giải Chia Tỷ Lệ (Split Award)'), icon: <Scale size={15} className="text-white" />, badgeBg: 'bg-amber-600 text-white shadow-sm' } :
        { label: resolution || formatActionTitle(log.action, t), icon: <CheckCircle size={15} className="text-white" />, badgeBg: 'bg-brand text-white shadow-sm' };

      const contractActionLabel = contractAction
        ? t(`adminSystemTracking.contractActions.${contractAction}`, contractAction)
        : null;

      return (
        <div className="activity-visual-box space-y-3">
          {/* Dispute Verdict Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-surface rounded-lg border border-border">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${resolutionDisplay.badgeBg}`}>
                {resolutionDisplay.icon}
                <span>{resolutionDisplay.label}</span>
              </span>
              {contractActionLabel && (
                <span className="px-2 py-0.5 rounded text-[11px] font-extrabold uppercase bg-red-600 text-white shadow-sm">
                  {t('adminSystemTracking.contractAction', 'Hợp đồng')}: {contractActionLabel}
                </span>
              )}
            </div>
            <span className="text-xs text-muted font-mono">{formatResourceText(log, t)}</span>
          </div>

          {/* Quotation / Admin Note */}
          {resolutionNote && (
            <div className="p-3 rounded-lg bg-surface-muted border border-border flex items-start gap-2.5 text-xs text-secondary italic">
              <MessageSquare size={14} className="text-brand flex-shrink-0 mt-0.5" />
              <span>&ldquo;{resolutionNote}&rdquo;</span>
            </div>
          )}

          {/* Financial Breakdown Grid */}
          {(freelancerAward != null || clientRefund != null || escrowBefore != null) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {freelancerAward != null && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-col justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-800 dark:text-emerald-300">
                    <Coins size={13} />
                    <span>{t('adminSystemTracking.freelancerAward', 'Freelancer Nhận')}</span>
                  </div>
                  <span className="text-base font-black text-emerald-600 font-mono">+{Number(freelancerAward).toLocaleString()} GIG</span>
                </div>
              )}
              {clientRefund != null && (
                <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 flex flex-col justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-sky-800 dark:text-sky-300">
                    <Coins size={13} />
                    <span>{t('adminSystemTracking.clientRefund', 'Hoàn Lại Client')}</span>
                  </div>
                  <span className="text-base font-black text-sky-600 font-mono">{Number(clientRefund).toLocaleString()} GIG</span>
                </div>
              )}
              {escrowBefore != null && (
                <div className="p-3 rounded-lg bg-surface border border-border flex flex-col justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-muted">
                    <Lock size={13} />
                    <span>{t('adminSystemTracking.escrowBalance', 'Ký Quỹ Escrow')}</span>
                  </div>
                  <span className="text-xs font-bold text-primary font-mono">{Number(escrowBefore).toLocaleString()} → {Number(escrowAfter ?? 0).toLocaleString()} GIG</span>
                </div>
              )}
            </div>
          )}

          {/* Client Violation Warning */}
          {clientViolation && clientViolation.ViolationCount > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-semibold">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{t('adminSystemTracking.violationRecorded', 'Ghi nhận vi phạm tài khoản')} ({t('adminSystemTracking.totalViolations', 'Tổng')}: <strong>{clientViolation.ViolationCount}</strong>)</span>
            </div>
          )}
        </div>
      );
    }

    // 3. USER / ACCOUNT / ELO
    if (act.includes('user') || act.includes('account') || act.includes('elo')) {
      const oldStatus = parsedOld?.status ?? parsedOld?.isActive;
      const newStatus = parsedNew?.status ?? parsedNew?.isActive;
      const oldElo = parsedOld?.eloRating ?? parsedOld?.elo ?? parsedOld?.EloRating;
      const newElo = parsedNew?.eloRating ?? parsedNew?.elo ?? parsedNew?.EloRating;
      const eloDiff = (newElo != null && oldElo != null) ? Number(newElo) - Number(oldElo) : null;
      const roleName = parsedNew?.role || parsedNew?.Role;

      return (
        <div className="activity-visual-box space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface rounded-lg border border-border">
            <div className="flex items-center gap-2.5">
              <UserAvatar name={log.userName || 'User'} size="md" className="!w-9 !h-9 !text-xs flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-primary">{log.userName}</div>
                <div className="text-[11px] text-muted">{log.resource}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-brand text-white shadow-sm">
                {formatActionTitle(log.action, t)}
              </span>
              {roleName && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-700 text-white">
                  {roleName}
                </span>
              )}
            </div>
          </div>

          {/* Elo change or Status Transition grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {eloDiff !== null && (
              <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted font-bold">
                  <Award size={14} className="text-amber-500" />
                  <span>{t('adminSystemTracking.eloChange', 'Điểm Elo')}:</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                  <span className="text-muted line-through">{oldElo}</span>
                  <ArrowRight size={12} className="text-muted" />
                  <span className="text-primary">{newElo}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold text-white ${eloDiff >= 0 ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {eloDiff >= 0 ? `+${eloDiff}` : eloDiff}
                  </span>
                </div>
              </div>
            )}

            {newStatus !== undefined && (
              <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
                <span className="text-xs text-muted font-bold">{t('adminSystemTracking.statusChange', 'Trạng thái')}:</span>
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                  {oldStatus !== undefined && oldStatus !== newStatus && (
                    <>
                      <span className="text-muted line-through">{String(oldStatus)}</span>
                      <ArrowRight size={12} className="text-muted" />
                    </>
                  )}
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-600 text-white shadow-sm">
                    {String(newStatus)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-surface-muted/70 border border-border text-xs text-secondary leading-relaxed flex items-center gap-2">
            <Shield size={14} className="text-brand flex-shrink-0" />
            <span>{formatLogDetails(log, t)}</span>
          </div>
        </div>
      );
    }

    // 4. JOBS & PROPOSALS
    if (act.includes('job') || act.includes('proposal')) {
      const budget = parsedNew?.budget ?? parsedNew?.Budget ?? parsedNew?.price;
      const jobTitle = parsedNew?.title || parsedNew?.jobTitle || log.resource;
      const status = parsedNew?.status || parsedNew?.Status;

      return (
        <div className="activity-visual-box space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-surface rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-sm">
                {act.includes('job') ? <Briefcase size={16} /> : <FileText size={16} />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-primary">{jobTitle}</h4>
                <p className="text-[11px] text-muted">{formatActionTitle(log.action, t)}</p>
              </div>
            </div>

            {budget != null && (
              <div className="text-right">
                <span className="text-[10px] text-muted uppercase font-bold block">{t('adminSystemTracking.budgetLabel', 'Ngân sách')}</span>
                <span className="text-sm font-black text-brand font-mono">{Number(budget).toLocaleString()} GIG</span>
              </div>
            )}
          </div>

          {status && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted font-bold">{t('adminSystemTracking.statusChange', 'Trạng thái')}:</span>
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-brand text-white shadow-sm">
                {status}
              </span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-surface-muted/70 border border-border text-xs text-secondary leading-relaxed flex items-center gap-2">
            <Shield size={14} className="text-brand flex-shrink-0" />
            <span>{formatLogDetails(log, t)}</span>
          </div>
        </div>
      );
    }

    // 5. CONTRACTS & MILESTONES
    if (act.includes('contract') || act.includes('milestone')) {
      const amount = parsedNew?.amount ?? parsedNew?.Amount ?? parsedNew?.totalAmount;
      const milestoneTitle = parsedNew?.milestoneTitle || parsedNew?.MilestoneTitle;

      return (
        <div className="activity-visual-box space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-surface rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-sm">
                <FileSignature size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-primary">{milestoneTitle || formatResourceText(log, t)}</h4>
                <p className="text-[11px] text-muted">{formatActionTitle(log.action, t)}</p>
              </div>
            </div>

            {amount != null && (
              <div className="text-right">
                <span className="text-[10px] text-muted uppercase font-bold block">{t('adminSystemTracking.financialAmount', 'Số tiền')}</span>
                <span className="text-sm font-black text-emerald-600 font-mono">{Number(amount).toLocaleString()} GIG</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-surface-muted/70 border border-border text-xs text-secondary leading-relaxed flex items-center gap-2">
            <Shield size={14} className="text-brand flex-shrink-0" />
            <span>{formatLogDetails(log, t)}</span>
          </div>
        </div>
      );
    }

    // 6. FINANCIAL & WALLET
    if (act.includes('wallet') || act.includes('escrow') || act.includes('withdrawal') || act.includes('payment')) {
      const amount = parsedNew?.amount ?? parsedNew?.Amount ?? parsedNew?.value;
      const status = parsedNew?.status ?? parsedNew?.Status;
      const isRetry = act.includes('retry');

      return (
        <div className="activity-visual-box space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-surface rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-sm">
                <Coins size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-primary">{formatActionTitle(log.action, t)}</h4>
                <p className="text-[11px] text-muted">{formatResourceText(log, t)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isRetry && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-600 text-white shadow-sm">
                  Thử lại giao dịch (Retry)
                </span>
              )}
              {status && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-brand text-white shadow-sm">
                  {status}
                </span>
              )}
              {amount != null && (
                <div className="text-right">
                  <span className="text-[10px] text-muted uppercase font-bold block">{t('adminSystemTracking.financialAmount', 'Số tiền')}</span>
                  <span className="text-sm font-black text-emerald-600 font-mono">+{Number(amount).toLocaleString()} GIG</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-muted/70 border border-border text-xs text-secondary leading-relaxed flex items-center gap-2">
            <Shield size={14} className="text-brand flex-shrink-0" />
            <span>{formatLogDetails(log, t)}</span>
          </div>
        </div>
      );
    }

    // 7. GENERIC STRUCTURED DIFF / PARAMETER BREAKDOWN
    if (parsedNew && Object.keys(parsedNew).length > 0) {
      const keys = Object.keys(parsedNew);
      return (
        <div className="activity-visual-box space-y-3">
          <div className="flex items-center justify-between text-xs p-2.5 bg-surface rounded-lg border border-border">
            <span className="font-bold text-primary">{formatActionTitle(log.action, t)}</span>
            <span className="text-muted font-mono">{formatResourceText(log, t)}</span>
          </div>

          <div className="activity-diff-grid">
            {keys.map(key => {
              const newVal = parsedNew[key];
              const oldVal = parsedOld ? parsedOld[key] : undefined;
              const isUuid = isUuidString(newVal);

              return (
                <div key={key} className="activity-diff-item flex flex-col justify-between gap-1">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                    {formatFieldLabel(key)}
                  </span>

                  {typeof newVal === 'object' && newVal !== null ? (
                    <span className="text-xs text-primary font-mono truncate block mt-0.5 bg-surface-muted p-1 rounded">
                      {JSON.stringify(newVal)}
                    </span>
                  ) : isUuid ? (
                    (() => {
                      const matchedUser = userMap ? userMap.get(String(newVal).toLowerCase()) : null;
                      return matchedUser ? (
                        <div className="flex items-center gap-2 mt-1 p-1 bg-surface-muted rounded">
                          <UserAvatar name={matchedUser.fullName || 'User'} src={matchedUser.avatar} userId={String(newVal)} size="sm" className="!w-6 !h-6 !text-[10px] flex-shrink-0" />
                          <div className="flex-1 min-w-0 truncate">
                            <div className="text-xs font-bold text-primary truncate">{matchedUser.fullName}</div>
                            <div className="text-[10px] text-muted font-mono truncate">{matchedUser.email || `#${String(newVal).slice(0, 8)}...`}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1 mt-0.5 bg-surface-muted px-2 py-0.5 rounded font-mono text-xs">
                          <code className="text-primary font-bold truncate max-w-[150px]" title={String(newVal)}>
                            #{String(newVal).slice(0, 8)}...
                          </code>
                          <button
                            onClick={() => onCopy(String(newVal), `fld_${key}_${log.id}`)}
                            className="p-0.5 text-muted hover:text-primary transition-colors flex-shrink-0"
                            title="Sao chép ID"
                          >
                            {copiedId === `fld_${key}_${log.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5 truncate font-mono text-xs">
                      {oldVal !== undefined && oldVal !== newVal && (
                        <>
                          <span className="text-red-600 line-through text-[11px] font-bold">{String(oldVal)}</span>
                          <ArrowRight size={11} className="text-muted flex-shrink-0" />
                        </>
                      )}
                      <span className="text-primary font-bold">{String(newVal ?? 'null')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 8. CLEAN HUMAN READABLE FALLBACK
    return (
      <div className="p-3.5 rounded-lg bg-surface border border-border text-xs text-primary leading-relaxed flex items-center gap-2">
        <Shield size={16} className="text-brand flex-shrink-0" />
        <span>Ghi nhận hoạt động <strong>{formatActionTitle(log.action, t)}</strong> cho đối tượng <strong>{formatResourceText(log, t)}</strong>.</span>
      </div>
    );
  };

  const renderJsonBody = () => {
    const jsonFormatted = JSON.stringify(
      log.newValues || parsedNew || (log.oldValues ? { oldValues: log.oldValues, newValues: log.newValues } : { details: log.details }),
      null,
      2
    );

    return (
      <div className="activity-json-box">
        <div className="activity-json-bar">
          <div className="flex items-center gap-1.5">
            <Code2 size={12} className="text-sky-400" />
            <span>{t('adminSystemTracking.structuredPayload', 'Structured Payload (JSON)')}</span>
          </div>
          <button
            onClick={() => onCopy(jsonFormatted, `json_${log.id}`)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-white transition-all font-semibold"
          >
            {copiedId === `json_${log.id}` ? (
              <>
                <Check size={11} className="text-emerald-400" />
                <span className="text-emerald-400">{t('adminSystemTracking.copied', 'Đã chép')}</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>{t('adminSystemTracking.copyJson', 'Sao chép JSON')}</span>
              </>
            )}
          </button>
        </div>
        <pre className="activity-json-code">
          {jsonFormatted}
        </pre>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2.5">
        <div className="activity-view-switcher">
          <button
            onClick={() => setLocalViewMode('visual')}
            className={localViewMode === 'visual' ? 'active' : ''}
            title={t('adminSystemTracking.viewVisual', 'Xem giao diện trực quan')}
          >
            <Eye size={12} />
            <span>{t('adminSystemTracking.visual', 'Trực quan')}</span>
          </button>
          <button
            onClick={() => setLocalViewMode('json')}
            className={localViewMode === 'json' ? 'active' : ''}
            title={t('adminSystemTracking.viewJson', 'Xem mã JSON')}
          >
            <Code2 size={12} />
            <span>JSON</span>
          </button>
        </div>

        <span className="text-xs text-muted whitespace-nowrap font-mono">
          {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {localViewMode === 'visual' ? renderVisualBody() : renderJsonBody()}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted pt-2.5 border-t border-border">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span><strong>{t('adminSystemTracking.resource', 'Tài nguyên')}:</strong> <code className="text-primary font-mono">{formatResourceText(log, t)}</code></span>
          <span>•</span>
          <span><strong>IP:</strong> {log.ipAddress}</span>
        </div>
        {log.correlationId && (
          <button
            onClick={() => onCopy(log.correlationId || '', `corr_${log.id}`)}
            className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-brand font-mono transition-colors"
            title={t('adminSystemTracking.copyCid', 'Sao chép Correlation ID')}
          >
            <span>CID: {log.correlationId.slice(0, 8)}...</span>
            {copiedId === `corr_${log.id}` ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
          </button>
        )}
      </div>
    </div>
  );
}
