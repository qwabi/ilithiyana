'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { grades, subjects } from '@/lib/site-config';
import { saveClass } from '@/app/actions/admin-actions';

type LearnerOption = {
  id: string;
  first_name: string;
  last_name: string;
  grade: number;
};

type TutorOption = {
  id: string;
  first_name: string;
  last_name: string;
};

type Initial = {
  id?: string;
  learner_id: string;
  tutor_id: string | null;
  subject: string;
  grade: number;
  level: string | null;
  schedule: string | null;
  meet_link: string | null;
};

export function ClassForm({
  learners,
  tutors,
  initial,
  redirectTo,
}: {
  learners: LearnerOption[];
  tutors: TutorOption[];
  initial?: Initial;
  redirectTo: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    learner_id: initial?.learner_id ?? '',
    tutor_id: initial?.tutor_id ?? '',
    subject: initial?.subject ?? subjects[0],
    grade: String(initial?.grade ?? grades[0]),
    level: initial?.level ?? '',
    schedule: initial?.schedule ?? '',
    meet_link: initial?.meet_link ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.learner_id) {
      toast.error('Select a learner');
      return;
    }

    startTransition(async () => {
      const result = await saveClass(initial?.id ?? null, {
        learner_id: form.learner_id,
        tutor_id: form.tutor_id || null,
        subject: form.subject,
        grade: Number(form.grade),
        level: form.level || null,
        schedule: form.schedule || null,
        meet_link: form.meet_link || null,
      });

      if (!result.ok) {
        toast.error(result.error ?? 'Save failed');
        return;
      }

      toast.success(initial?.id ? 'Class updated' : 'Class created');
      router.push(redirectTo);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className='max-w-lg space-y-4'>
      <div className='space-y-2'>
        <Label>Learner</Label>
        <Select
          value={form.learner_id}
          onValueChange={(v) => setForm((f) => ({ ...f, learner_id: v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder='Select learner' />
          </SelectTrigger>
          <SelectContent>
            {learners.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.first_name} {l.last_name} (Gr {l.grade})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-2'>
        <Label>Tutor (optional)</Label>
        <Select
          value={form.tutor_id || '__none__'}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, tutor_id: v === '__none__' ? '' : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder='Unassigned' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__none__'>Unassigned</SelectItem>
            {tutors.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.first_name} {t.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-2'>
          <Label>Subject</Label>
          <Select
            value={form.subject}
            onValueChange={(v) => setForm((f) => ({ ...f, subject: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-2'>
          <Label>Grade</Label>
          <Select
            value={form.grade}
            onValueChange={(v) => setForm((f) => ({ ...f, grade: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {grades.map((g) => (
                <SelectItem key={g} value={String(g)}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='space-y-2'>
        <Label>Level (optional)</Label>
        <Input
          value={form.level}
          onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
        />
      </div>
      <div className='space-y-2'>
        <Label>Schedule</Label>
        <Input
          value={form.schedule}
          onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
          placeholder='e.g. Mon 16:00'
        />
      </div>
      <div className='space-y-2'>
        <Label>Meet link</Label>
        <Input
          value={form.meet_link}
          onChange={(e) => setForm((f) => ({ ...f, meet_link: e.target.value }))}
          placeholder='https://'
        />
      </div>

      <Button type='submit' disabled={isPending}>
        {isPending ? 'Saving…' : initial?.id ? 'Update class' : 'Create class'}
      </Button>
    </form>
  );
}
