import { useState, type FormEvent, useRef, useEffect } from 'react';
import { Crown, Sparkles, LoaderCircle, ArrowUp, Code2, Palette, PenTool, Eraser, X, Paperclip, FileText, FileArchive, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { parseJobDocument } from '../utils/documentParser';

interface Props {
  isPremium: boolean;
  isLoading: boolean;
  onGenerate: (prompt: string) => Promise<void>;
  onUpgrade: () => void;
  onClose: () => void;
}

const PRESETS = [
  {
    text: 'Build a responsive SaaS analytics dashboard with React, TypeScript and REST API integration.',
    label: 'SaaS Dashboard',
    desc: 'React & TS Stack',
    icon: Code2,
  },
  {
    text: 'Design a mobile fintech product in Figma, including user flows, a component library and developer handoff.',
    label: 'Fintech UI/UX',
    desc: 'Figma Design System',
    icon: Palette,
  },
  {
    text: 'Write five technical SEO articles for software engineers and startup founders.',
    label: 'SEO Articles',
    desc: 'Technical Copywriting',
    icon: PenTool,
  },
];

export function PostJobAiInput({ isPremium, isLoading, onGenerate, onUpgrade, onClose }: Props) {
  const { t } = useTranslation(['jobs', 'common']);
  const [prompt, setPrompt] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ charCount: number; fileType: string; isTruncated: boolean } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFile(file);
    setIsParsingDoc(true);
    setParseError(null);

    try {
      const result = await parseJobDocument(file);
      setExtractedText(result.text);
      setFileMeta({
        charCount: result.charCount,
        fileType: result.fileType,
        isTruncated: result.isTruncated,
      });
    } catch (err: any) {
      setAttachedFile(null);
      setExtractedText('');
      setFileMeta(null);
      if (err.message === 'FILE_TOO_LARGE') {
        setParseError(t('postJobWizard.ai.fileTooLarge', 'File size exceeds 10 MB limit.'));
      } else if (err.message === 'UNSUPPORTED_FORMAT') {
        setParseError(t('postJobWizard.ai.unsupportedFormat', 'Unsupported file format. Please upload .docx, .pdf, .txt, .md, or .zip.'));
      } else {
        setParseError(t('postJobWizard.ai.parsingFailed', 'Could not read document. Please check the file and try again.'));
      }
    } finally {
      setIsParsingDoc(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    setExtractedText('');
    setFileMeta(null);
    setParseError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isPremium || isLoading || isParsingDoc) return;
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt && !extractedText) return;

    const finalPrompt = extractedText
      ? `${trimmedPrompt}\n\n--- ATTACHED SPECIFICATION DOCUMENT (${attachedFile?.name}) ---\n${extractedText}`
      : trimmedPrompt;

    await onGenerate(finalPrompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((prompt.trim() || extractedText) && !isLoading && !isParsingDoc && isPremium) {
        const finalPrompt = extractedText
          ? `${prompt.trim()}\n\n--- ATTACHED SPECIFICATION DOCUMENT (${attachedFile?.name}) ---\n${extractedText}`
          : prompt.trim();
        void onGenerate(finalPrompt);
      }
    }
  };

  const canSubmit = Boolean((prompt.trim() || extractedText) && !isLoading && !isParsingDoc);

  return (
    <div className="job-post-ai-bar-container">
      {!isPremium ? (
        <div className="job-post-ai-bar-locked">
          <div className="flex items-center gap-3">
            <div className="job-post-ai-bar-locked__icon">
              <Crown size={16} />
            </div>
            <div className="text-left">
              <strong className="block text-sm text-foreground">{t('postJobWizard.ai.lockedTitle')}</strong>
              <p className="text-xs text-muted-foreground">{t('postJobWizard.ai.lockedDescription')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="job-post-ai-bar-locked__upgrade-btn" onClick={onUpgrade}>
              <Sparkles size={13} />
              {t('postJobWizard.ai.upgrade')}
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-[var(--surface-muted)] transition-colors"
              onClick={onClose}
              aria-label="Close AI Mode"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="job-post-ai-bar-wrap">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf,.txt,.md,.zip"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isLoading || isParsingDoc}
          />

          {/* Horizontal ChatGPT Input Bar */}
          <form onSubmit={submit} className="job-post-ai-bar__form">
            {/* Attachment / Parsing Status Badge */}
            {(isParsingDoc || attachedFile || parseError) && (
              <div className="px-3 pt-2 flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2 text-xs">
                {isParsingDoc && (
                  <div className="flex items-center gap-2 text-[var(--brand)] font-medium">
                    <LoaderCircle size={14} className="animate-spin" />
                    <span>{t('postJobWizard.ai.extractingText', 'Extracting document text...')}</span>
                  </div>
                )}

                {attachedFile && !isParsingDoc && (
                  <div className="flex items-center gap-2 bg-[var(--surface-muted)] px-2.5 py-1 rounded-md text-foreground font-medium border border-[var(--border)]">
                    {fileMeta?.fileType === 'ZIP' ? (
                      <FileArchive size={14} className="text-amber-500" />
                    ) : (
                      <FileText size={14} className="text-blue-500" />
                    )}
                    <span className="max-w-[200px] truncate">{attachedFile.name}</span>
                    {fileMeta && (
                      <span className="text-[10px] bg-[var(--brand)]/10 text-[var(--brand)] font-bold px-1.5 py-0.5 rounded">
                        {fileMeta.charCount.toLocaleString()} chars {fileMeta.isTruncated && '(capped)'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={removeAttachment}
                      className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                      title="Remove document"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {parseError && (
                  <div className="flex items-center gap-1.5 text-destructive text-xs font-medium">
                    <AlertCircle size={14} />
                    <span>{parseError}</span>
                  </div>
                )}
              </div>
            )}

            <div className="job-post-ai-bar__input-area">
              <div className="job-post-ai-bar__sparkle-icon">
                <Sparkles size={18} className="text-[var(--brand)]" />
              </div>
              <textarea
                ref={textareaRef}
                className="job-post-ai-bar__textarea"
                value={prompt}
                onChange={event => setPrompt(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={attachedFile ? t('postJobWizard.ai.placeholderWithDoc', 'Add additional requirements or instructions...') : t('postJobWizard.ai.placeholder')}
                rows={1}
                disabled={isLoading || isParsingDoc}
                maxLength={5000}
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="job-post-ai-bar__clear-btn hover:text-[var(--brand)]"
                  onClick={() => fileInputRef.current?.click()}
                  title={t('postJobWizard.ai.attachFile', 'Attach document (.docx, .pdf, .txt, .md, .zip)')}
                  disabled={isLoading || isParsingDoc}
                >
                  <Paperclip size={16} />
                </button>
                {prompt.trim() && (
                  <button
                    type="button"
                    className="job-post-ai-bar__clear-btn"
                    onClick={() => setPrompt('')}
                    title="Clear input"
                    disabled={isLoading || isParsingDoc}
                  >
                    <Eraser size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="job-post-ai-bar__toolbar">
              <div className="job-post-ai-bar__presets">
                {PRESETS.map((preset) => {
                  const IconComponent = preset.icon;
                  return (
                    <button
                      type="button"
                      key={preset.label}
                      className="job-post-ai-bar__preset-pill"
                      onClick={() => setPrompt(preset.text)}
                      disabled={isLoading || isParsingDoc}
                    >
                      <IconComponent size={12} className="text-[var(--brand)]" />
                      <span className="font-bold text-[11px]">{preset.label}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline-block">· {preset.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="job-post-ai-bar__counter text-[10px] text-muted-foreground font-semibold">
                  {prompt.length}/5000
                </span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground font-bold px-2.5 py-1 rounded-md hover:bg-[var(--surface-muted)] transition-colors"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="job-post-ai-bar__generate"
                  disabled={!canSubmit}
                  title={isLoading ? t('postJobWizard.ai.generating') : t('postJobWizard.ai.generate')}
                >
                  {isLoading ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <ArrowUp size={16} />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
