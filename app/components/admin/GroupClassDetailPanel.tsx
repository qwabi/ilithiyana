'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { Switch } from '@/components/ui/switch';
import {
  enrollLearnerInClass,
  unenrollLearnerFromClass,
  updateGroupClassSettings,
} from '@/app/actions/classes-admin';
import { formatWeeklySchedule } from '@/lib/schedules/format';
import type { ClassRow } from '@/lib/types/database';

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

type TutorOption = { id: string; first_name: string; last_name: string };
type LearnerOption = {
  id: string;
  first_name: string;
  last_name: string;
  grade: number;
  school_name?: string;
};

type EnrollmentRow = {
  id: string;
  learner_id: string;
  learners: LearnerOption | LearnerOption[] | null;
};

type Props = {
  cls: ClassRow & {
    tutors?: { id: string; first_name: string; last_name: string } | null;
  };
  enrollments: EnrollmentRow[];
  enrollmentCount: number;
  tutors: TutorOption[];
  learners: LearnerOption[];
};

export function GroupClassDetailPanel({
  cls,
  enrollments,
  enrollmentCount,
  tutors,
  learners,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addLearnerId, setAddLearnerId] = useState('');

  const [settings, setSettings] = useState({
    tutor_id: cls.tutor_id ?? '',
    schedule_day: cls.schedule_day ?? 'tuesday',
    schedule_time: cls.schedule_time?.slice(0, 5) ?? '18:00',
    meet_link: cls.meet_link ?? '',
    max_enrollment: String(cls.max_enrollment ?? 8),
    is_active: cls.is_active ?? true,
  });

  const enrolledIds = new Set(enrollments.map((e) => e.learner_id));

  const addableLearners = useMemo(
    () =>
      learners.filter(
        (l) => l.grade === cls.grade && !enrolledIds.has(l.id)
      ),
    [learners, cls.grade, enrolledIds]
  );

  const bandLabel =
    cls.band_label ??
    (cls.band ? `Band ${cls.band}` : '');

  const handleSaveSettings = () => {
    startTransition(async () => {
      const result = await updateGroupClassSettings(cls.id, {
        tutor_id: settings.tutor_id || null,
        schedule_day: settings.schedule_day,
        schedule_time: settings.schedule_time,
        meet_link: settings.meet_link.trim() || null,
        max_enrollment: Number(settings.max_enrollment),
        is_active: settings.is_active,
      });
      if (!result.ok) {
        toast.error(result.error ?? 'Save failed');
        return;
      }
      toast.success('Class settings saved');
      router.refresh();
    });
  };

  const handleEnroll = () => {
    if (!addLearnerId) {
      toast.error('Select a learner');
      return;
    }
    startTransition(async () => {
      const result = await enrollLearnerInClass(cls.id, addLearnerId);
      if (!result.ok) {
        toast.error(result.error ?? 'Could not enroll');
        return;
      }
      toast.success('Learner enrolled');
      setAddLearnerId('');
      router.refresh();
    });
  };

  const handleUnenroll = (enrollmentId: string, learnerId: string) => {
    if (!confirm('Remove this learner from the class?')) return;
    startTransition(async () => {
      const result = await unenrollLearnerFromClass(
        enrollmentId,
        learnerId,
        cls.id
      );
      if (!result.ok) {
        toast.error(result.error ?? 'Could not remove');
        return;
      }
      toast.success('Learner removed');
      router.refresh();
    });
  };

  return (
    <div className='space-y-8'>
      <Card>
        <CardHeader>
          <CardTitle>Class settings</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2'>
          <div className='md:col-span-2 text-sm text-muted-foreground'>
            <p>
              {cls.subject} · Grade {cls.grade} · {bandLabel}
            </p>
            <p className='mt-1'>
              Current schedule:{' '}
              {formatWeeklySchedule(
                cls.schedule_day,
                cls.schedule_time,
                cls.schedule
              ) ?? 'TBC'}
            </p>
          </div>

          <div>
            <Label>Assigned tutor</Label>
            <Select
              value={settings.tutor_id || '__none__'}
              onValueChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  tutor_id: v === '__none__' ? '' : v,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Select tutor' />
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

          <div>
            <Label>Schedule day</Label>
            <Select
              value={settings.schedule_day}
              onValueChange={(v) =>
                setSettings((s) => ({ ...s, schedule_day: v }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Schedule time (SAST, HH:MM)</Label>
            <Input
              type='time'
              value={settings.schedule_time}
              onChange={(e) =>
                setSettings((s) => ({ ...s, schedule_time: e.target.value }))
              }
            />
          </div>

          <div>
            <Label>Google Meet link</Label>
            <Input
              value={settings.meet_link}
              onChange={(e) =>
                setSettings((s) => ({ ...s, meet_link: e.target.value }))
              }
              placeholder='https://meet.google.com/...'
            />
          </div>

          <div>
            <Label>Max enrollment (1–8)</Label>
            <Input
              type='number'
              min={1}
              max={8}
              value={settings.max_enrollment}
              onChange={(e) =>
                setSettings((s) => ({ ...s, max_enrollment: e.target.value }))
              }
            />
          </div>

          <div className='flex items-center gap-3'>
            <Switch
              id='is_active'
              checked={settings.is_active}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, is_active: checked }))
              }
            />
            <Label htmlFor='is_active'>Class active</Label>
          </div>

          <div className='md:col-span-2'>
            <Button onClick={handleSaveSettings} disabled={isPending}>
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Enrolled learners ({enrollmentCount}/{cls.max_enrollment ?? 8})
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {enrollments.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No learners yet.</p>
          ) : (
            <ul className='divide-y rounded-md border'>
              {enrollments.map((row) => {
                const learner = Array.isArray(row.learners)
                  ? row.learners[0]
                  : row.learners;
                if (!learner) return null;
                return (
                  <li
                    key={row.id}
                    className='flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm'
                  >
                    <div>
                      <p className='font-medium'>
                        {learner.first_name} {learner.last_name}
                      </p>
                      <p className='text-muted-foreground'>
                        Grade {learner.grade}
                        {learner.school_name
                          ? ` · ${learner.school_name}`
                          : ''}
                      </p>
                    </div>
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={isPending}
                      onClick={() =>
                        handleUnenroll(row.id, row.learner_id)
                      }
                    >
                      Remove
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className='flex flex-wrap items-end gap-2 border-t pt-4'>
            <div className='min-w-[200px] flex-1'>
              <Label>Add learner (grade {cls.grade})</Label>
              <Select
                value={addLearnerId || '__none__'}
                onValueChange={(v) =>
                  setAddLearnerId(v === '__none__' ? '' : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select learner' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>Select…</SelectItem>
                  {addableLearners.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.first_name} {l.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleEnroll}
              disabled={
                isPending ||
                !addLearnerId ||
                enrollmentCount >= (cls.max_enrollment ?? 8)
              }
            >
              Add learner
            </Button>
          </div>
          {enrollmentCount >= (cls.max_enrollment ?? 8) ? (
            <p className='text-sm text-amber-700'>This class is full.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
