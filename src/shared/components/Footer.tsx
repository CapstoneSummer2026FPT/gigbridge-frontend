import { useNavigate } from 'react-router';
import { Github, Twitter, Linkedin, Mail, ArrowRight } from 'lucide-react';
import { useScrollRestoration } from '../../hooks/useScrollRestoration';
import './styles/footer.css';

export function Footer() {
  const navigate = useNavigate();
  const { saveScrollPosition } = useScrollRestoration();

  const footerSections = [
    {
      title: 'Platform',
      links: [
        { label: 'Browse Jobs', path: '/jobs/browse' },
        { label: 'How It Works', path: '/guide' },
        { label: 'Market Insights', path: '/market-insights' },
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', path: '/about' },
        { label: 'Careers', path: '/careers' },
        { label: 'Press Kit', path: '/press-kit' },
      ]
    },
    {
      title: 'Support',
      links: [
        { label: 'FAQ', path: '/faq' },
        { label: 'Contact', path: '/about#contact' },
        { label: 'Privacy Policy', path: '/privacy' },
        { label: 'Terms of Service', path: '/terms' },
      ]
    }
  ];

  const socialLinks = [
    { icon: <Twitter size={20} />, url: '#', label: 'Twitter' },
    { icon: <Github size={20} />, url: '#', label: 'GitHub' },
    { icon: <Linkedin size={20} />, url: '#', label: 'LinkedIn' },
    { icon: <Mail size={20} />, url: 'mailto:hello@gigbridge.com', label: 'Email' },
  ];

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Top Section */}
        <div className="footer-top">
          {/* Brand Section */}
          <div className="footer-brand">
            <div className="footer-logo" onClick={() => {
              saveScrollPosition();
              navigate('/');
            }}>
              <img
                src="/img/logo.png"
                alt="GigBridge Logo"
                className="footer-logo-img"
              />
              <span className="footer-logo-text">GigBridge</span>
            </div>
            <p className="footer-brand-desc">
              AI-powered freelance marketplace connecting businesses with top talent through intelligent matching and automated interviews.
            </p>
            <div className="footer-social">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-link"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Sections */}
          {footerSections.map((section) => (
            <div key={section.title} className="footer-section">
              <h3 className="footer-section-title">{section.title}</h3>
              <ul className="footer-links">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => {
                        saveScrollPosition();
                        navigate(link.path);
                      }}
                      className="footer-link"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Section */}
        <div className="footer-newsletter">
          <div className="footer-newsletter-content">
            <h3 className="footer-newsletter-title">Stay Updated</h3>
            <p className="footer-newsletter-desc">
              Get the latest news, insights, and job opportunities delivered to your inbox.
            </p>
          </div>
          <form className="footer-newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email"
              className="footer-newsletter-input"
            />
            <button type="submit" className="footer-newsletter-btn">
              Subscribe
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Bottom Section */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {new Date().getFullYear()} GigBridge. All rights reserved.
          </p>
          <div className="footer-bottom-links">
            <button onClick={() => {
              saveScrollPosition();
              navigate('/privacy');
            }} className="footer-bottom-link">
              Privacy
            </button>
            <button onClick={() => {
              saveScrollPosition();
              navigate('/terms');
            }} className="footer-bottom-link">
              Terms
            </button>
            <button onClick={() => {
              saveScrollPosition();
              navigate('/faq');
            }} className="footer-bottom-link">
              Help
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
