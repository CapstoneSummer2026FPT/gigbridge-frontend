import { ArrowUpRight, Clock3 } from 'lucide-react';
import type { PublicJobPromotionCardDto } from '../../../types/models/Job';
import '../styles/promotion-card.css';

/**
 * Sanitizes URLs for img src attributes using protocol whitelist and encodeURI
 * to prevent DOM XSS / dangerous protocol execution (CodeQL js/xss-through-dom)
 */
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

/**
 * Sanitizes text by escaping HTML meta-characters
 * to guarantee 100% safe plain text rendering (CodeQL js/xss-through-dom)
 */
function sanitizeText(text?: string): string {
  if (!text) return '';
  const clean = String(text).trim();
  return clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  const safeImageUrl = sanitizeImageUrl(card?.imageUrl);
  const safeTitle = sanitizeText(card?.title);
  const safeDescription = sanitizeText(card?.description);
  const safeDate = card?.featuredUntil ? new Date(card.featuredUntil).toLocaleDateString() : '';

  return (
    <article className="promotion-profile-card promoted-job-card">
      {preview && <span className="promotion-preview-badge">Live preview</span>}
      <img src={safeImageUrl} alt={safeTitle} className="promotion-profile-photo" style={imageStyle} />
      <div className="promotion-profile-shade" />
      <div className="promotion-profile-content promoted-job-content">
        <p className="promotion-profile-kicker">Promoted job</p>
        <h3>{safeTitle}</h3>
        <p className="promotion-job-description">{safeDescription}</p>
        {safeDate && (
          <span className="promotion-job-expiry">
            <Clock3 size={14} /> Featured until {safeDate}
          </span>
        )}
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
