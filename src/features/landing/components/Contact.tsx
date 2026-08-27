import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import AnimatedTitle from './AnimatedTitle';
import Button from './Button';

interface ImageClipBoxProps {
  src: string;
  clipClass: string;
  alt?: string;
}

const ImageClipBox = ({ src, clipClass, alt = '' }: ImageClipBoxProps) => (
  <div className={clipClass}>
    <img src={src} alt={alt} width={800} height={800} loading="lazy" />
  </div>
);

export default function Contact() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const handleGetStarted = () => {
    navigate('/auth/signup');
  };

  return (
    <div id="contact" className="my-20 min-h-96 w-full px-5 sm:px-10">
      <div className="relative rounded-lg bg-card text-card-foreground border border-border/50 py-24 sm:overflow-hidden transition-colors duration-300">

        {/* Left Side Polygon Clip-Path Images */}
        <div className="absolute -left-20 top-0 hidden h-full w-72 overflow-hidden sm:block lg:left-20 lg:w-96 pointer-events-none opacity-60 md:opacity-100">
          <ImageClipBox
            src="/img/contact-1.jpg"
            clipClass="contact-clip-path-1"
            alt={t('landing.contact.imageAlt')}
          />
          <ImageClipBox
            src="/img/contact-2.jpg"
            clipClass="contact-clip-path-2 lg:translate-y-40 translate-y-60"
            alt={t('landing.contact.imageAlt')}
          />
        </div>

        {/* Right Side Polygon Clip-Path Images */}
        <div className="absolute hidden sm:block pointer-events-none sm:top-1/2 md:left-auto md:right-10 lg:top-20 lg:w-80 opacity-60 md:opacity-100">
          <ImageClipBox
            src="/img/contact-1.jpg"
            clipClass="contact-clip-path-3 absolute md:scale-125 -translate-y-10"
            alt={t('landing.contact.imageAlt')}
          />
          <ImageClipBox
            src="/img/contact-2.jpg"
            clipClass="sword-man-clip-path md:scale-125 translate-y-32 lg:translate-y-44"
            alt={t('landing.contact.imageAlt')}
          />
        </div>

        {/* Center Content */}
        <div className="relative z-20 flex flex-col items-center text-center px-4 py-8 max-w-4xl mx-auto">
          {/* Seamless Radial Gradient Backdrop blending into var(--card) */}
          <div
            className="pointer-events-none absolute -inset-x-32 -inset-y-24 -z-10 rounded-full blur-3xl opacity-95"
            style={{
              background: 'radial-gradient(ellipse at center, var(--card) 0%, var(--card) 55%, transparent 95%)',
            }}
          />

          <p className="mb-6 font-general text-xs md:text-sm uppercase tracking-widest text-muted-foreground">
            {t('landing.contact.label')}
          </p>

          <AnimatedTitle
            title={t('landing.contact.animatedTitle')}
            containerClass="special-font !md:text-[5.5rem] w-full font-zentry !text-4xl sm:!text-5xl !font-black !leading-[1.05]"
          />

          <Button
            title={t('landing.contact.cta')}
            onClick={handleGetStarted}
            containerClass="mt-8 cursor-pointer shadow-lg hover:shadow-xl transition-all"
          />
        </div>
      </div>
    </div>
  );
}


