import React from 'react';
import {
  Calendar,
  CalendarDays,
  Clock,
  Video,
  Mail,
  FileText,
  AlertTriangle,
  Loader2,
  X,
  AlertCircle,
  RefreshCw,
  Info,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ScheduleEvent } from '../../../api/scheduleAPI';
import type { GoogleMeetConnectionStatus } from '../../../api/googleMeetAPI';

export interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleMode: 'create' | 'edit' | 'cancel' | 'counter-create' | 'counter-edit';
  editingSchedule: ScheduleEvent | null;
  scheduleTitle: string;
  setScheduleTitle: (val: string) => void;
  scheduleDetails: string;
  setScheduleDetails: (val: string) => void;
  scheduleTime: string;
  setScheduleTime: (val: string) => void;
  scheduleReason: string;
  setScheduleReason: (val: string) => void;
  scheduleError: string;
  scheduleSaving: boolean;
  scheduleConflict: { version: number; remainingEdits: number } | null;
  midnightConfirmed: boolean;
  setMidnightConfirmed: (val: boolean) => void;
  scheduleAddGoogleMeet: boolean;
  setScheduleAddGoogleMeet: (val: boolean) => void;
  scheduleSendEmail: boolean;
  setScheduleSendEmail: (val: boolean) => void;
  googleMeetStatusLoading: boolean;
  googleMeetStatus: GoogleMeetConnectionStatus | null;
  googleMeetConnecting: boolean;
  connectGoogleMeet: () => void;
  confirmScheduleRetry: () => void;
  submitSchedule: () => void;
}

