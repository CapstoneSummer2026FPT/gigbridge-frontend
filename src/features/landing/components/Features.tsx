import { useState, useRef, ReactNode, MouseEvent } from 'react';
import { TiLocationArrow } from 'react-icons/ti';
import { useTranslation } from 'react-i18next';

interface BentoTiltProps {
  children: ReactNode;
  className?: string;
}

function BentoTilt({ children, className = '' }: BentoTiltProps) {
  const [transformStyle, setTransformStyle] = useState('');
  const itemRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!itemRef.current) return;

    const { left, top, width, height } = itemRef.current.getBoundingClientRect();

    const relativeX = (event.clientX - left) / width;
    const relativeY = (event.clientY - top) / height;

    const tiltX = (relativeY - 0.5) * 5;
    const tiltY = (relativeX - 0.5) * -5;

    const newTransform = `perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(.95, .95, .95)`;
    setTransformStyle(newTransform);
  };

  const handleMouseLeave = () => {
    setTransformStyle('');
  };

  return (
    <div
      ref={itemRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: transformStyle }}
    >
      {children}
    </div>
  );
}

interface BentoCardProps {
  src: string;
  title: ReactNode;
  description?: string;
  isComingSoon?: boolean;
  exploreLabel?: string;
}

function BentoCard({ src, title, description, isComingSoon, exploreLabel = 'explore' }: BentoCardProps) {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [hoverOpacity, setHoverOpacity] = useState(0);
  const hoverButtonRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!hoverButtonRef.current) return;
    const rect = hoverButtonRef.current.getBoundingClientRect();

    setCursorPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => setHoverOpacity(1);
  const handleMouseLeave = () => setHoverOpacity(0);

  const isVideo = src.endsWith('.mp4') || src.endsWith('.webm');

  return (
    <div className="relative size-full">
      {isVideo ? (
        <video
          src={src}
          loop
          muted
          autoPlay
          playsInline
          className="absolute left-0 top-0 size-full object-cover object-center"
        />
      ) : (
        <img
          src={src}
          alt="Feature Illustration"
          width={800}
          height={800}
          loading="lazy"
          className="absolute left-0 top-0 size-full object-cover object-center"
        />
      )}
      {/* Dark overlay for contrast enhancement on media backgrounds */}
      <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />

      <div className="relative z-10 flex size-full flex-col justify-between p-5 text-blue-50">
        <div>
          <h1 className="bento-title special-font">{title}</h1>
          {description && (
            <p className="mt-3 max-w-64 text-xs md:text-base">{description}</p>
          )}
        </div>

        {isComingSoon && (
          <div
            ref={hoverButtonRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="border-hsla relative flex w-fit cursor-pointer items-center gap-1 overflow-hidden rounded-full bg-black px-5 py-2 text-xs uppercase text-white/20"
          >
            <div
              className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
              style={{
                opacity: hoverOpacity,
                background: `radial-gradient(100px circle at ${cursorPosition.x}px ${cursorPosition.y}px, #656fe288, #00000026)`,
              }}
            />
            <TiLocationArrow className="relative z-20" />
            <p className="relative z-20">{exploreLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Features() {
  const { t } = useTranslation('common');

  return (
    <section className="bg-background text-foreground pb-52 transition-colors duration-300">
      <div className="container mx-auto px-3 md:px-10">
        <div className="px-5 py-32">
          <p className="font-circular-web text-lg text-foreground">
            {t('landing.features.sectionLabel')}
          </p>
          <p className="max-w-md font-circular-web text-lg text-muted-foreground">
            {t('landing.features.sectionDesc')}
          </p>
        </div>

        <BentoTilt className="border-hsla relative mb-7 h-96 w-full overflow-hidden rounded-md md:h-[65vh]">
          <BentoCard
            src="/videos/finding_work_landing.webm"
            title={<span dangerouslySetInnerHTML={{ __html: t('landing.features.matchmakingTitle') }} />}
            description={t('landing.features.matchmakingDesc')}
            isComingSoon
            exploreLabel={t('landing.features.explore')}
          />
        </BentoTilt>

        <div className="grid w-full grid-cols-1 md:grid-cols-2 md:grid-rows-3 gap-5 md:gap-7 h-auto md:h-[135vh]">
          <BentoTilt className="bento-tilt_1 col-span-2 row-span-1 md:col-span-1 md:row-span-2">
            <BentoCard
              src="/img/feature-2.jpg"
              title={<span dangerouslySetInnerHTML={{ __html: t('landing.features.escrowTitle') }} />}
              description={t('landing.features.escrowDesc')}
              isComingSoon
              exploreLabel={t('landing.features.explore')}
            />
          </BentoTilt>

          <BentoTilt className="bento-tilt_1 col-span-1 row-span-1 ms-0 md:col-span-1 md:ms-32">
            <BentoCard
              src="/img/feature-3.jpg"
              title={<span dangerouslySetInnerHTML={{ __html: t('landing.features.contractsTitle') }} />}
              description={t('landing.features.contractsDesc')}
              isComingSoon
              exploreLabel={t('landing.features.explore')}
            />
          </BentoTilt>

          <BentoTilt className="bento-tilt_1 col-span-1 row-span-1 me-0 md:col-span-1 md:me-14">
            <BentoCard
              src="/img/feature-4.jpg"
              title={<span dangerouslySetInnerHTML={{ __html: t('landing.features.aiPilotTitle') }} />}
              description={t('landing.features.aiPilotDesc')}
              isComingSoon
              exploreLabel={t('landing.features.explore')}
            />
          </BentoTilt>

          <BentoTilt className="bento-tilt_2 col-span-1 row-span-1">
            <div className="flex size-full flex-col justify-between bg-secondary p-5 text-secondary-foreground">
              <h1
                className="bento-title special-font max-w-64"
                dangerouslySetInnerHTML={{ __html: t('landing.features.expandingTitle') }}
              />
              <TiLocationArrow className="m-5 scale-[5] self-end text-secondary-foreground" />
            </div>
          </BentoTilt>

          <BentoTilt className="bento-tilt_2 col-span-1 row-span-1">
            <img
              src="/img/feature-5.jpg"
              alt={t('landing.features.workspaceAlt')}
              width={800}
              height={800}
              loading="lazy"
              className="size-full object-cover object-center"
            />
          </BentoTilt>
        </div>
      </div>
    </section>
  );
}
