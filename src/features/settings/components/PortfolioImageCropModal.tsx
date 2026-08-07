import { useState, useRef, useEffect, useCallback, type MouseEvent, type TouchEvent, type ChangeEvent } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Move, RefreshCw, AlertCircle, Scissors, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useTranslation } from '../../../hooks/useTranslation';
import { removeBackground } from '../../../services/removeBgService';

interface PortfolioImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropSave: (croppedImageBase64: string, file: File) => void;
}

// 7:6 Aspect Ratio matching 3D Coverflow Card display
const OUTPUT_WIDTH = 560;
const OUTPUT_HEIGHT = 480;

export function PortfolioImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropSave,
}: PortfolioImageCropModalProps) {
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
          { opacity: 0, scale: 0.92, y: 40 },
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

  useEffect(() => {
    setCurrentImageSrc(imageSrc);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setRemoveBgError(null);
    setRemoveBgSuccess(false);
  }, [imageSrc]);

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

  // Draw preview on Canvas (Exact 560x480 Coverflow Ratio)
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;

    ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    ctx.save();
    ctx.translate(OUTPUT_WIDTH / 2, OUTPUT_HEIGHT / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(position.x, position.y);

    const aspect = img.width / img.height;
    const targetAspect = OUTPUT_WIDTH / OUTPUT_HEIGHT;

    let drawWidth = OUTPUT_WIDTH;
    let drawHeight = OUTPUT_HEIGHT;

    if (aspect > targetAspect) {
      drawWidth = OUTPUT_HEIGHT * aspect;
      drawHeight = OUTPUT_HEIGHT;
    } else {
      drawWidth = OUTPUT_WIDTH;
      drawHeight = OUTPUT_WIDTH / aspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }, [zoom, rotation, position]);

  useEffect(() => {
    if (isOpen && currentImageSrc) {
      drawPreview();
    }
  }, [isOpen, currentImageSrc, drawPreview]);

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

  const handleRotateSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = parseFloat(e.target.value);
    const snapThreshold = 6;
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

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mimeType = removeBgSuccess ? 'image/png' : 'image/jpeg';
    const croppedBase64 = canvas.toDataURL(mimeType, 0.92);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `portfolio-${Date.now()}.${removeBgSuccess ? 'png' : 'jpg'}`, { type: mimeType });
        onCropSave(croppedBase64, file);
        onClose();
      }
    }, mimeType, 0.92);
  };

  if (!isOpen || !currentImageSrc) return null;

  return (
    <div ref={modalRef} className="avatar-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="avatar-modal-glass bento-modal-card relative w-full max-w-xl rounded-3xl p-6 space-y-5 border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 bento-crop-item">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--brand-soft,rgba(73,75,231,0.12))] flex items-center justify-center text-[var(--brand,#494be7)]">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <span>{t('settings.cropPortfolioTitle', { defaultValue: 'Cắt & Chỉnh sửa ảnh Coverflow' })}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[var(--brand-soft)] text-[var(--brand,#494be7)]">Tỷ lệ 7:6</span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {t('settings.cropInstruction', { defaultValue: 'Khung vừa khít với kích thước hiển thị trên 3D Gallery.' })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Remove BG Alerts */}
        {removeBgSuccess && (
          <div className="alert-green flex items-center gap-2 text-xs p-3.5 rounded-2xl bento-crop-item shadow-sm">
            <Check size={16} />
            <span>{t('settings.removeBgSuccess', { defaultValue: 'Đã tách nền thành công!' })}</span>
          </div>
        )}

        {removeBgError && (
          <div className="alert-red flex items-center gap-2 text-xs p-3.5 rounded-2xl bento-crop-item shadow-sm">
            <AlertCircle size={16} />
            <span>{removeBgError}</span>
          </div>
        )}

        {/* Bento Workspace */}
        <div className="bento-crop-container">
          {/* Rectangular Canvas Crop Workspace (Exact 336x288 display ratio for 3D Coverflow) */}
          <div className="bento-crop-workspace bento-crop-item">
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              className="relative h-[252px] w-[294px] sm:h-[288px] sm:w-[336px] cursor-grab active:cursor-grabbing overflow-hidden rounded-2xl border-4 border-[var(--brand,#494be7)] shadow-[0_15px_45px_-10px_rgba(73,75,231,0.4)] bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:12px_12px] flex items-center justify-center transition-all duration-300 hover:scale-[1.02]"
            >
              <canvas
                ref={canvasRef}
                className="pointer-events-none rounded-xl"
              />
              <div className="absolute inset-0 rounded-xl border-2 border-white/20 pointer-events-none shadow-inner" />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
                <Sparkles size={10} className="text-amber-400" />
                <span>Coverflow Display Frame</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 mt-3.5 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-xs text-xs font-semibold text-[var(--text-secondary)] animate-pulse">
              <Move size={12} className="text-[var(--brand,#494be7)]" />
              <span>{t('settings.dragInstruction', { defaultValue: 'Kéo thả để di chuyển vị trí ảnh' })}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="bento-crop-controls bento-crop-item">
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
                    <span>{t('settings.removingBg', { defaultValue: 'Đang tách nền…' })}</span>
                  </>
                ) : (
                  <>
                    <Scissors size={15} />
                    <span>Tách nền AI (Remove BG)</span>
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
                className="w-full text-center text-[var(--text-muted)] hover:text-[var(--text-primary)] underline text-xs transition-colors font-semibold"
              >
                {t('settings.reset', { defaultValue: 'Đặt lại ban đầu' })}
              </button>
            </div>

            <div className="bento-control-card flex flex-col justify-between space-y-4">
              {/* Zoom Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <ZoomIn size={13} className="text-[var(--brand,#494be7)]" />
                    <span>Thu phóng</span>
                  </span>
                  <span className="font-extrabold text-[var(--brand,#494be7)]">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <ZoomOut size={14} className="text-[var(--text-muted)] shrink-0" />
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.02"
                    value={zoom}
                    onChange={e => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-[var(--brand,#494be7)] cursor-pointer"
                  />
                  <ZoomIn size={14} className="text-[var(--text-muted)] shrink-0" />
                </div>
              </div>

              {/* Rotate Slider */}
              <div className="space-y-1 pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2 bento-crop-item">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-xs font-extrabold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            {t('settings.cancel', { defaultValue: 'Hủy' })}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="settings-submit-btn text-xs py-2.5 px-7 font-extrabold flex items-center gap-1.5"
          >
            <Check size={16} />
            <span>{t('settings.apply', { defaultValue: 'Áp dụng ảnh này' })}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
