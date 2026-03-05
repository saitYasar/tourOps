'use client';

import Image from 'next/image';

interface SprinterLoadingProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const LOADING_GIF = "https://cdn.dribbble.com/userupload/20209450/file/original-36f329b34b5de4520f02ccf57b712096.gif";

export function SprinterLoading({ message, size = 'md', className }: SprinterLoadingProps) {
  // xs: buton içi inline kullanım (SVG spinner, hydration uyumlu)
  if (size === 'xs') {
    return (
      <svg
        className={`h-4 w-4 animate-spin ${className || ''}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        role="status"
        aria-label="Loading"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    );
  }

  const sizeClasses = {
    sm: { container: 'py-8', img: 'w-32 h-32', text: 'text-sm' },
    md: { container: 'py-12', img: 'w-48 h-48', text: 'text-base' },
    lg: { container: 'py-16', img: 'w-64 h-64', text: 'text-lg' },
  };

  const { container, img, text } = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center justify-center ${container} ${className || ''}`}>
      <div className={`relative ${img}`}>
        <Image
          src={LOADING_GIF}
          alt="Loading..."
          fill
          className="object-contain"
          unoptimized
          priority
        />
      </div>

      {message && (
        <p className={`mt-5 text-neutral-500 ${text} flex items-center gap-1`}>
          {message}
          <span className="inline-flex ml-1">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
          </span>
        </p>
      )}
    </div>
  );
}
