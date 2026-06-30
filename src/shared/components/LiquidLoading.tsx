import React from 'react';
import '../styles/LiquidLoading.css';

interface LiquidLoadingProps {
  readonly message?: string;
  readonly overlay?: boolean;
  readonly className?: string;
}

export function LiquidLoading({ message = 'Đang xử lý...', overlay = false, className = '' }: LiquidLoadingProps) {
  const content = (
    <div className={`liquid-loader-wrapper ${overlay ? '' : className}`}>
      <div className="liquid-blob-container">
        <div className="liquid-blob-glow"></div>
        <div className="liquid-blob-main"></div>
        <div className="liquid-blob-highlight"></div>
        <div className="liquid-blob-glass"></div>
        <div className="liquid-blob-label">G</div>
        <div className="liquid-bubbles">
          <div className="liquid-bubble-dot"></div>
          <div className="liquid-bubble-dot"></div>
          <div className="liquid-bubble-dot"></div>
        </div>
      </div>
      {message && (
        <p className="text-sm font-bold text-mint-pulse tracking-wide select-none">
          {message}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 animate-fade-in">
        {content}
      </div>
    );
  }

  return content;
}
