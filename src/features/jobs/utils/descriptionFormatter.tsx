import React from 'react';

/**
 * Renders a plain-text description with bold headers for any uppercase lines.
 */
export function renderDescription(text: string | null | undefined): React.ReactNode {
  if (!text) return null;

  return text.split('\n').map((line, index) => {
    const trimmed = line.trim();

    // A line is considered a header if it is:
    // - between 3 and 50 characters long
    // - completely uppercase
    // - not just numbers, bullet points, or punctuation
    const isHeader =
      trimmed.length >= 3 &&
      trimmed.length < 50 &&
      trimmed === trimmed.toUpperCase() &&
      !/^[-\*\d\.\s]+$/.test(trimmed) &&
      !trimmed.startsWith('-') &&
      !trimmed.startsWith('*');

    if (isHeader) {
      return (
        <div key={index} className="font-bold text-foreground mt-4 mb-2 first:mt-0 uppercase tracking-wide">
          {trimmed}
        </div>
      );
    }

    return (
      <div key={index} className="min-h-[1.2em]">
        {line}
      </div>
    );
  });
}
