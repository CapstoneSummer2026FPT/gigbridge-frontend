import { Send } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { PromotionCardInput } from '../types';
import '../styles/promotion-card.css';

function sanitizeImageUrl(url?: string): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:image/')) return trimmed;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return encodeURI(parsed.href);
    }
  } catch {
    return '';
  }

  return '';
}

function sanitizeText(text?: string): string {
  if (!text) return '';
  const clean = String(text).replace(/<[^>]*>?/gm, '').trim();
  return clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function PromotionCard({
  card,
  onExplore,
  preview = false,
  carouselCount = 4,
  carouselIndex = 1,
  onSelectCarousel,
}: {
  card: PromotionCardInput;
  onExplore?: () => void;
  preview?: boolean;
  carouselCount?: number;
  carouselIndex?: number;
  onSelectCarousel?: (index: number) => void;
}) {
  const { t } = useTranslation();
  const safePhotoUrl = sanitizeImageUrl(card?.photoUrl);
  const safeDisplayName = sanitizeText(card?.displayName);
  const safeJobTitle = sanitizeText(card?.jobTitle);
  const safeQuote = sanitizeText(card?.quote);

  return (
    <article className="promotion-profile-card">
      {preview && <span className="promotion-preview-badge">{t('premiumPromotion.preview')}</span>}
      <img src={safePhotoUrl} alt={safeDisplayName} className="promotion-profile-photo" />
      <div className="promotion-profile-shade" />
      <div className="promotion-profile-content">
        <p className="promotion-profile-kicker">{t('premiumPromotion.promotedFreelancer')}</p>
        <h3>{safeDisplayName}</h3>
        {card.showJobTitle && safeJobTitle && <p className="promotion-profile-title">{safeJobTitle}</p>}
        {card.showQuote && safeQuote && <blockquote>“{safeQuote}”</blockquote>}
      </div>
      <button type="button" className="promotion-explore-button" disabled={preview} onClick={onExplore}>
        {t('premiumPromotion.explore')} <Send size={18} />
      </button>
      <div className="promotion-carousel-dots" aria-label={t('premiumPromotion.carouselLabel')}>
        {Array.from({ length: carouselCount }, (_, index) => (
          <button
            key={index}
            type="button"
            className={index === carouselIndex ? 'active' : ''}
            disabled={!onSelectCarousel}
            aria-label={t('premiumPromotion.carouselItem', { number: index + 1 })}
            onClick={() => onSelectCarousel?.(index)}
          />
        ))}
      </div>
    </article>
  );
}
