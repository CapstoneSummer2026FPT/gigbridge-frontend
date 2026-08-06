import { useCallback, useEffect, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { adminGetAPI } from '../../../api/adminAPI/GET';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { type AdminEloAppealRow, type PaginatedElo } from '../../../types/elo';
import { eloAppealStatusKey } from '../../elo/utils/eloLabels';
import '../styles/admin-elo-screen.css';

const STATUS_OPTIONS = [
  { value: '', labelKey: 'adminElo.filterAllStatuses' },
  { value: 0, labelKey: 'elo.appealStatus.0' },
  { value: 1, labelKey: 'elo.appealStatus.1' },
  { value: 2, labelKey: 'elo.appealStatus.2' },
  { value: 3, labelKey: 'elo.appealStatus.3' },
  { value: 4, labelKey: 'elo.appealStatus.4' },
  { value: 5, labelKey: 'elo.appealStatus.5' },
];

const PAGE_SIZE = 15;

const formatDate = (value: string, language: string): string =>
  new Date(value).toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminEloAppealsScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [items, setItems] = useState<AdminEloAppealRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const response = await adminGetAPI.getAdminEloAppeals({
      page,
      pageSize: PAGE_SIZE,
      ...(search ? { search } : {}),
      ...(status !== '' ? { status } : {}),
    });
    if (response.success && response.data) {
      const data = response.data as PaginatedElo<AdminEloAppealRow>;
      setItems(data.items);
      setTotalPages(data.totalPages);
    } else {
      setItems([]);
      setTotalPages(0);
      setError(response.message || t('adminElo.loadError'));
    }
    setLoading(false);
  }, [page, search, status, t]);

  useEffect(() => { void load(); }, [load]);

  const applySearch = () => { setPage(1); setSearch(searchDraft.trim()); };
  const changeStatus = (next: number | '') => { setStatus(next); setPage(1); };

  return (
    <AppLayout>
      <div className="admin-elo-page">
        <header>
          <div>
            <span className="admin-elo-eyebrow">{t('adminElo.eyebrow')}</span>
            <h1>{t('adminElo.navAppeals')}</h1>
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
          <select value={status === '' ? '' : String(status)} onChange={event => changeStatus(event.target.value === '' ? '' : Number(event.target.value))}>
            {STATUS_OPTIONS.map(option => (
              <option key={String(option.value)} value={option.value === '' ? '' : String(option.value)}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </section>

        {error && <div className="admin-elo-error">{error}</div>}

        <section className="admin-elo-table-wrap">
          <table className="admin-elo-table">
            <thead>
              <tr>
                <th>{t('adminElo.user')}</th>
                <th>{t('adminElo.appealReason')}</th>
                <th>{t('adminElo.appealResolution')}</th>
                <th>{t('adminElo.date')}</th>
                <th>{t('adminElo.action')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="admin-elo-empty">{t('adminElo.loading')}</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={5} className="admin-elo-empty">{t('adminElo.empty')}</td></tr>}
              {items.map(appeal => (
                <tr key={appeal.appealId}>
                  <td>
                    <UserProfileLink userId={appeal.user.userId} role={appeal.user.role}>
                      <strong>{appeal.user.fullName}</strong>
                    </UserProfileLink>
                    <small>{appeal.user.email}</small>
                  </td>
                  <td>
                    <strong>{appeal.reason}</strong>
                    <small>{t(eloAppealStatusKey(appeal.status))}</small>
                  </td>
                  <td>{appeal.resolution == null ? '—' : t(`elo.resolutions.${appeal.resolution}`)}</td>
                  <td>{formatDate(appeal.createdAt, i18n.language)}</td>
                  <td>
                    <button type="button" className="admin-elo-link-button" onClick={() => navigate(`/admin/elo/appeals/${appeal.appealId}`)}>
                      <Eye size={15} /> {t('adminElo.view')}
                    </button>
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
    </AppLayout>
  );
}
