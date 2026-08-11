import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BookOpen, CalendarDays, FileCheck2, Mail, Printer, Scale, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link, useLocation } from 'react-router';
import { policyAPI } from '../../../api/policyAPI';
import { useTranslation } from '../../../hooks/useTranslation';
import { GuestLayout } from '../../../shared/components/AppLayout';
import '../styles/policy-screen.css';

interface PolicyHeading {
  id: string;
  label: string;
}

const POLICY_VERSION = 'Ver 1.0 Gigbridge';
const POLICY_UPDATED_AT = '10/08/2026';

const plainText = (value: ReactNode): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(plainText).join('');
  if (value && typeof value === 'object' && 'props' in value) {
    return plainText((value as { props?: { children?: ReactNode } }).props?.children);
  }
  return '';
};

const policySlug = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const extractPartHeadings = (markdown: string): PolicyHeading[] => Array.from(
  markdown.matchAll(/^##\s+(.+)$/gm),
  (match) => ({
    id: policySlug(match[1].trim()),
    label: match[1].trim(),
  }),
);

export default function PolicyScreen() {
  const { t } = useTranslation();
  const location = useLocation();
  const loadErrorMessage = t('policy.loadError');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const headings = useMemo(() => extractPartHeadings(content), [content]);

  const loadPolicy = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const response = await policyAPI.getGigBridgeVietnamPolicy();
    if (response.success && typeof response.data === 'string') {
      setContent(response.data);
    } else {
      setError(response.message || loadErrorMessage);
    }

    setIsLoading(false);
  }, [loadErrorMessage]);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  useEffect(() => {
    if (!content) return;

    const routeTarget = location.pathname === '/terms'
      ? 'phan-i-dieu-khoan-su-dung'
      : location.pathname === '/privacy'
        ? 'phan-iii-so-huu-tri-tue-bao-mat-va-du-lieu-ca-nhan'
        : '';
    const targetId = location.hash.slice(1) || routeTarget;

    if (!targetId) return;

    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [content, location.hash, location.pathname]);

  return (
    <GuestLayout>
      <div className="policy-page mx-auto w-full max-w-7xl py-7 sm:py-12">
        <header className="policy-hero">
          <div className="policy-hero__content">
            <span className="policy-kicker"><Scale size={15} /> {t('policy.legalCenter')}</span>
            <h1>{t('policy.pageTitle')}</h1>
            <p>{t('policy.pageDescription')}</p>
            <div className="policy-meta" aria-label={t('policy.documentInfo')}>
              <span><FileCheck2 size={16} /> {t('policy.version', { version: POLICY_VERSION })}</span>
              <span><CalendarDays size={16} /> {t('policy.updatedAt', { date: POLICY_UPDATED_AT })}</span>
            </div>
          </div>
          <div className="policy-hero__mark" aria-hidden="true">
            <ShieldCheck />
          </div>
        </header>

        <nav className="policy-route-nav" aria-label={t('policy.policyViews')}>
          <Link className={location.pathname === '/policies' ? 'is-active' : ''} to="/policies">
            <BookOpen size={17} /> {t('policy.allPolicies')}
          </Link>
          <Link className={location.pathname === '/terms' ? 'is-active' : ''} to="/terms">
            <FileCheck2 size={17} /> {t('policy.terms')}
          </Link>
          <Link className={location.pathname === '/privacy' ? 'is-active' : ''} to="/privacy">
            <ShieldCheck size={17} /> {t('policy.privacy')}
          </Link>
        </nav>

        {isLoading && (
          <div className="policy-state glass-card" role="status">
            <span className="policy-state__loader" aria-hidden="true" />
            <p>{t('policy.loading')}</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="policy-state glass-card" role="alert">
            <ShieldCheck size={34} aria-hidden="true" />
            <p className="text-red-500">{error}</p>
            <button type="button" className="btn-cyan px-5 py-2.5" onClick={() => void loadPolicy()}>
              {t('policy.retry')}
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <div className="policy-layout">
            <aside className="policy-toc glass-card" aria-label={t('policy.tableOfContents')}>
              <div className="policy-toc__heading">
                <BookOpen size={18} />
                <span>{t('policy.tableOfContents')}</span>
              </div>
              <ol>
                {headings.map((heading, index) => (
                  <li key={heading.id}>
                    <a href={`#${heading.id}`}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      {heading.label}
                    </a>
                  </li>
                ))}
              </ol>
              <div className="policy-toc__actions">
                <button type="button" onClick={() => window.print()}>
                  <Printer size={16} /> {t('policy.print')}
                </button>
                <a href="mailto:hello@gigbridge.com">
                  <Mail size={16} /> {t('policy.contact')}
                </a>
              </div>
            </aside>

            <article className="policy-document glass-card" lang="vi">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1>{children}</h1>,
                  h2: ({ children }) => {
                    const label = plainText(children);
                    return <h2 id={policySlug(label)}>{children}</h2>;
                  },
                  h3: ({ children }) => {
                    const label = plainText(children);
                    return <h3 id={policySlug(label)}>{children}</h3>;
                  },
                  a: ({ href, children }) => {
                    const isExternal = /^https?:\/\//i.test(href || '');
                    return (
                      <a
                        href={href}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </article>
          </div>
        )}
      </div>
    </GuestLayout>
  );
}
