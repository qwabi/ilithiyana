import { LoginForm } from '@/app/components/LoginForm';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';

export default function LoginPage() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-[hsl(var(--light-blue)/0.08)] px-4 py-12'>
      <div className='w-full max-w-md space-y-6'>
        <div className='text-center'>
          <p className='text-xs font-semibold uppercase tracking-widest text-primary'>
            Ilithiyana Academics
          </p>
          <h1 className={`${pageTitle} mt-2`}>Admin</h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            Sign in to manage applications and operations.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
