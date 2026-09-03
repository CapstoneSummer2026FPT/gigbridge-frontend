import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, FileText, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { adminGetAPI } from '../../../api/adminAPI/GET';
import { adminPostAPI } from '../../../api/adminAPI/POST';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import {
  EloPointAppealResolution,
  EloPointAppealStatus,
  type AdminEloAppealDetail,
} from '../../../types/elo';
import { canResolveAppeal, eloAppealStatusKey, eloModeKey, eloReasonKey, eloSourceTypeKey } from '../../elo/utils/eloLabels';
import '../styles/admin-elo-screen.css';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';

const formatDate = (value: string, language: string): string =>
  new Date(value).toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

interface ResolutionOption {
  id: string;
  status: EloPointAppealStatus;
  resolution: EloPointAppealResolution;
  labelKey: string;
  requiresDelta: boolean;
}

const RESOLUTION_OPTIONS: ResolutionOption[] = [
  { id: 'rejected', status: EloPointAppealStatus.Rejected, resolution: EloPointAppealResolution.NoChange, labelKey: 'adminElo.resolutionRejected', requiresDelta: false },
  { id: 'fullReversal', status: EloPointAppealStatus.Approved, resolution: EloPointAppealResolution.FullReversal, labelKey: 'adminElo.resolutionFullReversal', requiresDelta: false },
  { id: 'partialCorrection', status: EloPointAppealStatus.PartiallyApproved, resolution: EloPointAppealResolution.PartialCorrection, labelKey: 'adminElo.resolutionPartialCorrection', requiresDelta: true },
  { id: 'customAdjustment', status: EloPointAppealStatus.Approved, resolution: EloPointAppealResolution.CustomAdjustment, labelKey: 'adminElo.resolutionCustomAdjustment', requiresDelta: true },
];

