import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/all';
import { useTranslation } from 'react-i18next';
import AnimatedTitle from './AnimatedTitle';

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const { t } = useTranslation('common');

  useGSAP(() => {
    const clipAnimation = gsap.timeline({
      scrollTrigger: {
        trigger: '#clip',
        start: 'center center',
        end: '+=800 center',
        scrub: 0.5,
        pin: true,
        pinSpacing: true,
      },
    });

    clipAnimation.to('.mask-clip-path', {
      width: '100vw',
      height: '100vh',
      borderRadius: 0,
    });
  });

  return (
    <div id="about" className="min-h-screen w-full">
      <div className="relative mb-12 mt-28 md:mt-36 flex flex-col items-center gap-4 px-4 text-center">
        <p className="font-general text-xs md:text-sm uppercase tracking-widest text-muted-foreground">
          {t('landing.about.welcome')}
        </p>

        <AnimatedTitle
          title={t('landing.about.animatedTitle')}
          containerClass="mt-2 text-center"
        />

        <div className="about-subtext">
          <p className="font-medium text-foreground">{t('landing.about.subtext1')}</p>
          <p className="text-muted-foreground mt-1">
            {t('landing.about.subtext2')}
          </p>
        </div>
      </div>

      <div className="h-dvh w-full" id="clip">
        <div className="mask-clip-path about-image">
          <img
            src="/img/about.jpg"
            alt="Background"
            width={800}
            height={800}
            loading="lazy"
            className="absolute left-0 top-0 size-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
