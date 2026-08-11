import { useState, useRef, useEffect, useCallback, type MouseEvent, type ChangeEvent } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Move, RefreshCw, AlertCircle, Image as ImageIcon, Sparkles, Sliders, Palette, CheckCircle2 } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useTranslation } from '../../../hooks/useTranslation';
import { removeBackground } from '../../../services/removeBgService';
import '../styles/client-pricing-screen.css';

interface PromotionImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropSave: (croppedImageBase64: string, file: File) => void;
}

interface BgOption {
  id: string;
  nameKey: string;
  defaultName: string;
  type: 'none' | 'gradient';
  gradientColors?: [string, string];
}

const PRESET_BACKGROUNDS: BgOption[] = [
  {
    id: 'none',
    nameKey: 'promotionCropModal.bgNone',
    defaultName: 'Không nền',
    type: 'none',
  },
  {
    id: 'midnight',
    nameKey: 'promotionCropModal.bgMidnight',
    defaultName: 'Midnight',
    type: 'gradient',
    gradientColors: ['#09090b', '#18181b'],
  },
  {
    id: 'indigo',
    nameKey: 'promotionCropModal.bgIndigo',
    defaultName: 'Cyber Indigo',
    type: 'gradient',
    gradientColors: ['#4f46e5', '#1e1b4b'],
  },
  {
    id: 'sunset',
    nameKey: 'promotionCropModal.bgSunset',
    defaultName: 'Sunset Studio',
    type: 'gradient',
    gradientColors: ['#f43f5e', '#881337'],
  },
  {
    id: 'emerald',
    nameKey: 'promotionCropModal.bgEmerald',
    defaultName: 'Emerald Glass',
    type: 'gradient',
    gradientColors: ['#059669', '#064e3b'],
  },
  {
    id: 'gold',
    nameKey: 'promotionCropModal.bgGold',
    defaultName: 'Golden Luxury',
    type: 'gradient',
    gradientColors: ['#d97706', '#78350f'],
  },
  {
    id: 'ocean',
    nameKey: 'promotionCropModal.bgOcean',
    defaultName: 'Deep Ocean',
    type: 'gradient',
    gradientColors: ['#0284c7', '#0c4a6e'],
  },
];

