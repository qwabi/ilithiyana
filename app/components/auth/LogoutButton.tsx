'use client';

import { LogOut } from 'lucide-react';
import { signOut } from '@/app/actions/auth-actions';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LogoutButtonProps = {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  label?: string;
};

export function LogoutButton({
  variant = 'outline',
  size = 'sm',
  className,
  showIcon = true,
  label = 'Log out',
}: LogoutButtonProps) {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return null;
  }

  return (
    <form action={signOut}>
      <Button
        type='submit'
        variant={variant}
        size={size}
        className={cn(showIcon && 'gap-2', className)}
      >
        {showIcon ? <LogOut className='h-4 w-4' aria-hidden /> : null}
        {label}
      </Button>
    </form>
  );
}
