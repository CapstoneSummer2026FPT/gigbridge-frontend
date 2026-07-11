import { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, Upload, Target } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { premiumAPI } from '../api';
import type { PromotionCardInput, PromotionDraft, PromotionManager } from '../types';
import { calculatePromotionTarget } from '../utils/promotionPolicy';
import { PromotionCard } from './PromotionCard';

const NO_ADDITIONAL_BOOST = 0;
const MANAGER_REFRESH_INTERVAL_MS = 15_000;

export function PromotionManagerPanel({ entitled }: { entitled: boolean }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<PromotionDraft>();
  const [manager, setManager] = useState<PromotionManager>();
  const [card, setCard] = useState<PromotionCardInput>({ photoUrl: '', displayName: '', quote: '', showQuote: false, jobTitle: '', showJobTitle: true });
  const [initialBoostAmount, setInitialBoostAmount] = useState(String(NO_ADDITIONAL_BOOST));
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
        <button className="premium-button" disabled>{t('premiumPromotion.activated')}</button>
        <label><Target size={16} /> {t('premiumPromotion.raiseTarget')}<input className="premium-input" type="number" min={manager.active.targetClickCount} value={manager.active.targetClickCount} disabled readOnly /></label>
        <button className="premium-button" disabled>{t('premiumPromotion.boostTemporarilyDisabled')}</button>
      </section>}
    <div><PromotionCard card={activeCard} preview={!manager.active} carouselCount={1} carouselIndex={0} /></div>
    <section className="premium-card promotion-history"><h3>{t('premiumPromotion.queueHistory')}</h3>{[
      ...(manager.active ? [manager.active] : []), ...manager.queued, ...manager.history,
    ].map(item => <div className="premium-row" key={item.id}><div><strong>{item.displayName}</strong><div className="premium-muted">{new Date(item.startsAt).toLocaleDateString()} – {new Date(item.endsAt).toLocaleDateString()}</div></div><span className={`promotion-status ${item === manager.active ? 'ongoing' : item.queuePosition ? 'queued' : 'ended'}`}>{item === manager.active ? t('premiumPromotion.ongoing') : item.queuePosition ? t('premiumPromotion.queued') : t('premiumPromotion.ended')}</span></div>)}</section>
    {message && <div className="premium-notice"><Upload size={16} />{message}</div>}
  </div>;
}
