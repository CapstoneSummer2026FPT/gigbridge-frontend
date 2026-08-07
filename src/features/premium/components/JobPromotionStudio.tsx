import { useEffect, useMemo, useState } from 'react';
import { Crop, ImagePlus, Loader2, Megaphone, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { jobAPI } from '../../../api/jobAPI';
import { JobPostStatus, type GetMyJobPostDto, type JobPostPromotionDto } from '../../../types/models/Job';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import { PromotedJobCard } from './PromotedJobCard';

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
  const [jobs, setJobs] = useState<GetMyJobPostDto[]>(initialJob ? [initialJob] : []);
  const [selectedJobId, setSelectedJobId] = useState(initialJob?.jobPostsId || '');
  const [policy, setPolicy] = useState<{ tokenCost: number; durationDays: number }>();
  const [file, setFile] = useState<File>();
  const [sourceUrl, setSourceUrl] = useState('');
  const [zoom, setZoom] = useState(1);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const [title, setTitle] = useState(initialJob?.title || '');
  const [description, setDescription] = useState(initialJob?.description || '');
  const [busy, setBusy] = useState(false);
  const [endingJobId, setEndingJobId] = useState<string>();

  useEffect(() => {
    void jobAPI.getJobPromotionPolicy().then(response => response.data && setPolicy(response.data));
    if (!initialJob) {
      void jobAPI.getMyJobPosts({ pageIndex: 1, pageSize: 100 }).then(response => {
        const openJobs = (response.data || []).filter(job => job.status === JobPostStatus.Open);
        setJobs(openJobs);
        setSelectedJobId(current => current || openJobs.find(job => !job.isFeatured)?.jobPostsId || openJobs[0]?.jobPostsId || '');
      });
    }
  }, [initialJob]);

  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);

  useEffect(() => {
    const job = jobs.find(item => item.jobPostsId === selectedJobId);
    if (job) {
      setTitle(job.title);
      setDescription(job.description);
    }
  }, [jobs, selectedJobId]);

  const selectedJob = jobs.find(job => job.jobPostsId === selectedJobId) || initialJob;
  const activeJobs = jobs.filter(job => job.isFeatured);

  const previewCard = useMemo(
    () => ({
      id: 'preview',
      jobPostId: selectedJobId,
      imageUrl: sourceUrl,
      title: title || 'Tiêu đề quảng bá dự án',
      description: description || 'Mô tả ngắn dự án quảng bá sẽ hiển thị trực tiếp tại đây.',
      featuredUntil: new Date(Date.now() + (policy?.durationDays || 7) * 86400000).toISOString(),
    }),
    [description, policy?.durationDays, selectedJobId, sourceUrl, title]
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
    if (selected.size > 5 * 1024 * 1024) return toast.error('Ảnh quảng bá không được vượt quá 5 MB.');
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setFile(selected);
    setSourceUrl(URL.createObjectURL(selected));
    setZoom(1);
    setCropX(50);
    setCropY(50);
  };

  const promote = async () => {
    if (!selectedJob || !file || !sourceUrl || !policy) return;
    setBusy(true);
    try {
      const croppedFile = await createCroppedFile(file, sourceUrl, zoom, cropX, cropY);
      const upload = await jobAPI.uploadJobPromotionImage(croppedFile);
      if (!upload.success || !upload.data) throw new Error(upload.message || 'Không thể tải ảnh quảng bá lên.');
      const response = await jobAPI.promoteJobPost(selectedJob.jobPostsId, {
        idempotencyKey: crypto.randomUUID(),
        imageUrl: upload.data,
        promotionTitle: title.trim(),
        promotionDescription: description.trim(),
      });
      if (!response.success || !response.data) throw new Error(response.message || 'Không thể kích hoạt quảng bá tin này.');

      setJobs(current =>
        current.map(job =>
          job.jobPostsId === selectedJob.jobPostsId
            ? { ...job, isFeatured: true, featuredUntil: response.data!.featuredUntil }
            : job
        )
      );
      window.dispatchEvent(new Event('gigbridge-wallet-updated'));
      toast.success(`Đã kích hoạt quảng bá tin nổi bật đến ${new Date(response.data.featuredUntil).toLocaleDateString('vi-VN')}.`);
      onComplete?.(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể kích hoạt quảng bá tin này.');
    } finally {
      setBusy(false);
    }
  };

  const endPromotion = async (job: GetMyJobPostDto) => {
    if (!window.confirm('Bạn có chắc chắn muốn dừng quảng bá tin này? Số GigCoin đã thanh toán sẽ không được hoàn lại.')) return;
    setEndingJobId(job.jobPostsId);
    try {
      const response = await jobAPI.endJobPromotion(job.jobPostsId);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể dừng quảng bá tin này.');
      }
      setJobs(current =>
        current.map(item =>
          item.jobPostsId === job.jobPostsId
            ? { ...item, isFeatured: false, featuredUntil: response.data!.featuredUntil }
            : item
        )
      );
      toast.success('Đã dừng quảng bá tin tuyển dụng.');
      onDeactivated?.(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể dừng quảng bá tin này.');
    } finally {
      setEndingJobId(undefined);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Studio Header */}
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
          <Megaphone size={20} />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-500">
            <Sparkles size={12} /> Job Promotion Studio
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
            Thiết Kế Thẻ Quảng Bá Tin Tuyển Dụng Nổi Bật
          </h2>
        </div>
      </div>

      {!selectedJob?.isFeatured && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form & Image Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {!initialJob && (
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                  Chọn tin tuyển dụng quảng bá
                </label>
                <select
                  value={selectedJobId}
                  onChange={event => selectJob(event.target.value)}
                  className="w-full h-11 rounded-2xl border border-border/80 bg-surface-muted/40 px-4 text-xs font-bold text-text-primary outline-none transition focus:border-brand"
                >
                  <option value="">-- Chọn tin đang tuyển dụng --</option>
                  {jobs.map(job => (
                    <option key={job.jobPostsId} value={job.jobPostsId} disabled={job.isFeatured}>
                      {job.title} {job.isFeatured ? ' — (Đang quảng bá)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Image Picker Dropzone */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                Ảnh bìa thẻ quảng bá (Khuyên dùng tỉ lệ 2:3 hoặc dọc)
              </label>
              <label className="group relative border-2 border-dashed border-border hover:border-amber-500/50 bg-surface-muted/30 hover:bg-amber-500/5 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={event => chooseImage(event.target.files?.[0])}
                />
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <ImagePlus size={24} />
                </div>
                <span className="text-xs font-black text-text-primary">
                  {file ? file.name : 'Tải lên ảnh bài viết quảng bá'}
                </span>
                <span className="text-[11px] font-semibold text-text-muted mt-1">
                  Định dạng JPG, PNG, WEBP (Tối đa 5MB)
                </span>
              </label>
            </div>

            {/* Crop & Scale Controls Panel */}
            {sourceUrl && (
              <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  <Crop size={16} /> Cắt & Căn Chỉnh Vị Trí Ảnh
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold text-text-muted">
                  <div className="space-y-1">
                    <span>Phóng to (Zoom): {zoom.toFixed(2)}x</span>
                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.05"
                      value={zoom}
                      onChange={event => setZoom(Number(event.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <span>Vị trí ngang: {cropX}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={cropX}
                      onChange={event => setCropX(Number(event.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <span>Vị trí dọc: {cropY}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={cropY}
                      onChange={event => setCropY(Number(event.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Title & Description Inputs */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black uppercase tracking-wider text-text-muted">
                <label htmlFor="promo-title">Tiêu đề thẻ quảng bá</label>
                <span>{title.length}/140</span>
              </div>
              <input
                id="promo-title"
                type="text"
                maxLength={140}
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="Nhập tiêu đề quảng bá thu hút ứng viên..."
                className="w-full h-11 rounded-2xl border border-border/80 bg-surface-muted/40 px-4 text-xs font-bold text-text-primary outline-none transition focus:border-amber-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black uppercase tracking-wider text-text-muted">
                <label htmlFor="promo-desc">Mô tả ngắn quảng bá</label>
                <span>{description.length}/1000</span>
              </div>
              <textarea
                id="promo-desc"
                rows={3}
                maxLength={1000}
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="Nhập mô tả điểm nổi bật của dự án..."
                className="w-full rounded-2xl border border-border/80 bg-surface-muted/40 p-4 text-xs font-bold text-text-primary outline-none transition focus:border-amber-500 resize-none"
              />
            </div>

            {/* Pricing Banner & CTA Button */}
            <div className="rounded-3xl border border-border/80 bg-surface-card p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-text-muted">Phí dịch vụ quảng bá ({policy?.durationDays || 7} ngày):</span>
                <div className="flex items-center gap-1.5 text-base font-black text-amber-500">
                  {policy ? <GigCoinAmount amount={policy.tokenCost} /> : <span>Đang tải...</span>}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void promote()}
                disabled={busy || !entitled || !policy || !selectedJob || selectedJob.isFeatured || !file || !title.trim() || !description.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 px-5 text-xs font-black text-white shadow-lg hover:from-amber-600 hover:to-amber-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang xử lý ảnh & kích hoạt...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Kích Hoạt Quảng Bá Nổi Bật Tức Thì
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live Promoted Card Preview (5 cols Sticky) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-3">
            <span className="block text-xs font-black uppercase tracking-wider text-text-muted text-center">
              Xem Trước Thẻ Quảng Báo Live
            </span>
            <div className="flex justify-center">
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
                <div className="w-full max-w-[320px] aspect-[2/3] rounded-3xl border-2 border-dashed border-border/80 bg-surface-muted/30 p-8 flex flex-col items-center justify-center text-center space-y-3 text-text-muted">
                  <ImagePlus size={40} className="text-text-muted/40" />
                  <p className="font-black text-text-primary text-xs">Thẻ xem trước thực tế</p>
                  <p className="text-[11px] font-medium">Tải ảnh bìa ở cột bên trái để thiết kế và xem trước thẻ quảng bá live tại đây.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ongoing Active Promotions List */}
      {(!initialJob || activeJobs.length > 0) && (
        <div className="rounded-3xl border border-border/80 bg-surface-card p-6 shadow-md space-y-4">
          <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border/60 pb-3">
            <Megaphone size={16} className="text-amber-500" />
            Các Tin Đăng Đang Quảng Bá Nổi Bật
          </h3>

          <div className="space-y-3">
            {activeJobs.length > 0 ? (
              activeJobs.map(job => (
                <div
                  key={job.jobPostsId}
                  className="rounded-2xl border border-border/80 bg-surface-muted/40 p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <strong className="text-xs font-black text-text-primary">{job.title}</strong>
                    <div className="text-[11px] font-bold text-amber-500">
                      Nổi bật đến ngày {job.featuredUntil ? new Date(job.featuredUntil).toLocaleDateString('vi-VN') : '—'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                      Đang Quảng Bá
                    </span>
                    <button
                      type="button"
                      disabled={Boolean(endingJobId)}
                      onClick={() => void endPromotion(job)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs font-bold hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-50"
                    >
                      {endingJobId === job.jobPostsId ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Dừng Quảng Bá
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs font-bold text-text-muted text-center py-4">Chưa có tin tuyển dụng nào đang được quảng bá.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
