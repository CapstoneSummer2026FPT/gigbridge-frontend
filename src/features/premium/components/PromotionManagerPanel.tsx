import { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, Target, Sparkles, ImagePlus, Zap, AlertCircle, Flame, Wand2, HelpCircle } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { premiumAPI } from '../api';
import { PromotionStatus } from '../types';
import type { PromotionCardInput, PromotionDraft, PromotionManager } from '../types';
import { calculatePromotionBoostWeight, calculatePromotionTarget, projectPromotionQueue } from '../utils/promotionPolicy';
import { PromotionCard } from './PromotionCard';
import { PromotionImageCropModal } from './PromotionImageCropModal';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';

import '../styles/client-pricing-screen.css';

const NO_ADDITIONAL_BOOST = 0;
const MANAGER_REFRESH_INTERVAL_MS = 15_000;
const BOOST_LADDER_VISIBLE_ROWS = 8;

export function PromotionManagerPanel({ entitled }: { entitled: boolean }) {
  const { t } = useTranslation(['premium', 'common']);
  const [draft, setDraft] = useState<PromotionDraft>();
  const [manager, setManager] = useState<PromotionManager>();
  const [card, setCard] = useState<PromotionCardInput>({
    photoUrl: '',
    displayName: '',
    quote: '',
    showQuote: false,
    jobTitle: '',
    showJobTitle: true,
  });
  const [initialBoostAmount, setInitialBoostAmount] = useState(String(NO_ADDITIONAL_BOOST));
  const [boostAmount, setBoostAmount] = useState('');
  const [clientTarget, setClientTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');

  // Crop & Remove BG Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

  // Metrics Guide Tooltip State
  const [showMetricsGuide, setShowMetricsGuide] = useState(false);

  const load = useCallback(async () => {
    const [draftResponse, managerResponse] = await Promise.all([
      premiumAPI.promotionDraft(),
      premiumAPI.promotionManager(),
    ]);
    setLoadError(
      !draftResponse.success
        ? draftResponse.message
        : !managerResponse.success
        ? managerResponse.message
        : ''
    );
    if (draftResponse.data) {
      setDraft(draftResponse.data);
      setCard(current =>
        current.displayName
          ? current
          : {
              photoUrl: draftResponse.data!.photoUrl,
              displayName: draftResponse.data!.displayName,
              quote: '',
              showQuote: false,
              jobTitle: draftResponse.data!.jobTitle || '',
              showJobTitle: Boolean(draftResponse.data!.jobTitle),
            }
      );
    }
    if (managerResponse.data) setManager(managerResponse.data);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!manager?.active) return;
    const timer = window.setInterval(() => void load(), MANAGER_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load, manager?.active]);

  const defaultTarget = useMemo(
    () => (draft ? calculatePromotionTarget(NO_ADDITIONAL_BOOST, draft.policy) : NO_ADDITIONAL_BOOST),
    [draft]
  );
  const initialBoostTokens = Number(initialBoostAmount) || NO_ADDITIONAL_BOOST;
  const projectedTarget = draft
    ? calculatePromotionTarget(initialBoostTokens, draft.policy)
    : NO_ADDITIONAL_BOOST;

  const updateClientTarget = (raw: string) => {
    const requested = Math.max(defaultTarget, Math.trunc(Number(raw) || defaultTarget));
    const additionalClicks = requested - defaultTarget;
    const amount = draft
      ? Math.ceil(additionalClicks / draft.policy.targetClicksPerCoin)
      : NO_ADDITIONAL_BOOST;
    setInitialBoostAmount(String(amount));
    setClientTarget(String(draft ? calculatePromotionTarget(amount, draft.policy) : requested));
  };

  const handleFileChoose = (file?: File) => {
    if (!file) return;
    if (draft && file.size > draft.policy.maximumPhotoBytes) {
      setMessage(t('premiumPromotion.photoTooLarge', { defaultValue: 'Kích thước ảnh vượt quá giới hạn tối đa cho phép.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setTempImageSrc(dataUrl);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setMessage('');
    const response = await premiumAPI.uploadPromotionPhoto(file);
    setBusy(false);
    if (response.data) setCard(value => ({ ...value, photoUrl: response.data! }));
    else if (response.message) setMessage(response.message);
  };

  const create = async () => {
    if (!card.photoUrl.trim() || !card.displayName.trim()) return;
    setBusy(true);
    setMessage('');
    const response = await premiumAPI.purchasePromotion(initialBoostTokens, crypto.randomUUID(), card);
    setMessage(response.message);
    setBusy(false);
    if (response.success) {
      setInitialBoostAmount(String(NO_ADDITIONAL_BOOST));
      setClientTarget('');
      await load();
    }
  };

  if (loadError) {
    return (
      <article className="cp-card" style={{ padding: 24, color: 'var(--cp-red)', textAlign: 'center' }}>
        <AlertCircle size={32} className="mx-auto mb-2" />
        {loadError}
      </article>
    );
  }

  if (!draft || !manager) {
    return (
      <div className="cp-card-grid">
        <div style={{ height: 260, borderRadius: 24, background: 'var(--card)', opacity: 0.5 }} />
        <div style={{ height: 260, borderRadius: 24, background: 'var(--card)', opacity: 0.5 }} />
      </div>
    );
  }

  const boostTokens = Number(boostAmount);
  const boostWeightIncrease =
    boostTokens > 0 ? calculatePromotionBoostWeight(boostTokens, draft.policy) : 0;
  const canBoost =
    entitled &&
    Boolean(manager.active) &&
    Number.isInteger(boostTokens) &&
    boostTokens >= draft.policy.minimumBoostCoins &&
    boostTokens <= draft.policy.maximumBoostCoinsPerTransaction &&
    boostTokens <= manager.availableTokens;

  const managerQueue = manager.queue ?? [];
  const queueSource =
    manager.active && !managerQueue.some(entry => entry.isCurrent)
      ? [
          ...managerQueue,
          {
            queuePosition: manager.active.queuePosition,
            boostWeight: manager.active.boostWeight,
            isCurrent: true,
          },
        ]
      : managerQueue;

  const projectedWeight = manager.active ? manager.active.boostWeight + boostWeightIncrease : 0;
  const projectedQueue = projectPromotionQueue(queueSource, projectedWeight);
  const currentProjectedIndex = projectedQueue.findIndex(entry => entry.isCurrent);
  const projectedPosition =
    currentProjectedIndex >= 0 ? currentProjectedIndex + 1 : manager.active?.queuePosition || 0;

  const ladderStart = Math.min(
    Math.max(currentProjectedIndex - 3, 0),
    Math.max(projectedQueue.length - BOOST_LADDER_VISIBLE_ROWS, 0)
  );
  const visibleQueue = projectedQueue.slice(ladderStart, ladderStart + BOOST_LADDER_VISIBLE_ROWS);
  const maximumVisibleWeight = Math.max(1, ...visibleQueue.map(entry => entry.boostWeight));

  const boost = async () => {
    if (!manager?.active || !canBoost) return;
    setBusy(true);
    setMessage('');
    const response = await premiumAPI.boostPromotion(
      manager.active.id,
      boostTokens,
      crypto.randomUUID()
    );
    setMessage(response.message);
    setBusy(false);
    if (response.success) {
      setBoostAmount('');
      await load();
    }
  };

  const end = async () => {
    if (!manager?.active || !window.confirm(t('premiumPromotion.endConfirmation', { defaultValue: 'Bạn có chắc chắn muốn kết thúc chiến dịch quảng bá này ngay lập tức không?' }))) return;
    setBusy(true);
    setMessage('');
    const response = await premiumAPI.endPromotion(manager.active.id);
    setMessage(response.message);
    setBusy(false);
    if (response.success) {
      setBoostAmount('');
      await load();
    }
  };

  const activeCard = manager.active
    ? {
        photoUrl: manager.active.photoUrl,
        displayName: manager.active.displayName,
        quote: manager.active.quote || '',
        showQuote: manager.active.showQuote,
        jobTitle: manager.active.jobTitle || '',
        showJobTitle: manager.active.showJobTitle,
      }
    : card;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* HEADER SECTION */}
      <div>
        <p className="cp-section-eyebrow"><Megaphone size={14} /> {t('premiumPromotion.studioEyebrow', { defaultValue: 'Profile Promotion Studio' })}</p>
        <h2 className="cp-section-headline">{t('premiumPromotion.studioHeadline', { defaultValue: 'Chỉnh sửa & Ghim Hồ sơ Freelancer Nổi bật' })}</h2>
        <p style={{ fontSize: 13, color: 'var(--cp-muted)', marginTop: 4, fontWeight: 500 }}>
          {t('premiumPromotion.studioSubtitle', { defaultValue: 'Ghim hồ sơ của bạn ở vị trí ưu tiên cao nhất với viền 3D Neon để tiếp cận hàng ngàn Nhà tuyển dụng.' })}
        </p>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: 14, background: 'var(--cp-accent-dim)', border: '1px solid var(--cp-border)', color: 'var(--cp-accent)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* MAIN TWO-COLUMN STUDIO GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28, alignItems: 'start' }}>

        {/* LEFT COLUMN: BUILDER OR ACTIVE MANAGER */}
        {!manager.active ? (
          /* NO ACTIVE CAMPAIGN — CAMPAIGN BUILDER FORM */
          <article className="cp-card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--cp-accent-dim)', color: 'var(--cp-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Megaphone size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--cp-text)', margin: 0 }}>
                  {t('premiumPromotion.builderTitle', { defaultValue: 'Thiết lập Chiến dịch Quảng bá Hồ sơ' })}
                </h3>
                <span style={{ fontSize: 12, color: 'var(--cp-muted)', fontWeight: 600 }}>
                  {t('premiumPromotion.builderSub', { defaultValue: 'Điền thông tin và hình ảnh hiển thị trên thẻ Live' })}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* STEP 1: PHOTO UPLOAD WITH AI EDIT MODAL TRIGGER */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cp-muted)', display: 'block', marginBottom: 6 }}>
                  {t('premiumPromotion.photo', { defaultValue: '1. Ảnh chân dung đại diện (Tỷ lệ 2:3)' })} *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, border: '2px dashed var(--cp-border)', background: 'var(--card)', cursor: 'pointer' }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={e => handleFileChoose(e.target.files?.[0])}
                    />
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cp-accent-dim)', color: 'var(--cp-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ImagePlus size={18} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--cp-text)' }}>
                      {card.photoUrl
                        ? t('premiumPromotion.photoSelected', { defaultValue: 'Đã chọn ảnh — Bấm để chọn lại' })
                        : t('premiumPromotion.uploadPhotoPlaceholder', { defaultValue: 'Tải lên ảnh chân dung (JPG, PNG, WEBP)' })}
                    </span>
                  </label>

                  {card.photoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setTempImageSrc(card.photoUrl);
                        setIsCropModalOpen(true);
                      }}
                      className="cp-btn ghost"
                      style={{ padding: '8px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderColor: 'var(--cp-border)', color: 'var(--cp-accent)' }}
                    >
                      <Wand2 size={15} />
                      <span>{t('premiumPromotion.editAndRemoveBgAI', { defaultValue: '✨ Chỉnh Sửa & Tách Nền AI' })}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* STEP 2: DISPLAY NAME */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cp-muted)', display: 'block', marginBottom: 6 }}>
                  {t('premiumPromotion.name', { defaultValue: '2. Tên hiển thị trên thẻ' })} *
                </label>
                <input
                  type="text"
                  maxLength={draft.policy.displayNameMaxLength}
                  value={card.displayName}
                  onChange={e => setCard(val => ({ ...val, displayName: e.target.value }))}
                  placeholder={t('premiumPromotion.displayNamePlaceholder', { defaultValue: 'Ví dụ: Nguyễn Văn A' })}
                  style={{ width: '100%', height: 44, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--cp-border)', padding: '0 14px', color: 'var(--cp-text)', outline: 'none', fontSize: 13, fontWeight: 600 }}
                />
              </div>

              {/* STEP 3: QUOTE / SLOGAN TOGGLE */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={card.showQuote}
                    onChange={e => setCard(val => ({ ...val, showQuote: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: 'var(--cp-accent)' }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--cp-text)' }}>
                    {t('premiumPromotion.showQuote', { defaultValue: 'Hiển thị Slogan / Trích dẫn ấn tượng' })}
                  </span>
                </label>

                {card.showQuote && (
                  <textarea
                    rows={2}
                    maxLength={draft.policy.quoteMaxLength}
                    value={card.quote}
                    onChange={e => setCard(val => ({ ...val, quote: e.target.value }))}
                    placeholder={t('premiumPromotion.quotePlaceholder', { defaultValue: 'Viết một câu trích dẫn ngắn gọn mô tả giá trị nổi bật của bạn...' })}
                    style={{ width: '100%', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--cp-border)', padding: '10px 14px', color: 'var(--cp-text)', outline: 'none', fontSize: 12, fontWeight: 600, resize: 'none' }}
                  />
                )}
              </div>

              {/* STEP 4: JOB TITLE TOGGLE */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={card.showJobTitle}
                    onChange={e => setCard(val => ({ ...val, showJobTitle: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: 'var(--cp-accent)' }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--cp-text)' }}>
                    {t('premiumPromotion.showJobTitle', { defaultValue: 'Hiển thị Chức danh chuyên môn' })}
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={draft.policy.jobTitleMaxLength}
                  value={card.jobTitle}
                  readOnly
                  style={{ width: '100%', height: 40, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--cp-border)', padding: '0 14px', color: 'var(--cp-muted)', outline: 'none', fontSize: 12, fontWeight: 600, opacity: 0.8 }}
                />
              </div>

              {/* STEP 5: TARGET CLICKS & COIN COST */}
              <div style={{ padding: 16, borderRadius: 16, background: 'var(--cp-accent-dim)', border: '1px solid var(--cp-border)' }}>
                <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cp-accent)', display: 'block', marginBottom: 8 }}>
                  {t('premiumPromotion.clientTarget', { defaultValue: 'Mục tiêu Lượt nhấp (Clicks)' })}
                </label>
                <input
                  type="number"
                  min={defaultTarget}
                  value={clientTarget || projectedTarget}
                  onChange={e => updateClientTarget(e.target.value)}
                  style={{ width: '100%', height: 42, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--cp-border)', padding: '0 14px', color: 'var(--cp-text)', outline: 'none', fontSize: 14, fontWeight: 800 }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--cp-border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--cp-muted)', fontWeight: 600 }}>
                    {t('premiumPromotion.activationCostLabel', { defaultValue: 'Chi phí kích hoạt:' })}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <GigCoinAmount amount={initialBoostTokens} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--cp-text)' }}>
                      {t('premiumPromotion.clicksSummary', { count: projectedTarget, defaultValue: `(${projectedTarget} lượt nhấp)` })}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTIVATE BUTTON */}
              <button
                className="cp-btn"
                disabled={
                  busy ||
                  !entitled ||
                  !card.photoUrl.trim() ||
                  !card.displayName.trim() ||
                  !Number.isInteger(initialBoostTokens) ||
                  initialBoostTokens > draft.policy.maximumBoostCoinsPerTransaction ||
                  initialBoostTokens > manager.availableTokens
                }
                onClick={() => void create()}
                style={{ padding: '12px 24px', fontSize: 14, marginTop: 4 }}
              >
                <Zap size={16} />
                {t('premiumPromotion.activate', { defaultValue: 'Kích hoạt Quảng bá ngay' })}
              </button>

            </div>
          </article>
        ) : (
          /* ACTIVE CAMPAIGN MANAGER PANEL */
          <article className="cp-plan-prem" style={{ margin: 0, padding: 32 }}>
            <div className="cp-plan-prem-orb" aria-hidden />

            <div className="cp-plan-prem-top">
              <div className="cp-plan-prem-badge" style={{ background: 'var(--cp-accent-dim)', color: 'var(--cp-accent)', border: '1px solid var(--cp-border)' }}>
                <Flame size={12} /> ONGOING ✦ ACTIVE
              </div>
              <div className="cp-plan-prem-tier">
                Position #{manager.active.queuePosition}
              </div>
            </div>

            <div className="cp-plan-prem-headline" style={{ fontSize: 20, marginBottom: 16 }}>
              {t('premiumPromotion.managerTitle', { defaultValue: 'Chiến dịch Quảng bá đang Hoạt động' })}
            </div>

            {/* METRICS HEADER & INTERACTIVE GUIDE POPOVER */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative' }}>
              <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cp-muted)' }}>
                {t('premiumPromotion.realtimeStatsHeader', { defaultValue: 'Thống kê chiến dịch Real-time' })}
              </span>

              {/* HELP / GUIDE INTERACTIVE TOOLTIP BUTTON */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onMouseEnter={() => setShowMetricsGuide(true)}
                  onMouseLeave={() => setShowMetricsGuide(false)}
                  onClick={() => setShowMetricsGuide(prev => !prev)}
                  className="cp-btn ghost"
                  style={{ padding: '3px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999, borderColor: 'var(--cp-border)', color: 'var(--cp-accent)', background: 'var(--cp-accent-dim)' }}
                >
                  <HelpCircle size={14} />
                  <span>{t('premiumPromotion.explainMetricsBtn', { defaultValue: 'Giải thích chỉ số (?)' })}</span>
                </button>

                {/* GUIDANCE POPOVER DIALOG */}
                {showMetricsGuide && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 8,
                      width: 320,
                      padding: 16,
                      borderRadius: 16,
                      background: 'var(--card)',
                      border: '1px solid var(--cp-border)',
                      boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                      zIndex: 50,
                      color: 'var(--cp-text)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 900, color: 'var(--cp-accent)', marginBottom: 10 }}>
                      <Sparkles size={14} /> {t('premiumPromotion.metricsGuideTitle', { defaultValue: 'Hướng dẫn chỉ số & Mẹo đẩy Top #1' })}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11, lineHeight: 1.5, color: 'var(--cp-muted)' }}>
                      <div>
                        <strong style={{ color: 'var(--cp-text)' }}>{t('premiumPromotion.clicksGuideTitle', { defaultValue: '• Lượt nhấp (Clicks):' })}</strong> {t('premiumPromotion.clicksGuideText', { defaultValue: 'Số lần Nhà tuyển dụng thực sự bấm trực tiếp vào thẻ để xem hồ sơ của bạn.' })}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--cp-text)' }}>{t('premiumPromotion.impressionsGuideTitle', { defaultValue: '• Hiển thị (Impressions):' })}</strong> {t('premiumPromotion.impressionsGuideText', { defaultValue: 'Số lần thẻ ghim của bạn lướt qua màn hình Nhà tuyển dụng.' })}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--cp-text)' }}>{t('premiumPromotion.weightGuideTitle', { defaultValue: '• Trọng số Boost (Weight):' })}</strong> {t('premiumPromotion.weightGuideText', { defaultValue: 'Điểm ưu tiên quyết định vị trí ghim thẻ trên bảng tin.' })}
                      </div>
                    </div>

                    {/* CALL TO ACTION RECOMMENDATION BOX */}
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--cp-border)', background: 'var(--cp-accent-dim)', padding: 10, borderRadius: 10, border: '1px solid var(--cp-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 900, color: 'var(--cp-accent)', marginBottom: 4 }}>
                        <Flame size={13} /> {t('premiumPromotion.boostAdviceTitle', { defaultValue: 'Lời khuyên: Boost thêm GigCoin' })}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--cp-text)', margin: 0, fontWeight: 600, lineHeight: 1.4 }}>
                        {t('premiumPromotion.boostAdviceText', { defaultValue: 'Hãy Boost thêm GigCoin để gia tăng Trọng số Boost. Điểm trọng số vượt trội sẽ đẩy hồ sơ lên vị trí #1 hàng chờ (Top Queue Position) giúp thu hút tối đa Nhà tuyển dụng!' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* METRICS ROW WITH QUICK HOVER GUIDES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '0 0 24px' }}>
              <div
                style={{ padding: 12, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--cp-border)', cursor: 'pointer' }}
                title={t('premiumPromotion.clicksTitleAttr', { defaultValue: 'Lượt nhấp: Số lần Nhà tuyển dụng mở hồ sơ của bạn' })}
                onClick={() => setShowMetricsGuide(prev => !prev)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--cp-muted)', textTransform: 'uppercase' }}>{t('premiumPromotion.clicks', { defaultValue: 'Lượt nhấp' })}</span>
                  <HelpCircle size={11} style={{ color: 'var(--cp-muted)' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--cp-text)', marginTop: 2 }}>
                  {manager.active.clickCount}/{manager.active.targetClickCount}
                </div>
              </div>

              <div
                style={{ padding: 12, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--cp-border)', cursor: 'pointer' }}
                title={t('premiumPromotion.impressionsTitleAttr', { defaultValue: 'Hiển thị: Số lần thẻ ghim xuất hiện trên màn hình Nhà tuyển dụng' })}
                onClick={() => setShowMetricsGuide(prev => !prev)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--cp-muted)', textTransform: 'uppercase' }}>{t('premiumPromotion.impressions', { defaultValue: 'Hiển thị' })}</span>
                  <HelpCircle size={11} style={{ color: 'var(--cp-muted)' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--cp-text)', marginTop: 2 }}>
                  {manager.active.impressionCount}
                </div>
              </div>

              <div
                style={{ padding: 12, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--cp-border)', cursor: 'pointer' }}
                title={t('premiumPromotion.boostWeightTitleAttr', { defaultValue: 'Trọng số Boost: Quyết định thứ hạng ghim #1 trên bảng tin' })}
                onClick={() => setShowMetricsGuide(prev => !prev)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--cp-muted)', textTransform: 'uppercase' }}>{t('premiumPromotion.boostWeight', { defaultValue: 'Trọng số Boost' })}</span>
                  <HelpCircle size={11} style={{ color: 'var(--cp-accent)' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--cp-accent)', marginTop: 2 }}>
                  {manager.active.boostWeight}
                </div>
              </div>
            </div>

            {/* BOOST LADDER VISUALIZER */}
            <div style={{ margin: '20px 0', padding: 16, borderRadius: 16, background: 'var(--card)', border: '1px solid var(--cp-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 900, color: 'var(--cp-text)', margin: 0 }}>
                    {t('premiumPromotion.boostLadder', { defaultValue: 'Bảng xếp hạng vị trí ghim' })}
                  </h4>
                  <span style={{ fontSize: 11, color: 'var(--cp-muted)' }}>{t('premiumPromotion.projectedPositionLabel', { defaultValue: 'Vị trí dự kiến của bạn:' })}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 900, padding: '2px 10px', borderRadius: 8, background: 'var(--cp-accent-dim)', color: 'var(--cp-accent)' }}>
                  #{projectedPosition}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {visibleQueue.map(entry => (
                  <div
                    key={`${entry.queuePosition}-${entry.isCurrent}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: entry.isCurrent ? 'var(--cp-accent-dim)' : 'transparent',
                      border: entry.isCurrent ? '1px solid var(--cp-border)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 800, width: 24, color: 'var(--cp-muted)' }}>#{entry.queuePosition}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(8, (entry.boostWeight / maximumVisibleWeight) * 100)}%`,
                          background: entry.isCurrent ? 'var(--cp-accent)' : 'var(--cp-border)',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: entry.isCurrent ? 'var(--cp-accent)' : 'var(--cp-muted)' }}>
                      {entry.boostWeight}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* BOOST CONTROL INPUT & RECOMMENDATION BANNER */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--cp-border)', paddingTop: 16 }}>
              <div style={{ padding: 12, borderRadius: 12, background: 'var(--cp-accent-dim)', border: '1px solid var(--cp-border)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Flame size={18} style={{ color: 'var(--cp-accent)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12, color: 'var(--cp-text)', lineHeight: 1.4 }}>
                  <strong style={{ color: 'var(--cp-accent)', display: 'block', marginBottom: 2 }}>
                    {t('premiumPromotion.boostTipTitle', { defaultValue: 'Mẹo đẩy hồ sơ lên Vị trí Top #1:' })}
                  </strong>
                  {t('premiumPromotion.boostTipText', { defaultValue: 'Nạp thêm GigCoin bên dưới để gia tăng trọng số Boost và vượt qua các ứng viên khác trong bảng xếp hạng ghim thẻ.' })}
                </div>
              </div>

              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--cp-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={15} style={{ color: 'var(--cp-accent)' }} />
                {t('premiumPromotion.boostAmount', { defaultValue: 'Tăng tốc trọng số (GigCoin)' })}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  min={draft.policy.minimumBoostCoins}
                  max={draft.policy.maximumBoostCoinsPerTransaction}
                  step="1"
                  value={boostAmount}
                  onChange={e => setBoostAmount(e.target.value)}
                  placeholder={t('premiumPromotion.boostCoinsPlaceholder', { defaultValue: 'Nhập số GigCoin...' })}
                  style={{ flex: 1, height: 42, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--cp-border)', padding: '0 14px', color: 'var(--cp-text)', outline: 'none', fontSize: 13, fontWeight: 700 }}
                />
                <button
                  className="cp-btn"
                  disabled={busy || !canBoost}
                  onClick={() => void boost()}
                  style={{ padding: '0 20px', fontSize: 13 }}
                >
                  <Flame size={14} /> {t('premiumPromotion.boostNowBtn', { defaultValue: 'Boost Ngay' })}
                </button>
              </div>

              <button
                className="cp-btn ghost"
                disabled={busy}
                onClick={() => void end()}
                style={{ color: 'var(--cp-red)', borderColor: 'rgba(239,68,68,0.3)', marginTop: 8 }}
              >
                {t('premiumPromotion.endNow', { defaultValue: 'Dừng chiến dịch ngay' })}
              </button>
            </div>
          </article>
        )}

        {/* RIGHT COLUMN: REAL-TIME LIVE CARD PREVIEW (MAX 320PX EXACT FEED SIZE) */}
        <div style={{ position: 'sticky', top: 24, width: '100%', maxWidth: 320, margin: '0 auto' }}>
          <div style={{ marginBottom: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cp-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} style={{ color: 'var(--cp-accent)' }} /> {t('premiumPromotion.livePreviewLabel', { defaultValue: 'Xem Trước Thẻ Live (2:3 Feed)' })}
            </span>
          </div>

          <div style={{ width: '100%', maxWidth: 320, display: 'flex', justifyContent: 'center' }}>
            {activeCard.photoUrl ? (
              <PromotionCard
                card={activeCard}
                preview={!manager.active}
                carouselCount={1}
                carouselIndex={0}
              />
            ) : (
              <div style={{ width: '100%', maxWidth: 320, aspectRatio: '2 / 3', minHeight: 380, borderRadius: 24, border: '2px dashed var(--cp-border)', background: 'var(--card)', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--cp-muted)' }}>
                <ImagePlus size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
                <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--cp-text)', margin: '0 0 6px' }}>{t('premiumPromotion.previewCardTitle', { defaultValue: 'Thẻ xem trước thực tế' })}</p>
                <p style={{ fontSize: 11, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                  {t('premiumPromotion.previewCardHint', { defaultValue: 'Tải ảnh chân dung ở cột bên trái để thiết kế và xem trước thẻ quảng bá Live tại đây.' })}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* QUEUE HISTORY SECTION */}
      <article className="cp-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 900, color: 'var(--cp-text)', marginBottom: 16 }}>
          {t('premiumPromotion.queueHistory', { defaultValue: 'Lịch sử Quảng bá Hồ sơ' })}
        </h3>

        {[...(manager.active ? [manager.active] : []), ...manager.queued, ...manager.history].length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...(manager.active ? [manager.active] : []), ...manager.queued, ...manager.history].map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 14,
                  background: 'var(--card)',
                  border: '1px solid var(--cp-border)',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cp-text)' }}>{item.displayName}</div>
                  <div style={{ fontSize: 11, color: 'var(--cp-muted)', marginTop: 2 }}>
                    {new Date(item.startsAt).toLocaleDateString()} – {new Date(item.endsAt).toLocaleDateString()}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    padding: '3px 10px',
                    borderRadius: 999,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background:
                      item === manager.active
                        ? 'var(--cp-accent-dim)'
                        : item.status === PromotionStatus.Pending
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.05)',
                    color:
                      item === manager.active
                        ? 'var(--cp-accent)'
                        : item.status === PromotionStatus.Pending
                        ? 'var(--cp-text)'
                        : 'var(--cp-muted)',
                  }}
                >
                  {item === manager.active
                    ? t('premiumPromotion.ongoing', { defaultValue: 'ĐANG CHẠY' })
                    : item.status === PromotionStatus.Pending
                    ? t('premiumPromotion.queued', { defaultValue: 'ĐANG HÀNG ĐỜI' })
                    : t('premiumPromotion.ended', { defaultValue: 'ĐÃ KẾT THÚC' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--cp-muted)', margin: 0 }}>{t('premiumPromotion.noHistory', { defaultValue: 'Chưa có lịch sử quảng bá.' })}</p>
        )}
      </article>

      {/* PROMOTION IMAGE CROP & AI REMOVE BG MODAL */}
      <PromotionImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={tempImageSrc || card.photoUrl}
        onClose={() => setIsCropModalOpen(false)}
        onCropSave={(croppedBase64, croppedFile) => {
          setCard(val => ({ ...val, photoUrl: croppedBase64 }));
          void upload(croppedFile);
        }}
      />

    </div>
  );
}
