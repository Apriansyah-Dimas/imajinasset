import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Loading({ message = 'Loading...', size = 'md', className }: LoadingProps) {
  return (
    <div className={cn('flex items-center gap-2 text-gray-600', className)}>
      <LoadingSpinner size={size} />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}

export function PageLoading({ message = 'Loading page...' }: { message?: string }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

export function InlineLoading({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <LoadingSpinner size="sm" />
      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  );
}