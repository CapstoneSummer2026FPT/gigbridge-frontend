import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bold,
  Code,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Underline as UnderlineIcon,
} from 'lucide-react';
import './styles/MarkdownEditor.css';

interface MarkdownPreviewProps {
  value?: string | null;
  className?: string;
}

interface MarkdownEditorProps extends MarkdownPreviewProps {
  label: string;
  placeholder?: string;
  rows?: number;
  error?: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
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

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`rounded-md p-1.5 transition-colors ${active
        ? 'bg-brand/15 text-brand'
        : 'text-muted-foreground hover:bg-background hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

export function MarkdownEditor({
  label,
  value = '',
  placeholder,
  rows = 6,
  error,
  onChange,
  onFocus,
  className = '',
}: MarkdownEditorProps) {
  // Track whether initial content has been set from a non-empty external value
  const isInitialized = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: placeholder ?? '',
      }),
    ],
    content: '',
    onUpdate({ editor }) {
      onChange(editor.getText({ blockSeparator: '\n' }));
    },
    onFocus() {
      onFocus?.();
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor outline-none p-3 text-sm text-foreground',
        style: `min-height: ${rows * 1.75}rem`,
      },
    },
  });

  // Sync external value → editor content when value loads (e.g., draft hydration)
  // Only do this once when editor is ready AND the state value arrives non-empty
  useEffect(() => {
    if (!editor) return;
    if (isInitialized.current) return;
    if (!value) return;

    // Set content from external state (e.g., loaded draft)
    editor.commands.setContent(
      `<p>${value.replace(/\n/g, '</p><p>')}</p>`,
      { emitUpdate: false },
    );
    isInitialized.current = true;
  }, [editor, value]);

  if (!editor) return null;

  const tools = [
    {
      title: 'Bold',
      icon: <Bold size={15} />,
      active: editor.isActive('bold'),
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      title: 'Italic',
      icon: <Italic size={15} />,
      active: editor.isActive('italic'),
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      title: 'Underline',
      icon: <UnderlineIcon size={15} />,
      active: editor.isActive('underline'),
      action: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      title: 'Heading',
      icon: <Heading2 size={15} />,
      active: editor.isActive('heading', { level: 2 }),
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: 'Bullet list',
      icon: <List size={15} />,
      active: editor.isActive('bulletList'),
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: 'Numbered list',
      icon: <ListOrdered size={15} />,
      active: editor.isActive('orderedList'),
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: 'Code',
      icon: <Code size={15} />,
      active: editor.isActive('code'),
      action: () => editor.chain().focus().toggleCode().run(),
    },
  ];

  const hasError = !!error;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="text-sm font-semibold">{label}</label>}
      <div className={`overflow-hidden rounded-lg border bg-background transition-all focus-within:ring-2 ${
        hasError
          ? 'border-rose-500 focus-within:ring-rose-500/20'
          : 'border-border focus-within:ring-[var(--gb-cyan)]'
      }`}>
        <div className="flex flex-wrap gap-1 border-b border-border bg-muted/30 p-2">
          {tools.map(tool => (
            <ToolbarButton key={tool.title} title={tool.title} active={tool.active} onClick={tool.action}>
              {tool.icon}
            </ToolbarButton>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
      {hasError && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-500">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  );
}
