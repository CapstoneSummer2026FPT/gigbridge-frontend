import gsap from 'gsap';
import { useRef, MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import AnimatedTitle from './AnimatedTitle';

export default function Story() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const frameRef = useRef<HTMLImageElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLImageElement>) => {
    const { clientX, clientY } = e;
    const element = frameRef.current;

    if (!element) return;

    const rect = element.getBoundingClientRect();
    const xPos = clientX - rect.left;
    const yPos = clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((yPos - centerY) / centerY) * -10;
    const rotateY = ((xPos - centerX) / centerX) * 10;

    gsap.to(element, {
      duration: 0.3,
      rotateX,
      rotateY,
      transformPerspective: 500,
      ease: 'power1.inOut',
    });
  };

  const handleMouseLeave = () => {
    const element = frameRef.current;

    if (element) {
      gsap.to(element, {
        duration: 0.3,
        rotateX: 0,
        rotateY: 0,
        ease: 'power1.inOut',
      });
    }
  };

  return (
    <div id="story" className="min-h-dvh w-full bg-background text-foreground transition-colors duration-300">
      <div className="flex size-full flex-col items-center py-10 pb-24">
        <p className="font-general text-sm uppercase md:text-[10px] text-muted-foreground">
          {t('landing.story.label')}
        </p>

        <div className="relative size-full">
          <AnimatedTitle
            title={t('landing.story.animatedTitle')}
            containerClass="mt-5 pointer-events-none mix-blend-difference relative z-10 !text-white"
          />

          <div className="story-img-container">
            <div className="story-img-mask">
              <div className="story-img-content">
                <img
                  ref={frameRef}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseLeave}
                  onMouseEnter={handleMouseLeave}
                  src="/img/entrance.jpg"
                  alt="entrance"
                  width={800}
                  height={800}
                  loading="lazy"
                  className="object-contain"
                />
              </div>
            </div>

            <svg
              className="invisible absolute size-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="flt_tag">
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="8"
                    result="blur"
                  />
                  <feColorMatrix
                    in="blur"
                    mode="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
                    result="flt_tag"
                  />
                  <feComposite
                    in="SourceGraphic"
                    in2="flt_tag"
                    operator="atop"
                  />
                </filter>
              </defs>
            </svg>
          </div>
        </div>

        <div className="-mt-80 flex w-full justify-center md:-mt-64 md:me-44 md:justify-end">
          <div className="flex h-full w-fit flex-col items-center md:items-start">
            <p className="mt-3 max-w-sm text-center font-circular-web text-muted-foreground md:text-start">
              {t('landing.story.desc')}
            </p>

            <Button
              id="realm-btn"
              title={t('landing.story.cta')}
              onClick={() => navigate('/guide')}
              containerClass="mt-5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
