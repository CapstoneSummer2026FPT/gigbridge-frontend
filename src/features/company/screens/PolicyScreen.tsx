import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { policyAPI } from '../../../api/policyAPI';
import { useTranslation } from '../../../hooks/useTranslation';
import { GuestLayout } from '../../../shared/components/AppLayout';

export default function PolicyScreen() {
  const { t } = useTranslation();
  const loadErrorMessage = t('policy.loadError');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <GuestLayout>
      <div className="mx-auto w-full max-w-5xl py-8 sm:py-12">
        {isLoading && (
          <div className="glass-card p-8 text-center text-secondary" role="status">
            {t('policy.loading')}
          </div>
        )}

        {!isLoading && error && (
          <div className="glass-card p-8 text-center" role="alert">
            <p className="mb-4 text-red-500">{error}</p>
            <button type="button" className="btn-cyan px-5 py-2.5" onClick={() => void loadPolicy()}>
              {t('policy.retry')}
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <article className="glass-card overflow-x-auto p-6 text-secondary sm:p-10">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="mb-6 text-3xl font-black text-primary sm:text-4xl">{children}</h1>,
                h2: ({ children }) => <h2 className="mb-4 mt-10 text-2xl font-bold text-primary">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-3 mt-7 text-xl font-bold text-primary">{children}</h3>,
                p: ({ children }) => <p className="my-3 leading-7">{children}</p>,
                ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6">{children}</ul>,
                ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6">{children}</ol>,
                blockquote: ({ children }) => <blockquote className="my-5 border-l-4 border-cyan-500 pl-4 italic">{children}</blockquote>,
                table: ({ children }) => <table className="my-6 w-full min-w-xl border-collapse text-left">{children}</table>,
                th: ({ children }) => <th className="border border-white/20 bg-white/5 p-3 font-bold text-primary">{children}</th>,
                td: ({ children }) => <td className="border border-white/20 p-3 align-top">{children}</td>,
                hr: () => <hr className="my-8 border-white/20" />,
                a: ({ href, children }) => {
                  const isExternal = /^https?:\/\//i.test(href || '');
                  return (
                    <a
                      className="font-medium text-cyan-500 underline underline-offset-2 hover:text-cyan-400"
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
        )}
      </div>
    </GuestLayout>
  );
}
