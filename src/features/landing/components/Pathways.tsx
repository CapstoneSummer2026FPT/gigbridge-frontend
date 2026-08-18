import { useState, useRef, MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { TiLocationArrow } from 'react-icons/ti';
import { Building2, UserCheck, CheckCircle2 } from 'lucide-react';
import AnimatedTitle from './AnimatedTitle';
import Button from './Button';

interface BentoTiltProps {
  children: React.ReactNode;
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

export default function Pathways() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const handleForClients = () => {
    localStorage.setItem('selected_role', '0');
    navigate('/auth/signup');
  };

  const handleForFreelancers = () => {
    localStorage.setItem('selected_role', '1');
    navigate('/auth/signup');
  };

  const clientBulletsRaw = t('landing.pathways.client.bullets', { returnObjects: true });
  const clientBullets = Array.isArray(clientBulletsRaw) ? (clientBulletsRaw as string[]) : [];

  const freelancerBulletsRaw = t('landing.pathways.freelancer.bullets', { returnObjects: true });
  const freelancerBullets = Array.isArray(freelancerBulletsRaw) ? (freelancerBulletsRaw as string[]) : [];

  return (
    <section id="pathways" className="bg-background text-foreground pb-32 transition-colors duration-300">
      <div className="container mx-auto px-3 md:px-10">
        <div className="px-5 py-24 text-center flex flex-col items-center">
          <p className="font-circular-web text-sm md:text-base uppercase tracking-widest text-muted-foreground">
            {t('landing.pathways.label')}
          </p>

          <AnimatedTitle
            title={t('landing.pathways.animatedTitle')}
            containerClass="mt-4 text-center"
          />

          <p className="mt-4 max-w-xl font-circular-web text-base text-muted-foreground">
            {t('landing.pathways.desc')}
          </p>
        </div>

        {/* 2 Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 w-full">
          {/* Card 1: Doanh nghiệp */}
          <BentoTilt className="border-hsla relative h-[540px] md:h-[580px] w-full overflow-hidden rounded-md">
            <div className="relative size-full">
              <img
                src="/img/pathway-client.jpg"
                alt={t('landing.pathways.client.badge')}
                className="absolute left-0 top-0 size-full object-cover object-center"
              />
              {/* Single smooth gradient mask fading from dark at the bottom to transparent/light at the top */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10 z-0 pointer-events-none" />

              <div className="relative z-10 flex size-full flex-col justify-between p-7 md:p-10 text-blue-50">
                <div>
                  <div className="border-hsla relative flex w-fit items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-4 py-1.5 text-xs font-general uppercase tracking-widest text-blue-50">
                    <Building2 className="size-3.5 text-blue-50" />
                    <span>{t('landing.pathways.client.badge')}</span>
                  </div>

                  <h1
                    className="bento-title special-font mt-4 font-black uppercase text-blue-50"
                    dangerouslySetInnerHTML={{ __html: t('landing.pathways.client.cardTitle') }}
                  />

                  <p className="mt-3 font-circular-web text-sm md:text-base text-blue-50/90 font-medium">
                    {t('landing.pathways.client.title')}
                  </p>
                </div>

                <div>
                  <ul className="space-y-3 mb-6">
                    {clientBullets.map((bullet, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs md:text-sm text-blue-50/90 font-circular-web leading-relaxed"
                      >
                        <CheckCircle2 className="size-4 shrink-0 text-blue-50 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    id="client-pathway-btn"
                    title={t('landing.pathways.client.cta')}
                    rightIcon={<TiLocationArrow className="ml-1 scale-125" />}
                    onClick={handleForClients}
                    containerClass="bg-blue-50 text-black flex-center gap-1 text-xs uppercase font-bold px-6 py-3 hover:bg-violet-50"
                  />
                </div>
              </div>
            </div>
          </BentoTilt>

          {/* Card 2: Freelancer */}
          <BentoTilt className="border-hsla relative h-[540px] md:h-[580px] w-full overflow-hidden rounded-md">
            <div className="relative size-full">
              <img
                src="/img/pathway-freelancer.jpg"
                alt={t('landing.pathways.freelancer.badge')}
                className="absolute left-0 top-0 size-full object-cover object-center"
              />
              {/* Single smooth gradient mask fading from dark at the bottom to transparent/light at the top */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10 z-0 pointer-events-none" />

              <div className="relative z-10 flex size-full flex-col justify-between p-7 md:p-10 text-blue-50">
                <div>
                  <div className="border-hsla relative flex w-fit items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-4 py-1.5 text-xs font-general uppercase tracking-widest text-blue-50">
                    <UserCheck className="size-3.5 text-blue-50" />
                    <span>{t('landing.pathways.freelancer.badge')}</span>
                  </div>

                  <h1
                    className="bento-title special-font mt-4 font-black uppercase text-blue-50"
                    dangerouslySetInnerHTML={{ __html: t('landing.pathways.freelancer.cardTitle') }}
                  />

                  <p className="mt-3 font-circular-web text-sm md:text-base text-blue-50/90 font-medium">
                    {t('landing.pathways.freelancer.title')}
                  </p>
                </div>

                <div>
                  <ul className="space-y-3 mb-6">
                    {freelancerBullets.map((bullet, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs md:text-sm text-blue-50/90 font-circular-web leading-relaxed"
                      >
                        <CheckCircle2 className="size-4 shrink-0 text-blue-50 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    id="freelancer-pathway-btn"
                    title={t('landing.pathways.freelancer.cta')}
                    rightIcon={<TiLocationArrow className="ml-1 scale-125" />}
                    onClick={handleForFreelancers}
                    containerClass="bg-blue-50 text-black flex-center gap-1 text-xs uppercase font-bold px-6 py-3 hover:bg-violet-50"
                  />
                </div>
              </div>
            </div>
          </BentoTilt>
        </div>
      </div>
    </section>
  );
}
