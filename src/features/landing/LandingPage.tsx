export default function LandingPage() {
  return (
    <div className="landing-shell">
      <header className="landing-header">
        <a href="/" className="landing-brand">
          <span>GigBridge</span>
        </a>
        <nav className="landing-nav" aria-label="Điều hướng">
          <a href="/jobs">Việc làm</a>
          <a href="/freelancers">Freelancer</a>
          <a href="/guide">Hướng dẫn</a>
          <a href="/auth/login" className="landing-btn-primary">Đăng nhập</a>
        </nav>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-eyebrow">
            <span>Nền tảng Freelance Thông Minh</span>
          </div>
          <h1>Kết nối đúng freelancer. Quản lý dự án minh bạch.</h1>
          <p>
            GigBridge mang lại giải pháp cộng tác toàn diện giữa khách hàng và freelancer thông qua quy trình milestone an toàn, hợp đồng điện tử và hỗ trợ đánh giá AI.
          </p>
          <div className="landing-actions">
            <a href="/jobs" className="landing-btn-primary">Tìm việc freelance</a>
            <a href="/freelancers" className="landing-btn-primary" style={{ background: 'var(--lp-surface-muted)', border: '1px solid var(--lp-border)' }}>Thuê nhân tài</a>
          </div>
        </section>

        <section className="landing-grid" aria-label="Tính năng nổi bật">
          <article className="landing-card">
            <h2>Ghép nối thông minh</h2>
            <p>Thuật toán gợi ý dự án và nhân tài phù hợp theo bộ kỹ năng và chuyên môn thực tế.</p>
          </article>
          <article className="landing-card">
            <h2>Milestone & Ký quỹ an toàn</h2>
            <p>Bảo vệ ngân sách và thanh toán minh bạch theo từng giai đoạn hoàn thành công việc.</p>
          </article>
          <article className="landing-card">
            <h2>Hợp đồng điện tử & Xác thực</h2>
            <p>Thiết lập điều khoản và ký hợp đồng trực tuyến nhanh chóng, có giá trị pháp lý.</p>
          </article>
        </section>
      </main>

      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} GigBridge. Nền tảng kết nối nhân tài hàng đầu.</p>
      </footer>
    </div>
  );
}
