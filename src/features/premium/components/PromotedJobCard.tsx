import { ArrowUpRight, Clock3, Sparkles } from 'lucide-react';
import type { PublicJobPromotionCardDto } from '../../../types/models/Job';
import '../styles/promotion-card.css';

const REMOTE_IMAGE_PROTOCOLS = new Set(['http:', 'https:']);

function sanitizeImageUrl(imageUrl: string, allowBlob: boolean): string | undefined {
  const trimmed = imageUrl.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    const allowedProtocol =
      REMOTE_IMAGE_PROTOCOLS.has(parsed.protocol) || (allowBlob && parsed.protocol === 'blob:');
    return allowedProtocol
      ? parsed.href.replace(/[<"']/g, character => encodeURIComponent(character))
      : undefined;
  } catch {
    return undefined;
  }
}

export function PromotedJobCard({
  card,
  carouselCount = 1,
  carouselIndex = 0,
  onSelectCarousel,
  onExplore,
  preview = false,
  imageStyle,
}: {
  card: PublicJobPromotionCardDto;
  carouselCount?: number;
  carouselIndex?: number;
  onSelectCarousel?: (index: number) => void;
  onExplore?: () => void;
  preview?: boolean;
  imageStyle?: React.CSSProperties;
}) {
  const safeImageUrl = sanitizeImageUrl(card.imageUrl, preview);

  return (
    <article className="promotion-profile-card promoted-job-card relative overflow-hidden rounded-3xl border border-amber-500/30 bg-slate-900 shadow-2xl transition-all duration-300 hover:shadow-amber-500/10">
      {preview && (
        <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Preview
        </span>
      )}

      {safeImageUrl ? (
        <img
          src={safeImageUrl}
          alt={card.title}
          className="promotion-profile-photo"
          style={imageStyle}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-slate-900 to-cyan-900/40 flex items-center justify-center text-slate-500">
          <Sparkles size={48} className="opacity-20" />
        </div>
      )}

      <div className="promotion-profile-shade" />

      <div className="promotion-profile-content promoted-job-content p-6 space-y-2 relative z-10 text-white">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
          <Sparkles size={11} /> Promoted Job
        </span>

        <h3 className="text-lg font-black tracking-tight leading-snug line-clamp-2 text-white">
          {card.title}
        </h3>

        <p className="promotion-job-description text-xs text-slate-200 line-clamp-3 leading-relaxed font-medium">
          {card.description}
        </p>

        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 pt-1">
          <Clock3 size={13} className="text-amber-400" />
          <span>Featured until {new Date(card.featuredUntil).toLocaleDateString('vi-VN')}</span>
        </div>
      </div>

      <button
        type="button"
        className="promotion-explore-button"
        disabled={preview}
        onClick={onExplore}
      >
        <span>Xem Dự Án</span>
        <ArrowUpRight size={18} />
      </button>

      {carouselCount > 1 && (
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
      )}
    </article>
  );
}
