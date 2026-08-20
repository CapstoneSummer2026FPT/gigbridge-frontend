import { useState, type FormEvent, useRef, useEffect } from 'react';
import { Crown, Sparkles, LoaderCircle, ArrowUp, Code2, Palette, PenTool, Eraser, X, Paperclip, FileText, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { parseJobDocument, combineAndTrimJobDocuments } from '../utils/documentParser';
import { PostJobTrimWarningModal } from './PostJobTrimWarningModal';

interface Props {
  isPremium: boolean;
  isLoading: boolean;
  onGenerate: (prompt: string) => Promise<void>;
  onUpgrade: () => void;
  onClose: () => void;
}

interface AttachedFileItem {
  name: string;
  text: string;
  charCount: number;
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
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileItem[]>([]);
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [isTrimModalOpen, setIsTrimModalOpen] = useState(false);
  const [hasConfirmedTrim, setHasConfirmedTrim] = useState(false);

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
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setIsParsingDoc(true);
    setParseError(null);

    try {
      const newItems: AttachedFileItem[] = [];
      for (const file of selectedFiles) {
        // Skip duplicate filenames if already attached
        if (attachedFiles.some(f => f.name === file.name)) continue;
        const result = await parseJobDocument(file);
        newItems.push({
          name: result.fileName,
          text: result.text,
          charCount: result.charCount,
        });
      }

      if (newItems.length > 0) {
        setAttachedFiles(prev => [...prev, ...newItems]);
        setHasConfirmedTrim(false);
      }
    } catch (err: any) {
      if (err.message === 'FILE_TOO_LARGE') {
        setParseError(t('postJobWizard.ai.fileTooLarge', 'File size exceeds 10 MB limit.'));
      } else if (err.message === 'UNSUPPORTED_FORMAT') {
        setParseError(t('postJobWizard.ai.unsupportedFormat', 'Unsupported file format. Please upload .docx, .pdf, .txt, or .md.'));
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

  const removeAttachment = (fileName: string) => {
    setAttachedFiles(prev => prev.filter(f => f.name !== fileName));
    setParseError(null);
    setHasConfirmedTrim(false);
  };

  const clearAllAttachments = () => {
    setAttachedFiles([]);
    setParseError(null);
    setHasConfirmedTrim(false);
  };

  const combinedDocs = combineAndTrimJobDocuments(
    attachedFiles.map(f => ({ fileName: f.name, text: f.text }))
  );

  const rawTotalCharCount = attachedFiles.reduce((acc, f) => acc + f.charCount, 0);

  const executeGeneration = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt && !combinedDocs.text) return;

    const finalPrompt = combinedDocs.text
      ? `${trimmedPrompt}\n\n${combinedDocs.text}`.trim()
      : trimmedPrompt;

    await onGenerate(finalPrompt);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isPremium || isLoading || isParsingDoc) return;
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt && !combinedDocs.text) return;

    if (rawTotalCharCount > 15000 && !hasConfirmedTrim) {
      setIsTrimModalOpen(true);
      return;
    }

    await executeGeneration();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((prompt.trim() || combinedDocs.text) && !isLoading && !isParsingDoc && isPremium) {
        if (rawTotalCharCount > 15000 && !hasConfirmedTrim) {
          setIsTrimModalOpen(true);
          return;
        }
        void executeGeneration();
      }
    }
  };

  const handleConfirmTrimModal = () => {
    setHasConfirmedTrim(true);
    setIsTrimModalOpen(false);
    void executeGeneration();
  };

  const canSubmit = Boolean((prompt.trim() || combinedDocs.text) && !isLoading && !isParsingDoc);

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
            multiple
            accept=".docx,.pdf,.txt,.md"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isLoading || isParsingDoc}
          />

          {/* Horizontal ChatGPT Input Bar */}
          <form onSubmit={submit} className="job-post-ai-bar__form">
            {/* Attachment / Parsing Status Badge */}
            {(isParsingDoc || attachedFiles.length > 0 || parseError) && (
              <div className="px-3 pt-2 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2 text-xs">
                {isParsingDoc && (
                  <div className="flex items-center gap-2 text-[var(--brand)] font-medium">
                    <LoaderCircle size={14} className="animate-spin" />
                    <span>{t('postJobWizard.ai.extractingText', 'Extracting document text...')}</span>
                  </div>
                )}

                {attachedFiles.length > 0 && !isParsingDoc && (
                  <div className="flex flex-wrap items-center gap-2">
                    {attachedFiles.map(file => (
                      <div
                        key={file.name}
                        className="flex items-center gap-1.5 bg-[var(--surface-muted)] px-2.5 py-1 rounded-md text-foreground font-medium border border-[var(--border)]"
                      >
                        <FileText size={14} className="text-blue-500 shrink-0" />
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(file.name)}
                          className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                          title="Remove document"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}

                    <span className="text-[10px] bg-[var(--brand)]/10 text-[var(--brand)] font-bold px-2 py-0.5 rounded">
                      Total: {combinedDocs.charCount.toLocaleString()} / 15,000 chars {combinedDocs.isTruncated && '(capped at 15k)'}
                    </span>

                    {attachedFiles.length > 1 && (
                      <button
                        type="button"
                        onClick={clearAllAttachments}
                        className="text-[10px] text-muted-foreground hover:text-destructive underline ml-1"
                      >
                        Remove all
                      </button>
                    )}
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
                placeholder={attachedFiles.length > 0 ? t('postJobWizard.ai.placeholderWithDoc', 'Add additional requirements or instructions...') : t('postJobWizard.ai.placeholder')}
                rows={1}
                disabled={isLoading || isParsingDoc}
                maxLength={5000}
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="job-post-ai-bar__clear-btn hover:text-[var(--brand)]"
                  onClick={() => fileInputRef.current?.click()}
                  title={t('postJobWizard.ai.attachFile', 'Attach document (.docx, .pdf, .txt, .md)')}
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

          {/* Document Trim Confirmation Modal */}
          <PostJobTrimWarningModal
            isOpen={isTrimModalOpen}
            totalCharCount={rawTotalCharCount}
            onConfirmTrim={handleConfirmTrimModal}
            onCancel={() => setIsTrimModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
