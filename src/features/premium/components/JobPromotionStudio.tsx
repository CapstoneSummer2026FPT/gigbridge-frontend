import { useEffect, useMemo, useState } from 'react';
import { Crop, ImagePlus, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { jobAPI } from '../../../api/jobAPI';
import { JobPostStatus, type GetMyJobPostDto, type JobPostPromotionDto } from '../../../types/models/Job';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import { PromotedJobCard } from './PromotedJobCard';

const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 1500;

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
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
    if (!initialJob) void jobAPI.getMyJobPosts({ pageIndex: 1, pageSize: 100 }).then(response => {
      const openJobs = (response.data || []).filter(job => job.status === JobPostStatus.Open);
      setJobs(openJobs);
      setSelectedJobId(current => current || openJobs.find(job => !job.isFeatured)?.jobPostsId || openJobs[0]?.jobPostsId || '');
    });
  }, [initialJob]);

  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);

  useEffect(() => {
    const job = jobs.find(item => item.jobPostsId === selectedJobId);
    if (job) { setTitle(job.title); setDescription(job.description); }
  }, [jobs, selectedJobId]);

  const selectedJob = jobs.find(job => job.jobPostsId === selectedJobId) || initialJob;
  const activeJobs = jobs.filter(job => job.isFeatured);
  const previewCard = useMemo(() => ({
    id: 'preview',
    jobPostId: selectedJobId,
    imageUrl: sourceUrl,
    title: title || 'Your promotion title',
    description: description || 'Your promotion description will appear here.',
    featuredUntil: new Date(Date.now() + (policy?.durationDays || 7) * 86400000).toISOString(),
  }), [description, policy?.durationDays, selectedJobId, sourceUrl, title]);

  const selectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs.find(item => item.jobPostsId === jobId);
    if (job) { setTitle(job.title); setDescription(job.description); }
  };

  const chooseImage = (selected?: File) => {
    if (!selected) return;
    if (selected.size > 5 * 1024 * 1024) return toast.error('Promotion image must not exceed 5 MB.');
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setFile(selected);
    setSourceUrl(URL.createObjectURL(selected));
    setZoom(1); setCropX(50); setCropY(50);
  };

  const promote = async () => {
    if (!selectedJob || !file || !sourceUrl || !policy) return;
    setBusy(true);
    try {
      const croppedFile = await createCroppedFile(file, sourceUrl, zoom, cropX, cropY);
      const upload = await jobAPI.uploadJobPromotionImage(croppedFile);
      if (!upload.success || !upload.data) throw new Error(upload.message || 'Unable to upload the promotion image.');
      const response = await jobAPI.promoteJobPost(selectedJob.jobPostsId, {
        idempotencyKey: crypto.randomUUID(),
        imageUrl: upload.data,
        promotionTitle: title.trim(),
        promotionDescription: description.trim(),
      });
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to promote this job.');
      setJobs(current => current.map(job => job.jobPostsId === selectedJob.jobPostsId
        ? { ...job, isFeatured: true, featuredUntil: response.data!.featuredUntil } : job));
      window.dispatchEvent(new Event('gigbridge-wallet-updated'));
      toast.success(`Job promoted through ${new Date(response.data.featuredUntil).toLocaleDateString()}.`);
      onComplete?.(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to promote this job.');
    } finally { setBusy(false); }
  };

  const endPromotion = async (job: GetMyJobPostDto) => {
    if (!window.confirm('End this job promotion now? Spent GigCoin will not be refunded.')) return;
    setEndingJobId(job.jobPostsId);
    try {
      const response = await jobAPI.endJobPromotion(job.jobPostsId);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Unable to end this job promotion.');
      }
      setJobs(current => current.map(item => item.jobPostsId === job.jobPostsId
        ? { ...item, isFeatured: false, featuredUntil: response.data!.featuredUntil }
        : item));
      toast.success('Job promotion ended.');
      onDeactivated?.(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to end this job promotion.');
    } finally {
      setEndingJobId(undefined);
    }
  };

  return <div className="job-promotion-studio">
    {!selectedJob?.isFeatured && <section className="premium-card promotion-builder">
      <div className="premium-eyebrow"><Megaphone size={16} /> Job promotion studio</div>
      <h3>Design your promoted-job card</h3>
      {!initialJob && <label>Job<select className="premium-input" value={selectedJobId} onChange={event => selectJob(event.target.value)}><option value="">Select an open job</option>{jobs.map(job => <option key={job.jobPostsId} value={job.jobPostsId} disabled={job.isFeatured}>{job.title}{job.isFeatured ? ' — promotion active' : ''}</option>)}</select></label>}
      <label className="job-promotion-image-picker"><span>Card image</span><span><ImagePlus size={20} /> {file ? 'Choose another image' : 'Choose image'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => chooseImage(event.target.files?.[0])} /></label>
      {sourceUrl && <div className="job-crop-controls">
        <strong><Crop size={16} /> Crop and position</strong>
        <label>Zoom <input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label>
        <label>Horizontal position <input type="range" min="0" max="100" value={cropX} onChange={event => setCropX(Number(event.target.value))} /></label>
        <label>Vertical position <input type="range" min="0" max="100" value={cropY} onChange={event => setCropY(Number(event.target.value))} /></label>
      </div>}
      <label>Promotion title<input className="premium-input" maxLength={140} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>Promotion description<textarea className="premium-input" rows={4} maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} /></label>
      <div className="premium-row"><span>Promotion price</span>{policy ? <GigCoinAmount amount={policy.tokenCost} /> : <strong>Loading…</strong>}</div>
      <button className="premium-button" disabled={busy || !entitled || !policy || !selectedJob || selectedJob.isFeatured || !file || !title.trim() || !description.trim()} onClick={() => void promote()}>{busy ? 'Cropping and promoting…' : 'Activate promotion'}</button>
    </section>}
    {!selectedJob?.isFeatured && <div className="job-promotion-preview">
      {sourceUrl ? <PromotedJobCard card={previewCard} carouselCount={1} carouselIndex={0} preview imageStyle={{ transform: `scale(${zoom})`, transformOrigin: `${cropX}% ${cropY}%`, objectPosition: `${cropX}% ${cropY}%` }} /> : <div className="premium-card job-promotion-preview-empty"><ImagePlus size={32} /><strong>Your live preview appears here</strong><span>Choose an image to start designing the card.</span></div>}
    </div>}
    {(!initialJob || activeJobs.length > 0) && <section className="premium-card job-promotion-active"><h3>Ongoing promotions</h3>{activeJobs.length ? activeJobs.map(job => <div className="premium-row" key={job.jobPostsId}><div><strong>{job.title}</strong><div className="premium-muted">Featured until {job.featuredUntil ? new Date(job.featuredUntil).toLocaleDateString() : '—'}</div></div><div className="job-promotion-active-actions"><span className="promotion-status ongoing">Ongoing</span><button type="button" className="premium-button danger" disabled={Boolean(endingJobId)} onClick={() => void endPromotion(job)}>{endingJobId === job.jobPostsId ? 'Ending…' : 'End promotion now'}</button></div></div>) : <p className="premium-muted">No job promotion is currently running.</p>}</section>}
  </div>;
}
