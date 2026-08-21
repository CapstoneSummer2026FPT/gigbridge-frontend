import { useState, type FormEvent, useRef, useEffect, useCallback, useReducer } from 'react';
import { Crown, Sparkles, LoaderCircle, ArrowUp, Eraser, X, Paperclip, FileText, FileType, Code2, AlertCircle, UploadCloud, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { parseJobDocument, combineAndTrimJobDocuments } from '../utils/documentParser';
import { PostJobTrimWarningModal } from './PostJobTrimWarningModal';

interface Props {
  isPremium: boolean;
  isLoading: boolean;
  onGenerate: (prompt: string, sourceType?: 'prompt' | 'document') => Promise<void>;
  onUpgrade: () => void;
  onClose: () => void;
}

interface AttachedFileItem {
  name: string;
  text: string;
  charCount: number;
}

// ---- Kích thước cơ bản & giới hạn resize ----
const DEFAULT_W = 900;
const DEFAULT_H = 150;
const MIN_W = 760;
const MAX_W = 1180;
const MIN_H = 150;
const MAX_H = 420;

const SMALL_H = 50;
const GAP = 8;
const R = 20;
const NOTCH_R = 22;
const DURATION = 460;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clampR = (r: number, w: number, h: number) => Math.max(0, Math.min(r, w / 2, h / 2));

const normalize = ([x, y]: [number, number]): [number, number] => {
  const len = Math.hypot(x, y) || 1;
  return [x / len, y / len];
};

function roundedPolygonPath(points: [number, number][], radii: number[]): string {
  const n = points.length;
  const d: string[] = [];

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];

    const distPrev = Math.hypot(prev[0] - curr[0], prev[1] - curr[1]);
    const distNext = Math.hypot(next[0] - curr[0], next[1] - curr[1]);
    const maxR = Math.min(distPrev * 0.49, distNext * 0.49);
    const r = Math.max(0, Math.min(radii[i] ?? 0, maxR));

    const toPrev = normalize([prev[0] - curr[0], prev[1] - curr[1]]);
    const toNext = normalize([next[0] - curr[0], next[1] - curr[1]]);

    const startPt = [
      curr[0] + toPrev[0] * r,
      curr[1] + toPrev[1] * r,
    ];

    const endPt = [
      curr[0] + toNext[0] * r,
      curr[1] + toNext[1] * r,
    ];

    d.push(
      i === 0
        ? `M ${startPt[0]} ${startPt[1]}`
        : `L ${startPt[0]} ${startPt[1]}`
    );

    if (r > 0) {
      d.push(`Q ${curr[0]} ${curr[1]} ${endPt[0]} ${endPt[1]}`);
    }
  }

  d.push('Z');
  return d.join(' ');
}

