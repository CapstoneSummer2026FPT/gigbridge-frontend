import { useNavigate } from 'react-router';
import {
  Sparkles, PenTool, HelpCircle, CheckCircle,
  Lightbulb, ChevronRight, MessageSquare, BookOpen,
  ArrowRight, ShieldAlert, BadgeInfo
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../styles/PostJobPreGuideScreen.css';

export default function PostJobPreGuideScreen() {
  const navigate = useNavigate();

  const handleStartMode = (instantJobMode: boolean) => {
    navigate('/jobs/post', { state: { instantJobMode } });
  };

  return (
    <AppLayout>
      <div className="max-w-[1000px] mx-auto px-4 py-8 relative">
        {/* Background glow effects */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.03),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.03),transparent_50%)] pointer-events-none" />

        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--gb-purple)]/10 to-[var(--gb-cyan)]/10 border border-[var(--gb-purple)]/20 text-xs font-bold text-[var(--gb-purple)] mb-4">
            <BookOpen size={12} />
            <span>Posting Guide & Modes</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase mb-4" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif', letterSpacing: '0.05em'" }}>
            Hướng dẫn Đăng tin Tuyển dụng
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Lựa chọn phương thức tạo công việc phù hợp nhất với nhu cầu của bạn.
            Chúng tôi hỗ trợ cả quy trình tự động hóa bằng AI và nhập thủ công truyền thống.
          </p>
        </div>

        {/* Main Selection Buttons Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* AI Mode Button (Highlighted Premium Option) */}
          <button
            type="button"
            onClick={() => handleStartMode(true)}
            className="ai-mode-card group relative text-left overflow-hidden rounded-2xl p-8 shadow-lg transition-all duration-300 hover:scale-[1.02] focus:outline-none cursor-pointer"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="ai-select-orb w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="ai-select-sparkles-icon animate-pulse" size={26} />
              </div>
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[var(--gb-purple)] to-[var(--gb-cyan)] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                Recommended
              </span>
            </div>

            <h2 className="text-2xl font-black text-foreground mb-3 flex items-center gap-2 group-hover:text-[var(--gb-purple)] transition-colors">
              Tạo Job với AI (AI Gen)
              <ArrowRight size={18} className="transform group-hover:translate-x-1.5 transition-transform" />
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              Chỉ cần mô tả ngắn gọn mong muốn tuyển dụng. AI sẽ tự động tối ưu hóa và điền toàn bộ
              mô tả dự án, tiêu đề công việc, danh mục chuyên môn và gợi ý danh sách kỹ năng chuẩn xác.
            </p>

            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--gb-cyan)]">
              <span>Bắt đầu ngay với trợ lý AI</span>
              <ChevronRight size={14} />
            </div>
          </button>

          {/* Manual Mode Button */}
          <button
            type="button"
            onClick={() => handleStartMode(false)}
            className="group relative text-left overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-muted-foreground/30 hover:shadow-md focus:outline-none cursor-pointer"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
                <PenTool className="text-muted-foreground group-hover:text-foreground transition-colors" size={26} />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2 group-hover:text-foreground/80 transition-colors">
              Tạo Job Thủ Công
              <ArrowRight size={18} className="transform group-hover:translate-x-1.5 transition-transform text-muted-foreground group-hover:text-foreground" />
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              Tự tay thiết lập và điền từng trường thông tin công việc theo đúng cấu trúc của bạn.
              Phù hợp khi bạn đã chuẩn bị sẵn đầy đủ chi tiết file tài liệu yêu cầu (JD) từ trước.
            </p>

            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/75">
              <span>Đăng tin kiểu truyền thống</span>
              <ChevronRight size={14} />
            </div>
          </button>
        </div>

        {/* Detailed Guidelines Section */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-bold text-foreground border-b border-border pb-4 mb-6 flex items-center gap-2">
            <BadgeInfo className="text-[var(--gb-purple)]" size={18} />
            Cẩm nang Đăng tin Tuyển dụng Hiệu quả
          </h3>

          <div className="space-y-8">
            {/* Guide Item 1 */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-[var(--gb-cyan)]/10 flex items-center justify-center shrink-0 text-[var(--gb-cyan)]">
                <CheckCircle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground mb-1.5">1. Điền kỹ thông tin công việc</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Thông tin công việc được phân chia rõ ràng giúp freelancer dễ dàng hình dung quy mô dự án.
                  Hãy mô tả chi tiết phần <strong className="text-foreground">Job Description</strong> về các đầu việc cần làm,
                  giai đoạn thanh toán (milestones) dự kiến và công cụ cần sử dụng. Một tin tuyển dụng mạch lạc sẽ tăng lượng freelancer nộp proposal tốt lên đến 150%.
                </p>
              </div>
            </div>

            {/* Guide Item 2 */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-[var(--gb-purple)]/10 flex items-center justify-center shrink-0 text-[var(--gb-purple)]">
                <MessageSquare size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground mb-1.5">2. Questions for Interview là gì &amp; Tại sao nên thiết lập kĩ?</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Đây là các câu hỏi phỏng vấn nhanh do bạn định nghĩa. Freelancer bắt buộc phải trả lời những câu hỏi này ngay tại giao diện nộp proposal.
                  Tính năng này giúp bạn <strong className="text-foreground">đánh giá tư duy và năng lực của freelancer nhanh chóng</strong> mà không cần hẹn lịch gọi trực tiếp quá sớm.
                </p>
                <div className="bg-muted/40 border border-border rounded-xl p-4">
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Lightbulb size={12} className="text-amber-500" />
                    Kinh nghiệm thiết lập bộ câu hỏi phỏng vấn
                  </p>
                  <ul className="list-none space-y-2 text-[11px] text-muted-foreground">
                    <li className="flex gap-2 items-start">
                      <span className="text-[var(--gb-purple)] font-bold">•</span>
                      <span><strong>Đặt câu hỏi tình huống thực tế:</strong> Thay vì hỏi chung chung, hãy hỏi cách xử lý sự cố. Ví dụ: <em>"Bạn sẽ giải quyết thế nào khi API bị quá tải hoặc phản hồi chậm?"</em>.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-[var(--gb-purple)] font-bold">•</span>
                      <span><strong>Hỏi về kinh nghiệm sản phẩm tương đương:</strong> Ví dụ: <em>"Vui lòng gửi link hoặc ảnh chụp màn hình một ứng dụng bạn từng code sử dụng state management tương tự."</em>.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-[var(--gb-purple)] font-bold">•</span>
                      <span><strong>Giới hạn số câu hỏi:</strong> Chỉ nên đặt từ 2 đến 3 câu thực sự đắt giá để tránh làm freelancer nản lòng khi nộp hồ sơ.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Guide Item 3 */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-500">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground mb-1.5">3. Bảo mật &amp; Quy chuẩn tuyển dụng</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Để đảm bảo môi trường an toàn, vui lòng không chia sẻ thông tin liên hệ trực tiếp (như Zalo, Telegram, SĐT) trong phần mô tả.
                  Việc trao đổi và đặt cọc qua hợp đồng điện tử e-Sign của GigBridge sẽ giúp bảo vệ quyền lợi tài chính và sở hữu trí tuệ tối đa cho dự án của bạn.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
