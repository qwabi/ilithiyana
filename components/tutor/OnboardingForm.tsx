'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { grades, provinces } from '@/lib/site-config';
import { saveTutorOnboardingProfile } from '@/lib/tutor/actions';

export function OnboardingForm({
  defaults,
}: {
  defaults: {
    phone: string;
    province: string;
    idNumber: string;
    bio: string;
    gradesTaught: number[];
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState(defaults.phone);
  const [province, setProvince] = useState(defaults.province);
  const [idNumber, setIdNumber] = useState(defaults.idNumber);
  const [bio, setBio] = useState(defaults.bio);
  const [gradesTaught, setGradesTaught] = useState<number[]>(defaults.gradesTaught);

  const toggleGrade = (grade: number) => {
    setGradesTaught((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveTutorOnboardingProfile({
        phone,
        province,
        idNumber,
        bio,
        gradesTaught,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Profile complete');
      router.push('/tutor/dashboard');
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-2'>
        <div>
          <Label htmlFor='phone'>Phone</Label>
          <Input
            id='phone'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className='mt-1'
          />
        </div>
        <div>
          <Label>Province</Label>
          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger className='mt-1'>
              <SelectValue placeholder='Province' />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor='idNumber'>ID number</Label>
        <Input
          id='idNumber'
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          className='mt-1'
        />
      </div>
      <div>
        <Label htmlFor='bio'>Short bio</Label>
        <Textarea
          id='bio'
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className='mt-1'
        />
      </div>
      <div>
        <Label className='mb-2 block'>Grades you teach</Label>
        <div className='flex flex-wrap gap-2'>
          {grades.map((g) => (
            <button
              key={g}
              type='button'
              onClick={() => toggleGrade(g)}
              className={`rounded-full px-3 py-1 text-sm ${
                gradesTaught.includes(g)
                  ? 'bg-[#1B6CA8] text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              Grade {g}
            </button>
          ))}
        </div>
      </div>
      <Button
        type='submit'
        disabled={pending || gradesTaught.length < 1}
        className='rounded-full bg-[#1B6CA8] hover:bg-[#1B6CA8]/90'
      >
        {pending ? 'Saving…' : 'Continue to dashboard'}
      </Button>
    </form>
  );
}
