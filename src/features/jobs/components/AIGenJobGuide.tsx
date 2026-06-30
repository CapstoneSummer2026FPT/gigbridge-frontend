import {
  WandSparkles, Target, Search, Pencil,
  CheckCircle2, Lightbulb, ChevronDown, FlaskConical,
} from 'lucide-react';
import GCoinIcon from '../../../shared/components/GCoinIcon';

interface AIGenJobGuideProps {
  /** Show the "Mock Mode" badge when the backend AI endpoint is unavailable */
  showMockBadge?: boolean;
}

const STEPS = [
  {
    icon: <Target size={18} />,
    accent: 'purple',
    step: '01',
    title: 'Xác định rõ vai trò & cấp độ',
    body: (
      <>
        Ghi <strong className="text-foreground">tên vị trí đầy đủ và cấp độ kinh nghiệm</strong>.
        Tránh dùng tên mơ hồ như <em>"developer"</em> — hãy cụ thể:{' '}
        <em>"Senior React Developer"</em>, <em>"Junior Data Analyst"</em>,{' '}
        <em>"Mid-level UI/UX Designer"</em>.
      </>
    ),
  },
  {
    icon: <Search size={18} />,
    accent: 'cyan',
    step: '02',
    title: 'Liệt kê kỹ năng & tech stack',
    body: (
      <>
        Nêu rõ <strong className="text-foreground">ngôn ngữ, framework, công cụ</strong> và số năm
        kinh nghiệm cần thiết. Ví dụ:{' '}
        <em>"cần TypeScript, REST API, PostgreSQL — tối thiểu 2 năm kinh nghiệm"</em>.
        AI sẽ map tự động vào danh mục kỹ năng tương ứng.
      </>
    ),
  },
  {
    icon: <GCoinIcon size={18} />,
    accent: 'purple',
    step: '03',
    title: 'Nêu phạm vi, ngân sách & thời hạn',
    body: (
      <>
        Đề cập <strong className="text-foreground">quy mô dự án, mức ngân sách dự kiến và deadline</strong>.
        Ví dụ: <em>"dự án 3 tháng, ngân sách 5–10 triệu VNĐ, cần hoàn thành trước tháng 9/2026"</em>.
        Thông tin này giúp AI sinh mô tả phù hợp hơn.
      </>
    ),
  },
  {
    icon: <Pencil size={18} />,
    accent: 'cyan',
    step: '04',
    title: 'Generate rồi review & chỉnh sửa',
    body: (
      <>
        Sau khi AI tạo xong,{' '}
        <strong className="text-foreground">luôn đọc lại và điều chỉnh</strong> nội dung để phù hợp
        với văn hóa công ty và yêu cầu thực tế. AI có thể không nắm đủ context — bạn là người hiểu
        rõ nhất.
      </>
    ),
  },
] as const;

const TIPS = [
  'Viết bằng tiếng Anh hoặc tiếng Việt đều được',
  'Prompt càng chi tiết → kết quả càng chính xác',
  'Có thể generate lại nhiều lần miễn phí',
  'Kỹ năng AI gợi ý có thể chỉnh tay sau khi generate',
];

const EXAMPLE_PROMPTS = [
  {
    emoji: '💼',
    text: (
      <>
        "Tuyển{' '}
        <strong className="text-foreground">Senior React Developer</strong> thành thạo TypeScript +
        Next.js, có kinh nghiệm 3+ năm với REST API và state management (Zustand/Redux). Dự án
        thương mại điện tử, scope{' '}
        <strong className="text-foreground">4 tháng</strong>, remote, ngân sách{' '}
        <strong className="text-foreground">3,000–5,000 G-coin</strong>."
      </>
    ),
  },
  {
    emoji: '🎨',
    text: (
      <>
        "Cần{' '}
        <strong className="text-foreground">UI/UX Designer</strong> thiết kế app mobile fintech (iOS
        + Android) trong Figma. Phải có kinh nghiệm design system, user research và developer
        handoff.{' '}
        <strong className="text-foreground">6 tuần</strong>, ngân sách{' '}
        <strong className="text-foreground">15–20 triệu VNĐ</strong>."
      </>
    ),
  },
];

