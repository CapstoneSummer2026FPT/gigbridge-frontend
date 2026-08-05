import { useCallback, useEffect, useState } from 'react';
import { Gauge, ListChecks, Scale, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { adminGetAPI } from '../../../api/adminAPI/GET';
import { adminPutAPI } from '../../../api/adminAPI/PUT';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import { EloAdjustmentMode, EloPointAppealStatus, type EloPolicy } from '../../../types/elo';
import '../styles/admin-elo-screen.css';

const DEFAULT_POLICY: EloPolicy = { mode: EloAdjustmentMode.Percentage, value: 50 };

export default function AdminEloOverviewScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ transactions: 0, gained: 0, lost: 0, pendingAppeals: 0 });
  const [policy, setPolicy] = useState<EloPolicy>(DEFAULT_POLICY);
  const [policyDraft, setPolicyDraft] = useState<EloPolicy>(DEFAULT_POLICY);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [all, gained, lost, pending, policyResponse] = await Promise.all([
      adminGetAPI.getAdminEloHistory({ page: 1, pageSize: 1 }),
      adminGetAPI.getAdminEloHistory({ page: 1, pageSize: 1, filter: 'Gained' }),
      adminGetAPI.getAdminEloHistory({ page: 1, pageSize: 1, filter: 'Lost' }),
      adminGetAPI.getAdminEloAppeals({ page: 1, pageSize: 1, status: EloPointAppealStatus.Pending }),
      adminGetAPI.getEloPolicy(),
    ]);
    setStats({
      transactions: all.data?.totalCount ?? 0,
      gained: gained.data?.totalCount ?? 0,
      lost: lost.data?.totalCount ?? 0,
      pendingAppeals: pending.data?.totalCount ?? 0,
    });
    if (policyResponse.success && policyResponse.data) {
      setPolicy(policyResponse.data);
      setPolicyDraft(policyResponse.data);
    }
    if (!all.success && !gained.success && !lost.success && !pending.success && !policyResponse.success) {
      setError(all.message || t('adminElo.loadError'));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const savePolicy = async () => {
    setPolicySaving(true);
    setError('');
    const response = await adminPutAPI.updateEloPolicy(policyDraft);
    setPolicySaving(false);
    if (!response.success || !response.data) {
      setError(response.message || t('adminElo.policySaveError'));
      return;
    }
    setPolicy(response.data);
    setPolicyDraft(response.data);
    setPolicyModalOpen(false);
    setNotice(t('adminElo.policySaved'));
  };

  return (
    <AppLayout>
      <div className="admin-elo-page">
        <header>
          <div>
            <span className="admin-elo-eyebrow">{t('adminElo.eyebrow')}</span>
            <h1>{t('adminElo.title')}</h1>
            <p>{t('adminElo.subtitle')}</p>
          </div>
        </header>

        {error && <div className="admin-elo-error">{error}</div>}
        {notice && <div className="admin-elo-notice">{notice}</div>}

        <section className="admin-elo-summary" aria-label={t('adminElo.statsLabel')}>
          <div><strong>{stats.transactions}</strong><span>{t('adminElo.statTransactions')}</span></div>
          <div><strong className="gained">+{stats.gained}</strong><span>{t('adminElo.statGained')}</span></div>
          <div><strong className="lost">−{stats.lost}</strong><span>{t('adminElo.statLost')}</span></div>
          <div><strong>{stats.pendingAppeals}</strong><span>{t('adminElo.statPendingAppeals')}</span></div>
        </section>

        {loading && <div className="admin-elo-empty">{t('adminElo.loading')}</div>}

        <div className="admin-elo-layout">
          <section className="admin-elo-policy-card">
            <h3>{t('adminElo.policyTitle')}</h3>
            <div className="admin-elo-policy-row">
              <span>{t('adminElo.policyMode')}</span>
              <strong>{policy.mode === EloAdjustmentMode.Percentage ? t('adminElo.modePercentage') : t('adminElo.modeFixed')}</strong>
            </div>
            <div className="admin-elo-policy-row">
              <span>{t('adminElo.policyValue')}</span>
              <strong>{policy.mode === EloAdjustmentMode.Percentage ? `${policy.value}%` : policy.value}</strong>
            </div>
            <p className="admin-elo-policy-help">{t('adminElo.policyHelp')}</p>
            <button
              type="button"
              className="admin-elo-adjust-button"
              onClick={() => { setPolicyDraft(policy); setError(''); setPolicyModalOpen(true); }}
            >
              <Scale size={15} /> {t('adminElo.policyEdit')}
            </button>
          </section>

          <section className="admin-elo-quick-card">
            <h3>{t('adminElo.quickLinks')}</h3>
            <div className="admin-elo-quick-links">
              <button type="button" className="admin-elo-quick-link" onClick={() => navigate('/admin/elo/history')}>
                <ListChecks size={16} /> {t('adminElo.openHistory')}
              </button>
              <button type="button" className="admin-elo-quick-link" onClick={() => navigate('/admin/elo/appeals')}>
                <Gauge size={16} /> {t('adminElo.openAppeals')}
              </button>
            </div>
          </section>
        </div>
      </div>

      {policyModalOpen && (
        <div className="admin-elo-overlay" onMouseDown={() => !policySaving && setPolicyModalOpen(false)}>
          <section className="admin-elo-modal" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="admin-elo-modal-header">
              <div>
                <h2>{t('adminElo.policyEdit')}</h2>
                <p>{t('adminElo.policyHelp')}</p>
              </div>
              <button type="button" className="admin-elo-modal-close" aria-label={t('adminElo.close')} onClick={() => setPolicyModalOpen(false)}>
                <X size={19} />
              </button>
            </div>
            <label>
              {t('adminElo.policyMode')}
              <select
                value={policyDraft.mode}
                onChange={event => setPolicyDraft(draft => ({ ...draft, mode: Number(event.target.value) as EloAdjustmentMode }))}
              >
                <option value={EloAdjustmentMode.FixedPoints}>{t('adminElo.modeFixed')}</option>
                <option value={EloAdjustmentMode.Percentage}>{t('adminElo.modePercentage')}</option>
              </select>
            </label>
            <label>
              {t('adminElo.policyValue')}
              <input
                type="number"
                min="0"
                step="any"
                value={String(policyDraft.value)}
                disabled={policySaving}
                onChange={event => setPolicyDraft(draft => ({ ...draft, value: Number(event.target.value) }))}
              />
              {policyDraft.mode === EloAdjustmentMode.Percentage && (
                <small className="admin-elo-help">%</small>
              )}
            </label>
            <div className="admin-elo-modal-actions">
              <button type="button" disabled={policySaving} onClick={() => setPolicyModalOpen(false)}>
                {t('adminElo.cancel')}
              </button>
              <button type="button" className="primary" disabled={policySaving || !(policyDraft.value >= 0)} onClick={() => void savePolicy()}>
                {policySaving ? t('adminElo.policySaving') : t('adminElo.policySave')}
              </button>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
