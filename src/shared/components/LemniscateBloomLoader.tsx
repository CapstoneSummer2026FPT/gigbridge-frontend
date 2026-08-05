import { useEffect, useRef } from 'react';

export interface LemniscateBloomLoaderProps {
  /** Size in pixels or CSS string (default: 160) */
  size?: number | string;
  /** Optional loading text displayed underneath */
  label?: string;
  /** Optional subtitle or tag */
  tag?: string;
  /** CSS class for wrapper container */
  className?: string;
  /** Custom stroke color (default: 'var(--brand)') */
  color?: string;
  /** If true, renders full screen / full container centered layout */
  fullscreen?: boolean;
}

const CONFIG = {
  particleCount: 119,
  trailSpan: 0.45,
  durationMs: 4300,
  rotationDurationMs: 12500,
  pulseDurationMs: 4600,
  strokeWidth: 5.5,
  lemniscateA: 17,
  lemniscateBoost: 9.6,
  rotate: false,
};

function normalizeProgress(progress: number) {
  return ((progress % 1) + 1) % 1;
}

function getDetailScale(time: number) {
  const pulseProgress = (time % CONFIG.pulseDurationMs) / CONFIG.pulseDurationMs;
  const pulseAngle = pulseProgress * Math.PI * 2;
  return 0.52 + ((Math.sin(pulseAngle + 0.55) + 1) / 2) * 0.48;
}

function getRotation(time: number) {
  if (!CONFIG.rotate) return 0;
  return -((time % CONFIG.rotationDurationMs) / CONFIG.rotationDurationMs) * 360;
}

function point(progress: number, detailScale: number) {
  const t = progress * Math.PI * 2;
  const scale = CONFIG.lemniscateA + detailScale * CONFIG.lemniscateBoost;
  const denom = 1 + Math.sin(t) ** 2;
  return {
    x: 50 + (scale * Math.cos(t)) / denom,
    y: 50 + (scale * Math.sin(t) * Math.cos(t)) / denom,
  };
}

function buildPath(detailScale: number, steps = 480) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const pt = point(index / steps, detailScale);
    return `${index === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
  }).join(' ');
}

function getParticle(index: number, progress: number, detailScale: number) {
  const tailOffset = index / (CONFIG.particleCount - 1);
  const pt = point(normalizeProgress(progress - tailOffset * CONFIG.trailSpan), detailScale);
  const fade = Math.pow(1 - tailOffset, 0.56);
  return {
    x: pt.x,
    y: pt.y,
    radius: 0.9 + fade * 2.7,
    opacity: 0.04 + fade * 0.96,
  };
}

/**
 * Lemniscate Bloom Math Curve Loader
 * Reusable animated SVG loader component powered by Bernoulli Lemniscate equation.
 */
export function LemniscateBloomLoader({
  size = 160,
  label = 'Loading...',
  tag,
  className = '',
  color = 'var(--brand)',
  fullscreen = false,
}: LemniscateBloomLoaderProps) {
  const groupRef = useRef<SVGGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const particlesRef = useRef<SVGCircleElement[]>([]);

  useEffect(() => {
    const groupEl = groupRef.current;
    const pathEl = pathRef.current;
    if (!groupEl || !pathEl) return;

    const SVG_NS = 'http://www.w3.org/2000/svg';
    pathEl.setAttribute('stroke-width', String(CONFIG.strokeWidth));

    // Clear existing particle circles if re-mounted
    particlesRef.current.forEach(circle => circle.remove());
    particlesRef.current = [];

    // Create particle nodes once
    const particleNodes: SVGCircleElement[] = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('fill', 'currentColor');
      groupEl.appendChild(circle);
      particleNodes.push(circle);
    }
    particlesRef.current = particleNodes;

    let animId: number;
    const startedAt = performance.now();

    function render(now: number) {
      const time = now - startedAt;
      const progress = (time % CONFIG.durationMs) / CONFIG.durationMs;
      const detailScale = getDetailScale(time);

      if (groupEl) {
        groupEl.setAttribute('transform', `rotate(${getRotation(time)} 50 50)`);
      }
      if (pathEl) {
        pathEl.setAttribute('d', buildPath(detailScale));
      }

      particleNodes.forEach((node, index) => {
        const p = getParticle(index, progress, detailScale);
        node.setAttribute('cx', p.x.toFixed(2));
        node.setAttribute('cy', p.y.toFixed(2));
        node.setAttribute('r', p.radius.toFixed(2));
        node.setAttribute('opacity', p.opacity.toFixed(3));
      });

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      particleNodes.forEach(circle => circle.remove());
    };
  }, []);

  const containerStyle = {
    color,
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
  };

  const content = (
    <div className={`flex flex-col items-center justify-center p-6 text-center select-none ${className}`}>
      <div style={containerStyle} className="relative aspect-square flex items-center justify-center overflow-visible">
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full overflow-visible" aria-hidden="true">
          <g ref={groupRef}>
            <path ref={pathRef} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
          </g>
        </svg>
      </div>

      {(label || tag) && (
        <div className="mt-4 space-y-1">
          {label && (
            <div className="text-sm font-black text-text-primary tracking-tight">
              {label}
            </div>
          )}
          {tag && (
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-text-muted">
              {tag}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}
