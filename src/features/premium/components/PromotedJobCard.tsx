import { ArrowUpRight, Clock3 } from 'lucide-react';
import type { PublicJobPromotionCardDto } from '../../../types/models/Job';
import '../styles/promotion-card.css';

/**
 * Sanitizes image URLs to prevent XSS / dangerous protocol execution
 */
const sanitizeImageUrl = (value?: string): string => {
  if (!value) return '';
  try {
    const parsed = new URL(value, window.location.origin);
    return ['blob:', 'https:', 'http:'].includes(parsed.protocol) ? value : '';
  } catch {
    return '';
  }
};

/**
 * Sanitizes plain text by stripping HTML tags / meta-characters to prevent DOM XSS
 */
const sanitizeText = (text?: string): string => {
  if (!text) return '';
  return text.replace(/<[^>]*>?/gm, '').trim();
};

export function PromotedJobCard({
  card,
  carouselCount,
  carouselIndex,
  onSelectCarousel,
  onExplore,
  preview = false,
  imageStyle,
}: {
  card: PublicJobPromotionCardDto;
  carouselCount: number;
  carouselIndex: number;
  onSelectCarousel?: (index: number) => void;
  onExplore?: () => void;
  preview?: boolean;
  imageStyle?: React.CSSProperties;
}) {
  const safeImageUrl = sanitizeImageUrl(card.imageUrl);
  const safeTitle = sanitizeText(card.title);
  const safeDescription = sanitizeText(card.description);

  return (
    <article className="promotion-profile-card promoted-job-card">
      {preview && <span className="promotion-preview-badge">Live preview</span>}
      <img src={safeImageUrl} alt={safeTitle} className="promotion-profile-photo" style={imageStyle} />
      <div className="promotion-profile-shade" />
      <div className="promotion-profile-content promoted-job-content">
        <p className="promotion-profile-kicker">Promoted job</p>
        <h3>{safeTitle}</h3>
        <p className="promotion-job-description">{safeDescription}</p>
        <span className="promotion-job-expiry">
          <Clock3 size={14} /> Featured until {new Date(card.featuredUntil).toLocaleDateString()}
        </span>
      </div>
      <button type="button" className="promotion-explore-button" disabled={preview} onClick={onExplore}>
        View job <ArrowUpRight size={18} />
      </button>
      <div className="promotion-carousel-dots" aria-label="Promoted jobs">
        {Array.from({ length: carouselCount }, (_, index) => (
          <button
            key={index}
            type="button"
            className={index === carouselIndex ? 'active' : ''}
            aria-label={`Show promoted job ${index + 1}`}
            disabled={preview || !onSelectCarousel}
            onClick={() => onSelectCarousel?.(index)}
          />
        ))}
      </div>
    </article>
  );
}
