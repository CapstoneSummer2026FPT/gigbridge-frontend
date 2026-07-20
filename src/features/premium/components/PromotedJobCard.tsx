import { ArrowUpRight, Clock3 } from 'lucide-react';
import type { PublicJobPromotionCardDto } from '../../../types/models/Job';
import '../styles/promotion-card.css';

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
  return <article className="promotion-profile-card promoted-job-card">
    {preview && <span className="promotion-preview-badge">Live preview</span>}
    <img src={card.imageUrl} alt="" className="promotion-profile-photo" style={imageStyle} />
    <div className="promotion-profile-shade" />
    <div className="promotion-profile-content promoted-job-content">
      <p className="promotion-profile-kicker">Promoted job</p>
      <h3>{card.title}</h3>
      <p className="promotion-job-description">{card.description}</p>
      <span className="promotion-job-expiry"><Clock3 size={14} /> Featured until {new Date(card.featuredUntil).toLocaleDateString()}</span>
    </div>
    <button type="button" className="promotion-explore-button" disabled={preview} onClick={onExplore}>
      View job <ArrowUpRight size={18} />
    </button>
    <div className="promotion-carousel-dots" aria-label="Promoted jobs">
      {Array.from({ length: carouselCount }, (_, index) => <button
        key={index}
        type="button"
        className={index === carouselIndex ? 'active' : ''}
        aria-label={`Show promoted job ${index + 1}`}
        disabled={preview || !onSelectCarousel}
        onClick={() => onSelectCarousel?.(index)}
      />)}
    </div>
  </article>;
}
