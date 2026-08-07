import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { adminGetAPI } from '../../../api/adminAPI/GET';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import {
  type AdminEloTransactionRow,
  type EloHistoryFilter,
  type PaginatedElo,
} from '../../../types/elo';
import { eloModeKey, eloReasonKey, eloSourceTypeKey } from '../../elo/utils/eloLabels';
import { AdminEloAdjustmentModal, type AdminEloAdjustmentTarget } from '../components/AdminEloAdjustmentModal';
import { AdminTablePageSize, AdminTablePagination } from '../components/AdminTableControls';
import { AdminPageCache, adminPageCacheKey } from '../utils/AdminPageCache';
import '../styles/admin-elo-screen.css';

const HISTORY_FILTERS: Array<{ value: EloHistoryFilter; labelKey: string }> = [
  { value: 'All', labelKey: 'adminElo.allFilters' },
  { value: 'Reviews', labelKey: 'adminElo.filterReviews' },
  { value: 'Disputes', labelKey: 'adminElo.filterDisputes' },
  { value: 'Admin', labelKey: 'adminElo.filterAdmin' },
  { value: 'Appeal', labelKey: 'adminElo.filterAppeal' },
  { value: 'Gained', labelKey: 'adminElo.filterGained' },
  { value: 'Lost', labelKey: 'adminElo.filterLost' },
];

const formatDate = (value: string, language: string): string =>
  new Date(value).toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
type HistoryPageData = PaginatedElo<AdminEloTransactionRow>;

export default function AdminEloHistoryScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [items, setItems] = useState<AdminEloTransactionRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EloHistoryFilter>('All');
  const [adjustTarget, setAdjustTarget] = useState<AdminEloAdjustmentTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pageCache = useRef(new AdminPageCache<HistoryPageData>()).current;
  const latestRequest = useRef(0);

  const load = useCallback(async (force = false) => {
    const requestId = ++latestRequest.current;
    setError('');

    const paramsForPage = (targetPage: number) => ({
      page: targetPage,
      pageSize,
      ...(search ? { search } : {}),
      ...(filter !== 'All' ? { filter } : {}),
    });
    const keyForPage = (targetPage: number) => adminPageCacheKey('elo-history', paramsForPage(targetPage));
    const requestPage = async (targetPage: number): Promise<HistoryPageData> => {
      const response = await adminGetAPI.getAdminEloHistory(paramsForPage(targetPage));
      if (!response.success || !response.data) throw new Error(response.message || t('adminElo.loadError'));
      return response.data as HistoryPageData;
    };
    const cached = force ? undefined : pageCache.get(keyForPage(page));
    setLoading(!cached);

    const applyPage = (data: HistoryPageData) => {
      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalCount);
    };

    if (cached) applyPage(cached);

    try {
      const data = await pageCache.load(keyForPage(page), () => requestPage(page), force);
      if (requestId !== latestRequest.current) return;
      applyPage(data);
      [page - 1, page + 1]
        .filter(target => target >= 1 && target <= data.totalPages)
        .forEach(target => pageCache.prefetch(keyForPage(target), () => requestPage(target)));
    } catch (loadError) {
      if (requestId !== latestRequest.current || cached) return;
      setItems([]);
      setTotalPages(0);
      setTotalItems(0);
      setError(loadError instanceof Error ? loadError.message : t('adminElo.loadError'));
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [filter, page, pageCache, pageSize, search, t]);

  useEffect(() => { void load(); }, [load]);

  const applySearch = () => { setPage(1); setSearch(searchDraft.trim()); };
  const changeFilter = (next: EloHistoryFilter) => { setFilter(next); setPage(1); };

  const deltaClass = (delta: number): string => (delta >= 0 ? 'admin-elo-delta gained' : 'admin-elo-delta lost');
  const deltaText = (delta: number): string => `${delta >= 0 ? '+' : '−'}${Math.abs(delta)}`;

  return (
    <AppLayout>
      <div className="admin-elo-page">
        <header>
          <div>
            <span className="admin-elo-eyebrow">{t('adminElo.eyebrow')}</span>
            <h1>{t('adminElo.navHistory')}</h1>
            <p>{t('adminElo.subtitle')}</p>
          </div>
        </header>

        <section className="admin-elo-filters">
          <div className="admin-elo-search">
            <Search size={16} />
            <input
              value={searchDraft}
              onChange={event => setSearchDraft(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') applySearch(); }}
              placeholder={t('adminElo.search')}
            />
            <button onClick={applySearch}>{t('adminElo.searchAction')}</button>
          </div>
          <select value={filter} onChange={event => changeFilter(event.target.value as EloHistoryFilter)}>
            {HISTORY_FILTERS.map(option => (
              <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
            ))}
          </select>
        </section>

        {error && <div className="admin-elo-error">{error}</div>}
        {notice && <div className="admin-elo-notice">{notice}</div>}

        <div className="mb-3 flex justify-end">
          <AdminTablePageSize pageSize={pageSize} totalEntries={totalItems} disabled={loading} onPageSizeChange={value => { setPageSize(value); setPage(1); }} />
        </div>

        <section className="admin-elo-table-wrap">
          <table className="admin-elo-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>{t('adminElo.user')}</th>
                <th>{t('adminElo.reason')}</th>
                <th>{t('adminElo.delta')}</th>
                <th>{t('adminElo.source')}</th>
                <th>{t('adminElo.date')}</th>
                <th>{t('adminElo.action')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="admin-elo-empty">{t('adminElo.loading')}</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={7} className="admin-elo-empty">{t('adminElo.empty')}</td></tr>}
              {items.map((row, index) => (
                <tr key={row.transactionId}>
                  <td><strong className="text-cyan">{((page - 1) * pageSize) + index + 1}</strong></td>
                  <td>
                    <UserProfileLink userId={row.user.userId} role={row.user.role}>
                      <strong>{row.user.fullName}</strong>
                    </UserProfileLink>
                    <small>{row.user.email}</small>
                  </td>
                  <td>{t(eloReasonKey(row.reason))}</td>
                  <td><span className={deltaClass(row.pointsDelta)}>{deltaText(row.pointsDelta)}</span></td>
                  <td>
                    {t(eloSourceTypeKey(row.sourceType))}
                    <small>{t(eloModeKey(row.mode))}</small>
                  </td>
                  <td>{formatDate(row.createdAt, i18n.language)}</td>
                  <td>
                    <div className="admin-elo-row-actions">
                      <button type="button" className="admin-elo-link-button" onClick={() => navigate(`/admin/users/${row.user.userId}`)}>
                        {t('adminElo.view')}
                      </button>
                      <button
                        type="button"
                        className="admin-elo-adjust-button"
                        onClick={() => { setNotice(''); setAdjustTarget({ userId: row.user.userId, fullName: row.user.fullName }); }}
                      >
                        {t('adminElo.adjustElo')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {totalPages > 1 && <AdminTablePagination currentPage={page} totalPages={totalPages} disabled={loading} onPageChange={setPage} ariaLabel="Elo history pagination" />}
      </div>

      {adjustTarget && (
        <AdminEloAdjustmentModal
          target={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onApplied={() => { setNotice(t('adminElo.adjustSuccess')); pageCache.clear(); void load(true); }}
        />
      )}
    </AppLayout>
  );
}
