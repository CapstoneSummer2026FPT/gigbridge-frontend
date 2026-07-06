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
    <div id="about" className="min-h-screen w-screen">
      <div className="relative mb-8 mt-36 flex flex-col items-center gap-5">
        <p className="font-general text-sm uppercase md:text-[10px]">
          {t('landing.about.welcome')}
        </p>

        <AnimatedTitle
          title={t('landing.about.animatedTitle')}
          containerClass="mt-5 text-center"
        />

        <div className="about-subtext">
          <p>{t('landing.about.subtext1')}</p>
          <p className="text-gray-500">
            {t('landing.about.subtext2')}
          </p>
        </div>
      </div>

      <div className="h-dvh w-screen" id="clip">
        <div className="mask-clip-path about-image">
          <img
            src="/img/about.png"
            alt="Background"
            className="absolute left-0 top-0 size-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
export { About };
