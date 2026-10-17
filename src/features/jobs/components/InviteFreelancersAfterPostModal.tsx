import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, LoaderCircle, MapPin, Search, Send, Sparkles, UserPlus, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { jobInvitationAPI } from '../../../api/jobInvitationAPI';
import type { FreelancerSummaryDto } from '../../../types/models/Profile';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { showValidationToast } from '../../../shared/utils/validationToast';

interface InviteFreelancersAfterPostModalProps {
  jobPostId: string;
  jobTitle?: string;
  onClose: () => void;
}

const getFreelancerProfileId = (freelancer: FreelancerSummaryDto): string =>
  freelancer.freelancerProfilesId;

const getFreelancerName = (freelancer: FreelancerSummaryDto): string =>
  freelancer.userFullName || freelancer.title || 'Freelancer';

export function InviteFreelancersAfterPostModal({
  jobPostId,
  jobTitle,
  onClose,
}: InviteFreelancersAfterPostModalProps) {
  const { t } = useTranslation('jobs');
  const [freelancers, setFreelancers] = useState<FreelancerSummaryDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const candidatesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadFreelancers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await profileGetAPI.getFreelancers({
          page: 1,
          pageSize: 50,
          search: query.trim() || undefined,
          sort: 'featured',
        });
        if (!response.success || !response.data) {
          throw new Error(response.message || t('inviteModal.unableToLoad', 'Không thể tải danh sách ứng viên.'));
        }

        if (isMounted) {
          setFreelancers(
            response.data.items.filter(freelancer => getFreelancerProfileId(freelancer)),
          );
        }
      } catch (err) {
        if (!isMounted) return;
        setFreelancers([]);
        setError(err instanceof Error ? err.message : t('inviteModal.unableToLoad', 'Không thể tải danh sách ứng viên.'));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadFreelancers();
    }, query.trim() ? 250 : 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [query, t]);

  const toggleFreelancer = (freelancerProfileId: string) => {
    setSelectedIds(prev =>
      prev.includes(freelancerProfileId)
        ? prev.filter(id => id !== freelancerProfileId)
        : [...prev, freelancerProfileId]
    );
    setError(null);
  };

  const applyPresetMessage = () => {
    setMessage(t('inviteModal.presetMessage', 'Chào bạn, dự án của chúng tôi rất phù hợp với chuyên môn của bạn. Mời bạn xem chi tiết và nộp proposal nhé!'));
  };

  const submitInvites = async () => {
    if (!jobPostId || selectedIds.length === 0) {
      showValidationToast(t('inviteModal.selectAtLeastOne'), {
        fallback: 'Select at least one freelancer.',
      });
      candidatesRef.current?.focus();
      setError(t('inviteModal.selectAtLeastOne', 'Vui lòng chọn ít nhất 1 freelancer để gửi lời mời.'));
      setError(null);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const result = await jobInvitationAPI.bulkCreateInvitations({
        jobPostIds: [jobPostId],
        freelancerProfileIds: selectedIds,
        message: message.trim() || null,
      });

      if (result.created.length === 0) {
        showValidationToast(result.skipped[0]?.reason, {
          fallback: 'Unable to send invitations.',
        });
        candidatesRef.current?.focus();
        setError(result.skipped[0]?.reason || 'Không thể gửi lời mời.');
        setError(null);
        return;
      }

      toast.success(t('inviteModal.successSent', 'Đã gửi thành công {{count}} lời mời!', { count: result.created.length }));
      setSuccess(true);
      setSelectedIds([]);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitations could not be sent.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-6 animate-fade-in">
      <div className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] sm:max-h-[640px] flex flex-col overflow-hidden relative">
        {/* HERO HEADER */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-border/70 bg-gradient-to-r from-[var(--brand)]/10 via-purple-500/5 to-card flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[var(--brand)]/15 to-purple-500/15 text-[var(--brand)] shrink-0">
              <UserPlus size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-black text-foreground tracking-tight truncate">
                {t('inviteModal.title', 'Mời Freelancer ứng tuyển')}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
                {t('inviteModal.subtitle', 'Gửi lời mời trực tiếp cho dự án "{{jobTitle}}" đến các freelancer hàng đầu.', { jobTitle: jobTitle || 'dự án của bạn' })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full border border-border/80 bg-background hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* MODAL BODY SPLIT */}
        <div className="p-3.5 sm:p-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 sm:gap-6 overflow-y-auto min-h-0 flex-1">
          {/* LEFT: SEARCH & FREELANCERS GRID */}
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={t('inviteModal.searchPlaceholder', 'Tìm kiếm theo tên, chuyên môn, thành phố hoặc kỹ năng...')}
                className="w-full rounded-xl sm:rounded-2xl border border-border/80 bg-background py-2.5 sm:py-3 pl-10 pr-4 text-xs sm:text-sm font-medium text-foreground outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {loading ? (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-8 sm:p-12 text-center text-xs sm:text-sm font-medium text-muted-foreground flex flex-col items-center justify-center gap-2">
                <LoaderCircle className="animate-spin text-[var(--brand)]" size={22} />
                <span>{t('inviteModal.loadingFreelancers', 'Đang tìm kiếm freelancer phù hợp...')}</span>
              </div>
            ) : error && freelancers.length === 0 ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3.5 sm:p-4 text-xs sm:text-sm text-red-500 font-bold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            ) : freelancers.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 p-8 sm:p-12 text-center text-xs sm:text-sm font-medium text-muted-foreground space-y-2">
                <Users size={28} className="mx-auto text-muted-foreground/60" />
                <p className="font-bold text-foreground">{t('inviteModal.noFreelancers', 'Không tìm thấy freelancer phù hợp.')}</p>
                <p className="text-xs text-muted-foreground">Thử tìm kiếm với từ khóa khác như kỹ năng hoặc chuyên môn.</p>
              </div>
            ) : (
              <div ref={candidatesRef} tabIndex={-1} className="space-y-2.5 sm:space-y-3">
                {freelancers.map(freelancer => {
                  const freelancerProfileId = getFreelancerProfileId(freelancer);
                  const checked = selectedIds.includes(freelancerProfileId);
                  const skillNames = (freelancer.skills || []).map(skill => skill.skillName).filter(Boolean);

                  return (
                    <div
                      key={freelancerProfileId}
                      onClick={() => !submitting && !success && toggleFreelancer(freelancerProfileId)}
                      className={`group rounded-xl sm:rounded-2xl border p-3 sm:p-4 bg-card cursor-pointer flex items-start gap-2.5 sm:gap-3.5 transition-all shadow-2xs ${
                        checked
                          ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/20 bg-[var(--brand)]/5'
                          : 'border-border/80 hover:border-[var(--brand)]/50 hover:shadow-md'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <div
                          className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center transition-all ${
                            checked
                              ? 'bg-[var(--brand)] border-[var(--brand)] text-white shadow-2xs'
                              : 'border-border/80 bg-background group-hover:border-[var(--brand)]/60'
                          }`}
                        >
                          {checked && <Check size={12} className="stroke-[3]" />}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <UserAvatar
                          name={getFreelancerName(freelancer)}
                          src={freelancer.userAvatar}
                          size="md"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                          <h3 className="text-xs sm:text-sm font-extrabold text-foreground group-hover:text-[var(--brand)] transition-colors truncate">
                            {getFreelancerName(freelancer)}
                          </h3>
                          {freelancer.location && (
                            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
                              <MapPin size={11} className="text-[var(--brand)]" />
                              {freelancer.location}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground line-clamp-1">
                          {freelancer.title || 'Freelancer Professional'}
                        </p>

                        {skillNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {skillNames.slice(0, 5).map(skill => (
                              <span
                                key={skill}
                                className="inline-flex items-center bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20 px-2 py-0.5 text-[9.5px] sm:text-[10px] font-extrabold rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: PERSONAL INVITATION STICKY CARD */}
          <div className="rounded-xl sm:rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5 space-y-3.5 sm:space-y-4 h-fit lg:sticky lg:top-0">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                <Send size={15} className="text-[var(--brand)]" />
                {t('inviteModal.messageTitle', 'Lời nhắn gửi kèm')}
              </h3>
              <p className="text-xs font-extrabold text-[var(--brand)]">
                {t('inviteModal.selectedCount', 'Đã chọn {{count}} ứng viên', { count: selectedIds.length })}
              </p>
            </div>

            {/* PRESET MESSAGE BUTTON */}
            <button
              type="button"
              onClick={applyPresetMessage}
              disabled={submitting || success}
              className="w-full text-left text-[11px] font-bold text-[var(--brand)] bg-[var(--brand)]/10 hover:bg-[var(--brand)]/15 border border-[var(--brand)]/20 rounded-xl p-2.5 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={13} className="shrink-0" />
              <span>+ Chèn lời mời mẫu tự động</span>
            </button>

            <div className="space-y-1">
              <textarea
                value={message}
                onChange={event => setMessage(event.target.value.slice(0, 1000))}
                className="w-full rounded-xl border border-border/80 bg-background p-3 text-xs font-medium text-foreground outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15 transition-all resize-none"
                rows={4}
                placeholder={t('inviteModal.messagePlaceholder', 'Nhập lời nhắn cá nhân hóa gửi đến các freelancer được chọn...')}
                disabled={submitting || success}
              />
              <div className="text-right text-[10px] font-semibold text-muted-foreground">{message.length}/1000</div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500 font-bold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                {t('inviteModal.successSent', 'Đã gửi lời mời thành công!', { count: selectedIds.length })}
              </div>
            )}

            <button
              type="button"
              onClick={submitInvites}
              disabled={submitting || success}
              className="w-full rounded-xl bg-[var(--brand)] text-white px-5 py-3 text-xs font-black border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all"
            >
              {submitting ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={15} />}
              {submitting ? t('inviteModal.sending', 'Đang gửi lời mời...') : t('inviteModal.sendInvites', 'Gửi lời mời ngay ({{count}})', { count: selectedIds.length })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
