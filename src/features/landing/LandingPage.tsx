const popularSearches = [
  'Lập trình web',
  'Thiết kế UI/UX',
  'Ứng dụng di động',
  'Marketing số',
  'Phân tích dữ liệu',
  'AI và tự động hóa',
] as const;

const clientSteps = [
  ['Đăng nhu cầu', 'Mô tả mục tiêu, kỹ năng cần thiết và ngân sách dự kiến cho dự án.'],
  ['Chọn người phù hợp', 'Khám phá hồ sơ, trao đổi và chọn freelancer phù hợp với công việc.'],
  ['Cộng tác an toàn', 'Theo dõi milestone, hợp đồng và thanh toán trong một quy trình rõ ràng.'],
] as const;

const freelancerSteps = [
  ['Xây dựng hồ sơ', 'Giới thiệu kỹ năng, kinh nghiệm và các sản phẩm nổi bật của bạn.'],
  ['Tìm cơ hội', 'Tìm kiếm việc làm freelance phù hợp và gửi đề xuất trực tiếp.'],
  ['Làm việc và phát triển', 'Hoàn thành milestone, nhận thanh toán và xây dựng uy tín lâu dài.'],
] as const;

const features = [
  {
    icon: 'match',
    title: 'Ghép nối thông minh',
    body: 'Gợi ý cơ hội và nhân tài dựa trên kỹ năng, chuyên môn và nhu cầu thực tế của dự án.',
  },
  {
    icon: 'shield',
    title: 'Milestone minh bạch',
    body: 'Chia công việc thành từng giai đoạn với phạm vi, sản phẩm bàn giao và thanh toán rõ ràng.',
  },
  {
    icon: 'contract',
    title: 'Hợp đồng điện tử',
    body: 'Thống nhất điều khoản và quản lý hợp đồng ngay trong quy trình cộng tác của GigBridge.',
  },
  {
    icon: 'ai',
    title: 'Phỏng vấn hỗ trợ bởi AI',
    body: 'Hỗ trợ sàng lọc năng lực và chuẩn hóa thông tin trước khi hai bên bắt đầu hợp tác.',
  },
] as const;

function FeatureIcon({ name }: { readonly name: string }) {
  if (name === 'shield') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 5.5 5.7v5.2c0 4.4 2.7 8.4 6.5 10.1 3.8-1.7 6.5-5.7 6.5-10.1V5.7L12 3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === 'contract') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.5h7l3 3V20H7V3.5Z" />
        <path d="M14 3.5V7h3M9.5 11h5M9.5 14h5M9.5 17H13" />
      </svg>
    );
  }

  if (name === 'ai') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="6" width="14" height="13" rx="3" />
        <path d="M9 11h.01M15 11h.01M9 15h6M12 3v3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="16" r="3" />
      <path d="m10.2 10.2 3.6 3.6M14 7h4v4M10 17H6v-4" />
    </svg>
  );
}

