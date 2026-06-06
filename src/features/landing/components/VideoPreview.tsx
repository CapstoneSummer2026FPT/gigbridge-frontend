import { gsap } from 'gsap';
import { useState, useRef, useEffect, ReactNode, MouseEvent } from 'react';

interface VideoPreviewProps {
  children: ReactNode;
}

export default function VideoPreview({ children }: VideoPreviewProps) {
  const [isHovering, setIsHovering] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: MouseEvent<HTMLElement>) => {
    const currentTarget = event.currentTarget;
    const rect = currentTarget.getBoundingClientRect();

    const xOffset = event.clientX - (rect.left + rect.width / 2);
    const yOffset = event.clientY - (rect.top + rect.height / 2);

    if (isHovering && sectionRef.current && contentRef.current) {
      gsap.to(sectionRef.current, {
        x: xOffset,
        y: yOffset,
        rotationY: xOffset / 2,
        rotationX: -yOffset / 2,
        transformPerspective: 500,
        duration: 1,
        ease: 'power1.out',
      });

      gsap.to(contentRef.current, {
        x: -xOffset,
        y: -yOffset,
        duration: 1,
        ease: 'power1.out',
      });
    }
  };

  useEffect(() => {
    if (!isHovering && sectionRef.current && contentRef.current) {
      gsap.to(sectionRef.current, {
        x: 0,
        y: 0,
        rotationY: 0,
        rotationX: 0,
        duration: 1,
        ease: 'power1.out',
      });

      gsap.to(contentRef.current, {
        x: 0,
        y: 0,
        duration: 1,
        ease: 'power1.out',
      });
    }
  }, [isHovering]);

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="absolute z-50 size-full overflow-hidden rounded-lg"
      style={{
        perspective: '500px',
      }}
    >
      <div
        ref={contentRef}
        className="origin-center rounded-lg"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </div>
    </section>
  );
}
export { VideoPreview };
