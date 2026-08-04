import { ArrowUpRight, Clock3 } from 'lucide-react';
import type { PublicJobPromotionCardDto } from '../../../types/models/Job';
import '../styles/promotion-card.css';

/**
 * Validates image URLs to ensure safe protocols (http, https, blob, data:image, relative path)
 */
function safeUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('blob:')) return trimmed;
  if (trimmed.startsWith('data:image/')) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }

  return '';
}

/**
 * Contextual HTML meta-character escaping to prevent XSS through DOM (CodeQL js/xss-through-dom)
 */
function escapeHtml(str?: string): string {
  if (!str) return '';
  return String(str)
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
  const safeImageUrl = safeUrl(card.imageUrl);
  const safeTitle = escapeHtml(card.title);
  const safeDescription = escapeHtml(card.description);

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
