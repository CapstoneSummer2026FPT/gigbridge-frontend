import { useState, useRef, useEffect, useCallback, type MouseEvent, type TouchEvent, type ChangeEvent } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Move, RefreshCw, AlertCircle, Scissors, Image as ImageIcon } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useTranslation } from '../../../hooks/useTranslation';
import { removeBackground } from '../../../services/removeBgService';

interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropSave: (croppedImageBase64: string) => void;
}

export function AvatarCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropSave,
}: AvatarCropModalProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const snapIconRef = useRef<SVGSVGElement>(null);

  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(imageSrc);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Remove BG States
  const [isRemovingBg, setIsRemovingBg] = useState<boolean>(false);
  const [removeBgError, setRemoveBgError] = useState<string | null>(null);
  const [removeBgSuccess, setRemoveBgSuccess] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // GSAP Modal Entrance Animation
  useGSAP(
    () => {
      if (isOpen && modalRef.current) {
        gsap.fromTo(
          '.bento-modal-card',
          { opacity: 0, scale: 0.9, y: 40 },
          { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' }
        );
        gsap.fromTo(
          '.bento-crop-item',
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power3.out', delay: 0.1 }
        );
      }
    },
    { dependencies: [isOpen], scope: modalRef }
  );

  // Sync state when new image is provided
  useEffect(() => {
    setCurrentImageSrc(imageSrc);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setRemoveBgError(null);
    setRemoveBgSuccess(false);
  }, [imageSrc]);

  // Load image object when currentImageSrc changes
  useEffect(() => {
    if (currentImageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = currentImageSrc;
      img.onload = () => {
        imageRef.current = img;
        drawPreview();
      };
    }
  }, [currentImageSrc]);

  // Draw preview on Canvas
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(position.x, position.y);

    const aspect = img.width / img.height;
    const drawWidth = aspect > 1 ? size * aspect : size;
    const drawHeight = aspect > 1 ? size : size / aspect;

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }, [zoom, rotation, position]);

  useEffect(() => {
    if (isOpen && currentImageSrc) {
      drawPreview();
    }
  }, [isOpen, currentImageSrc, drawPreview]);

  // Handle Remove.bg call
  const handleRemoveBg = async () => {
    if (!currentImageSrc) return;
    setIsRemovingBg(true);
    setRemoveBgError(null);
    setRemoveBgSuccess(false);

    try {
      const transparentImageBase64 = await removeBackground(currentImageSrc);
      setCurrentImageSrc(transparentImageBase64);
      setRemoveBgSuccess(true);
    } catch (error: unknown) {
      setRemoveBgError(error instanceof Error ? error.message : t('settings.removeBgError', { defaultValue: 'Tách nền thất bại.' }));
    } finally {
      setIsRemovingBg(false);
    }
  };

  // Handle Rotate Slider Change with 90° Snap Notch & Pause Effect
  const handleRotateSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = parseFloat(e.target.value);
    const snapThreshold = 6; // 6 degree snap window
    let finalVal = rawVal;

    const snapAngles = [0, 90, 180, 270, 360];
    for (const snap of snapAngles) {
      if (Math.abs(rawVal - snap) <= snapThreshold) {
        finalVal = snap % 360;
        if (Math.round(rotation) !== finalVal && snapIconRef.current) {
          gsap.fromTo(snapIconRef.current, { scale: 1.5, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.35, ease: 'back.out(2)' });
        }
        break;
      }
    }

    setRotation(finalVal);
  };

  // Drag Handlers
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Drag Handlers
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  // Generate Final Cropped Circular Avatar Base64
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mimeType = removeBgSuccess ? 'image/png' : 'image/jpeg';
    const croppedBase64 = canvas.toDataURL(mimeType, 0.95);
    onCropSave(croppedBase64);
    onClose();
  };

  if (!isOpen || !currentImageSrc) return null;

  return (
    <div ref={modalRef} className="avatar-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="avatar-modal-glass bento-modal-card relative w-full max-w-lg rounded-3xl p-6 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border,#ededf0)] pb-4 bento-crop-item">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--brand-soft,rgba(73,75,231,0.12))] flex items-center justify-center text-[var(--brand,#494be7)]">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[var(--text-primary,#19191b)]">
                {t('settings.cropTitle')}
              </h3>
              <p className="text-xs text-secondary">
                {t('settings.dragInstruction')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-[var(--surface-hover,#ededf0)] hover:text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Remove BG Status Alerts */}
        {removeBgSuccess && (
          <div className="alert-green flex items-center gap-2 text-xs p-3.5 rounded-2xl bento-crop-item shadow-sm">
            <Check size={16} />
            <span>{t('settings.removeBgSuccess')}</span>
          </div>
        )}

        {removeBgError && (
          <div className="alert-red flex items-center gap-2 text-xs p-3.5 rounded-2xl bento-crop-item shadow-sm">
            <AlertCircle size={16} />
            <span>{removeBgError}</span>
          </div>
        )}

        {/* Bento Grid Workspace */}
        <div className="bento-crop-container">
          {/* Bento Card 1: Interactive Canvas Crop Circle */}
          <div className="bento-crop-workspace bento-crop-item">
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              className="relative h-[250px] w-[250px] cursor-grab active:cursor-grabbing overflow-hidden rounded-full border-4 border-[var(--brand,#494be7)] shadow-[0_15px_45px_-10px_rgba(73,75,231,0.4)] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px] flex items-center justify-center transition-all duration-300 hover:scale-105"
            >
              <canvas
                ref={canvasRef}
                className="pointer-events-none rounded-full"
              />
              <div className="absolute inset-0 rounded-full border-2 border-white/20 pointer-events-none shadow-inner" />
            </div>

            <div className="inline-flex items-center gap-1.5 mt-3.5 px-3 py-1 rounded-full bg-[var(--surface,#ffffff)] border border-[var(--border,#ededf0)] shadow-xs text-xs font-semibold text-secondary animate-pulse">
              <Move size={12} className="text-[var(--brand,#494be7)]" />
              <span>{t('settings.dragInstruction')}</span>
            </div>
          </div>

          {/* Bento Grid Controls Row */}
          <div className="bento-crop-controls bento-crop-item">
            {/* Bento Box 1: Remove Background Button */}
            <div className="bento-control-card flex flex-col justify-center space-y-3">
              <button
                type="button"
                onClick={handleRemoveBg}
                disabled={isRemovingBg}
                className="remove-bg-btn-gradient w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-extrabold text-xs text-white shadow-lg disabled:opacity-60"
              >
                {isRemovingBg ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>{t('settings.removingBg')}</span>
                  </>
                ) : (
                  <>
                    <Scissors size={15} />
                    <span>Remove Background</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentImageSrc(imageSrc);
                  setZoom(1);
                  setRotation(0);
                  setPosition({ x: 0, y: 0 });
                  setRemoveBgSuccess(false);
                  setRemoveBgError(null);
                }}
                className="w-full text-center text-muted hover:text-primary underline text-xs transition-colors font-semibold"
              >
                {t('settings.reset')}
              </button>
            </div>

            {/* Bento Box 2: Zoom & Rotate Slider Bar System */}
            <div className="bento-control-card flex flex-col justify-between space-y-4">
              {/* Zoom Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-secondary">
                  <span className="flex items-center gap-1">
                    <ZoomIn size={13} className="text-[var(--brand,#494be7)]" />
                    <span>Zoom</span>
                  </span>
                  <span className="font-extrabold text-[var(--brand,#494be7)]">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <ZoomOut size={14} className="text-muted shrink-0" />
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={e => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-[var(--brand,#494be7)] cursor-pointer"
                  />
                  <ZoomIn size={14} className="text-muted shrink-0" />
                </div>
              </div>

              {/* Rotate Control Slider with 90° Snap Notches */}
              <div className="space-y-1 pt-2 border-t border-[var(--border,#ededf0)]">
                <div className="flex items-center justify-between text-xs font-bold text-secondary">
                  <span className="flex items-center gap-1">
                    <RotateCw ref={snapIconRef} size={13} className="text-[var(--brand,#494be7)]" />
                    <span>Xoay góc</span>
                  </span>
                  <span className="font-extrabold text-[var(--brand,#494be7)]">{Math.round(rotation)}°</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={rotation}
                    onChange={handleRotateSliderChange}
                    className="w-full accent-[var(--brand,#494be7)] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 bento-crop-item">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-xs font-extrabold text-secondary hover:bg-[var(--surface-hover,#ededf0)] transition-colors"
          >
            {t('settings.cancel')}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="settings-submit-btn text-xs py-2.5 px-7 font-extrabold"
          >
            <Check size={16} />
            <span>{t('settings.apply')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
