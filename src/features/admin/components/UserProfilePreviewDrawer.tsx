import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ExternalLink, RefreshCw, Wallet, X } from 'lucide-react';
import { Link } from 'react-router';

import { adminGetAPI } from '../../../api/adminAPI/GET';
import { adminPostAPI } from '../../../api/adminAPI/POST';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';
import {
  AccountStatus,
  UserViolationType,
  type AdminUserDetail,
  type EnforcementPayload,
} from '../../../types/models/AdminPhase1';

type PreviewTab = 'overview' | 'profile' | 'reports' | 'violations' | 'wallet' | 'assets' | 'audit';
type UserAction = 'warning' | 'suspend' | 'ban' | 'clear' | 'restore' | 'wallet' | null;

interface UserProfilePreviewDrawerProps {
  userId: string;
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
}

const tabs: Array<{ id: PreviewTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Profile' },
  { id: 'reports', label: 'Reports' },
  { id: 'violations', label: 'Violations' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'assets', label: 'Assets' },
  { id: 'audit', label: 'Audit History' },
];

const roleLabels = ['Client', 'Freelancer', 'Admin'];
const accountLabels = ['Active', 'Suspended', 'Banned'];

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="admin-user-preview__field"><span>{label}</span><strong>{value ?? '—'}</strong></div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="admin-user-preview__empty">{children}</div>;
}

