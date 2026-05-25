'use client';

import type * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps extends ButtonProps {
  children: React.ReactNode;
}

export function AnimatedButton({
  className,
  variant = 'default',
  size = 'default',
  children,
  asChild = false,
  ...props
}: AnimatedButtonProps) {
  return (
    <Button
      className={cn('transition-colors duration-200', className)}
      variant={variant}
      size={size}
      asChild={asChild}
      {...props}
    >
      {children}
    </Button>
  );
}
