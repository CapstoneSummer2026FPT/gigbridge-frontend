import { useCallback, useEffect, useState } from 'react';
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

const PAGE_SIZE = 15;

const formatDate = (value: string, language: string): string =>
  new Date(value).toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminEloHistoryScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [items, setItems] = useState<AdminEloTransactionRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EloHistoryFilter>('All');
  const [adjustTarget, setAdjustTarget] = useState<AdminEloAdjustmentTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const response = await adminGetAPI.getAdminEloHistory({
      page,
      pageSize: PAGE_SIZE,
      ...(search ? { search } : {}),
      ...(filter !== 'All' ? { filter } : {}),
    });
    if (response.success && response.data) {
      const data = response.data as PaginatedElo<AdminEloTransactionRow>;
      setItems(data.items);
      setTotalPages(data.totalPages);
    } else {
      setItems([]);
      setTotalPages(0);
      setError(response.message || t('adminElo.loadError'));
    }
    setLoading(false);
  }, [filter, page, search, t]);

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

        <section className="admin-elo-table-wrap">
          <table className="admin-elo-table">
            <thead>
              <tr>
                <th>{t('adminElo.user')}</th>
                <th>{t('adminElo.reason')}</th>
                <th>{t('adminElo.delta')}</th>
                <th>{t('adminElo.source')}</th>
                <th>{t('adminElo.date')}</th>
                <th>{t('adminElo.action')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="admin-elo-empty">{t('adminElo.loading')}</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={6} className="admin-elo-empty">{t('adminElo.empty')}</td></tr>}
              {items.map(row => (
                <tr key={row.transactionId}>
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

        {totalPages > 1 && (
          <div className="admin-elo-pagination">
            <button disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>
              {t('adminElo.previous')}
            </button>
            <span>{t('adminElo.pageOf', { page, total: totalPages })}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>
              {t('adminElo.next')}
            </button>
          </div>
        )}
      </div>

      {adjustTarget && (
        <AdminEloAdjustmentModal
          target={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onApplied={() => { setNotice(t('adminElo.adjustSuccess')); void load(); }}
        />
      )}
    </AppLayout>
  );
}
