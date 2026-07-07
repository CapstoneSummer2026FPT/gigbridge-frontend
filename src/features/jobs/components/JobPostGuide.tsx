import { useEffect, useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

interface JobPostGuideProps {
  isActive: boolean;
  onClose: () => void;
}

interface SpotlightStep {
  targetId: string;
  title: string;
  description: string;
}

export function JobPostGuide({ isActive, onClose }: JobPostGuideProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlight, setSpotlight] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const steps: SpotlightStep[] = useMemo(() => [
    {
      targetId: 'guide-prompt-textarea',
      title: t('postJobTour.step1Title'),
      description: t('postJobTour.step1Desc'),
    },
    {
      targetId: 'guide-prompt-suggestions',
      title: t('postJobTour.step2Title'),
      description: t('postJobTour.step2Desc'),
    },
    {
      targetId: 'guide-prompt-generate-btn',
      title: t('postJobTour.step3Title'),
      description: t('postJobTour.step3Desc'),
    },
    {
      targetId: 'guide-job-details-panel',
      title: t('postJobTour.step4Title'),
      description: t('postJobTour.step4Desc'),
    },
  ], [t]);

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      return;
    }

    const updateCoordinates = () => {
      const step = steps[currentStep];
      if (!step) return;
      const element = document.getElementById(step.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        setSpotlight({
          x: rect.left - padding,
          y: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });
      }
    };

    // Scroll element into view smoothly on step change
    const step = steps[currentStep];
    if (step) {
      const element = document.getElementById(step.targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Query positions regularly to handle smooth scrolling, layout adjustments, and resizing
    const intervalId = setInterval(updateCoordinates, 50);
    window.addEventListener('resize', updateCoordinates);
    window.addEventListener('scroll', updateCoordinates);

    updateCoordinates();

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('resize', updateCoordinates);
      window.removeEventListener('scroll', updateCoordinates);
    };
  }, [isActive, currentStep, steps]);

  if (!isActive) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const activeStepItem = steps[currentStep];
  if (!activeStepItem) return null;

  // Determine ideal position for the onboarding card (fixed viewport relative)
  const isDesktop = window.innerWidth >= 1024;
  const isDetailsStep = activeStepItem.targetId === 'guide-job-details-panel';
  const bubbleWidth = Math.min(320, window.innerWidth - 32);

  let bubbleX = Math.max(16, Math.min(window.innerWidth - bubbleWidth - 16, spotlight.x + spotlight.width / 2 - bubbleWidth / 2));
  let bubbleY = spotlight.y + spotlight.height + 16;

  if (isDesktop && isDetailsStep) {
    bubbleX = spotlight.x - 320 - 16; // Place on the left of the Job Details panel
    // Center vertically relative to the visible portion of the spotlight in the viewport
    const bubbleHeight = 260; // Estimated height of the guide bubble
    const visibleTop = Math.max(0, spotlight.y);
    const visibleBottom = Math.min(window.innerHeight, spotlight.y + spotlight.height);
    const visibleCenterY = (visibleTop + visibleBottom) / 2;
    bubbleY = Math.max(16, Math.min(window.innerHeight - bubbleHeight - 16, visibleCenterY - bubbleHeight / 2));
  } else {
    const isCardAbove = spotlight.y + spotlight.height + 180 > window.innerHeight;
    bubbleY = isCardAbove
      ? spotlight.y - 190
      : spotlight.y + spotlight.height + 16;
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none select-none">
      {/* SVG Spotlight Mask Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="guide-spotlight-mask">
            {/* White covers the entire screen (opaque overlay) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black rounded rect cuts out the spotlight window */}
            <rect
              x={spotlight.x}
              y={spotlight.y}
              width={spotlight.width}
              height={spotlight.height}
              rx={12}
              ry={12}
              fill="black"
              style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </mask>
        </defs>
        
        {/* The semi-transparent overlay rect with the cutout mask */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="black"
          fillOpacity="0.7"
          mask="url(#guide-spotlight-mask)"
          className="pointer-events-auto"
          onClick={onClose}
          style={{ cursor: 'pointer' }}
        />
      </svg>

      {/* Floating Guided Info Bubble */}
      <div
        className="fixed bg-card/90 backdrop-blur-md border border-border rounded-2xl p-5 shadow-2xl z-[10000] w-[calc(100vw-32px)] sm:w-[320px] pointer-events-auto flex flex-col gap-4 text-left transition-all duration-300"
        style={{
          top: `${bubbleY}px`,
          left: `${bubbleX}px`,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
        >
          <X size={14} />
        </button>

        <div className="flex flex-col gap-1 pr-6">
          <span className="text-[10px] text-[var(--gb-cyan)] font-extrabold uppercase tracking-widest">
            {t('postJobTour.step', { current: currentStep + 1, total: steps.length })}
          </span>
          <h4 className="text-sm font-bold text-foreground leading-tight">
            {activeStepItem.title}
          </h4>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {activeStepItem.description}
        </p>

        <div className="flex items-center justify-between border-t border-border pt-4 mt-1">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer border-none bg-transparent"
          >
            <ChevronLeft size={14} />
            <span>{t('postJobTour.previous')}</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[var(--gb-purple)] to-[var(--gb-cyan)] text-white hover:opacity-90 shadow-md transition-all cursor-pointer border-none"
          >
            <span>{currentStep === steps.length - 1 ? t('postJobTour.finish') : t('postJobTour.next')}</span>
            {currentStep === steps.length - 1 ? <Check size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
