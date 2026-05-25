'use client';

import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { removeClass, saveClass } from '@/app/actions/admin-actions';

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

type ClassRow = {
  id: string;
  learner_id: string;
  tutor_id: string | null;
  subject: string;
  grade: number;
  level: string | null;
  schedule: string | null;
  meet_link: string | null;
  learners?: LearnerOption | null;
  tutors?: TutorOption | null;
};

const emptyForm = {
  learner_id: '',
  tutor_id: '',
  subject: subjects[0],
  grade: String(grades[0]),
  level: '',
  schedule: '',
  meet_link: '',
};

interface Props {
  initialClasses: ClassRow[];
  learners: LearnerOption[];
  tutors: TutorOption[];
  initialError?: string;
}

export function ClassesManager({
  initialClasses,
  learners,
  tutors,
  initialError,
}: Props) {
  const [classes, setClasses] = useState(initialClasses);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error] = useState(initialError ?? null);
  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.learner_id) {
      toast.error('Select a learner');
      return;
    }

    startTransition(async () => {
      const result = await saveClass(editingId, {
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

      toast.success(editingId ? 'Class updated' : 'Class added');
      resetForm();
      window.location.reload();
    });
  };

  const handleEdit = (row: ClassRow) => {
    setEditingId(row.id);
    setForm({
      learner_id: row.learner_id,
      tutor_id: row.tutor_id ?? '',
      subject: row.subject,
      grade: String(row.grade),
      level: row.level ?? '',
      schedule: row.schedule ?? '',
      meet_link: row.meet_link ?? '',
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this class entry?')) return;
    startTransition(async () => {
      const result = await removeClass(id);
      if (!result.ok) {
        toast.error(result.error ?? 'Delete failed');
        return;
      }
      toast.success('Class removed');
      setClasses((prev) => prev.filter((c) => c.id !== id));
    });
  };

  return (
    <div className='space-y-8'>
      {error && <p className='text-sm text-destructive'>{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit class' : 'Add class'}</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2'>
          <div>
            <Label>Learner</Label>
            <Select
              value={form.learner_id}
              onValueChange={(v) => setForm({ ...form, learner_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select learner' />
              </SelectTrigger>
              <SelectContent>
                {learners.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.first_name} {l.last_name} (Grade {l.grade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tutor (optional)</Label>
            <Select
              value={form.tutor_id || '__none__'}
              onValueChange={(v) =>
                setForm({ ...form, tutor_id: v === '__none__' ? '' : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Select tutor' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__none__'>None</SelectItem>
                {tutors.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.first_name} {t.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select
              value={form.subject}
              onValueChange={(v) => setForm({ ...form, subject: v })}
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
          <div>
            <Label>Grade</Label>
            <Select
              value={form.grade}
              onValueChange={(v) => setForm({ ...form, grade: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g} value={String(g)}>
                    Grade {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Schedule (e.g. Tue 16:00–17:00)</Label>
            <Input
              value={form.schedule}
              onChange={(e) => setForm({ ...form, schedule: e.target.value })}
            />
          </div>
          <div>
            <Label>Google Meet link</Label>
            <Input
              value={form.meet_link}
              onChange={(e) => setForm({ ...form, meet_link: e.target.value })}
              placeholder='https://meet.google.com/...'
            />
          </div>
          <div className='md:col-span-2 flex gap-2'>
            <Button onClick={handleSave} disabled={isPending}>
              {editingId ? 'Update' : 'Add class'}
            </Button>
            {editingId && (
              <Button variant='outline' onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4'>
        {classes.map((row) => {
          const learner = row.learners;
          const tutor = row.tutors;
          return (
            <Card key={row.id}>
              <CardHeader className='pb-2'>
                <CardTitle className='text-lg'>
                  {row.subject} — Grade {row.grade}
                </CardTitle>
              </CardHeader>
              <CardContent className='text-sm space-y-1'>
                <p>
                  Learner:{' '}
                  {learner
                    ? `${learner.first_name} ${learner.last_name}`
                    : row.learner_id}
                </p>
                {tutor && (
                  <p>
                    Tutor: {tutor.first_name} {tutor.last_name}
                  </p>
                )}
                {row.schedule && <p>When: {row.schedule}</p>}
                {row.meet_link && (
                  <p>
                    <a
                      href={row.meet_link}
                      className='text-primary underline'
                      target='_blank'
                      rel='noreferrer'
                    >
                      Join class
                    </a>
                  </p>
                )}
                <div className='flex gap-2 pt-2'>
                  <Button size='sm' variant='outline' onClick={() => handleEdit(row)}>
                    Edit
                  </Button>
                  <Button
                    size='sm'
                    variant='destructive'
                    onClick={() => handleDelete(row.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!classes.length && (
          <p className='text-muted-foreground'>No classes scheduled yet.</p>
        )}
      </div>
    </div>
  );
}
