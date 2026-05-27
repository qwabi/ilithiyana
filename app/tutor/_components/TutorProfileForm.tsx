'use client';

import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateTutorProfileAction } from '@/lib/tutor/actions';
import { provinces, subjects as tutoringSubjects } from '@/lib/site-config';
import type { TutorProfileRow, TutorRow } from '@/lib/types/database';

export function TutorProfileForm({
  tutor,
  profile,
}: {
  tutor: TutorRow;
  profile: TutorProfileRow;
}) {
  const [firstName, setFirstName] = useState(tutor.first_name);
  const [lastName, setLastName] = useState(tutor.last_name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [province, setProvince] = useState(profile.province ?? '');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    tutor.subjects ?? []
  );
  const [pending, startTransition] = useTransition();

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateTutorProfileAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        province,
        subjects: selectedSubjects,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Profile updated');
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='max-w-lg space-y-4 rounded-xl border border-border bg-card p-6'
    >
      <div className='grid gap-4 sm:grid-cols-2'>
        <div>
          <Label htmlFor='pfn'>First name</Label>
          <Input
            id='pfn'
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className='mt-1'
          />
        </div>
        <div>
          <Label htmlFor='pln'>Last name</Label>
          <Input
            id='pln'
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className='mt-1'
          />
        </div>
      </div>
      <div>
        <Label>Email</Label>
        <Input value={tutor.email} disabled className='mt-1 bg-muted' />
      </div>
      <div>
        <Label htmlFor='pphone'>Mobile</Label>
        <Input
          id='pphone'
          type='tel'
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className='mt-1'
        />
      </div>
      <div>
        <Label htmlFor='pprovince'>Province</Label>
        <select
          id='pprovince'
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
      <fieldset>
        <legend className='text-sm font-medium'>Subjects</legend>
        <div className='mt-2 flex flex-wrap gap-2'>
          {tutoringSubjects.map((subject) => (
            <button
              key={subject}
              type='button'
              onClick={() => toggleSubject(subject)}
              className={`rounded-full px-3 py-1 text-sm ${
                selectedSubjects.includes(subject)
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      </fieldset>
      <Button type='submit' disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
