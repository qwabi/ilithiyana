import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { grades } from '@/lib/site-config';
import { getTutoringSubjectsForGrade } from '@/lib/curriculum/subjects';
import { formatWeeklySchedule, BAND_SHORT } from '@/lib/schedules/format';
import type { ClassBand, GroupClassWithCount } from '@/lib/types/database';

const BANDS: ClassBand[] = ['A', 'B', 'C', 'D'];

type Props = {
  classes: GroupClassWithCount[];
  initialError?: string;
};

function groupClasses(classes: GroupClassWithCount[]) {
  const byGrade = new Map<number, Map<string, Map<ClassBand, GroupClassWithCount>>>();

  for (const cls of classes) {
    if (!cls.band) continue;
    const gradeMap = byGrade.get(cls.grade) ?? new Map();
    const subjectMap = gradeMap.get(cls.subject) ?? new Map();
    subjectMap.set(cls.band, cls);
    gradeMap.set(cls.subject, subjectMap);
    byGrade.set(cls.grade, gradeMap);
  }

  return byGrade;
}

export function ClassesManager({ classes, initialError }: Props) {
  const grouped = groupClasses(classes);

  return (
    <div className='space-y-10'>
      {initialError ? (
        <p className='text-sm text-destructive'>{initialError}</p>
      ) : null}

      <p className='text-sm text-muted-foreground'>
        Band A is the foundation group (lower NSC levels); Band D is advanced.
        Each class holds up to 8 learners.
      </p>

      {grades.map((grade) => {
        const subjectMap = grouped.get(grade);
        if (!subjectMap?.size) return null;

        const gradeSubjects = getTutoringSubjectsForGrade(grade).filter((s) =>
          subjectMap.has(s)
        );

        if (!gradeSubjects.length) return null;

        return (
          <section key={grade} className='space-y-6'>
            <h2 className='text-xl font-semibold text-foreground'>
              Grade {grade}
            </h2>
            {gradeSubjects.map((subject) => {
              const bandMap = subjectMap.get(subject)!;
              return (
                <div key={subject} className='space-y-3'>
                  <h3 className='text-base font-medium text-foreground'>
                    {subject}
                  </h3>
                  <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                    {BANDS.map((band) => {
                      const cls = bandMap.get(band);
                      if (!cls) {
                        return (
                          <Card
                            key={band}
                            className='border-dashed opacity-60'
                          >
                            <CardHeader className='pb-2'>
                              <CardTitle className='text-sm font-medium'>
                                Band {band} — {BAND_SHORT[band]}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className='text-xs text-muted-foreground'>
                              Not seeded
                            </CardContent>
                          </Card>
                        );
                      }

                      const schedule = formatWeeklySchedule(
                        cls.schedule_day,
                        cls.schedule_time,
                        cls.schedule
                      );
                      const atCap =
                        cls.enrollment_count >= (cls.max_enrollment ?? 8);

                      const inactive = cls.is_active === false;

                      return (
                        <Card
                          key={cls.id}
                          className={inactive ? 'opacity-75' : undefined}
                        >
                          <CardHeader className='pb-2'>
                            <CardTitle className='text-sm font-medium leading-snug'>
                              Band {band} —{' '}
                              {cls.band_label ?? BAND_SHORT[band]}
                              {inactive ? (
                                <span className='ml-2 text-xs font-normal text-muted-foreground'>
                                  (inactive)
                                </span>
                              ) : null}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className='space-y-2 text-sm'>
                            <p
                              className={
                                atCap
                                  ? 'font-medium text-amber-700'
                                  : 'text-muted-foreground'
                              }
                            >
                              {cls.enrollment_count}/{cls.max_enrollment ?? 8}{' '}
                              learners
                            </p>
                            <p className='text-muted-foreground'>
                              {schedule ?? 'Schedule TBC'}
                            </p>
                            {cls.tutors ? (
                              <p className='text-xs text-muted-foreground'>
                                Tutor: {cls.tutors.first_name}{' '}
                                {cls.tutors.last_name}
                              </p>
                            ) : null}
                            <Link
                              href={`/admin/dashboard/classes/${cls.id}`}
                              className='inline-block text-sm font-medium text-primary hover:underline'
                            >
                              Edit
                            </Link>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}

      {!classes.length && !initialError ? (
        <p className='text-muted-foreground'>
          No class groups found. Run the database migration and Masande
          provisioning script.
        </p>
      ) : null}
    </div>
  );
}
