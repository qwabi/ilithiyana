'use client';

import { ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';

export type DocumentViewerProps = {
  url?: string | null;
  title?: string;
  mimeType?: string;
  className?: string;
  /** Height of the preview area */
  height?: number | string;
};

function isImageUrl(url: string, mimeType?: string) {
  if (mimeType?.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url);
}

function isPdf(url: string, mimeType?: string) {
  if (mimeType === 'application/pdf') return true;
  return /\.pdf(\?|$)/i.test(url);
}

export function DocumentViewer({
  url,
  title = 'Document',
  mimeType,
  className,
  height = 480,
}: DocumentViewerProps) {
  if (!url) {
    return (
      <EmptyState
        icon={FileText}
        title='No document'
        description='Upload or select a file to preview it here.'
        className={className}
      />
    );
  }

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-white',
        className,
      )}
    >
      <div className='flex items-center justify-between gap-2 border-b border-border px-4 py-3'>
        <p className='truncate text-sm font-medium text-[#0F2942]'>{title}</p>
        <Button asChild variant='ghost' size='sm'>
          <a href={url} target='_blank' rel='noopener noreferrer'>
            <ExternalLink className='mr-1 h-4 w-4' />
            Open
          </a>
        </Button>
      </div>

      <div
        className='relative bg-[#F8FAFC]'
        style={{ minHeight: heightStyle }}
      >
        {isImageUrl(url, mimeType) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={title}
            className='mx-auto max-h-full w-full object-contain p-4'
            style={{ maxHeight: heightStyle }}
          />
        ) : isPdf(url, mimeType) ? (
          <iframe
            src={url}
            title={title}
            className='h-full w-full border-0'
            style={{ height: heightStyle }}
          />
        ) : (
          <div className='flex flex-col items-center justify-center gap-3 p-8 text-center'>
            <FileText className='h-10 w-10 text-[#1B6CA8]' />
            <p className='text-sm text-muted-foreground'>
              Preview not available for this file type.
            </p>
            <Button asChild variant='secondary' size='sm'>
              <a href={url} target='_blank' rel='noopener noreferrer'>
                Download file
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
