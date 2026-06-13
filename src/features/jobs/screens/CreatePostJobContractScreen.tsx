import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { 
  ShieldCheck, PenTool, Trash, Check, ChevronLeft, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../styles/PostJobScreen.css';

export default function CreatePostJobContractScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  const jobData = location.state?.jobData;
  const jobPostId = location.state?.jobPostId;

  useEffect(() => {
    if (!jobData || !jobPostId) {
      toast.error('Created JobPost data is missing. Redirecting to Job Creation step.');
      navigate('/jobs/post');
    }
  }, [jobData, jobPostId, navigate]);

  const [contractForm, setContractForm] = useState({
    title: jobData?.title ? `${jobData.title} Contract` : '',
    description: jobData?.description || '',
    budget: jobData?.budgetMin !== undefined ? String(jobData.budgetMin) : '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: jobData?.deadline || '',
  });

  const [policies, setPolicies] = useState({
    accuracy: false,
    escrow: false,
    conduct: false,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = 192;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#1782fc'; // GB primary blue/cyan
      }
    }
  }, []);

  // Prevent scrolling on mobile while signing
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (e.target === canvasRef.current) {
        e.preventDefault();
      }
    };
    document.body.addEventListener('touchstart', preventDefault, { passive: false });
    document.body.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      document.body.removeEventListener('touchstart', preventDefault);
      document.body.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setIsSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsSigned(false);
  };

  const handleBack = () => {
    navigate('/jobs/post', { state: { jobData } });
  };

  const handleSubmit = async () => {
    if (!contractForm.title || !contractForm.budget || !contractForm.endDate) {
      alert('Please fill in all contract details (Title, Budget, End Date)');
      return;
    }

    if (!policies.accuracy || !policies.escrow || !policies.conduct) {
      alert('Please agree to all contract policies before finalizing.');
      return;
    }

    if (!isSigned) {
      alert('Please sign the contract before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Contract setup confirmed for JobPost:', jobPostId, contractForm);
      toast.success('Contract setup confirmed for the created JobPost.');
      setIsSubmitting(false);
      navigate('/jobs/my-jobs');
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
      alert('Failed to confirm contract setup. Please try again.');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto px-6 py-8 relative">
        {/* Background Mesh Gradient (Subtle) */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.02),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.02),transparent_50%)] opacity-50 pointer-events-none" />

        {/* Header & Stepper */}
        <div className="flex flex-col gap-6 items-center mb-8">
          <div className="flex justify-center w-full">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground text-center uppercase" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", letterSpacing: '0.05em' }}>
              Create New Contract
            </h1>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center w-full max-w-3xl mx-auto py-4">
            {/* Step 1: Completed */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={handleBack}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md font-bold text-sm bg-green-500 text-white hover:bg-green-600 transition-colors">
                <Check size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-green-500 uppercase tracking-wider font-bold">Step 1</span>
                <span className="text-xs font-bold text-green-500 group-hover:underline">Project Details</span>
              </div>
            </div>
            {/* Connector */}
            <div className="flex-grow mx-6 h-[2px] bg-green-500 rounded-full opacity-60" />
            {/* Step 2: Active */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md font-bold text-sm bg-[var(--gb-cyan)] text-white">
                2
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--gb-cyan)] uppercase tracking-wider font-bold">Step 2</span>
                <span className="text-xs font-bold text-foreground">Contract Signing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Contract Bento Grid Layout */}
        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
          {/* Main Details Card */}
          <div className="bg-card rounded-2xl border border-border p-8 shadow-sm flex flex-col gap-6">
            <h2 className="text-lg font-bold border-b border-border pb-4 mb-2 text-foreground">Contract Details</h2>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-title">Title</label>
                <input 
                  id="contract-title"
                  type="text" 
                  placeholder="e.g. Senior UX Designer Retainer" 
                  value={contractForm.title}
                  onChange={e => setContractForm({ ...contractForm, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all text-foreground font-medium"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-desc">Description</label>
                <textarea 
                  id="contract-desc"
                  placeholder="Detail the scope of work, deliverables, and expectations..." 
                  value={contractForm.description}
                  onChange={e => setContractForm({ ...contractForm, description: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all text-foreground resize-y leading-relaxed"
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-budget">Total Budget ($) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">$</span>
                    <input 
                      id="contract-budget"
                      type="number" 
                      placeholder="5000" 
                      value={contractForm.budget}
                      onChange={e => setContractForm({ ...contractForm, budget: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all text-foreground font-semibold"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-start">Start Date (Created Date)</label>
                  <input 
                    id="contract-start"
                    type="date" 
                    value={contractForm.startDate}
                    onChange={e => setContractForm({ ...contractForm, startDate: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all text-foreground cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-end">End Date (Deadline)</label>
                  <input 
                    id="contract-end"
                    type="date" 
                    value={contractForm.endDate}
                    onChange={e => setContractForm({ ...contractForm, endDate: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all text-foreground cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row Bento Grid: Policies & E-sign */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Policies Card */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--gb-cyan)]/10 flex items-center justify-center text-[var(--gb-cyan)]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Contract Policy</h2>
                  <p className="text-[10px] text-muted-foreground font-semibold">Review and confirm terms</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-5">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={policies.accuracy}
                    onChange={e => setPolicies({ ...policies, accuracy: e.target.checked })}
                    className="w-5 h-5 rounded border-border text-[var(--gb-cyan)] focus:ring-[var(--gb-cyan)] focus:ring-offset-0 bg-background cursor-pointer mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground group-hover:text-[var(--gb-cyan)] transition-colors">Accuracy Confirmation</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 leading-normal">I confirm that the scope of work, budget, and timeline are accurate and reflect our mutual agreement.</span>
                  </div>
                </label>

                <label className="flex items-start gap-4 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={policies.escrow}
                    onChange={e => setPolicies({ ...policies, escrow: e.target.checked })}
                    className="w-5 h-5 rounded border-border text-[var(--gb-cyan)] focus:ring-[var(--gb-cyan)] focus:ring-offset-0 bg-background cursor-pointer mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground group-hover:text-[var(--gb-cyan)] transition-colors">Escrow Agreement</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 leading-normal">I agree to fund the contract budget into escrow and acknowledge that payments will be released upon milestone approval.</span>
                  </div>
                </label>

                <label className="flex items-start gap-4 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={policies.conduct}
                    onChange={e => setPolicies({ ...policies, conduct: e.target.checked })}
                    className="w-5 h-5 rounded border-border text-[var(--gb-cyan)] focus:ring-[var(--gb-cyan)] focus:ring-offset-0 bg-background cursor-pointer mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground group-hover:text-[var(--gb-cyan)] transition-colors">Professional Conduct</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 leading-normal">I commit to maintaining a professional working relationship and complying with the platform's non-circumvention policies.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Signature Card */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--gb-cyan)]/10 flex items-center justify-center text-[var(--gb-cyan)]">
                    <PenTool size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Digital Signature</h2>
                    <p className="text-[10px] text-muted-foreground font-semibold">Legally binding signature</p>
                  </div>
                </div>
                <div className="flex bg-muted rounded-lg p-1 text-xs">
                  <button className="px-4 py-1.5 font-bold bg-background text-[var(--gb-cyan)] rounded shadow-sm cursor-pointer border-none" type="button">Draw</button>
                  <button className="px-4 py-1.5 font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer bg-transparent border-none" type="button" onClick={() => alert('Simulating file upload')}>Upload</button>
                </div>
              </div>

              <div className="bg-background h-48 rounded-xl border border-border flex items-center justify-center relative hover:bg-muted/10 transition-colors cursor-crosshair group overflow-hidden">
                <canvas 
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="absolute inset-0 w-full h-full z-10"
                />
                {!isSigned && (
                  <div className="text-center flex flex-col items-center gap-2 pointer-events-none opacity-60 z-0">
                    <span className="material-symbols-outlined text-muted-foreground text-4xl group-hover:scale-110 transition-transform">gesture</span>
                    <span className="text-xs text-muted-foreground font-medium">Sign here using your mouse or touch screen</span>
                  </div>
                )}
                <div className="absolute bottom-8 left-12 right-12 border-b border-border/50 pointer-events-none z-0"></div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-xs font-bold border border-green-500/20">
                  <ShieldCheck size={14} />
                  <span>Identity Verified</span>
                </div>
                <button 
                  onClick={clearSignature}
                  className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0" 
                  type="button"
                >
                  <Trash size={14} />
                  Clear Signature
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-card border border-border rounded-2xl p-6 mt-8 flex justify-between items-center shadow-sm max-w-5xl mx-auto">
          <button 
            type="button"
            onClick={handleBack}
            className="px-6 py-3 rounded-full font-bold text-sm border border-border bg-background text-muted-foreground hover:bg-muted transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ChevronLeft size={16} />
            Back to Details
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !contractForm.title || !contractForm.budget || !contractForm.endDate}
            className="w-full md:w-auto px-10 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer border-none"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending Contract...
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Finalize & Send</span>
              </>
            )}
          </button>
        </div>

      </div>
    </AppLayout>
  );
}
