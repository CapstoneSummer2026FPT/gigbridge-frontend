import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/all';
import { TiLocationArrow } from 'react-icons/ti';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import VideoPreview from './VideoPreview';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [currentIndex, setCurrentIndex] = useState(1);
  const [hasClicked, setHasClicked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadedVideos, setLoadedVideos] = useState(0);

  const totalVideos = 4;
  const nextVdRef = useRef<HTMLVideoElement>(null);

  const handleVideoLoad = () => {
    setLoadedVideos((prev) => prev + 1);
  };

  useEffect(() => {
    if (loadedVideos >= totalVideos - 1) {
      setLoading(false);
    }
  }, [loadedVideos]);

  // Fallback timer to hide loading screen if browser load events are delayed
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleMiniVdClick = () => {
    setHasClicked(true);
    setCurrentIndex((prevIndex) => (prevIndex % totalVideos) + 1);
  };

  useGSAP(
    () => {
      if (hasClicked) {
        gsap.set('#next-video', { visibility: 'visible' });
        gsap.to('#next-video', {
          transformOrigin: 'center center',
          scale: 1,
          width: '100%',
          height: '100%',
          duration: 1,
          ease: 'power1.inOut',
          onStart: () => {
            if (nextVdRef.current) nextVdRef.current.play().catch(() => undefined);
          },
        });
        gsap.from('#current-video', {
          transformOrigin: 'center center',
          scale: 0,
          duration: 1.5,
          ease: 'power1.inOut',
        });
      }
    },
    {
      dependencies: [currentIndex],
      revertOnUpdate: true,
    }
  );

  useGSAP(() => {
    gsap.set('#video-frame', {
      clipPath: 'polygon(14% 0, 72% 0, 88% 90%, 0 95%)',
      borderRadius: '0% 0% 40% 10%',
    });
    gsap.from('#video-frame', {
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      borderRadius: '0% 0% 0% 0%',
      ease: 'power1.inOut',
      scrollTrigger: {
        trigger: '#video-frame',
        start: 'center center',
        end: 'bottom center',
        scrub: true,
      },
    });
  });

  const getVideoSrc = (index: number) => {
    return index % 2 === 1 ? '/videos/hand_shake_landing.webm' : '/videos/finding_work_landing.webm';
  };

  const handleFindWork = () => {
    navigate('/public/job-posts');
  };

  const handleHireTalent = () => {
    navigate('/public/freelancers');
  };

  return (
    <div className="relative h-dvh w-full overflow-x-hidden">
      {loading && (
        <div className="flex-center absolute z-[100] h-dvh w-full overflow-hidden bg-violet-50">
          <div className="three-body">
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
          </div>
        </div>
      )}

      <div
        id="video-frame"
        className="relative z-10 h-dvh w-full overflow-hidden rounded-lg bg-blue-75"
      >
        <div>
          <div className="mask-clip-path absolute-center absolute z-50 size-40 sm:size-64 cursor-pointer overflow-hidden rounded-lg">
            <VideoPreview>
              <div
                onClick={handleMiniVdClick}
                className="origin-center scale-50 opacity-0 transition-all duration-500 ease-in hover:scale-100 hover:opacity-100"
              >
                <video
                  ref={nextVdRef}
                  src={getVideoSrc((currentIndex % totalVideos) + 1)}
                  loop
                  muted
                  playsInline
                  id="current-video"
                  className="size-40 sm:size-64 origin-center scale-150 object-cover object-center"
                  onLoadedData={handleVideoLoad}
                />
              </div>
            </VideoPreview>
          </div>

          <video
            ref={nextVdRef}
            src={getVideoSrc(currentIndex)}
            loop
            muted
            playsInline
            id="next-video"
            className="absolute-center invisible absolute z-20 size-40 sm:size-64 object-cover object-center"
            onLoadedData={handleVideoLoad}
          />
          <video
            src={getVideoSrc(currentIndex === totalVideos - 1 ? 1 : currentIndex)}
            autoPlay
            loop
            muted
            playsInline
            className="absolute left-0 top-0 size-full object-cover object-center"
            onLoadedData={handleVideoLoad}
          />
        </div>

        <h1 className="special-font hero-heading absolute bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 text-blue-75 opacity-70 sm:opacity-100">
          BU<b>I</b>LD
        </h1>

        <div className="absolute left-0 top-0 z-40 size-full">
          <div className="mt-20 sm:mt-24 px-4 sm:px-10">
            <h1 className="special-font hero-heading text-blue-100">
              GIGBR<b>I</b>DGE
            </h1>

            <div className="mb-5 max-w-md font-robert-regular text-blue-100">
              <p className="text-base sm:text-xl font-semibold leading-tight">
                {t('landing.hero.tagline')} <br /> {t('landing.hero.tagline2')}
              </p>
              {t('landing.hero.subtext') && (
                <p className="mt-2 text-xs sm:text-base opacity-90">
                  {t('landing.hero.subtext')}
                </p>
              )}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3">
              <Button
                id="find-work-btn"
                title={t('landing.hero.findWork')}
                leftIcon={<TiLocationArrow />}
                onClick={handleFindWork}
                containerClass="bg-yellow-300 flex-center gap-1 min-h-[44px] min-w-[130px]"
              />
              <Button
                id="hire-talent-btn"
                title={t('landing.hero.hireTalent')}
                onClick={handleHireTalent}
                containerClass="bg-blue-50 flex-center gap-1 border border-white/10 min-h-[44px] min-w-[130px]"
              />
            </div>
          </div>
        </div>
      </div>

      <h1 className="special-font hero-heading absolute bottom-3 right-3 sm:bottom-5 sm:right-5 text-background opacity-70 sm:opacity-100">
        BU<b>I</b>LD
      </h1>
    </div>
  );
}
