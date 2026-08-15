import React, { useRef, useState } from 'react';
import { gsap } from 'gsap';

interface BrandSweepBackButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function BrandSweepBackButton({
  onClick,
  children,
  className = '',
  disabled = false,
}: BrandSweepBackButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const beamRef = useRef<HTMLSpanElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (disabled || isAnimating) return;

    setIsAnimating(true);

    if (beamRef.current && buttonRef.current) {
      const tl = gsap.timeline({
        onComplete: () => {
          setIsAnimating(false);
          onClick();
        },
      });

      tl.set(beamRef.current, { xPercent: -100, opacity: 1 })
        .to(beamRef.current, {
          xPercent: 100,
          duration: 0.5,
          ease: 'power2.inOut',
        })
        .set(beamRef.current, { opacity: 0 });

      gsap.fromTo(
        buttonRef.current,
        { scale: 0.96 },
        { scale: 1, duration: 1, ease: 'back.out(1.8)' }
      );
    } else {
      onClick();
    }
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled || isAnimating}
      onClick={handleClick}
      className={`brand-sweep-back-btn ${className}`}
    >
      <span ref={beamRef} className="brand-sweep-beam" aria-hidden="true" />
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </button>
  );
}