export function UserProfilePreviewDrawer({ userId, onClose, onChanged }: UserProfilePreviewDrawerProps) {
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [tab, setTab] = useState<PreviewTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsLoadedFor, setAssetsLoadedFor] = useState('');
  const [action, setAction] = useState<UserAction>(null);
  const [reason, setReason] = useState('');
  const [suspendedUntil, setSuspendedUntil] = useState('');
  const [walletDirection, setWalletDirection] = useState<'credit' | 'debit'>('credit');
  const [walletAmount, setWalletAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const drawerRef = useRef<HTMLElement>(null);
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setData(null);
    setLoading(true);
    setError(null);
    const response = await adminGetAPI.getUserDetail(userId);
    if (sequence !== requestSequence.current) return;
    if (response.success && response.data) setData(response.data);
    else setError({ message: response.message || 'Unable to load this user.', status: response.statusCode });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setTab('overview');
    setAssets([]);
    setAssetsLoadedFor('');
    setAction(null);
    void load();
    return () => { requestSequence.current += 1; };
  }, [load]);

  useEffect(() => {
    if (tab !== 'assets' || assetsLoadedFor === userId) return;
    let active = true;
    setAssetsLoading(true);
    void adminGetAPI.getAssets({ uploadedByUserId: userId }).then(response => {
      if (!active) return;
      setAssets(response.success && response.data ? response.data : []);
      setAssetsLoadedFor(userId);
      setAssetsLoading(false);
    });
    return () => { active = false; };
  }, [assetsLoadedFor, tab, userId]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const drawer = drawerRef.current;
    drawer?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !action) { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (focusable.length === 0) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus(); };
  }, [action, onClose]);

  const applyAction = async () => {
    if (!action || !data) return;
    const validationMessages: string[] = [];
    const tokenAmount = Number(walletAmount);
    if (action === 'wallet' && (!Number.isFinite(tokenAmount) || tokenAmount <= 0)) {
      validationMessages.push('Enter an amount greater than zero.');
    }
    if (action !== 'wallet' && !reason.trim()) {
      validationMessages.push('A reason is required.');
    }
    if (action === 'suspend' && !suspendedUntil) {
      validationMessages.push('Select a suspension end date.');
    }
    if (validationMessages.length > 0) {
      showValidationToast(validationMessages, { fallback: 'Complete the required fields.' });
      if (action === 'wallet') drawerRef.current?.querySelector<HTMLInputElement>('[aria-label="Token amount"]')?.focus();
      else if (action === 'suspend' && !suspendedUntil) drawerRef.current?.querySelector<HTMLInputElement>('[aria-label="Suspension end"]')?.focus();
      else drawerRef.current?.querySelector<HTMLTextAreaElement>('[aria-label="Reason"]')?.focus();
      return;
    }
    setBusy(true); setActionError('');
    let response;
    if (action === 'wallet') {
      const payload = { tokenAmount, note: reason.trim() || `Admin ${walletDirection} adjustment`, idempotencyKey: crypto.randomUUID() };
      response = walletDirection === 'credit' ? await adminPostAPI.creditWallet(userId, payload) : await adminPostAPI.debitWallet(userId, payload);
    } else if (action === 'clear') response = await adminPostAPI.clearUserSuspension(userId, reason.trim());
    else if (action === 'restore') response = await adminPostAPI.restoreUser(userId, reason.trim());
    else {
      const payload: EnforcementPayload = { requestId: crypto.randomUUID(), violationType: UserViolationType.PlatformPolicyViolation, reason: reason.trim() };
      if (action === 'suspend') payload.suspendedUntil = new Date(suspendedUntil).toISOString();
      response = await adminPostAPI.enforceUser(userId, action, payload);
    }
    if (!response.success) {
      if (isValidationResponse(response)) {
        showValidationToast(response, { fallback: response.message || 'The action could not be completed.' });
        drawerRef.current?.querySelector<HTMLTextAreaElement>('[aria-label="Reason"]')?.focus();
      } else {
      setActionError(response.statusCode === 409 ? `Conflict: ${response.message}` : response.message || 'The action could not be completed.');
      }
    } else {
      setAction(null); setReason(''); setSuspendedUntil(''); setWalletAmount('');
      await load(); await onChanged?.();
    }
    setBusy(false);
  };

  const protectedAdmin = data?.role === 2;
  const actionReady = true;
  const errorTitle = error?.status === 404 ? 'User not found' : error?.status === 401 || error?.status === 403 ? 'Access denied' : 'Profile Preview could not be loaded';

  return createPortal(
    <div className="admin-user-preview__overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <aside ref={drawerRef} className="admin-user-preview" role="dialog" aria-modal="true" aria-labelledby="user-preview-title" tabIndex={-1}>
        <header className="admin-user-preview__header">
          <div><span>Profile Preview</span><h2 id="user-preview-title">{data?.fullName || 'User details'}</h2></div>
          <button className="admin-user-preview__close" onClick={onClose} aria-label="Close Profile Preview"><X size={20} /></button>
        </header>

        {loading ? <div className="admin-user-preview__loading" role="status" aria-label="Loading user detail">{Array.from({ length: 7 }).map((_, index) => <div key={index} />)}</div> : error ? (
          <div className="admin-user-preview__state" role="alert"><AlertTriangle size={34} /><h3>{errorTitle}</h3><p>{error.message}</p><button onClick={() => void load()}><RefreshCw size={16} /> Retry</button></div>
        ) : data ? <>
          <div className="admin-user-preview__identity">
            <UserAvatar name={data.fullName} src={data.avatar} size="xl" premium={Boolean(data.subscription)} />
            <div><h3>{data.fullName}</h3><p>{data.email}</p><div className="admin-user-preview__badges"><span className="admin-phase__badge">{roleLabels[data.role] || 'Unknown role'}</span><span className={`admin-phase__badge ${data.accountStatus === AccountStatus.Active ? 'success' : 'danger'}`}>{accountLabels[data.accountStatus] || 'Unknown status'}</span>{data.isFlagged && <span className="admin-phase__badge danger">Flagged · {data.violationCount}</span>}</div></div>
          </div>
          <nav className="admin-user-preview__tabs" role="tablist" aria-label="User detail sections">{tabs.map(item => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
          <div className="admin-user-preview__content" role="tabpanel">
            {tab === 'overview' && <>
              <section className="admin-user-preview__grid"><Field label="Email verification" value={data.isEmailVerified ? 'Verified' : 'Not verified'} /><Field label="IsActive" value={data.isActive ? 'Yes' : 'No'} /><Field label="AccountStatus" value={accountLabels[data.accountStatus] || 'Unknown'} /><Field label="IsFlagged" value={data.isFlagged ? 'Yes' : 'No'} /><Field label="ViolationCount" value={data.violationCount} /><Field label="Created" value={new Date(data.createdAt).toLocaleString()} /><Field label="SuspendedUntil" value={data.suspendedUntil ? new Date(data.suspendedUntil).toLocaleString() : '—'} /><Field label="BannedAt" value={data.bannedAt ? new Date(data.bannedAt).toLocaleString() : '—'} /><Field label="BanReason" value={data.banReason || '—'} /><Field label="Reputation / Elo" value={data.eloPoints ?? 'Not available'} /></section>
              <section className="admin-user-preview__section"><h3>Premium / Subscription</h3>{data.subscription ? <div className="admin-user-preview__grid"><Field label="Plan" value={data.subscription.planName} /><Field label="Status" value={data.subscription.status} /><Field label="Starts" value={new Date(data.subscription.startDate).toLocaleDateString()} /><Field label="Ends" value={new Date(data.subscription.endDate).toLocaleDateString()} /></div> : <Empty>No subscription is recorded.</Empty>}</section>
              <section className="admin-user-preview__section"><h3>Account enforcement</h3><p>{protectedAdmin ? 'Admin accounts are protected from User Management enforcement.' : 'Every action requires a reason and is recorded by the backend audit service.'}</p><div className="admin-user-preview__actions"><button disabled={protectedAdmin} onClick={() => setAction('warning')}>Issue warning</button><button disabled={protectedAdmin} onClick={() => setAction('suspend')}>Suspend</button><button className="danger" disabled={protectedAdmin} onClick={() => setAction('ban')}>Ban</button><button disabled={protectedAdmin || data.accountStatus !== AccountStatus.Suspended} onClick={() => setAction('clear')}>Clear suspension</button><button disabled={protectedAdmin} onClick={() => setAction('restore')}>Restore</button></div></section>
            </>}
            {tab === 'profile' && <section className="admin-user-preview__section"><h3>{data.profile?.kind || 'Profile'}</h3>{data.profile ? <><div className="admin-user-preview__grid"><Field label="Title / Company" value={data.profile.title || data.profile.companyName || '—'} /><Field label="Industry" value={data.profile.industry || '—'} /><Field label="Location" value={data.profile.location || '—'} /></div>{data.profile.bio && <p className="admin-user-preview__copy">{data.profile.bio}</p>}<h4>Skills</h4><div className="admin-user-preview__chips">{data.profile.skills.length ? data.profile.skills.map(skill => <span key={skill}>{skill}</span>) : 'No skills recorded.'}</div><h4>Categories</h4><div className="admin-user-preview__chips">{data.profile.categories.length ? data.profile.categories.map(category => <span key={category}>{category}</span>) : 'No categories recorded.'}</div><h4>Portfolio</h4>{data.profile.portfolioUrls.length ? data.profile.portfolioUrls.map(url => <a className="admin-user-preview__external" href={url} target="_blank" rel="noreferrer" key={url}>{url}<ExternalLink size={14} /></a>) : <Empty>No portfolio items recorded.</Empty>}<h4>Work experience</h4>{data.profile.workExperience.length ? <ul>{data.profile.workExperience.map(item => <li key={item}>{item}</li>)}</ul> : <Empty>No work experience recorded.</Empty>}</> : <Empty>No Client or Freelancer profile is available.</Empty>}</section>}
            {tab === 'reports' && <section className="admin-user-preview__section"><h3>Recent Account Reports</h3>{data.recentReports.length ? <div className="admin-user-preview__list">{data.recentReports.map(report => <article key={report.id}><Link to={`/admin/reports/accounts/${report.id}`}>{report.reason}</Link><p>{report.description || 'No description.'}</p><small>{new Date(report.createdAt).toLocaleString()} · {report.evidenceCount} evidence item(s)</small></article>)}</div> : <Empty>No recent account reports.</Empty>}</section>}
            {tab === 'violations' && <section className="admin-user-preview__section"><h3>Violation History</h3>{data.recentViolations.length ? <div className="admin-user-preview__list">{data.recentViolations.map(violation => <article key={violation.id}><strong>Violation #{violation.number}</strong><p>{violation.reason}</p><small>{new Date(violation.createdAt).toLocaleString()} · {violation.isActive ? 'Active' : 'Inactive'}</small></article>)}</div> : <Empty>No violations recorded.</Empty>}</section>}
            {tab === 'wallet' && <section className="admin-user-preview__section"><div className="admin-user-preview__section-heading"><div><h3>Read-only Wallet Summary</h3><p>Ledger values are displayed exactly as returned by the Admin User Detail API.</p></div><button onClick={() => setAction('wallet')}><Wallet size={16} /> Open adjustment dialog</button></div>{data.wallet ? <div className="admin-user-preview__grid"><Field label="Available tokens" value={data.wallet.availableTokens} /><Field label="Withdrawable tokens" value={data.wallet.withdrawableTokens} /><Field label="Held tokens" value={data.wallet.heldTokens} /><Field label="Pending withdrawal" value={data.wallet.pendingWithdrawalTokens} /></div> : <Empty>No wallet exists for this user.</Empty>}</section>}
            {tab === 'assets' && <section className="admin-user-preview__section"><h3>User Assets</h3>{assetsLoading ? <div className="admin-user-preview__loading compact" role="status"><div /><div /></div> : assets.length ? <div className="admin-user-preview__list">{assets.map(asset => <article key={asset.assetId || asset.id}><strong>{asset.fileName || 'Asset'}</strong><p>{asset.contractTitle || asset.assetType || 'Platform asset'}</p><small>{asset.createdAt ? new Date(asset.createdAt).toLocaleString() : 'Date unavailable'}</small></article>)}</div> : <Empty>No assets recorded.</Empty>}</section>}
            {tab === 'audit' && <section className="admin-user-preview__section"><h3>Related Audit History</h3>{data.recentAuditLogs.length ? <div className="admin-user-preview__list">{data.recentAuditLogs.map(log => <article key={log.id}><strong>{log.action}</strong><small>{new Date(log.createdAt).toLocaleString()}</small>{log.newValues != null && <pre>{typeof log.newValues === 'string' ? log.newValues : JSON.stringify(log.newValues, null, 2)}</pre>}</article>)}</div> : <Empty>No related audit entries.</Empty>}</section>}
          </div>
        </> : <div className="admin-user-preview__state">No user data is available.</div>}

        {action && <div className="admin-user-preview__action-dialog" role="alertdialog" aria-modal="true" aria-labelledby="user-action-title">
          <div><h3 id="user-action-title">{action === 'wallet' ? 'Wallet adjustment' : `${action[0].toUpperCase()}${action.slice(1)} user`}</h3>{action === 'wallet' && <select aria-label="Wallet adjustment direction" value={walletDirection} onChange={event => setWalletDirection(event.target.value as 'credit' | 'debit')}><option value="credit">Credit</option><option value="debit">Debit</option></select>}{action === 'wallet' && <input aria-label="Token amount" type="number" min="0.01" step="any" value={walletAmount} onChange={event => setWalletAmount(event.target.value)} placeholder="Token amount" />}{action === 'suspend' && <input aria-label="Suspension end" type="datetime-local" value={suspendedUntil} onChange={event => setSuspendedUntil(event.target.value)} />}<textarea autoFocus aria-label="Reason" value={reason} onChange={event => setReason(event.target.value)} placeholder={action === 'wallet' ? 'Adjustment note' : 'Required reason'} />{actionError && <p className="admin-user-preview__action-error" role="alert">{actionError}</p>}<div className="admin-user-preview__actions"><button onClick={() => { setAction(null); setActionError(''); }}>Cancel</button><button className={action === 'ban' || (action === 'wallet' && walletDirection === 'debit') ? 'danger' : 'primary'} disabled={busy || !actionReady} onClick={() => void applyAction()}>{busy ? 'Working…' : 'Confirm'}</button></div></div>
        </div>}
      </aside>
    </div>,
    document.body,
  );
}
