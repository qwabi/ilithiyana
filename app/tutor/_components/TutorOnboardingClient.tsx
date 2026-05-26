'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveTutorOnboardingProfile } from '@/lib/tutor/actions';
import { provinces, grades } from '@/lib/site-config';
import type { TutorProfileRow, TutorRow } from '@/lib/types/database';

export function TutorOnboardingClient({
  tutor,
  profile,
}: {
  tutor: TutorRow;
  profile: TutorProfileRow;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [province, setProvince] = useState(profile.province ?? '');
  const [idNumber, setIdNumber] = useState(profile.id_number ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [gradesTaught, setGradesTaught] = useState<number[]>(
    profile.grades_taught?.length ? profile.grades_taught : []
  );
  const [pending, startTransition] = useTransition();

  const toggleGrade = (grade: number) => {
    setGradesTaught((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const handleFinish = () => {
    if (!province) {
      toast.error('Select your province');
      return;
    }
    if (gradesTaught.length === 0) {
      toast.error('Select at least one grade you teach');
      return;
    }

    startTransition(async () => {
      const result = await saveTutorOnboardingProfile({
        phone: phone.trim(),
        province,
        idNumber: idNumber.trim(),
        bio: bio.trim(),
        gradesTaught,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Profile complete');
      router.replace('/tutor/dashboard');
      router.refresh();
    });
  };

  return (
    <div className='mx-auto max-w-lg space-y-6'>
      <div>
        <p className='text-xs font-semibold uppercase tracking-wider text-primary'>
          Step {step} of 2
        </p>
        <h1 className='[font-family:var(--font-dm-serif),serif] mt-1 text-3xl text-[hsl(210,100%,25%)]'>
          Complete your tutor profile
        </h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Welcome, {tutor.first_name}. A few details before you access classes and
          timesheets.
        </p>
      </div>

      <div className='rounded-xl border border-border bg-card p-6'>
        {step === 1 ? (
          <div className='space-y-4'>
            <div>
              <Label htmlFor='ophone'>Mobile</Label>
              <Input
                id='ophone'
                type='tel'
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className='mt-1'
              />
            </div>
            <div>
              <Label htmlFor='oprovince'>Province</Label>
              <select
                id='oprovince'
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className='mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
              >
                <option value=''>Select province</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor='oid'>ID number (optional)</Label>
              <Input
                id='oid'
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className='mt-1'
              />
            </div>
            <Button type='button' className='w-full' onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            <div>
              <Label htmlFor='obio'>Short bio</Label>
              <Textarea
                id='obio'
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder='Teaching experience, qualifications, and approach…'
                className='mt-1'
              />
            </div>
            <fieldset>
              <legend className='text-sm font-medium'>Grades you teach</legend>
              <div className='mt-2 flex flex-wrap gap-2'>
                {grades.map((g) => (
                  <button
                    key={g}
                    type='button'
                    onClick={() => toggleGrade(g)}
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      gradesTaught.includes(g)
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    Grade {g}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className='flex gap-2'>
              <Button type='button' variant='outline' onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                type='button'
                className='flex-1'
                disabled={pending}
                onClick={handleFinish}
              >
                {pending ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Saving…
                  </>
                ) : (
                  'Finish setup'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
