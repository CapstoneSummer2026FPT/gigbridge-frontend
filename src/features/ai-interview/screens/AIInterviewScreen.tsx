import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  Brain,
  Bug,
  CheckCircle2,
  ChevronDown,
  Cpu,
  LoaderCircle,
  Mail,
  Mic,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Timer,
  Volume2,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useAiInterview, formatDuration, QUESTION_MAX_SECONDS } from '../hooks/useAiInterview';
import '../styles/ai-interview-screen.css';

function formatRemainingTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainingSeconds = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

function TimerRing({ seconds, maxSeconds = 180, size = 52 }: { seconds: number; maxSeconds?: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, seconds / maxSeconds));
  const strokeDashoffset = circumference * (1 - progress);
  const isLow = seconds <= 30;
  const isCritical = seconds <= 10;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90" style={{ overflow: 'visible' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={3.5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isCritical ? '#ef4444' : isLow ? '#f59e0b' : 'var(--brand)'}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span className={`relative z-10 text-xs font-black tabular-nums ${
        isCritical ? 'text-rose-500 animate-pulse' : isLow ? 'text-amber-500' : 'text-brand'
      }`}>
        {formatRemainingTime(seconds)}
      </span>
    </div>
  );
}

export default function AIInterviewScreen() {
  const {
    navigate,
    t,
    jobPostId, jobTitle, proposalId,
    stage,
    sessionId, audioAccessToken,
    questionIndex, questionCount, interviewLanguage,
    answerState, transcript, sttProvider, sttConfidence,
    recordingSeconds, ttsState, ttsProvider,
    subtitleCueIndex, subtitleCues, silenceCountdown,
    questionRemainingSeconds,
    isStarting, startError, actionError,
    startInterview,
    beginAnswer, finishAnswer, cancelAnswer, recordAgain, confirmAnswer,
    playQuestion,
  } = useAiInterview();

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: t('aiInterview.faq.q1', 'GigBridge AI phỏng vấn gồm bao nhiêu câu hỏi?'),
      a: t('aiInterview.faq.a1', 'Số lượng câu hỏi được khởi tạo tự động linh hoạt dựa trên yêu cầu kỹ năng và mức độ phức tạp của từng dự án tuyển dụng.'),
    },
    {
      q: t('aiInterview.faq.q2', 'Thời gian cho mỗi câu hỏi là bao lâu?'),
      a: t('aiInterview.faq.a2', 'Giống phỏng vấn tiêu chuẩn, mỗi câu hỏi phỏng vấn AI có đúng 3 phút (180 giây) đếm ngược. Hệ thống sẽ tự động ghi nhận và chuyển câu tiếp theo khi hết giờ.'),
    },
    {
      q: t('aiInterview.faq.q3', 'Nếu câu trả lời của tôi chưa rõ ràng thì sao?'),
      a: t('aiInterview.faq.a3', 'Sau khi phát biểu xong, GigBridge AI sẽ chuyển giọng nói thành văn bản. Bạn hoàn toàn có thể chọn "Nói lại" để thu âm lại câu trả lời bất kỳ lúc nào trong thời gian quy định.'),
    },
    {
      q: t('aiInterview.faq.q4', 'GigBridge AI hỗ trợ những ngôn ngữ nào?'),
      a: t('aiInterview.faq.a4', 'Hệ thống nhận dạng thông minh cả tiếng Việt và tiếng Anh (tự động điều chỉnh theo ngôn ngữ hiển thị trên giao diện của bạn).'),
    },
    {
      q: t('aiInterview.faq.q5', 'Kết quả phỏng vấn sẽ gửi cho nhà tuyển dụng như thế nào?'),
      a: t('aiInterview.faq.a5', 'Ngay khi hoàn thành, đánh giá từ GigBridge AI và văn bản câu trả lời sẽ tự động đính kèm vào Đề xuất (Proposal) gửi đến Khách hàng.'),
    },
  ];

  return (
    <AppLayout>
      <main className="ai-bento-shell">

        {/* ══════════════════════════════════════
            STAGE 1: INTRO (AWWARDS BENTO GRID)
        ══════════════════════════════════════ */}
        {stage === 'intro' && (
          <>
            {/* HERO HEADER */}
            <header className="ai-bento-hero">
              <div className="ai-bento-eyebrow">
                <span className="ai-bento-eyebrow-dot" />
                <Zap size={13} /> GIGBRIDGE AI INTERVIEW SYSTEM ✦
              </div>

              <h1 className="ai-bento-headline">
                {t('aiInterview.intro.title', 'Phỏng vấn thoại tự động cùng GigBridge AI')}
              </h1>
              <p className="ai-bento-sub">
                {t('aiInterview.intro.description', 'Đánh giá năng lực chuyên sâu, nhận diện giọng nói tức thì và nâng cao cơ hội nhận dự án từ Nhà tuyển dụng.')}
              </p>
            </header>

            {/* BENTO GRID */}
            <div className="ai-bento-grid">

              {/* CARD 1: HERO ACTION CARD (SPANS 2 COLS, 2 ROWS) */}
              <div className="ai-bento-card hero-card">
                <div className="ai-hero-orb-shell">
                  <div className="ai-orb-ring-spin" />
                  <div className="ai-orb-ring-spin-2" />
                  <div className="ai-orb-core-face">
                    <Brain size={56} strokeWidth={1.4} />
                  </div>
                </div>

                <h2 className="ai-hero-card-title">GigBridge AI — Voice Assistant</h2>
                <p className="ai-hero-card-sub">
                  {t('aiInterview.interviewer.audioOnly', 'Sẵn sàng phỏng vấn 24/7. Phân tích phản xạ chuyên môn và tự động ghi nhận kết quả.')}
                </p>

                {jobTitle && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', marginBottom: 20, fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>
                    <Cpu size={14} color="var(--brand)" />
                    <span>{t('aiInterview.intro.interviewingFor', 'Đang ứng tuyển')}:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 900 }}>{jobTitle}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    className="ai-bento-btn"
                    onClick={startInterview}
                    disabled={isStarting}
                  >
                    {isStarting ? (
                      <>
                        <LoaderCircle size={18} className="animate-spin" />
                        {t('aiInterview.actions.starting', 'Đang khởi tạo...')}
                      </>
                    ) : (
                      <>
                        {t('aiInterview.actions.start', 'Bắt đầu phỏng vấn ngay')} <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  {!jobPostId && (
                    <button
                      className="ai-bento-btn ghost"
                      onClick={() => navigate('/jobs/browse')}
                    >
                      {t('aiInterview.actions.browseToChoose', 'Chọn công việc phỏng vấn')}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, background: 'var(--surface-muted, var(--surface))', border: '1px solid var(--border)', fontSize: 12, color: 'var(--brand)', fontWeight: 800 }}>
                    <Timer size={14} color="var(--brand)" /> 3 phút / câu hỏi (Có tính giờ)
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, background: 'var(--surface-muted, var(--surface))', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                    <Volume2 size={14} color="var(--brand)" /> {t('aiInterview.tips.quietRoom', '💡 Mẹo: Nên phỏng vấn ở phòng kín, yên tĩnh để có trải nghiệm tốt nhất.')}
                  </div>
                </div>
              </div>

              {/* CARD 2: VOICE RECOGNITION (1 COL, SPANS 2 ROWS) */}
              <div className="ai-bento-card" style={{ gridRow: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="ai-card-icon">
                  <Volume2 size={22} />
                </div>
                <h3 className="ai-card-title">{t('aiInterview.features.voiceTitle', 'Giọng nói 2 chiều')}</h3>
                <p className="ai-card-desc">
                  {t('aiInterview.features.voiceDesc', 'GigBridge AI phát âm thanh câu hỏi tự nhiên và tự động chuyển phát biểu của bạn thành văn bản chính xác.')}
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: 'var(--success)', background: 'var(--surface-muted, var(--surface))', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 999, width: 'fit-content' }}>
                  <ShieldCheck size={13} /> Real-time Speech-to-Text
                </div>
              </div>

              {/* CARD 4: TIMELINE (SPANS 3 COLS) */}
              <div className="ai-bento-card timeline-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={18} color="var(--brand)" />
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--ai-text-primary)', margin: 0 }}>
                    {t('aiInterview.intro.howItWorks', 'Quy trình phỏng vấn 4 bước đơn giản')}
                  </h3>
                </div>

                <div className="ai-timeline-grid">
                  <div className="ai-timeline-step">
                    <div className="ai-step-num">01 / STEP</div>
                    <h4 className="ai-step-title">{t('aiInterview.steps.qTitle', 'Lắng nghe câu hỏi')}</h4>
                    <p className="ai-step-desc">
                      {t('aiInterview.intro.steps.question', 'GigBridge AI phát trực tiếp câu hỏi tình huống phù hợp với dự án.')}
                    </p>
                  </div>

                  <div className="ai-timeline-step">
                    <div className="ai-step-num">02 / STEP</div>
                    <h4 className="ai-step-title">{t('aiInterview.steps.aTitle', 'Trả lời qua Micro')}</h4>
                    <p className="ai-step-desc">
                      {t('aiInterview.intro.steps.answer', 'Bật Micro và phát biểu ý kiến. Mỗi câu hỏi có đúng 3 phút tính giờ.')}
                    </p>
                  </div>

                  <div className="ai-timeline-step">
                    <div className="ai-step-num">03 / STEP</div>
                    <h4 className="ai-step-title">{t('aiInterview.steps.rTitle', 'Rà soát văn bản')}</h4>
                    <p className="ai-step-desc">
                      {t('aiInterview.intro.steps.review', 'Tự động chuyển thoại thành văn bản. Bạn có thể kiểm tra hoặc nói lại.')}
                    </p>
                  </div>

                  <div className="ai-timeline-step">
                    <div className="ai-step-num">04 / STEP</div>
                    <h4 className="ai-step-title">{t('aiInterview.steps.fTitle', 'Đánh giá & Gửi đi')}</h4>
                    <p className="ai-step-desc">
                      {t('aiInterview.intro.steps.finish', 'Kết quả được đính kèm trực tiếp vào Proposal gửi đến Khách hàng.')}
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 5: FAQ (SPANS 3 COLS) */}
              <div className="ai-bento-card faq-card">
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--ai-text-primary)', margin: '0 0 4px' }}>
                  {t('aiInterview.faq.title', 'Câu hỏi thường gặp về GigBridge AI')}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--ai-text-secondary)', margin: 0 }}>
                  {t('aiInterview.faq.subtitle', 'Giải đáp các thắc mắc phổ biến trước khi thực hiện phỏng vấn.')}
                </p>

                <div className="ai-faq-list">
                  {faqs.map((item, idx) => (
                    <div key={idx} className="ai-faq-box">
                      <div
                        className="ai-faq-header"
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      >
                        <span>{item.q}</span>
                        <ChevronDown
                          size={16}
                          style={{
                            transform: openFaq === idx ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s',
                          }}
                        />
                      </div>
                      {openFaq === idx && <div className="ai-faq-body">{item.a}</div>}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {startError && (
              <div style={{ color: 'var(--destructive)', padding: '14px 20px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={18} /> {startError}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            STAGE 2: INTERVIEW ROOM
        ══════════════════════════════════════ */}
        {stage === 'interview' && (
          <section>
            {/* Topbar */}
            <div className="ai-room-topbar flex items-center justify-between gap-4">
              <div className="ai-room-title-block min-w-0">
                <span className="ai-bento-eyebrow-dot" />
                <h1 className="truncate">{jobTitle || t('aiInterview.room.defaultTitle', 'Phỏng vấn thoại — GigBridge AI')}</h1>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="ai-room-progress-wrap hidden sm:flex">
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ai-text-secondary)' }}>
                    {t('aiInterview.room.questionOf', { current: questionIndex, total: questionCount })}
                  </span>
                  <div className="ai-progress-track">
                    <div
                      className="ai-progress-fill"
                      style={{ width: `${(questionIndex / questionCount) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Per-Question Countdown Timer Ring */}
                <div className="flex items-center gap-2 rounded-2xl border px-3 py-1.5 shadow-sm" style={{ background: 'var(--surface-muted, var(--surface))', borderColor: 'var(--border)' }}>
                  <TimerRing seconds={questionRemainingSeconds} maxSeconds={QUESTION_MAX_SECONDS} size={50} />
                </div>
              </div>
            </div>

            {actionError && (
              <div style={{ color: 'var(--destructive)', padding: '12px 18px', borderRadius: '14px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: 20, fontSize: 13, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertCircle size={16} /> {actionError}
              </div>
            )}

            {/* Grid layout */}
            <div className="ai-interview-grid-bento">
              {/* LEFT CARD — GIGBRIDGE AI INTERVIEWER */}
              <div className="ai-stage-bento-card">

                <div className="ai-avatar-flex">
                  <div className="ai-hero-orb-shell" style={{ width: 140, height: 140 }}>
                    <div className="ai-orb-ring-spin" />
                    <div className="ai-orb-ring-spin-2" />
                    <div className="ai-orb-core-face" style={{ width: 110, height: 110 }}>
                      <Brain size={48} strokeWidth={1.4} />
                    </div>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--ai-text-primary)', margin: '0 0 6px' }}>
                    GigBridge AI — Voice Assistant
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--ai-text-secondary)', margin: '0 0 16px' }}>
                    {ttsState === 'streaming' && t('aiInterview.interviewer.states.preparing', 'Đang chuẩn bị câu hỏi phỏng vấn...')}
                    {ttsState === 'playing' && t('aiInterview.interviewer.states.speaking', 'Đang đọc câu hỏi...')}
                    {ttsState === 'ready' && t('aiInterview.interviewer.states.yourTurn', 'Đã đọc xong. Hãy bấm phát biểu bên phải.')}
                    {ttsState === 'failed' && t('aiInterview.interviewer.states.failed', 'Chưa thể phát âm thanh.')}
                    {ttsState === 'idle' && t('aiInterview.interviewer.states.ready', 'Sẵn sàng phát câu hỏi.')}
                  </p>

                  <button
                    className="ai-bento-btn ghost"
                    style={{ padding: '8px 16px', fontSize: 13 }}
                    onClick={playQuestion}
                    disabled={ttsState === 'streaming' || ttsState === 'playing' || !audioAccessToken}
                  >
                    <Volume2 size={15} />
                    {ttsState === 'failed' ? t('aiInterview.actions.retryAudio', 'Thử lại phát thanh') : t('aiInterview.actions.hearAgain', 'Nghe lại câu hỏi')}
                  </button>
                </div>

                {ttsState === 'playing' && subtitleCueIndex >= 0 && (
                  <div className="ai-subtitle-bubble">
                    <strong style={{ color: 'var(--brand)', display: 'block', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Subtitles — GigBridge AI
                    </strong>
                    {subtitleCues[subtitleCueIndex]}
                  </div>
                )}
              </div>

              {/* RIGHT CARD — ANSWER PANEL */}
              <div className="ai-stage-bento-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--brand)' }}>
                    {t('aiInterview.answer.yourTurn', 'Phần phát biểu của bạn')}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: answerState === 'recording' ? 'var(--destructive)' : 'var(--ai-text-secondary)' }}>
                    <Mic size={13} style={{ display: 'inline', marginRight: 4 }} />
                    {answerState === 'recording' ? t('aiInterview.answer.micOn', 'Micro Đang Mở') : t('aiInterview.answer.micOff', 'Micro Tắt')}
                  </span>
                </div>

                {/* Question Timer Urgency Banner */}
                {questionRemainingSeconds <= 30 && questionRemainingSeconds > 0 && (
                  <div style={{
                    color: questionRemainingSeconds <= 10 ? '#ef4444' : '#f59e0b',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    background: questionRemainingSeconds <= 10 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                    border: `1px solid ${questionRemainingSeconds <= 10 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    marginBottom: 16,
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <Timer size={15} className={questionRemainingSeconds <= 10 ? 'animate-pulse shrink-0' : 'shrink-0'} />
                    <span>
                      {questionRemainingSeconds <= 10
                        ? 'Sắp hết 3 phút! Hệ thống sẽ tự động hoàn tất và chuyển câu hỏi khi về 00:00.'
                        : 'Còn dưới 30 giây cho câu hỏi này! Vui lòng chuẩn bị nộp câu trả lời.'}
                    </span>
                  </div>
                )}

                {/* State: Idle */}
                {answerState === 'idle' && (
                  <div className="ai-avatar-flex">
                    <button
                      className="ai-bento-btn"
                      style={{ padding: '16px 32px' }}
                      onClick={beginAnswer}
                      disabled={ttsState === 'streaming' || ttsState === 'playing'}
                    >
                      <Mic size={18} /> {t('aiInterview.actions.answerQuestion', 'Bắt đầu phát biểu')}
                    </button>
                    <p style={{ fontSize: 13, color: 'var(--ai-text-secondary)', marginTop: 16 }}>
                      {t('aiInterview.answer.microphoneHint', 'Nói rõ ràng vào micro. Hệ thống sẽ tự động hoàn tất sau 3 giây yên lặng.')}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontWeight: 600 }}>
                      {t('aiInterview.tips.quietRoomShort', '💡 Mẹo: Hãy phỏng vấn ở phòng kín để GigBridge AI nhận diện âm thanh chuẩn xác nhất.')}
                    </p>
                  </div>
                )}

                {/* State: Recording */}
                {answerState === 'recording' && (
                  <div className="ai-avatar-flex">
                    <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--brand)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatDuration(recordingSeconds)}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ai-text-secondary)', margin: '12px 0 20px' }}>
                      {silenceCountdown === null
                        ? t('aiInterview.recording.finishHint', 'Đang thu âm giọng nói... Bấm Dừng để hoàn tất.')
                        : t('aiInterview.recording.silenceCountdown', { count: silenceCountdown })}
                    </p>

                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="ai-bento-btn ghost" onClick={cancelAnswer}>{t('aiInterview.actions.cancel', 'Hủy')}</button>
                      <button className="ai-bento-btn" onClick={finishAnswer}>
                        <Square size={13} fill="currentColor" /> {t('aiInterview.actions.finishAnswer', 'Dừng thu âm')}
                      </button>
                    </div>
                  </div>
                )}

                {/* State: Transcribing */}
                {answerState === 'transcribing' && (
                  <div className="ai-avatar-flex">
                    <LoaderCircle size={36} className="animate-spin" color="var(--brand)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ai-text-primary)' }}>{t('aiInterview.transcribing.title', 'Chuyển thoại thành văn bản...')}</h3>
                    <p style={{ fontSize: 13, color: 'var(--ai-text-secondary)' }}>{t('aiInterview.transcribing.description', 'GigBridge AI đang xử lý âm thanh.')}</p>
                  </div>
                )}

                {/* State: Review */}
                {answerState === 'review' && (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--ai-text-primary)' }}>
                      {t('aiInterview.review.whatWeHeard', 'Văn bản ghi nhận từ giọng nói của bạn:')}
                    </label>
                    <textarea
                      className="ai-transcript-box"
                      value={transcript}
                      readOnly
                      rows={6}
                    />

                    <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
                      <button className="ai-bento-btn ghost" onClick={recordAgain}>
                        <RotateCcw size={14} /> {t('aiInterview.actions.speakAgain', 'Nói lại')}
                      </button>
                      <button className="ai-bento-btn" style={{ flex: 1 }} onClick={() => void confirmAnswer()}>
                        {t('aiInterview.actions.submitAnswer', 'Xác nhận & Nộp')} <Send size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* State: Submitting */}
                {answerState === 'submitting' && (
                  <div className="ai-avatar-flex">
                    <LoaderCircle size={36} className="animate-spin" color="var(--brand)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ai-text-primary)' }}>{t('aiInterview.submitting.title', 'Đang nộp câu trả lời...')}</h3>
                    <p style={{ fontSize: 13, color: 'var(--ai-text-secondary)' }}>{t('aiInterview.submitting.description', 'Chuyển sang câu hỏi tiếp theo.')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Debug Console */}
            <details style={{ marginTop: 24, fontSize: 12, color: 'var(--ai-text-secondary)', borderTop: '1px solid var(--ai-card-border)', paddingTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}><Bug size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('aiInterview.debug.title', 'Console Kỹ Thuật (Debug)')}</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12, padding: 16, borderRadius: 14, background: 'var(--surface-muted, var(--surface))', border: '1px solid var(--ai-card-border)' }}>
                <div><strong>{t('aiInterview.debug.session', 'Session ID')}:</strong> {sessionId ? `${sessionId.slice(0, 8)}...` : '—'}</div>
                <div><strong>{t('aiInterview.debug.question', 'Câu hỏi')}:</strong> {questionIndex} / {questionCount}</div>
                <div><strong>{t('aiInterview.debug.language', 'Ngôn ngữ')}:</strong> {interviewLanguage}</div>
                <div><strong>TTS Provider:</strong> {ttsProvider} ({ttsState})</div>
                <div><strong>STT Provider:</strong> {sttProvider || '—'}</div>
                <div><strong>{t('aiInterview.debug.confidence', 'Độ tin cậy STT')}:</strong> {sttConfidence ? `${Math.round(sttConfidence * 100)}%` : '—'}</div>
              </div>
            </details>
          </section>
        )}

        {/* ══════════════════════════════════════
            STAGE 3: RESULTS (COMPLETED)
        ══════════════════════════════════════ */}
        {stage === 'results' && (
          <section style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <div className="ai-bento-card" style={{ maxWidth: 560, width: '100%', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success)', display: 'grid', placeItems: 'center', color: '#fff', marginBottom: 20 }}>
                <CheckCircle2 size={36} />
              </div>

              <div className="ai-bento-eyebrow" style={{ color: 'var(--success)', background: 'var(--surface-muted, var(--surface))', borderColor: 'var(--border)' }}>
                {t('aiInterview.complete.eyebrow', 'HOÀN THÀNH PHỎNG VẤN')}
              </div>

              <h1 className="ai-bento-headline" style={{ fontSize: 32, marginBottom: 12 }}>
                {t('aiInterview.complete.title', 'Phỏng vấn thành công!')}
              </h1>

              <p className="ai-bento-sub" style={{ fontSize: 14, marginBottom: 28 }}>
                {t('aiInterview.complete.message', 'Kết quả phỏng vấn thoại cùng GigBridge AI đã được đính kèm trực tiếp vào Hồ sơ của bạn.')}
              </p>

              {jobTitle && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', marginBottom: 24, fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>
                  <Brain size={16} color="var(--brand)" />
                  <span>{t('aiInterview.intro.interviewingFor', 'Dự án')}:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 900 }}>{jobTitle}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', marginBottom: 28, textAlign: 'left' }}>
                <div style={{ padding: 16, border: '1px solid var(--ai-card-border)', borderRadius: 14, background: 'var(--surface-muted, var(--surface))' }}>
                  <BellRing size={18} color="var(--brand)" style={{ marginBottom: 6 }} />
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ai-text-primary)' }}>{t('aiInterview.complete.inAppTitle', 'Thông báo hệ thống')}</div>
                  <div style={{ fontSize: 12, color: 'var(--ai-text-secondary)' }}>{t('aiInterview.complete.inAppDescription', 'Cập nhật tự động')}</div>
                </div>
                <div style={{ padding: 16, border: '1px solid var(--ai-card-border)', borderRadius: 14, background: 'var(--surface-muted, var(--surface))' }}>
                  <Mail size={18} color="var(--brand)" style={{ marginBottom: 6 }} />
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ai-text-primary)' }}>{t('aiInterview.complete.emailTitle', 'Gửi Khách hàng')}</div>
                  <div style={{ fontSize: 12, color: 'var(--ai-text-secondary)' }}>{t('aiInterview.complete.emailDescription', 'Đính kèm Proposal')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button className="ai-bento-btn ghost" style={{ flex: 1 }} onClick={() => navigate('/jobs/browse')}>
                  {t('aiInterview.actions.browseMoreJobs', 'Tìm việc khác')}
                </button>
                <button
                  className="ai-bento-btn"
                  style={{ flex: 1 }}
                  onClick={() => {
                    if (proposalId) {
                      navigate('/proposals', { state: { submittedProposalId: proposalId } });
                    } else {
                      navigate('/freelancer/dashboard');
                    }
                  }}
                >
                  {proposalId ? t('aiInterview.actions.goToProposals', 'Xem Proposal') : t('aiInterview.actions.goToDashboard', 'Trang Quản Lý')}
                </button>
              </div>
            </div>
          </section>
        )}

      </main>
    </AppLayout>
  );
}
