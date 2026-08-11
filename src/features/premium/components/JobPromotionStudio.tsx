import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Crop, ImagePlus, Loader2, Megaphone, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { jobAPI } from '../../../api/jobAPI';
import { useTranslation } from '../../../hooks/useTranslation';
import { JobPostStatus, type GetMyJobPostDto, type JobPostPromotionDto } from '../../../types/models/Job';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import { PromotedJobCard } from './PromotedJobCard';
import { PromotionImageCropModal } from './PromotionImageCropModal';
import '../styles/client-pricing-screen.css';

const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 1500;

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected image could not be read.'));
    image.src = url;
  });

async function createCroppedFile(file: File, sourceUrl: string, zoom: number, x: number, y: number) {
  const image = await loadImage(sourceUrl);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image cropping is not supported in this browser.');

  const scale = Math.max(OUTPUT_WIDTH / image.naturalWidth, OUTPUT_HEIGHT / image.naturalHeight) * zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const offsetX = Math.max(0, drawWidth - OUTPUT_WIDTH) * (x / 100);
  const offsetY = Math.max(0, drawHeight - OUTPUT_HEIGHT) * (y / 100);
  context.drawImage(image, -offsetX, -offsetY, drawWidth, drawHeight);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('The cropped image could not be created.');
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-promotion.jpg`, { type: 'image/jpeg' });
}

export function JobPromotionStudio({
  entitled,
  initialJob,
  onComplete,
  onDeactivated,
}: {
  entitled: boolean;
  initialJob?: GetMyJobPostDto;
  onComplete?: (promotion: JobPostPromotionDto) => void;
  onDeactivated?: (promotion: JobPostPromotionDto) => void;
}) {
  const { t } = useTranslation('premium');
  const [jobs, setJobs] = useState<GetMyJobPostDto[]>(initialJob ? [initialJob] : []);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJob?.jobPostsId || '');
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const [title, setTitle] = useState(initialJob?.title || '');
  const [description, setDescription] = useState(initialJob?.description || '');

  // Crop & Remove BG Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

  const [policy, setPolicy] = useState<{ durationDays: number; tokenCost: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(!initialJob);
  const [endingJobId, setEndingJobId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoadingJobs(true);
        const policyRes = await jobAPI.getJobPromotionPolicy();
        if (policyRes.success && policyRes.data) {
          setPolicy({
            durationDays: policyRes.data.durationDays,
            tokenCost: policyRes.data.tokenCost,
          });
        }

        const myJobs = await jobAPI.getMyJobPosts({ pageIndex: 1, pageSize: 100 });
        if (myJobs.success && myJobs.data) {
          const jobsList: GetMyJobPostDto[] = Array.isArray(myJobs.data)
            ? myJobs.data
            : ((myJobs.data as unknown as { items?: GetMyJobPostDto[] }).items || []);

          const openJobs = jobsList.filter(
            job => Number(job.status) === Number(JobPostStatus.Open) || String(job.status).toLowerCase() === 'open' || Number(job.status) === 1
          );
          setJobs(openJobs);

          // EXCLUDE ALREADY FEATURED JOBS FROM DEFAULT SELECTION
          const unpromotedOpenJobs = openJobs.filter(job => !job.isFeatured);
          if (unpromotedOpenJobs.length > 0 && (!selectedJobId || openJobs.find(j => j.jobPostsId === selectedJobId)?.isFeatured)) {
            setSelectedJobId(unpromotedOpenJobs[0].jobPostsId);
            setTitle(unpromotedOpenJobs[0].title);
            setDescription(unpromotedOpenJobs[0].description);
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('jobPromotion.loadError', { defaultValue: 'Không thể tải dữ liệu quảng bá tin.' }));
      } finally {
        setLoadingJobs(false);
      }
    })();
  }, [selectedJobId, t]);

  useEffect(() => {
    if (!initialJob || jobs.length === 0) return;
    const job = jobs.find(item => item.jobPostsId === selectedJobId);
    if (job) {
      setTitle(job.title);
      setDescription(job.description);
    }
  }, [initialJob, jobs, selectedJobId]);

  const unpromotedJobs = useMemo(() => jobs.filter(job => !job.isFeatured), [jobs]);
  const activeJobs = useMemo(() => jobs.filter(job => job.isFeatured), [jobs]);
  const selectedJob = jobs.find(job => job.jobPostsId === selectedJobId) || initialJob;

  const previewCard = useMemo(
    () => ({
      id: 'preview',
      jobPostId: selectedJobId,
      imageUrl: sourceUrl,
      title: title || t('jobPromotion.defaultTitle', { defaultValue: 'Tiêu đề quảng bá dự án' }),
      description: description || t('jobPromotion.defaultDesc', { defaultValue: 'Mô tả ngắn dự án quảng bá sẽ hiển thị trực tiếp tại đây.' }),
      featuredUntil: new Date(Date.now() + (policy?.durationDays || 7) * 86400000).toISOString(),
    }),
    [description, policy?.durationDays, selectedJobId, sourceUrl, t, title]
  );

  const selectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs.find(item => item.jobPostsId === jobId);
    if (job) {
      setTitle(job.title);
      setDescription(job.description);
    }
  };

  const chooseImage = (selected?: File) => {
    if (!selected) return;
    if (selected.size > 5 * 1024 * 1024) return toast.error(t('jobPromotion.imageTooLarge', { defaultValue: 'Ảnh quảng bá không được vượt quá 5 MB.' }));
    const rawUrl = URL.createObjectURL(selected);
    setTempImageSrc(rawUrl);
    setIsCropModalOpen(true);
  };

  const handleCropSave = (_croppedBase64: string, processedFile: File) => {
    if (sourceUrl && sourceUrl.startsWith('blob:')) URL.revokeObjectURL(sourceUrl);
    setFile(processedFile);
    const newBlobUrl = URL.createObjectURL(processedFile);
    setSourceUrl(newBlobUrl);
    setZoom(1);
    setCropX(50);
    setCropY(50);
    toast.success(t('jobPromotion.cropSaveSuccess', { defaultValue: '✨ Đã lưu & cập nhật ảnh bài viết quảng bá thành công!' }));
  };

  const promote = async () => {
    if (!selectedJob || !file || !sourceUrl || !policy) return;
    setBusy(true);
    try {
      const croppedFile = await createCroppedFile(file, sourceUrl, zoom, cropX, cropY);
      const upload = await jobAPI.uploadJobPromotionImage(croppedFile);
      if (!upload.success || !upload.data) throw new Error(upload.message || t('jobPromotion.uploadError', { defaultValue: 'Không thể tải ảnh quảng bá lên.' }));
      const response = await jobAPI.promoteJobPost(selectedJob.jobPostsId, {
        idempotencyKey: crypto.randomUUID(),
        imageUrl: upload.data,
        promotionTitle: title.trim(),
        promotionDescription: description.trim(),
      });
      if (!response.success || !response.data) throw new Error(response.message || t('jobPromotion.promoteError', { defaultValue: 'Không thể kích hoạt quảng bá tin này.' }));

      setJobs(current =>
        current.map(job =>
          job.jobPostsId === selectedJob.jobPostsId
            ? { ...job, isFeatured: true, featuredUntil: response.data!.featuredUntil }
            : job
        )
      );
      window.dispatchEvent(new Event('gigbridge-wallet-updated'));
      toast.success(t('jobPromotion.promoteSuccess', { date: new Date(response.data.featuredUntil).toLocaleDateString('vi-VN'), defaultValue: `Đã kích hoạt quảng bá tin nổi bật.` }));
      onComplete?.(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('jobPromotion.promoteError', { defaultValue: 'Không thể kích hoạt quảng bá tin này.' }));
    } finally {
      setBusy(false);
    }
  };

  const endPromotion = async (job: GetMyJobPostDto) => {
    if (!window.confirm(t('jobPromotion.endConfirm', { defaultValue: 'Bạn có chắc chắn muốn dừng quảng bá tin này? Số GigCoin đã thanh toán sẽ không được hoàn lại.' }))) return;
    setEndingJobId(job.jobPostsId);
    try {
      const response = await jobAPI.endJobPromotion(job.jobPostsId);
      if (!response.success || !response.data) {
        throw new Error(response.message || t('jobPromotion.endError', { defaultValue: 'Không thể dừng quảng bá tin này.' }));
      }
      setJobs(current =>
        current.map(item =>
          item.jobPostsId === job.jobPostsId ? { ...item, isFeatured: false, featuredUntil: undefined } : item
        )
      );
      toast.success(t('jobPromotion.endSuccess', { defaultValue: 'Đã hủy quảng bá tin nổi bật.' }));
      onDeactivated?.(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('jobPromotion.endError', { defaultValue: 'Không thể dừng quảng bá tin này.' }));
    } finally {
      setEndingJobId(null);
    }
  };

  return (
    <div className="space-y-8">
      {!entitled && (
        <div style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sparkles size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cp-text)' }}>
            {t('jobPromotion.entitledNotice', { defaultValue: 'Tính năng Quảng bá Tin Nổi bật cần gói Client Premium đang hoạt động.' })}
          </span>
        </div>
      )}

      {loadingJobs ? (
        <div style={{ height: 280, borderRadius: 20, background: 'var(--card)', opacity: 0.5 }} />
      ) : unpromotedJobs.length === 0 && activeJobs.length === 0 ? (
        <div style={{ padding: 48, borderRadius: 24, background: 'var(--cp-card-bg)', border: '1px solid var(--cp-border)', textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--cp-muted)', margin: 0 }}>
            {t('jobPromotion.noJobs', { defaultValue: 'Bạn chưa có tin tuyển dụng nào chưa quảng bá. Tất cả công việc của bạn đều đã được quảng bá hoặc chưa được mở.' })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form & Image Controls */}
          <div className="lg:col-span-7 space-y-6">

            {/* Job Select Dropdown (Excludes Already Promoted Jobs) */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider color-[var(--cp-muted)]">
                {t('jobPromotion.step1', { defaultValue: '1. Chọn tin tuyển dụng chưa quảng bá' })}
              </label>
              <div className="relative">
                <select
                  value={selectedJobId}
                  onChange={event => selectJob(event.target.value)}
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 14,
                    border: '1px solid var(--cp-border)',
                    background: 'var(--cp-card-bg)',
                    padding: '0 40px 0 16px',
                    fontSize: 13,
                    fontWeight: 800,
                    color: 'var(--cp-text)',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  className="hover:border-[var(--cp-accent)] focus:border-[var(--cp-accent)] transition-all"
                >
                  <option value="">{t('jobPromotion.selectJobPlaceholder', { defaultValue: '-- Chọn tin đang tuyển dụng --' })}</option>
                  {unpromotedJobs.map(job => (
                    <option key={job.jobPostsId} value={job.jobPostsId}>
                      {job.title}
                    </option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--cp-muted)' }}>
                  <ChevronDown size={18} />
                </div>
              </div>
            </div>

            {/* Image Picker Dropzone & AI Edit Modal Trigger */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider color-[var(--cp-muted)]">
                {t('jobPromotion.step2', { defaultValue: '2. Ảnh bìa thẻ quảng bá (Tỷ lệ 2:3)' })}
              </label>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                <label className="group relative border-2 border-dashed border-[var(--cp-border)] hover:border-[var(--cp-accent)] bg-[var(--cp-card-bg)] hover:bg-[var(--cp-accent-dim)] rounded-2xl p-6 flex-1 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={event => chooseImage(event.target.files?.[0])}
                  />
                  <div className="h-12 w-12 rounded-xl bg-[var(--cp-accent-dim)] text-[var(--cp-accent)] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <ImagePlus size={24} />
                  </div>
                  <span className="text-xs font-black color-[var(--cp-text)]">
                    {file ? file.name : t('jobPromotion.uploadNewCover', { defaultValue: 'Tải lên ảnh bìa mới' })}
                  </span>
                  <span className="text-[11px] font-semibold color-[var(--cp-muted)] mt-1">
                    {t('jobPromotion.imageFormatsHint', { defaultValue: 'Định dạng JPG, PNG, WEBP (Tối đa 5MB)' })}
                  </span>
                </label>

                {sourceUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempImageSrc(sourceUrl);
                      setIsCropModalOpen(true);
                    }}
                    className="cp-btn ghost flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-black text-xs transition cursor-pointer"
                  >
                    <Wand2 size={22} className="text-indigo-400" />
                    <span>✨ {t('jobPromotion.editAndRemoveBg', { defaultValue: 'Chỉnh Sửa & Tách Nền AI' })}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Crop & Position Fine-Tuning */}
            {sourceUrl && (
              <div style={{ padding: 20, borderRadius: 16, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider color-[var(--cp-accent)]">
                  <Crop size={16} /> {t('jobPromotion.fineTuneTitle', { defaultValue: 'Fine-tune vị trí hiển thị trên thẻ Live' })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold color-[var(--cp-muted)]">
                  <div className="space-y-1">
                    <span>{t('jobPromotion.zoom', { defaultValue: 'Phóng to' })}: {zoom.toFixed(2)}x</span>
                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.05"
                      value={zoom}
                      onChange={event => setZoom(Number(event.target.value))}
                      className="w-full accent-[#6366f1] cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <span>{t('jobPromotion.cropX', { defaultValue: 'Ngang' })}: {cropX}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={cropX}
                      onChange={event => setCropX(Number(event.target.value))}
                      className="w-full accent-[#6366f1] cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <span>{t('jobPromotion.cropY', { defaultValue: 'Dọc' })}: {cropY}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={cropY}
                      onChange={event => setCropY(Number(event.target.value))}
                      className="w-full accent-[#6366f1] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Title & Description Inputs */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black uppercase tracking-wider color-[var(--cp-muted)]">
                <label htmlFor="promo-title">{t('jobPromotion.step3', { defaultValue: '3. Tiêu đề thẻ quảng bá' })}</label>
                <span>{title.length}/140</span>
              </div>
              <input
                id="promo-title"
                type="text"
                maxLength={140}
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder={t('jobPromotion.titlePlaceholder', { defaultValue: 'Nhập tiêu đề quảng bá thu hút ứng viên...' })}
                style={{
                  width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--cp-border)',
                  background: 'var(--cp-card-bg)', padding: '0 16px', fontSize: 13, fontWeight: 700,
                  color: 'var(--cp-text)', outline: 'none'
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black uppercase tracking-wider color-[var(--cp-muted)]">
                <label htmlFor="promo-desc">{t('jobPromotion.step4', { defaultValue: '4. Mô tả ngắn điểm nổi bật' })}</label>
                <span>{description.length}/1000</span>
              </div>
              <textarea
                id="promo-desc"
                rows={3}
                maxLength={1000}
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder={t('jobPromotion.descPlaceholder', { defaultValue: 'Nhập mô tả điểm nổi bật của dự án...' })}
                style={{
                  width: '100%', borderRadius: 12, border: '1px solid var(--cp-border)',
                  background: 'var(--cp-card-bg)', padding: 14, fontSize: 13, fontWeight: 700,
                  color: 'var(--cp-text)', outline: 'none', resize: 'none'
                }}
              />
            </div>

            {/* Pricing Banner & CTA Button */}
            <div style={{ padding: 20, borderRadius: 16, background: 'var(--cp-card-bg)', border: '1px solid var(--cp-border)' }} className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="color-[var(--cp-muted)]">
                  {t('jobPromotion.serviceFeeLabel', { days: policy?.durationDays || 7, defaultValue: `Phí dịch vụ quảng bá (${policy?.durationDays || 7} ngày):` })}
                </span>
                <div className="flex items-center gap-1.5 text-base font-black text-amber-500">
                  {policy ? <GigCoinAmount amount={policy.tokenCost} /> : <span>{t('common.loading', { defaultValue: 'Đang tải...' })}</span>}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void promote()}
                disabled={busy || !entitled || !policy || !selectedJob || selectedJob.isFeatured || !file || !title.trim() || !description.trim()}
                className="cp-btn large"
                style={{ width: '100%' }}
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t('jobPromotion.activating', { defaultValue: 'Đang xử lý ảnh & kích hoạt...' })}
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    {t('jobPromotion.activateBtn', { defaultValue: 'Kích Hoạt Quảng Bá Nổi Bật Tức Thì' })}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live Promoted Card Preview (Exact 320px Feed Container) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-3">
            <span className="block text-xs font-black uppercase tracking-wider color-[var(--cp-muted)] text-center">
              {t('jobPromotion.livePreviewHeader', { defaultValue: 'Xem Trước Thẻ Quảng Báo Live (1:1 Feed)' })}
            </span>
            <div className="w-full max-w-[320px] mx-auto flex justify-center">
              {sourceUrl ? (
                <PromotedJobCard
                  card={previewCard}
                  carouselCount={1}
                  carouselIndex={0}
                  preview
                  imageStyle={{
                    transform: `scale(${zoom})`,
                    transformOrigin: `${cropX}% ${cropY}%`,
                    objectPosition: `${cropX}% ${cropY}%`,
                  }}
                />
              ) : (
                <div className="w-full max-w-[320px] aspect-[2/3] min-h-[380px] rounded-3xl border-2 border-dashed border-[var(--cp-border)] bg-[var(--cp-card-bg)] p-8 flex flex-col items-center justify-center text-center space-y-3 color-[var(--cp-muted)]">
                  <ImagePlus size={40} className="opacity-40" />
                  <p className="font-black text-xs color-[var(--cp-text)]">{t('jobPromotion.previewCardTitle', { defaultValue: 'Thẻ xem trước thực tế' })}</p>
                  <p className="text-[11px] font-medium">{t('jobPromotion.previewCardHint', { defaultValue: 'Tải ảnh bìa ở cột bên trái để thiết kế và xem trước thẻ quảng bá live tại đây.' })}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ongoing Active Promotions List */}
      {(!initialJob || activeJobs.length > 0) && (
        <div style={{ padding: 24, borderRadius: 20, background: 'var(--cp-card-bg)', border: '1px solid var(--cp-border)' }} className="space-y-4">
          <h3 className="text-sm font-black color-[var(--cp-text)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--cp-border)] pb-3">
            <Megaphone size={16} className="text-amber-500" />
            {t('jobPromotion.activePromotionsHeader', { defaultValue: 'Các Tin Đăng Đang Quảng Bá Nổi Bật' })}
          </h3>

          <div className="space-y-3">
            {activeJobs.length > 0 ? (
              activeJobs.map(job => (
                <div
                  key={job.jobPostsId}
                  style={{ padding: 16, borderRadius: 14, background: 'rgba(99,102,241,0.04)', border: '1px solid var(--cp-border)' }}
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <strong className="text-xs font-black color-[var(--cp-text)]">{job.title}</strong>
                    <div className="text-[11px] font-bold text-amber-500">
                      {t('jobPromotion.featuredUntilDate', { date: job.featuredUntil ? new Date(job.featuredUntil).toLocaleDateString('vi-VN') : '—', defaultValue: `Nổi bật đến ngày ${job.featuredUntil ? new Date(job.featuredUntil).toLocaleDateString('vi-VN') : '—'}` })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
                      {t('jobPromotion.promotingStatus', { defaultValue: 'Đang Quảng Bá' })}
                    </span>
                    <button
                      type="button"
                      disabled={Boolean(endingJobId)}
                      onClick={() => void endPromotion(job)}
                      className="cp-btn ghost"
                      style={{ padding: '6px 12px', fontSize: 11, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                    >
                      {endingJobId === job.jobPostsId ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      {t('jobPromotion.endBtn', { defaultValue: 'Dừng Quảng Bá' })}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs font-bold color-[var(--cp-muted)] text-center py-4">
                {t('jobPromotion.noActivePromotions', { defaultValue: 'Chưa có tin tuyển dụng nào đang được quảng bá.' })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* PROMOTION IMAGE CROP & REMOVE BG MODAL */}
      <PromotionImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={tempImageSrc}
        onClose={() => setIsCropModalOpen(false)}
        onCropSave={handleCropSave}
      />
    </div>
  );
}
