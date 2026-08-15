import {
  useCallback,
  useEffect,
  useRef,
  type FormEvent,
  type TextareaHTMLAttributes,
} from 'react';

export interface AutoGrowTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
}

export function AutoGrowTextarea({
  minRows = 1,
  onInput,
  value,
  ...props
}: AutoGrowTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback((textarea = textareaRef.current) => {
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();

    const handleWindowResize = () => resizeTextarea();
    window.addEventListener('resize', handleWindowResize);

    return () => window.removeEventListener('resize', handleWindowResize);
  }, [resizeTextarea, value]);

  const handleInput = (event: FormEvent<HTMLTextAreaElement>) => {
    resizeTextarea(event.currentTarget);
    onInput?.(event);
  };

  return (
    <textarea
      {...props}
      ref={textareaRef}
      rows={minRows}
      value={value}
      onInput={handleInput}
    />
  );
}
