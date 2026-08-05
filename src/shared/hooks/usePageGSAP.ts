import type { RefObject } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

export interface StaggerGroupConfig {
  /** CSS selector string relative to containerRef scope */
  selector: string;
  /** Y offset distance in px (default: 20) */
  y?: number;
  /** X offset distance in px */
  x?: number;
  /** Initial scale (e.g. 0.85) */
  scale?: number;
  /** Animation duration in seconds (default: 0.5) */
  duration?: number;
  /** Delay between staggered elements in seconds (default: 0) */
  stagger?: number;
  /** GSAP timeline position parameter (e.g. '-=0.3') */
  position?: string;
  /** Custom ease function or name (default: 'power3.out') */
  ease?: string;
  /** GSAP clearProps property string (e.g. 'all' or 'transform,opacity') */
  clearProps?: string;
  /** Custom start vars override */
  fromVars?: gsap.TweenVars;
  /** Custom end vars override */
  toVars?: gsap.TweenVars;
}

export interface UsePageGSAPOptions {
  /** Root container ref for scoping GSAP selectors */
  containerRef: RefObject<HTMLElement | null>;
  /** Loading state flag; animation triggers when loading becomes false */
  loading?: boolean;
  /** Ordered array of element groups to animate sequentially */
  groups?: StaggerGroupConfig[];
  /** Custom additional animation callback inside matchMedia context */
  onAnimate?: (context: gsap.Context, mult: number) => void;
  /** Additional React state dependencies that should trigger re-animation */
  dependencies?: unknown[];
}

/**
 * Reusable Custom Hook for Page Entrance Animations with GSAP.
 * Features:
 * - Scoped DOM selection via containerRef
 * - Automatic matchMedia & prefers-reduced-motion accessibility
 * - Staggered element reveals with customizable easing & delays
 * - Supports custom transform aliases (x, y, scale, autoAlpha, clearProps)
 * - Clean teardown & memory management via mm.revert()
 */
export function usePageGSAP({
  containerRef,
  loading = false,
  groups = [],
  onAnimate,
  dependencies = [],
}: UsePageGSAPOptions) {
  useGSAP(() => {
    if (loading) return;

    const mm = gsap.matchMedia();

    mm.add({
      isDesktop: "(min-width: 768px)",
      isMobile: "(max-width: 767px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    }, (context) => {
      const { reduceMotion } = context.conditions!;
      const mult = reduceMotion ? 0 : 1;

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      groups.forEach((group, idx) => {
        const {
          selector,
          y = 20,
          x,
          scale,
          duration = 0.5,
          stagger = 0,
          position = idx === 0 ? undefined : '-=0.3',
          ease = 'power3.out',
          clearProps,
          fromVars,
          toVars,
        } = group;

        const targetElements = containerRef.current?.querySelectorAll(selector);
        if (targetElements && targetElements.length > 0) {
          const initialFrom: gsap.TweenVars = {
            autoAlpha: 0,
            y: reduceMotion ? 0 : y,
            ...(x !== undefined && !reduceMotion ? { x } : {}),
            ...(scale !== undefined && !reduceMotion ? { scale } : {}),
            ...fromVars,
          };

          const targetTo: gsap.TweenVars = {
            autoAlpha: 1,
            y: 0,
            ...(x !== undefined ? { x: 0 } : {}),
            ...(scale !== undefined ? { scale: 1 } : {}),
            duration: duration * mult,
            stagger: stagger * mult,
            ease,
            ...(clearProps ? { clearProps } : {}),
            ...toVars,
          };

          tl.fromTo(selector, initialFrom, targetTo, position);
        }
      });

      if (onAnimate) {
        onAnimate(context, mult);
      }
    }, containerRef);

    return () => mm.revert();
  }, { scope: containerRef, dependencies: [loading, ...dependencies] });
}