function roundedRectPath(x: number, y: number, w: number, h: number, radius: number): string {
  const r = clampR(radius, w, h);

  return [
    `M ${x + r} ${y}`,
    `L ${x + w - r} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `L ${x + w} ${y + h - r}`,
    `Q ${x + w} ${y + h} ${x + w - r} ${y + h}`,
    `L ${x + r} ${y + h}`,
    `Q ${x} ${y + h} ${x} ${y + h - r}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

function hexPath(x: number, y: number, w: number, h: number, cutW: number, cutH: number, side: 'left' | 'right'): string {
  if (cutW === 0 && cutH === 0) {
    return roundedRectPath(x, y, w, h, R);
  }

  const points: [number, number][] =
    side === 'right'
      ? [
          [x, y],
          [x + w - cutW, y],
          [x + w - cutW, y + cutH],
          [x + w, y + cutH],
          [x + w, y + h],
          [x, y + h],
        ]
      : [
          [x + cutW, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
          [x, y + cutH],
          [x + cutW, y + cutH],
        ];

  const rBig = clampR(R, w, h);
  const rNotch = clampR(NOTCH_R, w, h);

  const radii =
    side === 'right'
      ? [rBig, rNotch, rNotch, rBig, rBig, rBig]
      : [rNotch, rBig, rBig, rBig, rBig, rNotch];

  return roundedPolygonPath(points, radii);
}

export function PostJobAiInput({ isPremium, isLoading, onGenerate, onUpgrade, onClose }: Props) {
  const { t } = useTranslation(['jobs', 'common']);
  const [prompt, setPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileItem[]>([]);
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ---- Dynamic Resizing Dimensions & Responsive Viewport ----
  const [boxWidth, setBoxWidth] = useState(DEFAULT_W);
  const [boxHeight, setBoxHeight] = useState(DEFAULT_H);
  const [containerWidth, setContainerWidth] = useState(DEFAULT_W);
  const [isResizing, setIsResizing] = useState(false);

  const [isTrimModalOpen, setIsTrimModalOpen] = useState(false);
  const [hasConfirmedTrim, setHasConfirmedTrim] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);

  // Smooth Bloom & Horizontal Unfurl from the Landing Light Bubble
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    gsap.fromTo(
      el,
      {
        scaleX: 0.05,
        scaleY: 0.22,
        opacity: 0.2,
        filter: 'brightness(1.8) drop-shadow(0 0 45px rgba(73, 75, 231, 0.95))',
        transformOrigin: '50% 50%',
      },
      {
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        filter: 'brightness(1) drop-shadow(0 0 0px transparent)',
        duration: 0.5,
        ease: 'elastic.out(1, 0.85)',
        clearProps: 'transform,opacity,filter',
      }
    );
  }, []);

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    if (!containerRef.current) {
      onClose();
      return;
    }

    isClosingRef.current = true;
    const el = containerRef.current;

    gsap.to(el, {
      scaleX: 0.05,
      scaleY: 0.22,
      opacity: 0,
      filter: 'brightness(1.6) drop-shadow(0 0 30px rgba(73, 75, 231, 0.9))',
      duration: 0.3,
      ease: 'power3.in',
      onComplete: () => {
        onClose();
      },
    });
  }, [onClose]);

  // Responsive container width observer
  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) {
      const handleWinResize = () => {
        setContainerWidth(Math.min(window.innerWidth - 32, DEFAULT_W));
      };
      handleWinResize();
      window.addEventListener('resize', handleWinResize);
      return () => window.removeEventListener('resize', handleWinResize);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize?.[0]?.inlineSize) {
          setContainerWidth(Math.round(entry.contentBoxSize[0].inlineSize));
        } else if (entry.contentRect?.width) {
          setContainerWidth(Math.round(entry.contentRect.width));
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Responsive derived bounds
  const isSmallScreen = containerWidth < 640;
  const effectiveWidth = Math.max(320, Math.min(boxWidth, containerWidth));
  const effectiveHeight = isSmallScreen ? Math.max(boxHeight, 220) : boxHeight;
  const smallW = Math.min(232, Math.max(145, Math.round(effectiveWidth * 0.44)));

  // ---- Morph Animation State ----
  const progressRef = useRef(0);
  const targetRef = useRef(0);
  const fromRef = useRef(0);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [, forceRender] = useReducer((n) => n + 1, 0);

  const step = useCallback(() => {
    const now = performance.now();
    const elapsed = now - startRef.current;
    const t = Math.min(1, elapsed / DURATION);
    const eased = easeInOutCubic(t);

    progressRef.current = fromRef.current + (targetRef.current - fromRef.current) * eased;
    forceRender();

    if (t < 1) {
      rafRef.current = requestAnimationFrame(step);
    }
  }, []);

  const animateTo = useCallback(
    (target: number) => {
      if (
        targetRef.current === target &&
        Math.abs(progressRef.current - target) < 0.001
      ) {
        return;
      }

      targetRef.current = target;
      fromRef.current = progressRef.current;
      startRef.current = performance.now();

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(step);
    },
    [step]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Auto-resize textarea to fill available expanded height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxTextareaH = Math.max(46, boxHeight - 92);
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxTextareaH)}px`;
    }
  }, [prompt, boxHeight]);

  // ---- Drag to Resize Handlers ----
  const startResize = useCallback(
    (direction: 'top' | 'left' | 'right' | 'top-left' | 'top-right', startEvent: React.MouseEvent | React.TouchEvent) => {
      startEvent.preventDefault();
      setIsResizing(true);

      const clientX = 'touches' in startEvent ? startEvent.touches[0].clientX : startEvent.clientX;
      const clientY = 'touches' in startEvent ? startEvent.touches[0].clientY : startEvent.clientY;

      const initialW = boxWidth;
      const initialH = boxHeight;

      const onMove = (moveEvent: MouseEvent | TouchEvent) => {
        const curX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const curY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

        // Vertical resize: dragging UP (decreasing clientY) increases height
        if (direction === 'top' || direction === 'top-left' || direction === 'top-right') {
          const deltaY = clientY - curY;
          const newH = Math.max(MIN_H, Math.min(MAX_H, initialH + deltaY));
          setBoxHeight(newH);
        }

        // Horizontal resize: symmetric expansion from center
        if (direction === 'left' || direction === 'top-left') {
          const deltaX = (clientX - curX) * 2;
          const newW = Math.max(MIN_W, Math.min(MAX_W, initialW + deltaX));
          setBoxWidth(newW);
        } else if (direction === 'right' || direction === 'top-right') {
          const deltaX = (curX - clientX) * 2;
          const newW = Math.max(MIN_W, Math.min(MAX_W, initialW + deltaX));
          setBoxWidth(newW);
        }
      };

      const onEnd = () => {
        setIsResizing(false);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onMove);
      window.addEventListener('touchend', onEnd);
    },
    [boxWidth, boxHeight]
  );

  const processFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    setIsParsingDoc(true);
    setParseError(null);

    try {
      const newItems: AttachedFileItem[] = [];
      for (const file of selectedFiles) {
        if (attachedFiles.some(f => f.name === file.name)) continue;
        const result = await parseJobDocument(file);
        newItems.push({
          name: result.fileName,
          text: result.text,
          charCount: result.charCount,
        });
      }

      if (newItems.length > 0) {
        setAttachedFiles(prev => [...prev, ...newItems]);
        setHasConfirmedTrim(false);
      }
    } catch (err: any) {
      if (err.message === 'FILE_TOO_LARGE') {
        setParseError(t('postJobWizard.ai.fileTooLarge', 'File size exceeds 10 MB limit.'));
      } else if (err.message === 'UNSUPPORTED_FORMAT') {
        setParseError(t('postJobWizard.ai.unsupportedFormat', 'Unsupported format (.docx, .pdf, .txt, .md).'));
      } else {
        setParseError(t('postJobWizard.ai.parsingFailed', 'Could not read document. Please check the file.'));
      }
    } finally {
      setIsParsingDoc(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    void processFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    void processFiles(files);
  };

  const removeAttachment = (fileName: string) => {
    setAttachedFiles(prev => prev.filter(f => f.name !== fileName));
    setParseError(null);
    setHasConfirmedTrim(false);
  };

  const clearAllAttachments = () => {
    setAttachedFiles([]);
    setParseError(null);
    setHasConfirmedTrim(false);
  };

  const combinedDocs = combineAndTrimJobDocuments(
    attachedFiles.map(f => ({ fileName: f.name, text: f.text }))
  );

  const rawTotalCharCount = attachedFiles.reduce((acc, f) => acc + f.charCount, 0);

  const submitPrompt = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    if (!isPremium || isLoading || isParsingDoc) return;
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    await onGenerate(trimmedPrompt, 'prompt');
  };

  const submitDocument = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    if (!isPremium || isLoading || isParsingDoc) return;
    if (!combinedDocs.text) return;

    if (rawTotalCharCount > 15000 && !hasConfirmedTrim) {
      setIsTrimModalOpen(true);
      return;
    }

    await onGenerate(combinedDocs.text, 'document');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !isLoading && !isParsingDoc && isPremium) {
        void submitPrompt();
      }
    }
  };

  const handleConfirmTrimModal = () => {
    setHasConfirmedTrim(true);
    setIsTrimModalOpen(false);
    if (combinedDocs.text) {
      void onGenerate(combinedDocs.text, 'document');
    }
  };

  const canSubmitPrompt = Boolean(prompt.trim() && !isLoading && !isParsingDoc);
  const canSubmitDocument = Boolean(combinedDocs.text && !isLoading && !isParsingDoc);

  if (!isPremium) {
    return (
      <div className="job-post-ai-bar-container">
        <div className="job-post-ai-bar-locked">
          <div className="flex items-center gap-3">
            <div className="job-post-ai-bar-locked__icon">
              <Crown size={16} />
            </div>
            <div className="text-left">
              <strong className="block text-sm text-foreground">{t('postJobWizard.ai.lockedTitle')}</strong>
              <p className="text-xs text-muted-foreground">{t('postJobWizard.ai.lockedDescription')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="job-post-ai-bar-locked__upgrade-btn" onClick={onUpgrade}>
              <Sparkles size={13} />
              {t('postJobWizard.ai.upgrade')}
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-[var(--surface-muted)] transition-colors"
              onClick={handleClose}
              aria-label={t('common.close', 'Close')}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tVal = progressRef.current;

  // Dynamic geometry paths with current custom width & height
  const lightPathDynamic = (t: number) => {
    const x = 0;
    const y = 0;
    const w = lerp(effectiveWidth, smallW - GAP, t);
    const h = lerp(effectiveHeight, SMALL_H - GAP, t);
    const cutW = lerp(smallW, 0, t);
    const cutH = lerp(SMALL_H, 0, t);
    return hexPath(x, y, w, h, cutW, cutH, 'right');
  };

  const darkPathDynamic = (t: number) => {
    const x = lerp(effectiveWidth - smallW + GAP, 0, t);
    const y = 0;
    const w = lerp(smallW - GAP, effectiveWidth, t);
    const h = lerp(SMALL_H - GAP, effectiveHeight, t);
    const cutW = lerp(0, smallW, t);
    const cutH = lerp(0, SMALL_H, t);
    return hexPath(x, y, w, h, cutW, cutH, 'left');
  };

  const dLight = lightPathDynamic(tVal);
  const dDark = darkPathDynamic(tVal);
  const darkOnTop = tVal < 0.5;

  // Clean opacity transitions
  const promptOpacity = tVal <= 0.15 ? Math.max(0, 1 - tVal / 0.15) : 0;
  const attachTabOpacity = tVal <= 0.15 ? Math.max(0, 1 - tVal / 0.15) : 0;

  const fileOpacity = tVal >= 0.85 ? Math.max(0, (tVal - 0.85) / 0.15) : 0;
  const promptTabOpacity = tVal >= 0.85 ? Math.max(0, (tVal - 0.85) / 0.15) : 0;

  return (
    <div className="job-post-ai-bar-container">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".docx,.pdf,.txt,.md"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isLoading || isParsingDoc}
      />

      <div
        ref={containerRef}
        className={`job-post-ai-morph-wrapper ${isResizing ? 'job-post-ai-morph-wrapper--resizing' : ''}`}
        style={{
          maxWidth: `${effectiveWidth}px`,
          height: `${effectiveHeight}px`,
        }}
      >
        {/* ─── RESIZE BORDER HANDLES ─── */}
        {/* Top edge resize handle */}
        <div
          className="job-post-ai-resize-handle job-post-ai-resize-handle--top"
          onMouseDown={(e) => startResize('top', e)}
          onTouchStart={(e) => startResize('top', e)}
          title={t('postJobWizard.ai.resizeHeight', 'Drag up/down to adjust height')}
        >
          <div className="job-post-ai-resize-indicator" />
        </div>

        {/* Left edge resize handle */}
        <div
          className="job-post-ai-resize-handle job-post-ai-resize-handle--left"
          onMouseDown={(e) => startResize('left', e)}
          onTouchStart={(e) => startResize('left', e)}
          title={t('postJobWizard.ai.resizeWidth', 'Drag to adjust width')}
        />

        {/* Right edge resize handle */}
        <div
          className="job-post-ai-resize-handle job-post-ai-resize-handle--right"
          onMouseDown={(e) => startResize('right', e)}
          onTouchStart={(e) => startResize('right', e)}
          title={t('postJobWizard.ai.resizeWidth', 'Drag to adjust width')}
        />

        {/* Top-Left corner handle */}
        <div
          className="job-post-ai-resize-handle job-post-ai-resize-handle--top-left"
          onMouseDown={(e) => startResize('top-left', e)}
          onTouchStart={(e) => startResize('top-left', e)}
          title={t('postJobWizard.ai.resizeCorner', 'Drag corner to adjust size')}
        />

        {/* Top-Right corner handle */}
        <div
          className="job-post-ai-resize-handle job-post-ai-resize-handle--top-right"
          onMouseDown={(e) => startResize('top-right', e)}
          onTouchStart={(e) => startResize('top-right', e)}
          title={t('postJobWizard.ai.resizeCorner', 'Drag corner to adjust size')}
        />

        {/* Morphing SVG Background */}
        <svg
          viewBox={`0 0 ${effectiveWidth} ${effectiveHeight}`}
          className="job-post-ai-morph-svg"
        >
          <defs>
            <linearGradient id="aiMorphCardGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--card)" />
              <stop offset="100%" stopColor="var(--card)" />
            </linearGradient>

            <linearGradient id="aiMorphTabGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="color-mix(in srgb, var(--brand) 16%, var(--card))" />
              <stop offset="100%" stopColor="color-mix(in srgb, var(--brand) 12%, var(--card))" />
            </linearGradient>
          </defs>

          {darkOnTop ? [
            <path
              key="light"
              d={dLight}
              className="job-post-ai-morph-path job-post-ai-morph-path--main"
              onClick={() => animateTo(0)}
            />,
            <path
              key="dark"
              d={dDark}
              className="job-post-ai-morph-path job-post-ai-morph-path--tab"
              onClick={() => animateTo(1)}
            />,
          ] : [
            <path
              key="dark"
              d={dDark}
              className="job-post-ai-morph-path job-post-ai-morph-path--main"
              onClick={() => animateTo(1)}
            />,
            <path
              key="light"
              d={dLight}
              className="job-post-ai-morph-path job-post-ai-morph-path--tab"
              onClick={() => animateTo(0)}
            />,
          ]}
        </svg>

        {/* ───────────────────────────────────────
            HTML INTERACTIVE OVERLAY CONTENT
            ─────────────────────────────────────── */}
        <div className="job-post-ai-morph-overlay">
          {/* ════════ MODE 0: PROMPT INTERFACE (Visible only at t <= 0.15) ════════ */}
          {promptOpacity > 0 && (
            <div
              className="job-post-ai-morph-prompt-mode"
              style={{
                opacity: promptOpacity,
                pointerEvents: tVal < 0.05 ? 'auto' : 'none',
              }}
            >
              {/* Top-Left: Prompt Header */}
              <div
                className="job-post-ai-morph__prompt-header"
                style={{ right: `${smallW + 12}px` }}
              >
                <div className="job-post-ai-morph__badge">
                  <div className="job-post-ai-bar__sparkle-icon">
                    <Sparkles size={13} className="text-[var(--brand)]" />
                  </div>
                  <span className="text-xs font-bold text-foreground truncate">
                    {t('postJobWizard.ai.aiPromptTab', 'AI Job Prompt')}
                  </span>
                </div>
              </div>

              {/* Main Prompt Input Area */}
              <form onSubmit={submitPrompt} className="job-post-ai-morph__prompt-body">
                <div className="job-post-ai-morph__input-row">
                  <textarea
                    ref={textareaRef}
                    className="job-post-ai-bar__textarea"
                    value={prompt}
                    onChange={event => setPrompt(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t(
                      'postJobWizard.ai.placeholder',
                      'Describe the job you want to hire for, e.g. "Build a Next.js ecommerce web app with Stripe integration"...'
                    )}
                    rows={1}
                    disabled={isLoading || isParsingDoc}
                    maxLength={5000}
                  />

                  {prompt.trim() && (
                    <button
                      type="button"
                      className="job-post-ai-bar__clear-btn"
                      onClick={() => setPrompt('')}
                      title={t('postJobWizard.ai.clearPrompt', 'Clear prompt')}
                      disabled={isLoading || isParsingDoc}
                    >
                      <Eraser size={14} />
                    </button>
                  )}
                </div>

                {/* Prompt Toolbar at bottom */}
                <div className="job-post-ai-morph__toolbar">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="job-post-ai-bar__counter text-[10px] text-muted-foreground font-semibold">
                      {prompt.length}/5000
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground font-bold px-2 py-0.5 rounded-md hover:bg-[var(--surface-muted)] transition-colors"
                      onClick={handleClose}
                    >
                      {t('postJobWizard.cancel', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="job-post-ai-bar__generate"
                      disabled={!canSubmitPrompt}
                      title={isLoading ? t('postJobWizard.ai.generating') : t('postJobWizard.ai.generate')}
                    >
                      {isLoading ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : (
                        <ArrowUp size={15} />
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Top-Right: Clickable Tab to Switch to Import Document */}
          {attachTabOpacity > 0 && (
            <button
              type="button"
              className="job-post-ai-morph__tab-btn job-post-ai-morph__tab-btn--right"
              style={{
                width: `${smallW - 8}px`,
                opacity: attachTabOpacity,
                pointerEvents: tVal < 0.05 ? 'auto' : 'none',
              }}
              onClick={() => animateTo(1)}
              title={t('postJobWizard.ai.createWithDocTab', 'Create Job With Your Document')}
            >
              <div className="job-post-ai-morph__tab-content">
                <Paperclip size={14} className="text-[var(--brand)] shrink-0" />
                <span className="text-xs font-bold text-foreground truncate">
                  {t('postJobWizard.ai.createWithDocTab', 'Create Job With Your Document')}
                </span>
                {attachedFiles.length > 0 && (
                  <span className="job-post-ai-morph__tab-count-badge">
                    {attachedFiles.length}
                  </span>
                )}
              </div>
            </button>
          )}

          {/* ════════ MODE 1: FILE IMPORT INTERFACE (Visible only at t >= 0.85) ════════ */}
          {promptTabOpacity > 0 && (
            <button
              type="button"
              className="job-post-ai-morph__tab-btn job-post-ai-morph__tab-btn--left"
              style={{
                width: `${smallW - 8}px`,
                opacity: promptTabOpacity,
                pointerEvents: tVal > 0.95 ? 'auto' : 'none',
              }}
              onClick={() => animateTo(0)}
              title={t('postJobWizard.ai.aiPromptTab', 'AI Job Prompt')}
            >
              <div className="job-post-ai-morph__tab-content">
                <Sparkles size={14} className="text-[var(--brand)] shrink-0" />
                <span className="text-xs font-bold text-foreground truncate">
                  {t('postJobWizard.ai.aiPromptTab', 'AI Job Prompt')}
                </span>
              </div>
            </button>
          )}

          {fileOpacity > 0 && (
            <div
              className="job-post-ai-morph-file-mode"
              style={{
                opacity: fileOpacity,
                pointerEvents: tVal > 0.95 ? 'auto' : 'none',
              }}
            >
              {/* Parsing Status Spinner */}
              {isParsingDoc && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-[var(--brand)] text-xs font-medium z-20">
                  <LoaderCircle size={18} className="animate-spin" />
                  <span>{t('postJobWizard.ai.extractingText', 'Extracting document text...')}</span>
                </div>
              )}

              {/* Left Column: Add file action button directly under tab */}
              <div className="job-post-ai-morph__file-left-col">
                <div
                  className={`job-post-ai-morph__dropzone job-post-ai-morph__dropzone--compact ${isDragging ? 'job-post-ai-morph__dropzone--active' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  title={t('postJobWizard.ai.dropzoneTitle', 'Click or drop document here')}
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--brand)]/15 text-[var(--brand)] flex items-center justify-center shrink-0">
                    {attachedFiles.length > 0 ? (
                      <Plus size={15} />
                    ) : (
                      <UploadCloud size={15} />
                    )}
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight truncate">
                      {attachedFiles.length > 0
                        ? t('postJobWizard.ai.addMoreDoc', 'Add file')
                        : t('postJobWizard.ai.uploadDoc', 'Upload Document')}
                    </p>
                    <span className="text-[10px] text-muted-foreground leading-tight truncate">
                      .docx, .pdf, .txt, .md
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Full-Height Attached Files Workspace */}
              <div className="job-post-ai-morph__file-right-col">
                {attachedFiles.length === 0 ? (
                  <div className="h-full flex items-center">
                    <p className="text-xs text-muted-foreground italic px-2 hidden sm:block">
                      {t('postJobWizard.ai.emptyHint', 'No files attached yet. Drag and drop or click the button on the left to attach your job description.')}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start content-start gap-3 w-full h-full overflow-y-auto overflow-x-hidden pt-2 pr-2 pb-1">
                    {attachedFiles.map(file => {
                      const ext = file.name.split('.').pop()?.toLowerCase() || '';
                      const isPdf = ext === 'pdf';
                      const isWord = ext === 'doc' || ext === 'docx';
                      const isCodeOrMd = ext === 'md' || ext === 'txt';

                      const theme = isPdf
                        ? { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/25', ext: 'PDF', Icon: FileText }
                        : isWord
                        ? { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/25', ext: 'DOCX', Icon: FileType }
                        : isCodeOrMd
                        ? { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/25', ext: ext.toUpperCase(), Icon: Code2 }
                        : { bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/25', ext: ext.toUpperCase() || 'FILE', Icon: FileText };

                      const IconComponent = theme.Icon;

                      return (
                        <div
                          key={file.name}
                          className={`group relative flex flex-col items-center justify-center p-2 rounded-2xl border bg-[var(--card)] hover:shadow-md hover:border-[var(--brand)] transition-all w-[112px] h-[86px] shrink-0 ${theme.border}`}
                        >
                          {/* Floating Delete Button */}
                          <button
                            type="button"
                            onClick={() => removeAttachment(file.name)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10 cursor-pointer"
                            title={t('postJobWizard.ai.removeDoc', 'Remove document')}
                          >
                            <X size={11} />
                          </button>

                          {/* File Type Icon Box on Top */}
                          <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 mb-1 ${theme.bg}`}>
                            <IconComponent size={20} className={theme.text} />
                            <span className={`text-[7.5px] font-black uppercase leading-none mt-0.5 ${theme.text} opacity-90`}>
                              {theme.ext}
                            </span>
                          </div>

                          {/* Centered File Name below */}
                          <span
                            className="text-xs font-bold text-foreground truncate w-full text-center px-1 leading-tight"
                            title={file.name}
                          >
                            {file.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* File Mode Toolbar with Char Counter & Remove All */}
              <div className="job-post-ai-morph__toolbar job-post-ai-morph__toolbar--file">
                <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                  <span className="text-[10.5px] text-muted-foreground font-semibold">
                    {attachedFiles.length > 0
                      ? t('postJobWizard.ai.filesReady', {
                          count: attachedFiles.length,
                          defaultValue: `${attachedFiles.length} files ready`,
                        })
                      : t('postJobWizard.ai.noFileYet', 'No file attached')}
                  </span>

                  {attachedFiles.length > 0 && (
                    <>
                      <span className="text-muted-foreground/40 text-xs">·</span>
                      <span className="text-[10px] bg-[var(--brand)]/10 text-[var(--brand)] font-bold px-2 py-0.5 rounded">
                        {t('postJobWizard.ai.totalChars', {
                          count: combinedDocs.charCount.toLocaleString(),
                          defaultValue: `Total: ${combinedDocs.charCount.toLocaleString()} / 15,000 chars`,
                        })}{' '}
                        {combinedDocs.isTruncated && t('postJobWizard.ai.cappedAt15k', '(capped at 15k)')}
                      </span>
                      <span className="text-muted-foreground/40 text-xs">·</span>
                      <button
                        type="button"
                        onClick={clearAllAttachments}
                        className="text-[10.5px] text-muted-foreground hover:text-destructive font-medium underline transition-colors"
                      >
                        {t('postJobWizard.ai.removeAll', 'Remove all')}
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  {parseError && (
                    <div className="flex items-center gap-1 text-destructive text-[11px] font-semibold bg-destructive/10 px-2 py-0.5 rounded-md border border-destructive/20 animate-fade-in max-w-[260px]">
                      <AlertCircle size={12} className="shrink-0" />
                      <span className="truncate" title={parseError}>{parseError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground font-bold px-2 py-0.5 rounded-md hover:bg-[var(--surface-muted)] transition-colors"
                    onClick={handleClose}
                  >
                    {t('postJobWizard.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    onClick={submitDocument}
                    className="job-post-ai-bar__generate"
                    disabled={!canSubmitDocument}
                    title={isLoading ? t('postJobWizard.ai.generating') : t('postJobWizard.ai.generate')}
                  >
                    {isLoading ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <ArrowUp size={15} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Trim Confirmation Modal */}
      <PostJobTrimWarningModal
        isOpen={isTrimModalOpen}
        totalCharCount={rawTotalCharCount}
        onConfirmTrim={handleConfirmTrimModal}
        onCancel={() => setIsTrimModalOpen(false)}
      />
    </div>
  );
}
