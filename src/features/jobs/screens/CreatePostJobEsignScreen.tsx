import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { 
  Check, ChevronLeft, Send, Sparkles
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { jobAPI } from '../../../api/jobAPI';
import { JobPostStatus, JobPostVisibility } from '../../../types/models/Job';
import { toast } from 'sonner';
import '../styles/PostJobScreen.css';

export default function CreatePostJobEsignScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();

  const { jobPostId, jobData, contractForm } = location.state || {};

  useEffect(() => {
    if (!jobPostId || !jobData || !contractForm) {
      alert('Contract state is missing. Redirecting to Job Creation step.');
      navigate('/jobs/post');
    }
  }, [jobPostId, jobData, contractForm, navigate]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Signature canvas drawing states and refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize canvas in modal when opened
  useEffect(() => {
    if (isModalOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 540;
      canvas.height = 220;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#0247a3'; // Blue ink style
      }
    }
  }, [isModalOpen]);

  // Touch scroll prevention when signing
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
  }, [isModalOpen]);

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
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleCompleteSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if canvas is empty
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      alert('Vui lòng ký vào khung trước khi chọn Hoàn tất.');
      return;
    }

    const confirmSign = window.confirm("Quý khách xác nhận sử dụng chữ ký này?");
    if (confirmSign) {
      setSignatureImage(canvas.toDataURL());
      setIsModalOpen(false);
    }
  };

  const handleBack = () => {
    navigate('/jobs/post/contract', { state: { jobData, jobPostId } });
  };

  const handleFinalize = async () => {
    if (!signatureImage) {
      alert('Vui lòng ký số hợp đồng trước khi hoàn tất gửi.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Update the JobPost in backend with modified contract form details
      const updateRequest = {
        title: contractForm.title.trim(),
        description: contractForm.description.trim(),
        majorCategoryId: jobData?.majorCategoryId || null,
        budgetMin: parseFloat(contractForm.budget) || 0,
        budgetMax: parseFloat(contractForm.budget) || 0,
        currency: jobData?.currency || 'USD',
        estimatedDuration: jobData?.estimatedDuration || null,
        maxHires: jobData?.maxHires ? parseInt(jobData.maxHires) : null,
        location: jobData?.location || null,
        visibility: jobData?.visibility !== undefined ? parseInt(jobData.visibility) : JobPostVisibility.Public,
        endDate: contractForm.endDate ? new Date(`${contractForm.endDate}T23:59:59`).toISOString() : null,
        skillIds: jobData?.skillIds || [],
        customSkillNames: jobData?.customSkillNames || [],
      };

      const updateResponse = await jobAPI.updateJobPost(jobPostId, updateRequest);
      if (!updateResponse.success) {
        throw new Error(updateResponse.message || 'Lỗi khi lưu thông tin hợp đồng.');
      }

      // 2. Save questions if questions list is provided
      if (jobData?.interviewQuestions && jobData.interviewQuestions.length > 0) {
        const questionsResponse = await jobAPI.createBulkJobPostQuestions(jobPostId, {
          questions: jobData.interviewQuestions.map((q: any, index: number) => ({
            questionText: q.questionText.trim(),
            orderIndex: index,
            isRequired: q.isRequired,
          })),
        });
        if (!questionsResponse.success) {
          console.warn('Lưu câu hỏi phỏng vấn thất bại, tiếp tục quy trình.');
        }
      }

      // 3. Update JobPost status to open (publish it)
      const publishResponse = await jobAPI.updateJobPostStatus(jobPostId, { status: JobPostStatus.Open });
      if (!publishResponse.success) {
        throw new Error(publishResponse.message || 'Lỗi khi phát hành tin tuyển dụng.');
      }

      toast.success('Hợp đồng đã được ký số và đăng tuyển dụng thành công!');
      setIsSubmitting(false);
      navigate('/client/dashboard');
    } catch (error: any) {
      console.error(error);
      setIsSubmitting(false);
      alert(error.message || 'Đã xảy ra lỗi trong quá trình ký số hợp đồng. Vui lòng thử lại.');
    }
  };

  // Format dynamic dates
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();

  const clientName = user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Đức Trí Nguyễn';
  const clientEmail = user?.email || 'ductri.18102020@gmail.com';
  const clientPhone = user?.phone_number || '0911608947';

  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto px-6 py-8 relative">
        {/* Background Mesh Gradient (Subtle) */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.02),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.02),transparent_50%)] opacity-50 pointer-events-none" />

        {/* Header & Stepper */}
        <div className="flex flex-col gap-6 items-center mb-8">
          <div className="flex justify-center w-full">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground text-center uppercase" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", letterSpacing: '0.05em' }}>
              E-Sign Contract
            </h1>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center w-full max-w-3xl mx-auto py-4">
            {/* Step 1: Completed */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/jobs/post', { state: { jobData, jobPostId } })}>
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
            {/* Step 2: Completed */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={handleBack}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md font-bold text-sm bg-green-500 text-white hover:bg-green-600 transition-colors">
                <Check size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-green-500 uppercase tracking-wider font-bold">Step 2</span>
                <span className="text-xs font-bold text-green-500 group-hover:underline">Contract Setup</span>
              </div>
            </div>
            {/* Connector */}
            <div className="flex-grow mx-6 h-[2px] bg-green-500 rounded-full opacity-60" />
            {/* Step 3: Active */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md font-bold text-sm bg-[var(--gb-cyan)] text-white">
                3
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--gb-cyan)] uppercase tracking-wider font-bold">Step 3</span>
                <span className="text-xs font-bold text-foreground">E-Sign Contract</span>
              </div>
            </div>
          </div>
        </div>

        {/* Paper Contract Layout */}
        <div className="max-w-[850px] mx-auto bg-white text-black p-12 shadow-2xl border border-slate-200 rounded-sm font-serif leading-relaxed relative overflow-hidden my-4 select-text">
          {/* Header Lines */}
          <div className="text-center mb-6">
            <h2 className="text-sm font-bold tracking-wide uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
            <h3 className="text-xs font-bold tracking-wide uppercase mt-1">Độc lập - Tự do - Hạnh phúc</h3>
            <div className="w-48 h-[1px] bg-black mx-auto mt-2 mb-4" />
            <div className="text-right text-[10px] italic">
              Số: {jobPostId ? jobPostId.substring(0, 8).toUpperCase() : '1539927'}/GB-HĐ
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center mb-8">
            <h1 className="text-lg font-bold tracking-wider uppercase">PHIẾU ĐỀ NGHỊ CUNG CẤP DỊCH VỤ</h1>
            <p className="text-xs italic mt-1 text-slate-700">Hôm nay, ngày {day} tháng {month} năm {year}</p>
          </div>

          {/* Client Details Section */}
          <div className="space-y-3 mb-8 text-xs border-b border-dashed border-slate-300 pb-6">
            <div className="flex">
              <span className="w-32 font-semibold">Kính gửi:</span>
              <span className="flex-grow font-semibold">Công ty TNHH GigBridge Việt Nam</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Tên chủ thể:</span>
              <span className="flex-grow">{clientName}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">CMND/CCCD:</span>
              <span className="flex-grow">{user?.id ? user.id.substring(0, 12).replace(/[^0-9]/g, '0') : '048204000258'}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Địa chỉ:</span>
              <span className="flex-grow">{jobData?.location || '273/6 Đống Đa, Phường Hải Châu, Đà Nẵng, Việt Nam'}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Email:</span>
              <span className="flex-grow">{clientEmail}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Điện thoại:</span>
              <span className="flex-grow">{clientPhone}</span>
            </div>
            <div className="flex font-semibold text-slate-800">
              <span className="w-32">MÃ KHÁCH HÀNG:</span>
              <span className="flex-grow">GB-{(jobPostId || '895065').substring(0, 6).toUpperCase()}</span>
            </div>
          </div>

          {/* Service Information Table */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase mb-3 text-slate-800 tracking-wider">THÔNG TIN DỊCH VỤ</h3>
            <table className="w-full border-collapse border border-black text-xs text-left">
              <thead>
                <tr className="bg-slate-50 font-bold">
                  <th className="border border-black px-3 py-2 text-center w-12">STT</th>
                  <th className="border border-black px-4 py-2">Dịch vụ tuyển dụng</th>
                  <th className="border border-black px-4 py-2 text-center w-40">Hình thức thanh toán</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-3 py-3 text-center">1</td>
                  <td className="border border-black px-4 py-3">
                    <p className="font-bold">{contractForm?.title}</p>
                    <p className="text-[10px] text-slate-600 mt-1 italic line-clamp-2 leading-relaxed">
                      {contractForm?.description}
                    </p>
                  </td>
                  <td className="border border-black px-4 py-3 text-center font-bold">
                    Trọn gói (${parseFloat(contractForm?.budget).toLocaleString()} USD)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legal Conditions */}
          <div className="text-[10px] text-slate-700 text-justify space-y-2 leading-relaxed mb-12">
            <p>
              Chủ thể đăng ký tuân thủ và chịu trách nhiệm theo các quy định của Nhà nước và quốc tế về sử dụng dịch vụ Internet, quyền sở hữu công nghiệp, bản quyền hệ điều hành, phần mềm cài đặt trên máy chủ (nếu có), bảo mật quốc gia, an ninh, văn hoá. Tuân thủ Thỏa thuận sử dụng tại: <span className="underline cursor-pointer">https://www.gigbridge.com.vn/thoa-thuan-su-dung.html</span>.
            </p>
            <p>
              Chủ thể hoàn tất hồ sơ đăng ký trong vòng 7 ngày. Chủ động cập nhật thông tin lên website hoặc khi có sự thay đổi tên, địa chỉ email, điện thoại, địa chỉ nhận hóa đơn thanh toán, số tài khoản.
            </p>
            <p>
              Chủ thể có trách nhiệm bảo mật quyền đăng nhập vào hệ thống và thông tin tài khoản dịch vụ đăng ký. Chủ động đăng nhập vào website để kiểm tra thông tin dịch vụ, ngày hết hạn, chi phí dịch vụ và các thông tin khác.
            </p>
          </div>

          {/* Signatures Area */}
          <div className="flex justify-end text-center text-xs mt-8 pb-4">
            <div className="w-72 flex flex-col items-center">
              <span className="font-bold">Xác nhận của chủ thể đăng ký dịch vụ</span>
              <span className="text-[10px] italic text-slate-500 mt-0.5">(Cá nhân ký tên / Đại diện doanh nghiệp đóng dấu)</span>
              
              <div className="h-32 flex items-center justify-center mt-4 mb-2 w-full relative">
                {signatureImage ? (
                  <img 
                    src={signatureImage} 
                    alt="Signature" 
                    className="max-h-full max-w-full object-contain mix-blend-multiply border border-dashed border-slate-200 rounded p-1"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs shadow-md transition-all border-none cursor-pointer flex items-center gap-1.5"
                  >
                    Click để ký tên
                  </button>
                )}
              </div>

              <span className="font-bold underline text-slate-800 tracking-wide mt-2">{clientName}</span>
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
            Quay lại
          </button>
          <button 
            type="button"
            onClick={handleFinalize}
            disabled={isSubmitting || !signatureImage}
            className="w-full md:w-auto px-10 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer border-none"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang xử lý gửi...
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Hoàn tất & Gửi tin</span>
              </>
            )}
          </button>
        </div>

        {/* P.A Vietnam Style Signature Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg border-2 border-[#ff3b86] w-full max-w-[600px] overflow-hidden shadow-2xl relative animate-[fadeIn_0.2s_ease-out]">
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                <div className="flex flex-col text-[#c0005a] leading-none">
                  <span className="font-extrabold text-base tracking-widest uppercase">GIGBRIDGE LTD</span>
                  <span className="text-[10px] font-semibold text-slate-500 mt-1">Hotline: 1900 9477</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors border-none cursor-pointer font-bold text-xs"
                >
                  X
                </button>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col gap-4 text-black">
                {/* Guidelines */}
                <div className="border border-slate-300 rounded p-4 bg-slate-50/50 text-xs leading-relaxed space-y-2">
                  <p>
                    <span className="font-bold">Hướng dẫn:</span> Quý khách tạo chữ ký mẫu bằng cách nhấp chuột trái hoặc chạm vào khung bên dưới và giữ để ký tên, click nút "Hoàn tất".
                  </p>
                  <p>
                    <span className="font-bold">Lưu ý:</span> Bằng việc chọn "Hoàn tất" đồng nghĩa với việc Quý khách đã đọc hiểu rõ và đồng ý các điều khoản trong hợp đồng.
                  </p>
                </div>

                {/* Canvas Signature Area */}
                <div className="relative border border-[#1782fc] rounded-lg h-[222px] bg-white group overflow-hidden">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="absolute top-2 right-2 px-3 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded text-xs font-bold border border-slate-300 transition-colors z-20 cursor-pointer"
                  >
                    Xóa
                  </button>
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="absolute inset-0 w-full h-full z-10 cursor-crosshair"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0">
                    <span className="text-sm tracking-wider uppercase font-semibold text-slate-400">Vùng ký tên / Draw here</span>
                  </div>
                </div>

                {/* Confirm Actions */}
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 border border-slate-300 text-slate-600 rounded hover:bg-slate-100 font-semibold text-xs cursor-pointer bg-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteSignature}
                    className="px-6 py-2 bg-[#ff3b86] text-white rounded hover:bg-[#e02b70] font-bold text-xs cursor-pointer border-none shadow-sm"
                  >
                    Hoàn tất
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