export function AIGenJobGuide({ showMockBadge = false }: AIGenJobGuideProps) {
  return (
    <div className="ai-guide-card w-full">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--gb-purple)]/30 bg-gradient-to-br from-[var(--gb-purple)]/8 via-card to-[var(--gb-cyan)]/8 shadow-lg">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[var(--gb-purple)]/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-[var(--gb-cyan)]/5 blur-3xl pointer-events-none" />

        <div className="relative p-6 sm:p-8">

          {/* Mock badge */}
          {showMockBadge && (
            <div className="flex items-center justify-end mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 text-[10px] font-extrabold uppercase tracking-wider">
                <FlaskConical size={11} />
                Mock Mode Active – BE unavailable
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-8">
            <div className="ai-guide-orb w-16 h-16 rounded-2xl flex items-center justify-center shrink-0">
              <WandSparkles size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-foreground leading-tight">
                Hướng dẫn dùng{' '}
                <span className="ai-guide-shimmer-text">AI Gen Job</span>
                {' '}hiệu quả
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">
                AI sẽ tự động điền{' '}
                <strong className="text-foreground">tiêu đề, danh mục, kỹ năng và mô tả chi tiết</strong>{' '}
                dựa trên prompt bạn nhập. Làm theo 4 bước dưới đây để có kết quả chuyên nghiệp nhất.
              </p>
            </div>
          </div>

          {/* Step cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {STEPS.map(({ icon, accent, step, title, body }) => {
              const isPurple = accent === 'purple';
              const color = isPurple ? 'var(--gb-purple)' : 'var(--gb-cyan)';
              return (
                <div
                  key={step}
                  className={`ai-guide-step group flex gap-4 p-5 rounded-2xl bg-background/70 border border-border/70 transition-all duration-200 ${
                    isPurple
                      ? 'hover:border-[var(--gb-purple)]/40 hover:bg-[var(--gb-purple)]/4'
                      : 'hover:border-[var(--gb-cyan)]/40 hover:bg-[var(--gb-cyan)]/4'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{
                        background: `linear-gradient(135deg, color-mix(in srgb, ${color} 20%, transparent), color-mix(in srgb, ${color} 5%, transparent))`,
                        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
                        color,
                      }}
                    >
                      {icon}
                    </div>
                    <span
                      className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                      style={{
                        color,
                        background: `color-mix(in srgb, ${color} 10%, transparent)`,
                      }}
                    >
                      {step}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground mb-1.5">{title}</p>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tip pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {TIPS.map((tip, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-[11px] text-muted-foreground font-medium"
              >
                <span className="text-[var(--gb-cyan)]">
                  <CheckCircle2 size={11} />
                </span>
                {tip}
              </span>
            ))}
          </div>

          {/* Example prompts */}
          <div className="rounded-2xl border border-[var(--gb-cyan)]/25 bg-gradient-to-br from-[var(--gb-cyan)]/6 to-transparent p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md bg-[var(--gb-cyan)] flex items-center justify-center">
                <Lightbulb size={11} className="text-white" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--gb-cyan)]">
                Ví dụ prompt đạt kết quả tốt
              </p>
            </div>
            <div className="space-y-2">
              {EXAMPLE_PROMPTS.map(({ emoji, text }, i) => (
                <div key={i} className="bg-background/80 rounded-xl px-4 py-3 border border-border/60">
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                    {emoji} <em>{text}</em>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow pointing down to prompt input */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="flex-grow h-[1px] bg-gradient-to-r from-transparent to-border/50" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Nhập prompt bên dưới để bắt đầu
              </span>
              <ChevronDown size={16} className="text-[var(--gb-cyan)] animate-bounce" />
            </div>
            <div className="flex-grow h-[1px] bg-gradient-to-l from-transparent to-border/50" />
          </div>

        </div>
      </div>
    </div>
  );
}