function SearchPanel() {
  return (
    <div className="landing-search" aria-label="Tìm kiếm trên GigBridge">
      <div className="landing-search-tabs" role="group" aria-label="Chọn loại tìm kiếm">
        <input defaultChecked id="landing-search-talent" name="landing-search-scope" type="radio" />
        <label htmlFor="landing-search-talent">Tôi muốn thuê</label>
        <input id="landing-search-jobs" name="landing-search-scope" type="radio" />
        <label htmlFor="landing-search-jobs">Tôi muốn tìm việc</label>

        <form className="landing-search-form landing-search-form-talent" action="/freelancers" method="get">
          <label className="landing-sr-only" htmlFor="landing-talent-query">Kỹ năng freelancer cần tìm</label>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input id="landing-talent-query" name="q" type="search" placeholder="Bạn cần chuyên gia về lĩnh vực nào?" maxLength={120} />
          <button type="submit">Tìm freelancer</button>
        </form>

        <form className="landing-search-form landing-search-form-jobs" action="/jobs" method="get">
          <label className="landing-sr-only" htmlFor="landing-job-query">Việc làm freelance cần tìm</label>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input id="landing-job-query" name="q" type="search" placeholder="Bạn muốn tìm công việc nào?" maxLength={120} />
          <input name="view" type="hidden" value="all" />
          <button type="submit">Tìm việc</button>
        </form>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      <a className="landing-skip-link" href="#landing-main">Bỏ qua điều hướng</a>

      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <a className="landing-brand" href="/" aria-label="GigBridge - Trang chủ">
            <img src="/apple-touch-icon.png" width="44" height="44" alt="" />
            <span>GigBridge</span>
          </a>

          <nav className="landing-desktop-nav" aria-label="Điều hướng chính">
            <a href="/freelancers">Thuê freelancer</a>
            <a href="/jobs">Tìm việc</a>
            <a href="#how-it-works">Cách hoạt động</a>
            <a href="#why-gigbridge">Vì sao GigBridge</a>
          </nav>

          <div className="landing-header-actions">
            <a className="landing-login" href="/auth/login">Đăng nhập</a>
            <a className="landing-button landing-button-small" href="/auth/signup">Đăng ký</a>
          </div>

          <details className="landing-mobile-menu">
            <summary aria-label="Mở menu điều hướng">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </summary>
            <nav aria-label="Điều hướng trên thiết bị di động">
              <a href="/freelancers">Thuê freelancer</a>
              <a href="/jobs">Tìm việc</a>
              <a href="#how-it-works">Cách hoạt động</a>
              <a href="#why-gigbridge">Vì sao GigBridge</a>
              <a href="/auth/login">Đăng nhập</a>
              <a className="landing-button" href="/auth/signup">Đăng ký miễn phí</a>
            </nav>
          </details>
        </div>
      </header>

      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow"><span /> Nền tảng freelance dành cho người Việt</p>
              <h1 id="landing-title">Kết nối đúng freelancer. <span>Hoàn thành công việc tốt hơn.</span></h1>
              <p className="landing-hero-description">
                GigBridge giúp doanh nghiệp thuê freelancer tại Việt Nam và giúp chuyên gia tiếp cận việc làm freelance phù hợp trong một quy trình minh bạch.
              </p>
              <div className="landing-hero-actions">
                <a className="landing-button" href="/freelancers">Tìm freelancer</a>
                <a className="landing-button landing-button-secondary" href="/jobs">Tìm việc freelance</a>
              </div>
              <SearchPanel />
            </div>

            <div className="landing-hero-visual">
              <picture>
                <source
                  type="image/avif"
                  srcSet="/img/landing-hero-640.avif 640w, /img/landing-hero-960.avif 960w"
                  sizes="(max-width: 900px) 92vw, 46vw"
                />
                <source
                  type="image/webp"
                  srcSet="/img/landing-hero-640.webp 640w, /img/landing-hero-960.webp 960w"
                  sizes="(max-width: 900px) 92vw, 46vw"
                />
                <img
                  src="/img/about.png"
                  width="1024"
                  height="1024"
                  alt="Doanh nghiệp và chuyên gia cùng trao đổi về tiến độ dự án"
                  decoding="async"
                  {...{ fetchpriority: 'high' }}
                />
              </picture>
              <div className="landing-visual-card landing-visual-card-top">
                <span className="landing-status-dot" />
                <div><strong>Ghép nối phù hợp</strong><small>Theo kỹ năng và chuyên môn</small></div>
              </div>
              <div className="landing-visual-card landing-visual-card-bottom">
                <FeatureIcon name="shield" />
                <div><strong>Milestone rõ ràng</strong><small>Cộng tác và thanh toán minh bạch</small></div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-popular" aria-labelledby="popular-searches-title">
          <div className="landing-container">
            <h2 id="popular-searches-title">Tìm kiếm phổ biến</h2>
            <div className="landing-search-links">
              {popularSearches.map(search => (
                <a key={search} href={`/jobs?q=${encodeURIComponent(search)}&view=all`}>{search}</a>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-audiences" aria-labelledby="audiences-title">
          <div className="landing-container">
            <div className="landing-section-heading">
              <p className="landing-eyebrow">Bắt đầu theo cách của bạn</p>
              <h2 id="audiences-title">Một nền tảng, hai con đường để phát triển</h2>
              <p>GigBridge tạo một điểm gặp gỡ rõ ràng cho nhu cầu của doanh nghiệp và mục tiêu nghề nghiệp của freelancer.</p>
            </div>
            <div className="landing-audience-grid">
              <article className="landing-audience-card landing-audience-client">
                <p>Dành cho doanh nghiệp</p>
                <h3>Biến nhu cầu thành kết quả cùng chuyên gia phù hợp</h3>
                <ul>
                  <li>Khám phá hồ sơ công khai theo chuyên môn</li>
                  <li>Quản lý đề xuất, hợp đồng và milestone</li>
                  <li>Theo dõi tiến độ trong workspace chung</li>
                </ul>
                <a href="/freelancers">Khám phá freelancer <span aria-hidden="true">→</span></a>
              </article>
              <article className="landing-audience-card landing-audience-freelancer">
                <p>Dành cho freelancer</p>
                <h3>Tìm dự án phù hợp và xây dựng sự nghiệp bền vững</h3>
                <ul>
                  <li>Tìm việc theo kỹ năng và lĩnh vực quan tâm</li>
                  <li>Gửi đề xuất và trao đổi trực tiếp</li>
                  <li>Xây dựng uy tín qua từng dự án hoàn thành</li>
                </ul>
                <a href="/jobs">Xem việc làm mới <span aria-hidden="true">→</span></a>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-why" id="why-gigbridge" aria-labelledby="why-title">
          <div className="landing-container">
            <div className="landing-section-heading landing-section-heading-left">
              <p className="landing-eyebrow">Vì sao chọn GigBridge</p>
              <h2 id="why-title">Công cụ cần thiết cho một hành trình hợp tác liền mạch</h2>
              <p>Từ lúc tìm thấy nhau đến khi hoàn thành dự án, mọi bước quan trọng đều được kết nối trong cùng một nền tảng.</p>
            </div>
            <div className="landing-feature-grid">
              {features.map(feature => (
                <article className="landing-feature-card" key={feature.title}>
                  <span className="landing-feature-icon"><FeatureIcon name={feature.icon} /></span>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-how" id="how-it-works" aria-labelledby="how-title">
          <div className="landing-container">
            <div className="landing-section-heading">
              <p className="landing-eyebrow">Cách GigBridge hoạt động</p>
              <h2 id="how-title">Từ ý tưởng đến kết quả chỉ với ba bước rõ ràng</h2>
            </div>
            <div className="landing-how-grid">
              <article>
                <div className="landing-how-label">Cho doanh nghiệp</div>
                <ol>
                  {clientSteps.map(([title, body], index) => (
                    <li key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>
                  ))}
                </ol>
                <a className="landing-text-link" href="/auth/signup">Bắt đầu thuê freelancer <span aria-hidden="true">→</span></a>
              </article>
              <article>
                <div className="landing-how-label">Cho freelancer</div>
                <ol>
                  {freelancerSteps.map(([title, body], index) => (
                    <li key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>
                  ))}
                </ol>
                <a className="landing-text-link" href="/auth/signup">Tạo hồ sơ freelancer <span aria-hidden="true">→</span></a>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-faq" aria-labelledby="faq-title">
          <div className="landing-container landing-faq-grid">
            <div className="landing-section-heading landing-section-heading-left">
              <p className="landing-eyebrow">Câu hỏi thường gặp</p>
              <h2 id="faq-title">Những điều bạn cần biết trước khi bắt đầu</h2>
              <a className="landing-text-link" href="/faq">Xem tất cả câu hỏi <span aria-hidden="true">→</span></a>
            </div>
            <div className="landing-faq-list">
              <details>
                <summary>Doanh nghiệp bắt đầu tìm freelancer như thế nào?</summary>
                <p>Bạn có thể khám phá danh sách freelancer công khai, tìm theo kỹ năng và đăng ký tài khoản để trao đổi hoặc gửi lời mời hợp tác.</p>
              </details>
              <details>
                <summary>Freelancer có thể xem việc làm khi chưa đăng nhập không?</summary>
                <p>Có. Các việc làm đang mở và được đặt ở chế độ công khai có thể được xem trước khi đăng nhập. Bạn cần tài khoản để gửi đề xuất.</p>
              </details>
              <details>
                <summary>Milestone giúp hai bên cộng tác như thế nào?</summary>
                <p>Milestone chia dự án thành từng giai đoạn với mục tiêu và sản phẩm bàn giao rõ ràng để hai bên dễ theo dõi và xác nhận tiến độ.</p>
              </details>
              <details>
                <summary>GigBridge hỗ trợ những bước nào trong dự án?</summary>
                <p>Nền tảng kết nối việc tìm kiếm, đề xuất, hợp đồng, trao đổi, quản lý milestone và thanh toán trong cùng một quy trình làm việc.</p>
              </details>
            </div>
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <div className="landing-container landing-final-cta-inner">
            <div>
              <p className="landing-eyebrow">Sẵn sàng bắt đầu?</p>
              <h2 id="final-cta-title">Cùng xây dựng cách làm việc linh hoạt và minh bạch hơn</h2>
            </div>
            <div className="landing-final-actions">
              <a className="landing-button landing-button-light" href="/auth/signup">Tạo tài khoản miễn phí</a>
              <a className="landing-button landing-button-ghost" href="/guide">Xem hướng dẫn</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-grid">
          <div>
            <a className="landing-brand" href="/" aria-label="GigBridge - Trang chủ">
              <img src="/apple-touch-icon.png" width="40" height="40" alt="" loading="lazy" />
              <span>GigBridge</span>
            </a>
            <p>Kết nối doanh nghiệp và freelancer qua một quy trình cộng tác rõ ràng, an toàn và hiệu quả.</p>
          </div>
          <nav aria-label="Khám phá GigBridge">
            <h2>Khám phá</h2>
            <a href="/jobs">Việc làm freelance</a>
            <a href="/freelancers">Freelancer</a>
            <a href="/guide">Hướng dẫn</a>
          </nav>
          <nav aria-label="Thông tin công ty">
            <h2>Công ty</h2>
            <a href="/about">Về GigBridge</a>
            <a href="/careers">Cơ hội nghề nghiệp</a>
            <a href="/faq">Câu hỏi thường gặp</a>
          </nav>
          <nav aria-label="Thông tin pháp lý">
            <h2>Pháp lý</h2>
            <a href="/terms">Điều khoản sử dụng</a>
            <a href="/privacy">Quyền riêng tư</a>
          </nav>
        </div>
        <div className="landing-container landing-footer-bottom">
          <span>© GigBridge. Mọi quyền được bảo lưu.</span>
          <span>Nền tảng freelance dành cho người Việt</span>
        </div>
      </footer>
    </div>
  );
}