export const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({
  isOpen,
  onClose,
  scheduleMode,
  editingSchedule,
  scheduleTitle,
  setScheduleTitle,
  scheduleDetails,
  setScheduleDetails,
  scheduleTime,
  setScheduleTime,
  scheduleReason,
  setScheduleReason,
  scheduleError,
  scheduleSaving,
  scheduleConflict,
  midnightConfirmed,
  setMidnightConfirmed,
  scheduleAddGoogleMeet,
  setScheduleAddGoogleMeet,
  scheduleSendEmail,
  setScheduleSendEmail,
  googleMeetStatusLoading,
  googleMeetStatus,
  googleMeetConnecting,
  connectGoogleMeet,
  confirmScheduleRetry,
  submitSchedule,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const isCounter = scheduleMode.startsWith('counter');
  const isCancel = scheduleMode === 'cancel';

  const modalTitle = isCounter
    ? (editingSchedule?.agreementStatus === 0 || editingSchedule?.agreementStatus === 6
      ? 'Tùy chỉnh & Yêu cầu đổi lịch hẹn'
      : 'Chọn thời gian & ngày hẹn mới')
    : t(`schedule.${scheduleMode}`, scheduleMode === 'create' ? 'Lên lịch cuộc hẹn mới' : 'Chỉnh sửa lịch hẹn');

  const hourValue = scheduleTime ? Number(scheduleTime.slice(11, 13)) : null;
  const isLateNight = hourValue !== null && hourValue < 2;

  const remainingRequests = editingSchedule?.remainingRescheduleRequests ?? Math.max(0, 3 - (editingSchedule?.rescheduleRequestCount ?? 0));

  const isSubmitDisabled =
    scheduleSaving ||
    !!scheduleConflict ||
    googleMeetConnecting ||
    (scheduleMode === 'create' && scheduleAddGoogleMeet && !googleMeetStatus?.isConnected) ||
    (scheduleMode !== 'cancel' && isLateNight && !midnightConfirmed) ||
    (isCancel
      ? !scheduleReason.trim()
      : isCounter
        ? !scheduleTime
        : !scheduleTitle.trim() || !scheduleTime);

  const datePart = scheduleTime ? scheduleTime.slice(0, 10) : '';
  const timePart = scheduleTime ? scheduleTime.slice(11, 16) : '';

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      setScheduleTime('');
      return;
    }
    const time = timePart || '09:00';
    const combined = `${newDate}T${time}`;
    setScheduleTime(combined);
    setMidnightConfirmed(Number(time.slice(0, 2)) >= 2);
  };

  const handleTimeChange = (newTime: string) => {
    if (!newTime) {
      if (datePart) setScheduleTime(`${datePart}T09:00`);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const date = datePart || today;
    const combined = `${date}T${newTime}`;
    setScheduleTime(combined);
    setMidnightConfirmed(Number(newTime.slice(0, 2)) >= 2);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Main Modal Shell */}
      <div className="schedule-modal-shell relative w-full bg-card border border-border rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3.5 sm:pb-5 border-b border-border bg-muted/30 flex items-start justify-between gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <span className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20 shadow-sm">
              <Calendar size={20} className="sm:w-[22px] sm:h-[22px]" />
            </span>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 text-[9.5px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--brand)]">
                <Sparkles size={11} />
                <span>{isCancel ? 'HỦY BỎ LỊCH HẸN' : 'GIGBRIDGE SCHEDULING SYSTEM'}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight truncate">
                {modalTitle}
              </h2>
              <p className="text-[11px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock size={11} className="text-[var(--brand)] shrink-0" />
                <span>{t('schedule.vietnamTime', 'Múi giờ chuẩn: Việt Nam (GMT+7)')}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all border-none bg-transparent cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">

          {/* Mode: CANCEL */}
          {isCancel ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Lý do hủy cuộc hẹn <span className="text-red-500">*</span>
              </label>
              <textarea
                maxLength={1000}
                value={scheduleReason}
                onChange={e => setScheduleReason(e.target.value)}
                placeholder={t('schedule.reason', 'Vui lòng nhập lý do hủy lịch hẹn để thông báo đối tác...')}
                className="w-full min-h-[120px] bg-background/80 border border-border/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none transition-all resize-none shadow-inner"
              />
            </div>
          ) : (
            <>
              {/* Title Field (Not in counter mode) */}
              {!isCounter && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tiêu đề lịch hẹn <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--brand)]" />
                    <input
                      maxLength={200}
                      value={scheduleTitle}
                      onChange={e => setScheduleTitle(e.target.value)}
                      placeholder={t('schedule.title', 'Ví dụ: Phỏng vấn trao đổi chi tiết dự án')}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-background/80 border border-border/80 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>
              )}

              {/* Date & Time Field Card */}
              <div className="space-y-2.5 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-card shadow-sm">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                  <CalendarDays size={15} className="text-[var(--brand)]" />
                  <span>Thời gian diễn ra cuộc hẹn</span> <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Date Input */}
                  <div className="space-y-1 min-w-0">
                    <span className="block text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                      Ngày hẹn
                    </span>
                    <input
                      type="date"
                      value={datePart}
                      onChange={e => handleDateChange(e.target.value)}
                      className="schedule-datetime-input w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs sm:text-sm font-bold text-foreground focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] outline-none transition-all cursor-pointer"
                    />
                  </div>

                  {/* Time Input */}
                  <div className="space-y-1 min-w-0">
                    <span className="block text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                      Giờ hẹn (ICT)
                    </span>
                    <input
                      type="time"
                      value={timePart}
                      onChange={e => handleTimeChange(e.target.value)}
                      className="schedule-datetime-input w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs sm:text-sm font-bold text-foreground focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] outline-none transition-all cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Late night / Midnight warning */}
              {scheduleTime && isLateNight && (
                <div className="p-[1.5px] rounded-2xl bg-gradient-to-r from-amber-500 via-amber-500/40 to-transparent shadow-sm">
                  <div className="p-4 rounded-[calc(1rem-1.5px)] bg-amber-500/15 text-foreground space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={17} className="shrink-0 mt-0.5 text-amber-500" />
                      <span className="font-bold leading-relaxed text-foreground">
                        Lịch hẹn bắt đầu vào khoảng nửa đêm (00:00 - 02:00 sáng tại Việt Nam). Vui lòng xác nhận bạn và đối tác đã thống nhất khung giờ này.
                      </span>
                    </div>
                    <label className="flex items-center gap-2.5 font-bold cursor-pointer pt-2 text-foreground border-t border-amber-500/20">
                      <input
                        type="checkbox"
                        checked={midnightConfirmed}
                        onChange={e => setMidnightConfirmed(e.target.checked)}
                        className="w-4 h-4 rounded border-amber-500/60 text-[var(--brand)] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-foreground">Tôi đã hiểu và muốn tiếp tục đặt lịch</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Counter Request Remaining Badge */}
              {scheduleMode === 'counter-create' && editingSchedule && (editingSchedule.agreementStatus === 0 || editingSchedule.agreementStatus === 6) && (
                <div className="p-3.5 rounded-2xl bg-[var(--brand)]/10 border border-[var(--brand)]/30 flex items-start gap-2.5 text-xs text-[var(--brand)] font-semibold shadow-sm">
                  <Info size={17} className="shrink-0 mt-0.5" />
                  <span>
                    Khách hàng có thể Chấp nhận hoặc Từ chối yêu cầu này. Bạn còn <strong>{remainingRequests} / 3</strong> lượt gửi yêu cầu đổi lịch.
                  </span>
                </div>
              )}

              {/* Details Field (Not in counter mode) */}
              {!isCounter && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Ghi chú & Nội dung cuộc họp
                  </label>
                  <textarea
                    maxLength={4000}
                    value={scheduleDetails}
                    onChange={e => setScheduleDetails(e.target.value)}
                    placeholder={t('schedule.details', 'Nhập chuẩn bị cần thiết hoặc link tài liệu nếu có...')}
                    className="w-full min-h-[100px] bg-background/80 border border-border/80 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] outline-none transition-all resize-none shadow-inner"
                  />
                </div>
              )}

              {/* Create Mode Checkboxes */}
              {scheduleMode === 'create' && (
                <>
                  {/* Email Invite Checkbox Card */}
                  <label className="flex items-start gap-3.5 p-4 rounded-2xl border border-border/80 bg-background/80 hover:bg-muted/40 transition-all cursor-pointer shadow-sm">
                    <input
                      type="checkbox"
                      checked={scheduleSendEmail}
                      onChange={e => setScheduleSendEmail(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-border text-[var(--brand)] focus:ring-0 cursor-pointer mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <Mail size={14} className="text-[var(--brand)]" />
                        Gửi thư mời họp qua Email
                      </span>
                      <span className="block text-[11px] font-medium text-muted-foreground">
                        Tự động gửi email thông báo kèm file sự kiện (.ics) cho cả hai bên khi hoàn tất.
                      </span>
                    </div>
                  </label>

                  {/* Google Meet Card */}
                  <div className="p-4.5 rounded-2xl border border-emerald-500/30 bg-card space-y-3 shadow-sm">
                    <label className="flex items-center gap-3 text-xs font-bold text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleAddGoogleMeet}
                        onChange={e => setScheduleAddGoogleMeet(e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-border text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <Video size={17} className="text-emerald-500" />
                      <span>{t('schedule.addGoogleMeet', 'Tạo đường link họp tự động Google Meet')}</span>
                    </label>

                    {scheduleAddGoogleMeet && (
                      <div className="pl-7 pt-2 border-t border-emerald-500/20">
                        {googleMeetStatusLoading ? (
                          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <Loader2 size={14} className="animate-spin text-emerald-500" />
                            Đang kiểm tra kết nối Google...
                          </p>
                        ) : googleMeetStatus?.isConnected ? (
                          <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30 shadow-inner">
                            <ShieldCheck size={16} />
                            <span>{t('schedule.connectedAs', { email: googleMeetStatus.googleEmail || 'Google Account' })}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={connectGoogleMeet}
                            disabled={googleMeetConnecting}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                          >
                            {googleMeetConnecting ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Đang kết nối...</span>
                              </>
                            ) : (
                              <>
                                <Video size={15} />
                                <span>{googleMeetStatus?.needsReconnect ? t('schedule.reconnectGoogle') : t('schedule.connectGoogle')}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Edit Mode Warning */}
              {scheduleMode === 'edit' && editingSchedule?.remainingEdits === 1 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  Lưu thay đổi này sẽ sử dụng lượt chỉnh sửa cuối cùng của bạn.
                </div>
              )}
            </>
          )}

          {/* Error Message */}
          {scheduleError && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{scheduleError}</span>
            </div>
          )}

          {/* Conflict Retry */}
          {scheduleConflict && (
            <button
              disabled={scheduleMode === 'edit' && scheduleConflict.remainingEdits === 0}
              onClick={confirmScheduleRetry}
              className="w-full py-3 px-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <RefreshCw size={15} />
              <span>
                Thử lại với phiên bản mới hơn v{scheduleConflict.version}
                {scheduleConflict.remainingEdits === 1 ? ' (Lượt sửa cuối cùng)' : ''}
              </span>
            </button>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="relative z-10 p-3.5 sm:p-5 border-t border-border/60 bg-muted/40 flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl border border-border bg-background hover:bg-muted text-muted-foreground font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-sm"
          >
            Đóng
          </button>

          <button
            type="button"
            disabled={isSubmitDisabled}
            onClick={submitSchedule}
            className={`flex-1 py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider text-white transition-all cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isCancel
              ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20'
              : 'bg-[var(--brand)] hover:bg-[var(--brand)]/90 shadow-md shadow-blue-500/20 active:scale-[0.98]'
              }`}
          >
            {scheduleSaving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>{t('schedule.saving', 'Đang lưu...')}</span>
              </>
            ) : isCancel ? (
              t('schedule.cancel', 'Xác nhận hủy')
            ) : scheduleMode === 'counter-create' ? (
              <>
                <span>Gửi yêu cầu</span>
                <ArrowRight size={14} />
              </>
            ) : scheduleMode === 'counter-edit' ? (
              <>
                <span>Cập nhật yêu cầu</span>
                <ArrowRight size={14} />
              </>
            ) : (
              <>
                <span>{t('schedule.save', 'Xác nhận & Lưu')}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