export default function AdminEloAppealDetailScreen() {
  const { t, i18n } = useTranslation();
  const { appealId = '' } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AdminEloAppealDetail | null>(null);
  const [option, setOption] = useState<ResolutionOption>(RESOLUTION_OPTIONS[0]);
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const correctedDeltaRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const response = await adminGetAPI.getAdminEloAppealDetail(appealId);
    if (response.success && response.data) {
      setDetail(response.data);
    } else {
      setDetail(null);
      setError(response.message || t('adminElo.loadError'));
    }
    setLoading(false);
  }, [appealId, t]);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!detail || submitting) return;
    const requiresDelta = option.requiresDelta;
    const correctedDelta = requiresDelta ? Number(delta) : null;
    if (requiresDelta && (!Number.isFinite(correctedDelta) || correctedDelta === 0)) {
      const message = t('adminElo.adjustInvalidAmount');
      showValidationToast(message, { fallback: message });
      correctedDeltaRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setFormError('');
    const response = await adminPostAPI.resolveEloAppeal(detail.appeal.appealId, {
      status: option.status,
      resolution: option.resolution,
      correctedDelta,
      resolutionNote: note.trim() || null,
    });
    setSubmitting(false);
    if (!response.success) {
      if (isValidationResponse(response)) showValidationToast(response, { fallback: t('adminElo.resolveError') });
      else setFormError(response.message || t('adminElo.resolveError'));
      return;
    }
    setNotice(t('adminElo.resolveSuccess'));
    setNote('');
    await load();
  };

  const markUnderReview = async () => {
    if (!detail || submitting) return;
    setSubmitting(true);
    setError('');
    const response = await adminPostAPI.resolveEloAppeal(detail.appeal.appealId, {
      status: EloPointAppealStatus.UnderReview,
      resolution: EloPointAppealResolution.NoChange,
      correctedDelta: null,
      resolutionNote: null,
    });
    setSubmitting(false);
    if (!response.success) {
      if (isValidationResponse(response)) showValidationToast(response, { fallback: t('adminElo.resolveError') });
      else setError(response.message || t('adminElo.resolveError'));
      return;
    }
    setNotice(t('adminElo.statusUnderReview'));
    await load();
  };

  const appeal = detail?.appeal;
  const transaction = detail?.transaction;
  const userSummary = detail?.userSummary;
  const canResolve = appeal ? canResolveAppeal(appeal.status) : false;

  return (
    <AppLayout>
      <div className="admin-elo-page">
        <header>
          <div>
            <span className="admin-elo-eyebrow">{t('adminElo.eyebrow')}</span>
            <h1>{t('adminElo.navAppeals')}</h1>
            <button type="button" className="admin-elo-quick-link" style={{ marginTop: '.75rem', maxWidth: 'max-content' }} onClick={() => navigate('/admin/elo/appeals')}>
              <ArrowLeft size={15} /> {t('adminElo.openAppeals')}
            </button>
          </div>
        </header>

        {error && <div className="admin-elo-error">{error}</div>}
        {notice && <div className="admin-elo-notice">{notice}</div>}
        {loading && <div className="admin-elo-empty">{t('adminElo.loading')}</div>}

        {detail && appeal && (
          <div className="admin-elo-detail-layout">
            <div className="admin-elo-detail-card">
              <div className="admin-elo-modal-header">
                <div>
                  <h3>
                    <span className={`admin-elo-status status-${appeal.status}`}>{t(eloAppealStatusKey(appeal.status))}</span>
                  </h3>
                </div>
                <span>{formatDate(appeal.createdAt, i18n.language)}</span>
              </div>

              <div className="admin-elo-detail-grid">
                <div className="admin-elo-detail-full">
                  <small>{t('adminElo.user')}</small>
                  <strong>
                    <UserProfileLink userId={appeal.user.userId} role={appeal.user.role}>{appeal.user.fullName}</UserProfileLink>
                  </strong>
                </div>
                <div className="admin-elo-detail-full">
                  <small>{t('adminElo.appealReason')}</small>
                  <strong style={{ whiteSpace: 'pre-wrap' }}>{appeal.reason}</strong>
                </div>
                {appeal.resolution != null && (
                  <div className="admin-elo-detail-full">
                    <small>{t('adminElo.appealResolution')}</small>
                    <strong>{t(`elo.resolutions.${appeal.resolution}`)}</strong>
                  </div>
                )}
                {appeal.resolutionNote && (
                  <div className="admin-elo-detail-full">
                    <small>{t('adminElo.resolutionNote')}</small>
                    <strong style={{ whiteSpace: 'pre-wrap' }}>{appeal.resolutionNote}</strong>
                  </div>
                )}
                {appeal.correctedDelta != null && (
                  <div className="admin-elo-detail-full">
                    <small>{t('adminElo.correctedDelta')}</small>
                    <strong>{appeal.correctedDelta}</strong>
                  </div>
                )}
                {appeal.reviewedByAdminName && (
                  <div className="admin-elo-detail-full">
                    <small>{t('adminElo.reviewedBy')}</small>
                    <strong>{appeal.reviewedByAdminName}</strong>
                  </div>
                )}
              </div>

              <h3 style={{ marginTop: '1.2rem' }}>{t('adminElo.appealEvidence')}</h3>
              {detail.evidence.length === 0 ? (
                <div className="admin-elo-empty" style={{ border: '1px solid var(--gb-border)', borderRadius: '.55rem' }}>{t('adminElo.evidenceEmpty')}</div>
              ) : (
                <div className="admin-elo-evidence-list">
                  {detail.evidence.map(evidence => (
                    <div className="admin-elo-evidence-item" key={evidence.evidenceId}>
                      <FileText size={15} />
                      <span>{evidence.fileName || evidence.evidenceId}</span>
                      <small>{evidence.fileSize ? `${(evidence.fileSize / 1024 / 1024).toFixed(1)} MB` : ''}</small>
                      {evidence.fileUrl && (
                        <a href={evidence.fileUrl} target="_blank" rel="noopener noreferrer" className="admin-elo-link-button">
                          {t('adminElo.viewEvidence')}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <h3 style={{ marginTop: '1.2rem' }}>{t('adminElo.linkedTransaction')}</h3>
              {!transaction ? (
                <div className="admin-elo-empty" style={{ border: '1px solid var(--gb-border)', borderRadius: '.55rem' }}>{t('adminElo.empty')}</div>
              ) : (
                <div className="admin-elo-detail-grid">
                  <div className="admin-elo-detail-full">
                    <small>{t('adminElo.reason')}</small>
                    <strong>{t(eloReasonKey(transaction.reason))}</strong>
                  </div>
                  <div>
                    <small>{t('adminElo.delta')}</small>
                    <strong className={transaction.pointsDelta >= 0 ? 'gained' : 'lost'}>
                      {transaction.pointsDelta >= 0 ? '+' : '−'}{Math.abs(transaction.pointsDelta)}
                    </strong>
                  </div>
                  <div>
                    <small>{t('adminElo.source')}</small>
                    <strong>{t(eloSourceTypeKey(transaction.sourceType))}</strong>
                  </div>
                  <div>
                    <small>{t('adminElo.date')}</small>
                    <strong>{formatDate(transaction.createdAt, i18n.language)}</strong>
                  </div>
                  <div>
                    <small>{t('elo.mode')}</small>
                    <strong>{t(eloModeKey(transaction.mode))}</strong>
                  </div>
                  <div className="admin-elo-detail-full">
                    <small>{t('elo.transactionId')}</small>
                    <strong>{transaction.transactionId}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="admin-elo-detail-card">
              {userSummary && (
                <>
                  <h3>{t('adminElo.userScore')}</h3>
                  <div className="admin-elo-user-mini">
                    <strong>{userSummary.currentPoints}</strong>
                    <span>
                      <span className="gained">+{userSummary.totalGained}</span> / <span className="lost">−{userSummary.totalLost}</span> · {userSummary.totalTransactions} {t('adminElo.statTransactions')}
                    </span>
                  </div>
                </>
              )}

              <h3>{t('adminElo.resolveTitle')}</h3>
              <p className="admin-elo-policy-help">{t('adminElo.resolveHelp')}</p>

              {!canResolve ? (
                <div className="admin-elo-empty">{t('adminElo.empty')}</div>
              ) : (
                <>
                  <div className="admin-elo-resolution-options">
                    {RESOLUTION_OPTIONS.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className={option.id === item.id ? 'active' : ''}
                        onClick={() => { setOption(item); setFormError(''); }}
                      >
                        {t(item.labelKey)}
                      </button>
                    ))}
                  </div>

                  {option.requiresDelta && (
                    <label>
                      {t('adminElo.correctedDelta')}
                      <input
                        ref={correctedDeltaRef}
                        type="number"
                        step="any"
                        aria-label={t('adminElo.correctedDelta')}
                        value={delta}
                        disabled={submitting}
                        onChange={event => setDelta(event.target.value)}
                      />
                      <small className="admin-elo-help">{t('adminElo.deltaHelp')}</small>
                    </label>
                  )}

                  <label>
                    {t('adminElo.resolutionNote')}
                    <textarea
                      maxLength={2000}
                      value={note}
                      disabled={submitting}
                      placeholder={t('adminElo.notePlaceholder')}
                      onChange={event => setNote(event.target.value)}
                    />
                  </label>

                  {formError && <div className="admin-elo-error">{formError}</div>}

                  <div className="admin-elo-modal-actions">
                    <button type="button" disabled={submitting} onClick={() => void markUnderReview()}>
                      {submitting ? t('adminElo.resolveSubmitting') : t('adminElo.statusUnderReview')}
                    </button>
                    <button type="button" className="primary" disabled={submitting} onClick={() => void submit()}>
                      {submitting ? t('adminElo.resolveSubmitting') : t('adminElo.resolveConfirm')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {notice && (
        <div className="admin-elo-overlay" onMouseDown={() => setNotice('')}>
          <section className="admin-elo-modal" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="admin-elo-modal-header">
              <div>
                <h2>{notice}</h2>
              </div>
              <button type="button" className="admin-elo-modal-close" aria-label={t('adminElo.close')} onClick={() => setNotice('')}>
                <X size={19} />
              </button>
            </div>
            <div className="admin-elo-modal-actions">
              <button type="button" className="primary" onClick={() => { setNotice(''); navigate('/admin/elo/appeals'); }}>
                {t('adminElo.openAppeals')}
              </button>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
