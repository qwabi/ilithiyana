'use client';

import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { provinces, subjects } from '@/lib/site-config';
import { updateTutorProfileAction } from '@/lib/tutor/actions';

export function TutorProfileForm({
  defaults,
}: {
  defaults: {
    firstName: string;
    lastName: string;
    phone: string;
    province: string;
    subjects: string[];
  };
}) {
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(defaults.firstName);
  const [lastName, setLastName] = useState(defaults.lastName);
  const [phone, setPhone] = useState(defaults.phone);
  const [province, setProvince] = useState(defaults.province);
  const [selectedSubjects, setSelectedSubjects] = useState(defaults.subjects);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateTutorProfileAction({
        firstName,
        lastName,
        phone,
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
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-2'>
        <div>
          <Label htmlFor='firstName'>First name</Label>
          <Input
            id='firstName'
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className='mt-1'
          />
        </div>
        <div>
          <Label htmlFor='lastName'>Last name</Label>
          <Input
            id='lastName'
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className='mt-1'
          />
        </div>
      </div>
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
              <SelectValue />
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
        <Label className='mb-2 block'>Subjects</Label>
        <div className='grid gap-2'>
          {subjects.map((subject) => (
            <label key={subject} className='flex items-center gap-2 text-sm'>
              <Checkbox
                checked={selectedSubjects.includes(subject)}
                onCheckedChange={(c) =>
                  setSelectedSubjects((prev) =>
                    c === true
                      ? [...prev, subject]
                      : prev.filter((s) => s !== subject)
                  )
                }
              />
              {subject}
            </label>
          ))}
        </div>
      </div>
      <Button
        type='submit'
        disabled={pending}
        className='rounded-full bg-[#1B6CA8] hover:bg-[#1B6CA8]/90'
      >
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
