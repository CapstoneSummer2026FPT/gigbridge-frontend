import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Gauge,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { eloGetAPI } from '../../../api/eloAPI/GET';
import { eloPostAPI } from '../../../api/eloAPI/POST';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import {
  type EloAppeal,
  type EloHistoryFilter,
  type EloSummary,
  type EloTransaction,
} from '../../../types/elo';
import { EloAppealEvidencePicker } from '../components/EloAppealEvidencePicker';
import {
  canAppealTransaction,
  eloAppealResolutionKey,
  eloAppealStatusKey,
  eloModeKey,
  eloReasonKey,
  eloSourceTypeKey,
  isAppealActionable,
} from '../utils/eloLabels';
import '../styles/elo-history-screen.css';

const HISTORY_FILTERS: EloHistoryFilter[] = ['All', 'Reviews', 'Disputes', 'Admin', 'Appeal', 'Gained', 'Lost'];
const PAGE_SIZE = 15;

const filterKey = (filter: EloHistoryFilter): string =>
  filter === 'All' ? 'elo.filters.all' : `elo.filters.${filter.charAt(0).toLowerCase()}${filter.slice(1)}`;

const formatDate = (value: string, language: string): string =>
  new Date(value).toLocaleDateString(language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const EMPTY_SUMMARY: EloSummary = {
  currentPoints: 0,
  totalGained: 0,
  totalLost: 0,
  totalTransactions: 0,
  recentTransactions: [],
};

export default function EloHistoryScreen() {
  const { t, i18n } = useTranslation();

  const [summary, setSummary] = useState<EloSummary>(EMPTY_SUMMARY);
  const [tab, setTab] = useState<'history' | 'appeals'>('history');
  const [filter, setFilter] = useState<EloHistoryFilter>('All');

  const [transactions, setTransactions] = useState<EloTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [appeals, setAppeals] = useState<EloAppeal[]>([]);
  const [appealPage, setAppealPage] = useState(1);
  const [appealTotalPages, setAppealTotalPages] = useState(0);

  const [appealing, setAppealing] = useState<EloTransaction | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealFiles, setAppealFiles] = useState<File[]>([]);
  const [appealError, setAppealError] = useState<string | null>(null);
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  const [cancelling, setCancelling] = useState<EloAppeal | null>(null);
  const [cancellingSubmitting, setCancellingSubmitting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSummary = useCallback(async () => {
    const response = await eloGetAPI.getEloSummary();
    if (response.success && response.data) {
      setSummary(response.data);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    const response = await eloGetAPI.getEloHistory({ page, pageSize: PAGE_SIZE, filter });
    if (response.success && response.data) {
      const data = response.data;
      setTransactions(data.items);
      setTotalPages(data.totalPages);
    } else {
      setTransactions([]);
      setTotalPages(0);
      setError(response.message || t('elo.loadError'));
    }
    setLoading(false);
  }, [filter, page, t]);

  const loadAppeals = useCallback(async () => {
    setLoading(true);
    setError('');
    const response = await eloGetAPI.getMyEloAppeals({ page: appealPage, pageSize: PAGE_SIZE });
    if (response.success && response.data) {
      const data = response.data;
      setAppeals(data.items);
      setAppealTotalPages(data.totalPages);
    } else {
      setAppeals([]);
      setAppealTotalPages(0);
      setError(response.message || t('elo.loadAppealsError'));
    }
    setLoading(false);
  }, [appealPage, t]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => {
    if (tab === 'history') void loadHistory();
  }, [tab, loadHistory]);
  useEffect(() => {
    if (tab === 'appeals') void loadAppeals();
  }, [tab, loadAppeals]);

  const changeFilter = (next: EloHistoryFilter) => {
    if (next === filter) return;
    setFilter(next);
    setPage(1);
    setExpandedId(null);
  };

  const switchTab = (next: 'history' | 'appeals') => {
    if (next === tab) return;
    setTab(next);
    setError('');
    setNotice('');
  };

  const openAppealModal = (transaction: EloTransaction) => {
    setAppealing(transaction);
    setAppealReason('');
    setAppealFiles([]);
    setAppealError(null);
  };

  const submitAppeal = async () => {
    if (!appealing || appealReason.trim().length < 10) return;
    setAppealSubmitting(true);
    setAppealError(null);
    const response = await eloPostAPI.createEloAppeal({
      transactionId: appealing.transactionId,
      reason: appealReason.trim(),
      files: appealFiles,
    });
    setAppealSubmitting(false);
    if (!response.success) {
      setAppealError(response.message || t('elo.appeal.submitError'));
      return;
    }
    setAppealing(null);
    setNotice(t('elo.appeal.submitSuccess'));
    setPage(1);
    await Promise.all([loadSummary(), loadHistory()]);
  };

  const confirmCancelAppeal = async () => {
    if (!cancelling) return;
    setCancellingSubmitting(true);
    const response = await eloPostAPI.cancelEloAppeal(cancelling.appealId);
    setCancellingSubmitting(false);
    if (!response.success) {
      setError(response.message || t('elo.appeal.cancelError'));
      setCancelling(null);
      return;
    }
    setCancelling(null);
    setNotice(t('elo.appeal.cancelSuccess'));
    await loadAppeals();
  };

  const deltaClass = (delta: number): string => (delta >= 0 ? 'elo-delta gained' : 'elo-delta lost');
  const deltaText = (delta: number): string => `${delta >= 0 ? '+' : '−'}${Math.abs(delta)}`;
  const resolutionText = (appeal: EloAppeal): string | null =>
    appeal.resolution == null ? null : t(eloAppealResolutionKey(appeal.resolution));
  const statusClassName = (status: number): string => `elo-appeal-status status-${status}`;

  return (
    <AppLayout>
      <div className="elo-page">
        <header>
          <div>
            <span className="elo-eyebrow">{t('elo.eyebrow')}</span>
            <h1>{t('elo.title')}</h1>
            <p>{t('elo.subtitle')}</p>
          </div>
        </header>

        <section className="elo-summary">
          <div className="elo-summary-card">
            <span className="elo-summary-icon cyan"><Gauge size={20} /></span>
            <div>
              <strong>{summary.currentPoints}</strong>
              <span>{t('elo.currentPoints')}</span>
            </div>
          </div>
          <div className="elo-summary-card">
            <span className="elo-summary-icon green"><TrendingUp size={20} /></span>
            <div>
              <strong className="elo-plus">+{summary.totalGained}</strong>
              <span>{t('elo.totalGained')}</span>
            </div>
          </div>
          <div className="elo-summary-card">
            <span className="elo-summary-icon red"><TrendingDown size={20} /></span>
            <div>
              <strong className="elo-minus">−{summary.totalLost}</strong>
              <span>{t('elo.totalLost')}</span>
            </div>
          </div>
          <div className="elo-summary-card">
            <span className="elo-summary-icon cyan"><ShieldAlert size={20} /></span>
            <div>
              <strong>{summary.totalTransactions}</strong>
              <span>{t('elo.totalTransactions')}</span>
            </div>
          </div>
        </section>

        <nav className="elo-tabs" aria-label={t('elo.tabsLabel')}>
          <button
            type="button"
            className={`elo-tab${tab === 'history' ? ' active' : ''}`}
            onClick={() => switchTab('history')}
          >
            {t('elo.historyTab')}
          </button>
          <button
            type="button"
            className={`elo-tab${tab === 'appeals' ? ' active' : ''}`}
            onClick={() => switchTab('appeals')}
          >
            {t('elo.appealsTab')}
          </button>
        </nav>

        {error && <div className="elo-error">{error}</div>}
        {notice && <div className="elo-notice">{notice}</div>}

        {tab === 'history' && (
          <>
            <div className="elo-filter-tabs">
              {HISTORY_FILTERS.map(item => (
                <button
                  key={item}
                  type="button"
                  className={`elo-filter-tab${filter === item ? ' active' : ''}`}
                  onClick={() => changeFilter(item)}
                >
                  {t(filterKey(item))}
                </button>
              ))}
            </div>

            <section className="elo-list" aria-live="polite">
              {loading && <div className="elo-empty">{t('elo.loading')}</div>}
              {!loading && transactions.length === 0 && (
                <div className="elo-empty">{t('elo.empty')}</div>
              )}
              {!loading &&
                transactions.map(transaction => {
                  const delta = transaction.pointsDelta;
                  const expanded = expandedId === transaction.transactionId;
                  return (
                    <article className="elo-row" key={transaction.transactionId}>
                      <div className="elo-row-main">
                        <span className={deltaClass(delta)} aria-label={t('elo.deltaLabel')}>
                          {deltaText(delta)}
                        </span>
                        <div>
                          <div className="elo-row-title">{t(eloReasonKey(transaction.reason))}</div>
                          <div className="elo-row-meta">
                            <span>{t(eloSourceTypeKey(transaction.sourceType))}</span>
                            <span>{t(eloModeKey(transaction.mode))}</span>
                          </div>
                        </div>
                        <span className="elo-row-date">{formatDate(transaction.createdAt, i18n.language)}</span>
                        <div className="elo-row-actions">
                          {canAppealTransaction(transaction) && (
                            <button
                              type="button"
                              className="elo-appeal-button"
                              onClick={() => openAppealModal(transaction)}
                            >
                              {t('elo.appeal.action')}
                            </button>
                          )}
                          <button
                            type="button"
                            className="elo-link-button"
                            onClick={() => setExpandedId(expanded ? null : transaction.transactionId)}
                          >
                            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            {t('elo.viewDetail')}
                          </button>
                        </div>
                      </div>
                      {expanded && (
                        <div className="elo-detail">
                          <div className="elo-detail-grid">
                            <div>
                              <small>{t('elo.reason')}</small>
                              <strong>{t(eloReasonKey(transaction.reason))}</strong>
                            </div>
                            <div>
                              <small>{t('elo.source')}</small>
                              <strong>{t(eloSourceTypeKey(transaction.sourceType))}</strong>
                            </div>
                            <div>
                              <small>{t('elo.pointsBefore')}</small>
                              <strong>{transaction.pointsBefore}</strong>
                            </div>
                            <div>
                              <small>{t('elo.pointsAfter')}</small>
                              <strong>{transaction.pointsAfter}</strong>
                            </div>
                            {transaction.mode != null && (
                              <div>
                                <small>{t('elo.mode')}</small>
                                <strong>{t(eloModeKey(transaction.mode))}</strong>
                              </div>
                            )}
                            {transaction.rating != null && (
                              <div>
                                <small>{t('elo.rating')}</small>
                                <strong>{transaction.rating}</strong>
                              </div>
                            )}
                            <div className="elo-detail-full">
                              <small>{t('elo.transactionId')}</small>
                              <strong>{transaction.transactionId}</strong>
                            </div>
                            <div className="elo-detail-full">
                              <small>{t('elo.date')}</small>
                              <strong>{formatDate(transaction.createdAt, i18n.language)}</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
            </section>

            {totalPages > 1 && (
              <div className="elo-pagination">
                <button disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>
                  {t('elo.previous')}
                </button>
                <span>{t('elo.pageOf', { page, total: totalPages })}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>
                  {t('elo.next')}
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'appeals' && (
          <>
            <section className="elo-list" aria-live="polite">
              {loading && <div className="elo-empty">{t('elo.loading')}</div>}
              {!loading && appeals.length === 0 && (
                <div className="elo-empty">{t('elo.appeal.empty')}</div>
              )}
              {!loading &&
                appeals.map(appeal => {
                  const resolution = resolutionText(appeal);
                  return (
                    <article className="elo-appeal-card" key={appeal.appealId}>
                      <div className="elo-appeal-card-head">
                        <strong>{t('elo.appeal.appealLabel')}</strong>
                        <span className={statusClassName(appeal.status)}>
                          {t(eloAppealStatusKey(appeal.status))}
                        </span>
                      </div>
                      <p className="elo-appeal-reason">{appeal.reason}</p>
                      <div className="elo-appeal-card-meta">
                        <span>{t('elo.appeal.transactionIdLabel', { id: appeal.transactionId })}</span>
                        <span>{t('elo.appeal.filedAt', { date: formatDate(appeal.createdAt, i18n.language) })}</span>
                        {appeal.resolution != null && resolution && (
                          <span>{t('elo.appeal.resolution', { resolution })}</span>
                        )}
                        {appeal.resolutionNote && (
                          <span>{t('elo.appeal.resolutionNoteLabel', { note: appeal.resolutionNote })}</span>
                        )}
                      </div>
                      {isAppealActionable(appeal.status) && (
                        <div className="elo-appeal-card-actions">
                          <button type="button" className="elo-appeal-button" onClick={() => setCancelling(appeal)}>
                            {t('elo.appeal.cancelAction')}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
            </section>

            {appealTotalPages > 1 && (
              <div className="elo-pagination">
                <button
                  disabled={appealPage <= 1}
                  onClick={() => setAppealPage(value => Math.max(1, value - 1))}
                >
                  {t('elo.previous')}
                </button>
                <span>{t('elo.pageOf', { page: appealPage, total: appealTotalPages })}</span>
                <button disabled={appealPage >= appealTotalPages} onClick={() => setAppealPage(value => value + 1)}>
                  {t('elo.next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {appealing && (
        <div className="elo-overlay" onMouseDown={() => !appealSubmitting && setAppealing(null)}>
          <section className="elo-modal" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="elo-modal-header">
              <div>
                <h2>{t('elo.appeal.title')}</h2>
                <p>{t('elo.appeal.subtitle')}</p>
              </div>
              <button
                type="button"
                className="elo-modal-close"
                aria-label={t('elo.close')}
                onClick={() => setAppealing(null)}
              >
                <X size={19} />
              </button>
            </div>

            <div className="elo-detail-grid" style={{ marginBottom: '.4rem' }}>
              <div>
                <small>{t('elo.reason')}</small>
                <strong>{t(eloReasonKey(appealing.reason))}</strong>
              </div>
              <div>
                <small>{t('elo.deltaLabel')}</small>
                <strong className={deltaClass(appealing.pointsDelta)}>
                  {deltaText(appealing.pointsDelta)}
                </strong>
              </div>
            </div>

            <label>
              {t('elo.appeal.reasonLabel')}
              <textarea
                value={appealReason}
                maxLength={2000}
                disabled={appealSubmitting}
                placeholder={t('elo.appeal.reasonPlaceholder')}
                onChange={event => setAppealReason(event.target.value)}
              />
              <small className="elo-help">{t('elo.appeal.reasonHelp')}</small>
            </label>

            <label>
              {t('elo.appeal.evidenceLabel')}
              <EloAppealEvidencePicker
                files={appealFiles}
                disabled={appealSubmitting}
                onChange={setAppealFiles}
                onError={setAppealError}
              />
            </label>

            {appealError && <div className="elo-error">{appealError}</div>}

            <div className="elo-modal-actions">
              <button type="button" disabled={appealSubmitting} onClick={() => setAppealing(null)}>
                {t('elo.cancel')}
              </button>
              <button
                type="button"
                className="primary"
                disabled={appealSubmitting || appealReason.trim().length < 10}
                onClick={() => void submitAppeal()}
              >
                {appealSubmitting ? t('elo.appeal.submitting') : t('elo.appeal.submit')}
              </button>
            </div>
          </section>
        </div>
      )}

      {cancelling && (
        <div className="elo-overlay" onMouseDown={() => !cancellingSubmitting && setCancelling(null)}>
          <section className="elo-modal" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="elo-modal-header">
              <div>
                <h2>{t('elo.appeal.cancelTitle')}</h2>
                <p>{t('elo.appeal.cancelHelp')}</p>
              </div>
              <button
                type="button"
                className="elo-modal-close"
                aria-label={t('elo.close')}
                onClick={() => setCancelling(null)}
              >
                <X size={19} />
              </button>
            </div>
            <div className="elo-modal-actions">
              <button type="button" disabled={cancellingSubmitting} onClick={() => setCancelling(null)}>
                {t('elo.cancel')}
              </button>
              <button
                type="button"
                className="primary"
                disabled={cancellingSubmitting}
                onClick={() => void confirmCancelAppeal()}
              >
                {cancellingSubmitting ? t('elo.appeal.cancelling') : t('elo.appeal.confirmCancel')}
              </button>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
