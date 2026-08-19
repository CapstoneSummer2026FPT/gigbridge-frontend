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
        <div className="absolute -left-20 top-0 hidden h-full w-72 overflow-hidden sm:block lg:left-20 lg:w-96">
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

        <div className="absolute -top-40 left-20 w-60 sm:top-1/2 md:left-auto md:right-10 lg:top-20 lg:w-80">
          <ImageClipBox
            src="/img/contact-1.jpg"
            clipClass="absolute md:scale-125"
            alt={t('landing.contact.imageAlt')}
          />
          <ImageClipBox
            src="/img/contact-2.jpg"
            clipClass="sword-man-clip-path md:scale-125"
            alt={t('landing.contact.imageAlt')}
          />
        </div>

        <div className="flex flex-col items-center text-center">
          <p className="mb-10 font-general text-[10px] uppercase">
            {t('landing.contact.label')}
          </p>

          <AnimatedTitle
            title={t('landing.contact.animatedTitle')}
            containerClass="special-font !md:text-[6.2rem] w-full font-zentry !text-5xl !font-black !leading-[.9]"
          />

          <Button
            title={t('landing.contact.cta')}
            onClick={handleGetStarted}
            containerClass="mt-10 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
