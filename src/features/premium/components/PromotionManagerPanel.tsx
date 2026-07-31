import { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, Upload, Target } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { premiumAPI } from '../api';
import { PromotionStatus } from '../types';
import type { PromotionCardInput, PromotionDraft, PromotionManager } from '../types';
import { calculatePromotionBoostWeight, calculatePromotionTarget, projectPromotionQueue } from '../utils/promotionPolicy';
import { PromotionCard } from './PromotionCard';

const NO_ADDITIONAL_BOOST = 0;
const MANAGER_REFRESH_INTERVAL_MS = 15_000;
const BOOST_LADDER_VISIBLE_ROWS = 8;

export function PromotionManagerPanel({ entitled }: { entitled: boolean }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<PromotionDraft>();
  const [manager, setManager] = useState<PromotionManager>();
  const [card, setCard] = useState<PromotionCardInput>({ photoUrl: '', displayName: '', quote: '', showQuote: false, jobTitle: '', showJobTitle: true });
  const [initialBoostAmount, setInitialBoostAmount] = useState(String(NO_ADDITIONAL_BOOST));
  const [boostAmount, setBoostAmount] = useState('');
  const [clientTarget, setClientTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    const [draftResponse, managerResponse] = await Promise.all([
      premiumAPI.promotionDraft(), premiumAPI.promotionManager(),
    ]);
    setLoadError(!draftResponse.success ? draftResponse.message
      : !managerResponse.success ? managerResponse.message
        : '');
    if (draftResponse.data) {
      setDraft(draftResponse.data);
      setCard(current => current.displayName ? current : {
        photoUrl: draftResponse.data!.photoUrl, displayName: draftResponse.data!.displayName,
        quote: '', showQuote: false, jobTitle: draftResponse.data!.jobTitle || '', showJobTitle: Boolean(draftResponse.data!.jobTitle),
      });
    }
    if (managerResponse.data) setManager(managerResponse.data);
  }, [t]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!manager?.active) return;
    const timer = window.setInterval(() => void load(), MANAGER_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load, manager?.active]);

  const defaultTarget = useMemo(() => draft
    ? calculatePromotionTarget(NO_ADDITIONAL_BOOST, draft.policy) : NO_ADDITIONAL_BOOST, [draft]);
  const initialBoostTokens = Number(initialBoostAmount) || NO_ADDITIONAL_BOOST;
  const projectedTarget = draft
    ? calculatePromotionTarget(initialBoostTokens, draft.policy) : NO_ADDITIONAL_BOOST;
  const updateClientTarget = (raw: string) => {
    const requested = Math.max(defaultTarget, Math.trunc(Number(raw) || defaultTarget));
    const additionalClicks = requested - defaultTarget;
    const amount = draft ? Math.ceil(additionalClicks / draft.policy.targetClicksPerCoin) : NO_ADDITIONAL_BOOST;
    setInitialBoostAmount(String(amount));
    setClientTarget(String(draft
      ? calculatePromotionTarget(amount, draft.policy) : requested));
  };

  const upload = async (file?: File) => {
    if (!file) return;
    if (draft && file.size > draft.policy.maximumPhotoBytes) { setMessage(t('premiumPromotion.photoTooLarge')); return; }
    setBusy(true); setMessage('');
    const response = await premiumAPI.uploadPromotionPhoto(file);
    setBusy(false); if (response.data) setCard(value => ({ ...value, photoUrl: response.data! })); else setMessage(response.message);
  };
  const create = async () => {
    if (!card.photoUrl.trim() || !card.displayName.trim()) return;
    setBusy(true); setMessage('');
    const response = await premiumAPI.purchasePromotion(initialBoostTokens, crypto.randomUUID(), card);
    setMessage(response.message);
    setBusy(false); if (response.success) { setInitialBoostAmount(String(NO_ADDITIONAL_BOOST)); setClientTarget(''); await load(); }
  };
  if (loadError) return <section className="premium-card premium-error">{loadError}</section>;
  if (!draft || !manager) return <section className="premium-card">{t('premiumPromotion.loading')}</section>;
  const boostTokens = Number(boostAmount);
  const boostWeightIncrease = boostTokens > 0
    ? calculatePromotionBoostWeight(boostTokens, draft.policy) : 0;
  const canBoost = entitled && Boolean(manager.active) &&
    Number.isInteger(boostTokens) &&
    boostTokens >= draft.policy.minimumBoostCoins &&
    boostTokens <= draft.policy.maximumBoostCoinsPerTransaction &&
    boostTokens <= manager.availableTokens;
  const managerQueue = manager.queue ?? [];
  const queueSource = manager.active &&
    !managerQueue.some(entry => entry.isCurrent)
    ? [...managerQueue, {
          queuePosition: manager.active.queuePosition,
          boostWeight: manager.active.boostWeight,
          isCurrent: true,
        }]
    : managerQueue;
  const projectedWeight = manager.active
    ? manager.active.boostWeight + boostWeightIncrease : 0;
  const projectedQueue = projectPromotionQueue(queueSource, projectedWeight);
  const currentProjectedIndex = projectedQueue.findIndex(entry => entry.isCurrent);
  const projectedPosition = currentProjectedIndex >= 0
    ? currentProjectedIndex + 1
    : manager.active?.queuePosition || 0;
  const ladderStart = Math.min(
    Math.max(currentProjectedIndex - 3, 0),
    Math.max(projectedQueue.length - BOOST_LADDER_VISIBLE_ROWS, 0));
  const visibleQueue = projectedQueue.slice(
    ladderStart, ladderStart + BOOST_LADDER_VISIBLE_ROWS);
  const maximumVisibleWeight = Math.max(
    1, ...visibleQueue.map(entry => entry.boostWeight));
  const boost = async () => {
    if (!manager?.active || !canBoost) return;
    setBusy(true); setMessage('');
    const response = await premiumAPI.boostPromotion(
      manager.active.id, boostTokens, crypto.randomUUID());
    setMessage(response.message); setBusy(false);
    if (response.success) { setBoostAmount(''); await load(); }
  };
  const end = async () => {
    if (!manager?.active ||
      !window.confirm(t('premiumPromotion.endConfirmation'))) return;
    setBusy(true); setMessage('');
    const response = await premiumAPI.endPromotion(manager.active.id);
    setMessage(response.message); setBusy(false);
    if (response.success) { setBoostAmount(''); await load(); }
  };
  const activeCard = manager.active ? { photoUrl: manager.active.photoUrl, displayName: manager.active.displayName,
    quote: manager.active.quote || '', showQuote: manager.active.showQuote,
    jobTitle: manager.active.jobTitle || '', showJobTitle: manager.active.showJobTitle } : card;
  return <div className="promotion-manager-layout">
    {!manager.active ? <section className="premium-card promotion-builder">
      <Megaphone color="#8b5cf6" /><h3>{t('premiumPromotion.builderTitle')}</h3>
      <label>{t('premiumPromotion.photo')}<input className="premium-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void upload(event.target.files?.[0])} /></label>
      <label>{t('premiumPromotion.name')}<input className="premium-input" maxLength={draft.policy.displayNameMaxLength} value={card.displayName} onChange={event => setCard(value => ({ ...value, displayName: event.target.value }))} /></label>
      <label className="premium-toggle"><input type="checkbox" checked={card.showQuote} onChange={event => setCard(value => ({ ...value, showQuote: event.target.checked }))} />{t('premiumPromotion.showQuote')}</label>
      {card.showQuote && <textarea className="premium-input" maxLength={draft.policy.quoteMaxLength} value={card.quote} onChange={event => setCard(value => ({ ...value, quote: event.target.value }))} />}
      <label className="premium-toggle"><input type="checkbox" checked={card.showJobTitle} onChange={event => setCard(value => ({ ...value, showJobTitle: event.target.checked }))} />{t('premiumPromotion.showJobTitle')}</label>
      <input className="premium-input" maxLength={draft.policy.jobTitleMaxLength} value={card.jobTitle} readOnly />
      <label>{t('premiumPromotion.clientTarget')}<input className="premium-input" type="number" min={defaultTarget} value={clientTarget || projectedTarget} onChange={event => updateClientTarget(event.target.value)} /></label>
      <p className="premium-muted">{t('premiumPromotion.defaultTarget', { clicks: defaultTarget })}</p>
      <p className="premium-muted">{t('premiumPromotion.purchaseSummary', { coins: initialBoostTokens, clicks: projectedTarget })}</p>
      <button className="premium-button" disabled={busy || !entitled || !card.photoUrl.trim() || !card.displayName.trim() || !Number.isInteger(initialBoostTokens) || initialBoostTokens > draft.policy.maximumBoostCoinsPerTransaction || initialBoostTokens > manager.availableTokens} onClick={() => void create()}>{t('premiumPromotion.activate')}</button>
    </section> : <section className="premium-card promotion-stat-card promotion-active-manager">
        <h3>{t('premiumPromotion.managerTitle')}</h3>
        <span className="promotion-status ongoing">{t('premiumPromotion.ongoing')}</span>
        <div className="premium-row"><span>{t('premiumPromotion.duration')}</span><strong>{new Date(manager.active.endsAt).toLocaleString()}</strong></div>
        <div className="premium-row"><span>{t('premiumPromotion.clicks')}</span><strong>{manager.active.clickCount}/{manager.active.targetClickCount}</strong></div>
        <div className="premium-row"><span>{t('premiumPromotion.impressions')}</span><strong>{manager.active.impressionCount}</strong></div>
        <div className="premium-row"><span>{t('premiumPromotion.boostWeight')}</span><strong>{manager.active.boostWeight}</strong></div>
        <div className="premium-row"><span>{t('premiumPromotion.tokensSpent')}</span><strong>{manager.active.tokenCost}</strong></div>
        <div className="premium-row"><span>{t('premiumPromotion.queue')}</span><strong>{manager.active.queuePosition}</strong></div>
        <section className="boost-ladder" aria-label={t('premiumPromotion.boostLadder')}>
          <div className="boost-ladder-head">
            <div><h4>{t('premiumPromotion.boostLadder')}</h4><p>{t('premiumPromotion.boostLadderHint')}</p></div>
            <strong>#{projectedPosition}</strong>
          </div>
          <div className="boost-ladder-list">
            {visibleQueue.map(entry => <div className={`boost-ladder-row ${entry.isCurrent ? 'current' : ''}`} key={`${entry.queuePosition}-${entry.isCurrent}`}>
              <span className="boost-ladder-rank">#{entry.queuePosition}</span>
              <div className="boost-ladder-track">
                <span className="boost-ladder-fill" style={{ width: `${Math.max(6, (entry.boostWeight / maximumVisibleWeight) * 100)}%` }} />
                <span className="boost-ladder-label">{entry.isCurrent ? t('premiumPromotion.you') : t('premiumPromotion.promotion')}</span>
              </div>
              <strong>{entry.boostWeight}</strong>
            </div>)}
          </div>
        </section>
        <label><Target size={16} /> {t('premiumPromotion.boostAmount')}<input className="premium-input" type="number" min={draft.policy.minimumBoostCoins} max={draft.policy.maximumBoostCoinsPerTransaction} step="1" value={boostAmount} onChange={event => setBoostAmount(event.target.value)} /></label>
        {boostTokens > 0 && <div className="boost-impact" aria-live="polite">{t(
          projectedPosition === manager.active.queuePosition
            ? 'premiumPromotion.boostImpactStay'
            : 'premiumPromotion.boostImpactMove', {
            current: manager.active.boostWeight,
            increase: boostWeightIncrease,
            total: projectedWeight,
            from: manager.active.queuePosition,
            to: projectedPosition,
            coins: boostTokens,
          })}</div>}
        <button className="premium-button" disabled={busy || !canBoost} onClick={() => void boost()}>{t('premiumPromotion.boost')}</button>
        <button className="premium-button danger" disabled={busy} onClick={() => void end()}>{t('premiumPromotion.endNow')}</button>
      </section>}
    <div><PromotionCard card={activeCard} preview={!manager.active} carouselCount={1} carouselIndex={0} /></div>
    <section className="premium-card promotion-history"><h3>{t('premiumPromotion.queueHistory')}</h3>{[
      ...(manager.active ? [manager.active] : []), ...manager.queued, ...manager.history,
    ].map(item => <div className="premium-row" key={item.id}><div><strong>{item.displayName}</strong><div className="premium-muted">{new Date(item.startsAt).toLocaleDateString()} – {new Date(item.endsAt).toLocaleDateString()}</div></div><span className={`promotion-status ${item === manager.active ? 'ongoing' : item.status === PromotionStatus.Pending ? 'queued' : 'ended'}`}>{item === manager.active ? t('premiumPromotion.ongoing') : item.status === PromotionStatus.Pending ? t('premiumPromotion.queued') : t('premiumPromotion.ended')}</span></div>)}</section>
    {message && <div className="premium-notice"><Upload size={16} />{message}</div>}
  </div>;
}
