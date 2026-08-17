import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  FileStack,
  FolderOpen,
  Info,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import type { GetMyJobPostDto } from '../../../types/models/Job';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import '../styles/post-job-drafts-modal.css';

interface PostJobDraftsModalProps {
  isOpen: boolean;
  drafts: GetMyJobPostDto[];
  isLoading: boolean;
  error: string | null;
  onSelectDraft: (draft: GetMyJobPostDto) => void;
  onCreateNew: () => void;
  onClose: () => void;
  onRefresh?: () => void;
}

export function PostJobDraftsModal({
  isOpen,
  drafts,
  isLoading,
  error,
  onSelectDraft,
  onCreateNew,
  onClose,
  onRefresh,
}: PostJobDraftsModalProps) {
  const { t, i18n } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset search on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Sort drafts by newest updated date first
  const sortedDrafts = useMemo(() => {
    return [...drafts].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [drafts]);

  // Filter drafts based on search query
  const filteredDrafts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedDrafts;

    return sortedDrafts.filter(draft => {
      const title = (draft.title || '').toLowerCase();
      const desc = (draft.description || '').toLowerCase();
      const major = (draft.majorName || '').toLowerCase();
      const category = (draft.categoryName || '').toLowerCase();
      const skillNames = [
        ...(draft.skills || []).map(s => s.name.toLowerCase()),
        ...(draft.customSkillNames || []).map(s => s.toLowerCase()),
      ];

      return (
        title.includes(query) ||
        desc.includes(query) ||
        major.includes(query) ||
        category.includes(query) ||
        skillNames.some(s => s.includes(query))
      );
    });
  }, [sortedDrafts, searchQuery]);

  if (!isOpen) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    try {
      const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
      const timePart = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      const datePart = date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
      return `${timePart}, ${datePart}`;
    } catch {
      return date.toLocaleString();
    }
  };

  const formatBudget = (draft: GetMyJobPostDto) => {
    if (draft.budgetMin && draft.budgetMax && draft.budgetMin === draft.budgetMax) {
      return `${draft.budgetMin.toLocaleString()}`;
    }
    if (draft.budgetMin && draft.budgetMax) {
      return `${draft.budgetMin.toLocaleString()} - ${draft.budgetMax.toLocaleString()}`;
    }
    if (draft.budgetMin) {
      return `≥ ${draft.budgetMin.toLocaleString()}`;
    }
    if (draft.budgetMax) {
      return `≤ ${draft.budgetMax.toLocaleString()}`;
    }
    return null;
  };

  return (
    <div
      className="pjd-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pjd-modal-title"
      onClick={onClose}
    >
      <div className="pjd-modal-backdrop" />

      <div
        className="pjd-modal-container"
        onClick={e => e.stopPropagation()}
      >
        {/* Accent Bar */}
        <div className="pjd-modal-accent-bar" />

        {/* Header */}
        <header className="pjd-modal-header">
          <div className="pjd-modal-header-info">
            <div className="pjd-modal-header-icon">
              <FileStack size={22} />
            </div>
            <div>
              <div className="pjd-modal-header-title">
                <h2 id="pjd-modal-title">{t('postJob.continueDraftTitle')}</h2>
                {!isLoading && (
                  <span className="pjd-modal-badge-count">
                    {t('postJob.draftCount', { count: drafts.length, defaultValue: `${drafts.length} bản nháp` })}
                  </span>
                )}
              </div>
              <p className="pjd-modal-header-desc">
                {t('postJob.continueDraftDesc', { count: drafts.length })}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="pjd-modal-close-btn"
            onClick={onClose}
            aria-label={t('common.close', 'Đóng')}
          >
            <X size={19} />
          </button>
        </header>

        {/* Search & Actions Bar */}
        <div className="pjd-modal-search-bar">
          <div className="pjd-search-input-wrapper">
            <Search size={15} className="pjd-search-icon" />
            <input
              type="text"
              className="pjd-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('postJob.searchDraftsPlaceholder', 'Tìm kiếm theo tiêu đề, kỹ năng, ngành nghề...')}
              aria-label={t('postJob.searchDraftsPlaceholder', 'Tìm kiếm bản nháp')}
            />
            {searchQuery && (
              <button
                type="button"
                className="pjd-search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label={t('postJob.clearSearch', 'Xóa bộ lọc')}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {onRefresh && (
            <button
              type="button"
              className="pjd-refresh-btn"
              onClick={onRefresh}
              title={t('postJob.refreshDrafts', 'Làm mới')}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>{t('common.refresh', 'Làm mới')}</span>
            </button>
          )}
        </div>

        {/* Modal Body / Drafts List */}
        <div className="pjd-modal-body">
          {/* Loading Skeleton */}
          {isLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="pjd-skeleton-card">
                  <div className="flex justify-between items-center">
                    <div className="pjd-shimmer-box h-5 w-24" />
                    <div className="pjd-shimmer-box h-4 w-32" />
                  </div>
                  <div className="pjd-shimmer-box h-5 w-3/4" />
                  <div className="pjd-shimmer-box h-4 w-full" />
                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    <div className="pjd-shimmer-box h-6 w-20" />
                    <div className="pjd-shimmer-box h-6 w-28" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {!isLoading && error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500 flex items-start gap-3">
              <Info size={18} className="shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">{t('common.error', 'Có lỗi xảy ra')}</strong>
                <p className="mt-0.5 text-xs opacity-90">{error}</p>
              </div>
            </div>
          )}

          {/* Empty State: No drafts in database */}
          {!isLoading && !error && drafts.length === 0 && (
            <div className="pjd-empty-state">
              <div className="pjd-empty-icon-wrap">
                <FolderOpen size={28} />
              </div>
              <h3>{t('postJob.noDrafts')}</h3>
              <p>{t('postJob.noDraftsDesc')}</p>
              <button
                type="button"
                className="pjd-btn-new-job"
                onClick={onCreateNew}
              >
                <Plus size={15} />
                <span>{t('postJob.createNewJobPost2')}</span>
              </button>
            </div>
          )}

          {/* Empty State: Search yielded no results */}
          {!isLoading && !error && drafts.length > 0 && filteredDrafts.length === 0 && (
            <div className="pjd-empty-state">
              <div className="pjd-empty-icon-wrap">
                <Search size={28} />
              </div>
              <h3>{t('postJob.noSearchResults', 'Không tìm thấy bản nháp phù hợp')}</h3>
              <p>
                {t('postJob.noSearchMatchDesc', {
                  defaultValue: `Không tìm thấy bản nháp nào khớp với từ khóa "${searchQuery}".`,
                  query: searchQuery,
                })}
              </p>
              <button
                type="button"
                className="pjd-btn-cancel"
                onClick={() => setSearchQuery('')}
              >
                {t('postJob.clearSearch', 'Xóa bộ lọc')}
              </button>
            </div>
          )}

          {/* Drafts List */}
          {!isLoading && !error && filteredDrafts.length > 0 && (
            <div className="flex flex-col gap-3">
              {filteredDrafts.map((draft, idx) => {
                const isLatest = idx === 0 && !searchQuery;
                const budgetText = formatBudget(draft);
                const allSkills = [
                  ...(draft.skills || []).map(s => s.name),
                  ...(draft.customSkillNames || []),
                ].filter(Boolean);
                const displaySkills = allSkills.slice(0, 3);
                const remainingSkillsCount = allSkills.length - displaySkills.length;
                const timeText = formatDate(draft.updatedAt || draft.createdAt);

                return (
                  <div
                    key={draft.jobPostsId}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectDraft(draft)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectDraft(draft);
                      }
                    }}
                    className={`pjd-card group ${isLatest ? 'is-latest' : ''}`}
                  >
                    {/* Card Header: Badges & Timestamp */}
                    <div className="pjd-card-header">
                      <div className="pjd-card-badges">
                        <span className="pjd-badge pjd-badge-draft">
                          <span className="pjd-badge-pulse-dot" />
                          {t('postJob.draftBadge', 'Bản nháp')}
                        </span>

                        {isLatest && (
                          <span className="pjd-badge pjd-badge-latest">
                            <Sparkles size={11} />
                            {t('postJob.latestDraftBadge', 'Mới nhất')}
                          </span>
                        )}

                        {draft.isAigenerated && (
                          <span className="pjd-badge pjd-badge-ai">
                            <Sparkles size={11} />
                            {t('postJob.aiGeneratedBadge', 'AI tạo')}
                          </span>
                        )}
                      </div>

                      {timeText && (
                        <span className="pjd-card-time">
                          <Clock3 size={13} />
                          <span>{timeText}</span>
                        </span>
                      )}
                    </div>

                    {/* Card Body: Title & Short Snippet */}
                    <div className="pjd-card-content">
                      <h4 className="pjd-card-title">
                        {draft.title || t('postJob.untitledDraft')}
                      </h4>
                      {draft.description && (
                        <p className="pjd-card-desc">
                          {draft.description}
                        </p>
                      )}
                    </div>

                    {/* Card Footer: Metadata & Continue Button */}
                    <div className="pjd-card-footer">
                      <div className="pjd-card-meta">
                        {/* Major / Category tag */}
                        {(draft.majorName || draft.categoryName) && (
                          <span className="pjd-meta-tag" title={t('postJob.category', 'Danh mục')}>
                            <BriefcaseBusiness size={12} className="text-muted-foreground" />
                            <span>
                              {draft.majorName || ''}
                              {draft.majorName && draft.categoryName ? ' • ' : ''}
                              {draft.categoryName || ''}
                            </span>
                          </span>
                        )}

                        {/* Budget Tag */}
                        {budgetText && (
                          <span className="pjd-meta-tag is-budget" title={t('postJob.expectedBudget', 'Ngân sách')}>
                            <GCoinIcon size={13} />
                            <span>{budgetText} G-coin</span>
                          </span>
                        )}

                        {/* Skills preview */}
                        {displaySkills.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {displaySkills.map((skill, sIdx) => (
                              <span key={sIdx} className="pjd-meta-tag">
                                <Tag size={11} className="text-muted-foreground" />
                                <span>{skill}</span>
                              </span>
                            ))}
                            {remainingSkillsCount > 0 && (
                              <span className="pjd-meta-tag opacity-75">
                                +{remainingSkillsCount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pjd-card-actions">
                        <span className="pjd-action-btn-continue">
                          <span>{t('postJob.continueEditing', 'Tiếp tục chỉnh sửa')}</span>
                          <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="pjd-modal-footer">
          <div className="pjd-footer-hint">
            <Info size={13} className="shrink-0" />
            <span>{t('postJob.autoSaveNote', 'Bản nháp được lưu tự động trong quá trình soạn thảo.')}</span>
          </div>

          <div className="pjd-footer-actions">
            <button
              type="button"
              className="pjd-btn-cancel"
              onClick={onClose}
            >
              {t('postJob.cancel')}
            </button>

            <button
              type="button"
              className="pjd-btn-new-job"
              onClick={onCreateNew}
            >
              <Plus size={15} />
              <span>{t('postJob.createNewJobPost2')}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
