'use client';

import { SprinterLoading } from './SprinterLoading';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ message, size = 'lg' }: LoadingStateProps) {
  return <SprinterLoading message={message} size={size} />;
}
