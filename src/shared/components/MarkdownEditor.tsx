import { useState } from 'react';
import {
  Bold,
  Code,
  Eye,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Pencil,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  value?: string | null;
  className?: string;
}

interface MarkdownEditorProps extends MarkdownPreviewProps {
  label: string;
  placeholder?: string;
  rows?: number;
  onChange: (value: string) => void;
}

const previewClass = 'prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-pre:overflow-x-auto';

export function MarkdownPreview({ value, className = '' }: MarkdownPreviewProps) {
  if (!value?.trim()) return null;
  return (
    <div className={`${previewClass} ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
    </div>
  );
}

export function MarkdownEditor({ label, value = '', placeholder, rows = 6, onChange, className = '' }: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  const wrapSelection = (before: string, after = before) => {
    const active = document.activeElement as HTMLTextAreaElement | null;
    if (!active || active.tagName !== 'TEXTAREA') {
      onChange(`${value}${before}${after}`);
      return;
    }
    const start = active.selectionStart;
    const end = active.selectionEnd;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${before}${selected || 'text'}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      active.focus();
      active.setSelectionRange(start + before.length, start + before.length + (selected || 'text').length);
    });
  };

  const prefixLine = (prefix: string) => {
    const active = document.activeElement as HTMLTextAreaElement | null;
    if (!active || active.tagName !== 'TEXTAREA') {
      onChange(`${value}${value.endsWith('\n') || !value ? '' : '\n'}${prefix}`);
      return;
    }
    const start = active.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    onChange(`${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`);
    requestAnimationFrame(() => active.focus());
  };

  const tools = [
    { title: 'Bold', icon: <Bold size={15} />, action: () => wrapSelection('**') },
    { title: 'Italic', icon: <Italic size={15} />, action: () => wrapSelection('_') },
    { title: 'Heading', icon: <Heading2 size={15} />, action: () => prefixLine('## ') },
    { title: 'Bullet list', icon: <List size={15} />, action: () => prefixLine('- ') },
    { title: 'Numbered list', icon: <ListOrdered size={15} />, action: () => prefixLine('1. ') },
    { title: 'Link', icon: <Link size={15} />, action: () => wrapSelection('[', '](https://)') },
    { title: 'Code', icon: <Code size={15} />, action: () => wrapSelection('`') },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold">{label}</label>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
          <button type="button" title="Edit" onClick={() => setMode('edit')} className={`rounded-md p-1.5 ${mode === 'edit' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}>
            <Pencil size={14} />
          </button>
          <button type="button" title="Preview" onClick={() => setMode('preview')} className={`rounded-md p-1.5 ${mode === 'preview' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}>
            <Eye size={14} />
          </button>
        </div>
      </div>
      {mode === 'edit' ? (
        <div className="overflow-hidden rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-[var(--gb-cyan)]">
          <div className="flex flex-wrap gap-1 border-b border-border bg-muted/30 p-2">
            {tools.map(tool => (
              <button key={tool.title} type="button" title={tool.title} onClick={tool.action} className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground">
                {tool.icon}
              </button>
            ))}
          </div>
          <textarea
            value={value}
            onChange={event => onChange(event.target.value)}
            rows={rows}
            placeholder={placeholder}
            className="w-full resize-y border-none bg-transparent p-3 text-sm text-foreground outline-none"
          />
        </div>
      ) : (
        <div className="min-h-36 rounded-lg border border-border bg-background p-3 text-sm">
          {value?.trim() ? <MarkdownPreview value={value} /> : <p className="text-muted-foreground">Nothing to preview.</p>}
        </div>
      )}
    </div>
  );
}
