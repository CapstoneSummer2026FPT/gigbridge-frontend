import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw, Server, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';

import { adminGetAPI } from '../../../api/adminAPI/GET';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import type { AdminAuditLog } from '../../../types/models/AdminPhase1';
import '../styles/admin-phase-one.css';

type TrackingTab = 'activity' | 'events' | 'status' | 'errors' | 'security';

const tabs: Array<{ id: TrackingTab; label: string }> = [
  { id: 'activity', label: 'Admin Activity' },
  { id: 'events', label: 'System Events' },
  { id: 'status', label: 'Operational Status' },
  { id: 'errors', label: 'Recent Errors' },
  { id: 'security', label: 'Security Events' },
];

const pretty = (value?: unknown) => {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value !== 'string') return JSON.stringify(value, null, 2);
  try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
};

const unavailableCopy: Record<Exclude<TrackingTab, 'activity'>, { title: string; body: string }> = {
  events: { title: 'System events are not available', body: 'No backend system-event telemetry source is currently configured.' },
  status: { title: 'Operational status is not available', body: 'No backend health-history source is currently configured.' },
  errors: { title: 'Recent errors are not available', body: 'No backend operational-error feed is currently configured.' },
  security: { title: 'Security events are not available', body: 'No backend security-event feed is currently configured.' },
};

export default function AdminSystemTrackingScreen() {
  const [tab, setTab] = useState<TrackingTab>('activity');
  const [items, setItems] = useState<AdminAuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);

  const load = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError(null);
    const response = await adminGetAPI.getAuditLogs({
      page: nextPage,
      pageSize: 20,
      search: search.trim() || undefined,
      action: action.trim() || undefined,
      entityType: entityType.trim() || undefined,
    });
    if (response.success && response.data) {
      setItems(response.data.items);
      setPage(response.data.pageNumber);
      setPages(Math.max(1, response.data.totalPages));
    } else {
      setItems([]);
      setError({ message: response.message || 'Unable to load administrator activity.', status: response.statusCode });
    }
    setLoading(false);
  }, [action, entityType, page, search]);

  useEffect(() => { void load(1); }, []); // Initial server-backed activity load.

  const errorTitle = error?.status === 401 || error?.status === 403
    ? 'You are not authorized to view System Tracking.'
    : 'Administrator activity could not be loaded.';

  return (
    <AppLayout>
      <main className="admin-phase">
        <header className="admin-phase__header">
          <div>
            <p className="admin-phase__eyebrow"><Activity size={16} /> Platform operations</p>
            <h1>System Tracking</h1>
            <p>Real administrator activity and the availability of operational telemetry sources.</p>
          </div>
        </header>

        <div className="admin-phase__tabs" role="tablist" aria-label="System Tracking sections">
          {tabs.map(item => (
            <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>
          ))}
        </div>

        {tab === 'activity' ? (
          <section className="admin-phase__panel" role="tabpanel">
            <form className="admin-phase__filters" onSubmit={event => { event.preventDefault(); void load(1); }}>
              <input aria-label="Search administrator activity" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search action or structured values" />
              <input aria-label="Filter by exact action" value={action} onChange={event => setAction(event.target.value)} placeholder="Exact action" />
              <input aria-label="Filter by entity type" value={entityType} onChange={event => setEntityType(event.target.value)} placeholder="Entity type" />
              <button className="primary" type="submit">Apply filters</button>
            </form>

            {loading ? (
              <div className="admin-phase__skeleton-list" role="status" aria-label="Loading administrator activity">{Array.from({ length: 5 }).map((_, index) => <div className="admin-phase__skeleton" key={index} />)}</div>
            ) : error ? (
              <div className="admin-phase__state admin-phase__state--error" role="alert">
                <AlertTriangle size={28} /><h2>{errorTitle}</h2><p>{error.message}</p><button onClick={() => void load(page)}><RefreshCw size={16} /> Retry</button>
              </div>
            ) : items.length === 0 ? (
              <div className="admin-phase__state"><Activity size={30} /><h2>No administrator activity found</h2><p>Try changing the filters or check again later.</p></div>
            ) : (
              <div className="admin-phase__table-wrap">
                <table>
                  <thead><tr><th>Action</th><th>Admin</th><th>Entity</th><th>Before / after</th><th>Correlation</th><th>Time</th></tr></thead>
                  <tbody>{items.map(item => (
                    <tr key={item.auditLogId || item.id}>
                      <td><strong>{item.action}</strong></td>
                      <td><div className="admin-phase__person"><UserAvatar name={item.adminName || 'Admin'} src={item.adminAvatar} size="sm" /><span>{item.adminName || 'Admin'}</span></div></td>
                      <td>{item.entityType || '—'} {item.entityId && (item.entityType === 'User' ? <Link to={`/admin/users?preview=${encodeURIComponent(item.entityId)}`}>{item.entityId}</Link> : item.entityType === 'Report' ? <Link to={`/admin/reports/accounts/${item.entityId}`}>{item.entityId}</Link> : <code>{item.entityId}</code>)}</td>
                      <td><details><summary>Structured values</summary><pre>OLD {pretty(item.oldValues)}{`\n`}NEW {pretty(item.newValues)}</pre>{item.userAgent && <p>User-Agent: {item.userAgent}</p>}</details></td>
                      <td><code>{item.correlationId || '—'}</code></td>
                      <td>{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {!loading && !error && items.length > 0 && <footer className="admin-phase__pagination"><button disabled={page <= 1} onClick={() => void load(page - 1)}>Previous</button><span>Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => void load(page + 1)}>Next</button></footer>}
          </section>
        ) : (
          <section className="admin-phase__panel admin-phase__state" role="tabpanel">
            {tab === 'security' ? <ShieldAlert size={34} /> : <Server size={34} />}
            <h2>{unavailableCopy[tab].title}</h2><p>{unavailableCopy[tab].body}</p><span className="admin-phase__badge">Not available</span>
          </section>
        )}
      </main>
    </AppLayout>
  );
}
