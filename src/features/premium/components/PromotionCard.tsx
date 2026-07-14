import { Send } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { PromotionCardInput } from '../types';
import '../styles/promotion-card.css';

export function PromotionCard({ card, onExplore, preview = false, carouselCount = 4, carouselIndex = 1, onSelectCarousel }: {
  card: PromotionCardInput; onExplore?: () => void; preview?: boolean;
  carouselCount?: number; carouselIndex?: number; onSelectCarousel?: (index: number) => void;
}) {
  const { t } = useTranslation();
  return <article className="promotion-profile-card">
    {preview && <span className="promotion-preview-badge">{t('premiumPromotion.preview')}</span>}
    <img src={card.photoUrl} alt={card.displayName} className="promotion-profile-photo" />
    <div className="promotion-profile-shade" />
    <div className="promotion-profile-content">
      <p className="promotion-profile-kicker">{t('premiumPromotion.promotedFreelancer')}</p>
      <h3>{card.displayName}</h3>
      {card.showJobTitle && card.jobTitle && <p className="promotion-profile-title">{card.jobTitle}</p>}
      {card.showQuote && card.quote && <blockquote>“{card.quote}”</blockquote>}
    </div>
    <button type="button" className="promotion-explore-button" disabled={preview} onClick={onExplore}>
      {t('premiumPromotion.explore')} <Send size={18} />
    </button>
    <div className="promotion-carousel-dots" aria-label={t('premiumPromotion.carouselLabel')}>
      {Array.from({ length: carouselCount }, (_, index) => <button key={index} type="button"
        className={index === carouselIndex ? 'active' : ''} disabled={!onSelectCarousel}
        aria-label={t('premiumPromotion.carouselItem', { number: index + 1 })}
        onClick={() => onSelectCarousel?.(index)} />)}
    </div>
  </article>;
}
