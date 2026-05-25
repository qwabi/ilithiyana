'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { loginAdmin } from '@/app/actions/admin-actions';

const loginCard =
  'rounded-xl border-[0.5px] border-border bg-white shadow-sm';
const loginInput =
  'h-11 rounded-lg border border-input bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await loginAdmin(email.trim(), password);

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push('/admin/dashboard');
    router.refresh();
  };

  return (
    <Card className={loginCard}>
      <CardHeader className='pb-4'>
        <CardTitle className='text-lg font-semibold text-foreground'>
          Login
        </CardTitle>
      </CardHeader>
      <form
        onSubmit={handleSubmit}
        className='!m-0 !rounded-none !border-0 !p-0 !shadow-none'
      >
        <CardContent className='space-y-4'>
          {error ? (
            <p className='text-sm text-destructive' role='alert'>
              {error}
            </p>
          ) : null}
          <div className='space-y-2'>
            <Label htmlFor='email' className='text-sm font-medium'>
              Email
            </Label>
            <Input
              id='email'
              type='email'
              autoComplete='username'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={loginInput}
              required
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='password' className='text-sm font-medium'>
              Password
            </Label>
            <Input
              id='password'
              type='password'
              autoComplete='current-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={loginInput}
              required
            />
          </div>
        </CardContent>
        <CardFooter className='pt-2'>
          <Button
            type='submit'
            variant='secondary'
            className='h-11 w-full font-semibold'
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Log in'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
