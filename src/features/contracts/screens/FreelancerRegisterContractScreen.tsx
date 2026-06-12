import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { 
  ShieldCheck, PenTool, Trash, Check, ChevronLeft, Send, AlertTriangle
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { DB } from '../../../mock_backend';
import '../../jobs/styles/PostJobScreen.css';

export default function FreelancerRegisterContractScreen() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  // Fetch project details
  const project = DB.getProjects().find(p => p.id === projectId) || DB.getProjects()[0];

  const [contractForm, setContractForm] = useState({
    title: project ? `${project.title} - Freelancer Agreement` : 'Freelancer Agreement',
    description: project ? project.description : '',
    budget: project ? String(project.totalBudget) : '0',
    startDate: project ? (project.startDate || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
    endDate: project?.milestones?.[0]?.dueDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0],
  });

  const [policies, setPolicies] = useState({
    quality: false,
    escrow: false,
    ipTransfer: false,
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
    if (project) {
      navigate(`/workspace/${project.id}`);
    } else {
      navigate('/freelancer/dashboard');
    }
  };

  const handleSubmit = async () => {
    if (!policies.quality || !policies.escrow || !policies.ipTransfer) {
      alert('Vui lòng đồng ý với tất cả điều khoản chính sách hợp đồng.');
      return;
    }

    if (!isSigned) {
      alert('Vui lòng ký tên của bạn trước khi gửi hợp đồng.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate updating project status
      if (project) {
        project.status = 'active';
      }
      
      // Simulate contract save
      console.log('Freelancer Contract Signed:', contractForm);
      
      setTimeout(() => {
        setIsSubmitting(false);
        alert('Hợp đồng đã được ký thành công! Dự án hiện đang hoạt động.');
        navigate('/freelancer/dashboard');
      }, 1000);
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
      alert('Ký hợp đồng thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto px-6 py-8 relative">
        {/* Background Mesh Gradient */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.02),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.02),transparent_50%)] opacity-50 pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col gap-6 items-center mb-8">
          <div className="flex justify-center w-full">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground text-center uppercase" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", letterSpacing: '0.05em' }}>
              Register Freelancer Agreement
            </h1>
          </div>
        </div>

        {/* Warning Read-Only Alert */}
        <div className="max-w-5xl mx-auto mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3 text-xs text-amber-600 font-medium">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-amber-500" />
          <div className="flex flex-col">
            <span className="font-bold">Chế độ Xem & Ký hợp đồng</span>
            <span className="mt-0.5 leading-relaxed text-muted-foreground">
              Tất cả các trường thông tin hợp đồng được kế thừa trực tiếp từ Workspace đã thỏa thuận và không thể chỉnh sửa.
              Mức giá đã được cập nhật chính xác theo deal đề xuất trong phòng chat.
            </span>
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
                  value={contractForm.title}
                  disabled
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground font-medium cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-desc">Description</label>
                <textarea 
                  id="contract-desc"
                  value={contractForm.description}
                  disabled
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground resize-none leading-relaxed cursor-not-allowed"
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-budget">Total Budget ($)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">$</span>
                    <input 
                      id="contract-budget"
                      type="text" 
                      value={Number(contractForm.budget).toLocaleString()}
                      disabled
                      className="w-full bg-muted border border-border rounded-xl pl-8 pr-4 py-3 text-sm text-muted-foreground font-bold cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-start">Start Date</label>
                  <input 
                    id="contract-start"
                    type="date" 
                    value={contractForm.startDate}
                    disabled
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-end">End Date</label>
                  <input 
                    id="contract-end"
                    type="date" 
                    value={contractForm.endDate}
                    disabled
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row Bento Grid: Policies & E-sign */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Freelancer Policies Card */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--gb-cyan)]/10 flex items-center justify-center text-[var(--gb-cyan)]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Freelancer Policies</h2>
                  <p className="text-[10px] text-muted-foreground font-semibold">Điều khoản dành cho Freelancer</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-5">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={policies.quality}
                    onChange={e => setPolicies({ ...policies, quality: e.target.checked })}
                    className="w-5 h-5 rounded border-border text-[var(--gb-cyan)] focus:ring-[var(--gb-cyan)] focus:ring-offset-0 bg-background cursor-pointer mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground group-hover:text-[var(--gb-cyan)] transition-colors">Cam kết chất lượng & Phạm vi</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 leading-normal">Tôi cam kết hoàn thành sản phẩm theo đúng chất lượng, tiêu chuẩn và thời hạn bàn giao đã thống nhất với đối tác.</span>
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
                    <span className="text-xs font-bold text-foreground group-hover:text-[var(--gb-cyan)] transition-colors">Đảm bảo giao dịch qua Escrow</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 leading-normal">Tôi đồng ý thực hiện giao dịch và nhận các khoản thanh toán cột mốc thông qua cổng bảo đảm (Escrow) của Gigbridge để tránh rủi ro.</span>
                  </div>
                </label>

                <label className="flex items-start gap-4 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={policies.ipTransfer}
                    onChange={e => setPolicies({ ...policies, ipTransfer: e.target.checked })}
                    className="w-5 h-5 rounded border-border text-[var(--gb-cyan)] focus:ring-[var(--gb-cyan)] focus:ring-offset-0 bg-background cursor-pointer mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground group-hover:text-[var(--gb-cyan)] transition-colors">Chuyển giao quyền sở hữu trí tuệ</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 leading-normal">Tôi đồng ý chuyển giao toàn bộ quyền sở hữu trí tuệ đối với các tài liệu, mã nguồn đã bàn giao sau khi nhận được thanh toán từ đối tác.</span>
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
                    <p className="text-[10px] text-muted-foreground font-semibold">Chữ ký điện tử</p>
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
                  <span>Freelancer Verified</span>
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
            Quay lại Workspace
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !policies.quality || !policies.escrow || !policies.ipTransfer || !isSigned}
            className="w-full md:w-auto px-10 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer border-none"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang xử lý chữ ký...
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Ký Hợp Đồng & Bắt Đầu</span>
              </>
            )}
          </button>
        </div>

      </div>
    </AppLayout>
  );
}
