import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { adminGetAPI } from '../../../api/adminAPI/GET';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { type AdminEloAppealRow, type PaginatedElo } from '../../../types/elo';
import { eloAppealStatusKey } from '../../elo/utils/eloLabels';
import { AdminTablePageSize, AdminTablePagination } from '../components/AdminTableControls';
import { AdminPageCache, adminPageCacheKey } from '../utils/AdminPageCache';
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

const formatDate = (value: string, language: string): string =>
  new Date(value).toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
type AppealPageData = PaginatedElo<AdminEloAppealRow>;

export default function AdminEloAppealsScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [items, setItems] = useState<AdminEloAppealRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageCache = useRef(new AdminPageCache<AppealPageData>()).current;
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setError('');

    const paramsForPage = (targetPage: number) => ({
      page: targetPage,
      pageSize,
      ...(search ? { search } : {}),
      ...(status !== '' ? { status } : {}),
    });
    const keyForPage = (targetPage: number) => adminPageCacheKey('elo-appeals', paramsForPage(targetPage));
    const requestPage = async (targetPage: number): Promise<AppealPageData> => {
      const response = await adminGetAPI.getAdminEloAppeals(paramsForPage(targetPage));
      if (!response.success || !response.data) throw new Error(response.message || t('adminElo.loadError'));
      return response.data as AppealPageData;
    };
    const cached = pageCache.get(keyForPage(page));
    setLoading(!cached);

    const applyPage = (data: AppealPageData) => {
      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalCount);
    };

    if (cached) applyPage(cached);

    try {
      const data = await pageCache.load(keyForPage(page), () => requestPage(page));
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
  }, [page, pageCache, pageSize, search, status, t]);

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

        <div className="mb-3 flex justify-end">
          <AdminTablePageSize pageSize={pageSize} totalEntries={totalItems} disabled={loading} onPageSizeChange={value => { setPageSize(value); setPage(1); }} />
        </div>

        <section className="admin-elo-table-wrap">
          <table className="admin-elo-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>{t('adminElo.user')}</th>
                <th>{t('adminElo.appealReason')}</th>
                <th>{t('adminElo.appealResolution')}</th>
                <th>{t('adminElo.date')}</th>
                <th>{t('adminElo.action')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="admin-elo-empty">{t('adminElo.loading')}</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={6} className="admin-elo-empty">{t('adminElo.empty')}</td></tr>}
              {items.map((appeal, index) => (
                <tr key={appeal.appealId}>
                  <td><strong className="text-cyan">{((page - 1) * pageSize) + index + 1}</strong></td>
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

        {totalPages > 1 && <AdminTablePagination currentPage={page} totalPages={totalPages} disabled={loading} onPageChange={setPage} ariaLabel="Elo appeal pagination" />}
      </div>
    </AppLayout>
  );
}