export function PromotionImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropSave,
}: PromotionImageCropModalProps) {
  const { t } = useTranslation('premium');
  const modalRef = useRef<HTMLDivElement>(null);
  const snapIconRef = useRef<SVGSVGElement>(null);

  const [activeTab, setActiveTab] = useState<'adjust' | 'background'>('adjust');
  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(imageSrc);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedBgId, setSelectedBgId] = useState<string>('none');
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
          '.cp-modal-card',
          { opacity: 0, scale: 0.94, y: 30 },
          { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power3.out' }
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
    setSelectedBgId('none');
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

  const selectedBg = PRESET_BACKGROUNDS.find(bg => bg.id === selectedBgId) || PRESET_BACKGROUNDS[0];

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 280;
    const height = 420; // 2:3 ratio
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Draw background category gradient if selected
    if (selectedBg.type === 'gradient' && selectedBg.gradientColors) {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, selectedBg.gradientColors[0]);
      grad.addColorStop(1, selectedBg.gradientColors[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(position.x, position.y);

    const aspect = img.width / img.height;
    const targetAspect = 2 / 3;

    let drawWidth = width;
    let drawHeight = height;

    if (aspect > targetAspect) {
      drawWidth = height * aspect;
      drawHeight = height;
    } else {
      drawWidth = width;
      drawHeight = width / aspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }, [zoom, rotation, position, selectedBg]);

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
      setRemoveBgError(error instanceof Error ? error.message : t('promotionCropModal.removeBgError', { defaultValue: 'Tách nền bằng AI thất bại.' }));
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
          gsap.fromTo(snapIconRef.current, { scale: 1.4, rotate: -15 }, { scale: 1, rotate: 0, duration: 0.3, ease: 'back.out(2)' });
        }
        break;
      }
    }

    setRotation(finalVal);
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setSelectedBgId('none');
    setCurrentImageSrc(imageSrc);
    setRemoveBgSuccess(false);
    setRemoveBgError(null);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mimeType = selectedBg.id !== 'none' || removeBgSuccess ? 'image/png' : 'image/jpeg';
    const croppedBase64 = canvas.toDataURL(mimeType, 0.92);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `promo-${Date.now()}.${mimeType === 'image/png' ? 'png' : 'jpg'}`, { type: mimeType });
        onCropSave(croppedBase64, file);
        onClose();
      }
    }, mimeType, 0.92);
  };

  if (!isOpen || !currentImageSrc) return null;

  return (
    <div ref={modalRef} className="cp-modal-overlay" onClick={onClose}>
      <div
        className="cp-modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(860px, 95vw)',
          padding: 28,
          borderRadius: 24,
          background: 'var(--cp-card-bg)',
          border: '1px solid var(--cp-border)',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}
      >
        {/* Header (Full Width) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--cp-border)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="cp-card-icon">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--cp-text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{t('promotionCropModal.title', { defaultValue: 'Chỉnh Sửa & Tách Nền AI' })}</span>
                <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 999, background: 'var(--cp-accent-dim)', color: 'var(--cp-accent)', textTransform: 'uppercase' }}>
                  {t('promotionCropModal.aspectRatio', { defaultValue: 'Tỷ lệ 2:3' })}
                </span>
              </h3>
              <p style={{ fontSize: 12, color: 'var(--cp-muted)', margin: '2px 0 0' }}>
                {t('promotionCropModal.subtitle', { defaultValue: 'Tùy chỉnh vị trí, xoay góc, tách nền AI và ghép phông nền chuyên nghiệp cho bài đăng.' })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 0, color: 'var(--cp-muted)', cursor: 'pointer', padding: 6, borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Remove BG Alerts */}
        {removeBgSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, padding: '12px 16px', borderRadius: 14, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}>
            <Check size={16} />
            <span>{t('promotionCropModal.removeBgSuccess', { defaultValue: '✨ Đã tách nền bằng AI Remove.bg thành công!' })}</span>
          </div>
        )}

        {removeBgError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, padding: '12px 16px', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
            <AlertCircle size={16} />
            <span>{removeBgError}</span>
          </div>
        )}

        {/* Horizontal 2-Column Grid Body */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 280px', gap: 24, alignItems: 'start' }}>

          {/* LEFT COLUMN: 2 Tabs Navigation & Tab Panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Tab Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 4, borderRadius: 14, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--cp-border)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('adjust')}
                style={{
                  padding: '8px 14px', borderRadius: 10, border: 0, fontSize: 12, fontWeight: 900,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: activeTab === 'adjust' ? 'var(--cp-accent)' : 'transparent',
                  color: activeTab === 'adjust' ? '#ffffff' : 'var(--cp-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Sliders size={14} /> {t('promotionCropModal.adjustTab', { defaultValue: 'Tùy Chỉnh' })}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('background')}
                style={{
                  padding: '8px 14px', borderRadius: 10, border: 0, fontSize: 12, fontWeight: 900,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: activeTab === 'background' ? 'var(--cp-accent)' : 'transparent',
                  color: activeTab === 'background' ? '#ffffff' : 'var(--cp-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Palette size={14} /> {t('promotionCropModal.bgCategoryTab', { defaultValue: 'Background Category' })}
              </button>
            </div>

            {/* TAB 1: TÙY CHỈNH (Adjust) */}
            {activeTab === 'adjust' && (
              <div style={{ padding: 20, borderRadius: 20, background: 'var(--cp-card-bg)', border: '1px solid var(--cp-border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* AI Remove BG Button */}
                <button
                  type="button"
                  onClick={() => void handleRemoveBg()}
                  disabled={isRemovingBg}
                  className="cp-btn"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {isRemovingBg ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      {t('promotionCropModal.processingRemoveBg', { defaultValue: 'Processing Remove Background...' })}
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>{t('promotionCropModal.removeBgBtn', { defaultValue: 'Remove Background' })}</span>
                    </>
                  )}
                </button>

                {/* Zoom Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 12, borderTop: '1px solid var(--cp-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: 'var(--cp-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ZoomIn size={14} style={{ color: 'var(--cp-accent)' }} /> {t('promotionCropModal.zoom', { defaultValue: 'Thu phóng' })}
                    </span>
                    <span style={{ fontWeight: 900, color: 'var(--cp-accent)' }}>{Math.round(zoom * 100)}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ZoomOut size={14} style={{ color: 'var(--cp-muted)' }} />
                    <input
                      type="range"
                      min="0.8"
                      max="3"
                      step="0.05"
                      value={zoom}
                      onChange={e => setZoom(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--cp-accent)', cursor: 'pointer' }}
                    />
                    <ZoomIn size={14} style={{ color: 'var(--cp-muted)' }} />
                  </div>
                </div>

                {/* Rotate Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 12, borderTop: '1px solid var(--cp-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: 'var(--cp-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <RotateCw ref={snapIconRef} size={14} style={{ color: 'var(--cp-accent)' }} /> {t('promotionCropModal.rotate', { defaultValue: 'Xoay góc' })}
                    </span>
                    <span style={{ fontWeight: 900, color: 'var(--cp-accent)' }}>{Math.round(rotation)}°</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={rotation}
                      onChange={handleRotateSliderChange}
                      style={{ width: '100%', accentColor: 'var(--cp-accent)', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                {/* Reset Button */}
                <button
                  type="button"
                  onClick={handleReset}
                  style={{ background: 'transparent', border: 0, color: 'var(--cp-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 700, textDecoration: 'underline', textAlign: 'center', margin: '2px 0 0' }}
                >
                  {t('promotionCropModal.reset', { defaultValue: 'Đặt lại vị trí & ảnh ban đầu' })}
                </button>
              </div>
            )}

            {/* TAB 2: BACKGROUND CATEGORY (6 Presets + 1 No BG) */}
            {activeTab === 'background' && (
              <div style={{ padding: 20, borderRadius: 20, background: 'var(--cp-card-bg)', border: '1px solid var(--cp-border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--cp-muted)' }}>
                  {t('promotionCropModal.selectBgInstruction', { defaultValue: 'Chọn phông nền thiết kế bài đăng:' })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10 }}>
                  {PRESET_BACKGROUNDS.map(bg => {
                    const isSelected = bg.id === selectedBgId;
                    const bgName = t(bg.nameKey, { defaultValue: bg.defaultName });
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setSelectedBgId(bg.id)}
                        style={{
                          height: 72,
                          borderRadius: 14,
                          border: isSelected ? '2px solid var(--cp-accent)' : '1px solid var(--cp-border)',
                          padding: 8,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                          background: 'var(--cp-card-bg)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: 36,
                            borderRadius: 8,
                            background: bg.type === 'gradient' && bg.gradientColors
                              ? `linear-gradient(135deg, ${bg.gradientColors[0]}, ${bg.gradientColors[1]})`
                              : 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 12px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {isSelected && <CheckCircle2 size={16} style={{ color: '#ffffff' }} />}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: isSelected ? 'var(--cp-accent)' : 'var(--cp-text)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                          {bgName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Canvas Live Interactive Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                position: 'relative',
                width: 280,
                height: 420,
                overflow: 'hidden',
                borderRadius: 20,
                border: '2px solid var(--cp-accent)',
                background: 'var(--cp-card-bg)',
                cursor: isDragging ? 'grabbing' : 'grab',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <canvas ref={canvasRef} style={{ pointerEvents: 'none', display: 'block' }} />
              {/* FIXED CONTRAST OVERLAY TEXT BADGE */}
              <div style={{ position: 'absolute', top: 12, right: 12, pointerEvents: 'none', background: 'rgba(0, 0, 0, 0.78)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.25)', padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                <Move size={12} style={{ color: '#ffffff' }} /> {t('promotionCropModal.dragInstruction', { defaultValue: 'Kéo để di chuyển' })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions (Full Width) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--cp-border)', paddingTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            className="cp-btn ghost"
          >
            {t('common.cancel', { defaultValue: 'Hủy' })}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="cp-btn"
          >
            <Check size={16} /> {t('promotionCropModal.apply', { defaultValue: 'Áp Dụng & Lưu Ảnh Này' })}
          </button>
        </div>
      </div>
    </div>
  );
}
