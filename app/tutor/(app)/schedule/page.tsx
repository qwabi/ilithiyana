import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTutorSession, getTutorClasses } from '@/lib/tutor/queries';

export const dynamic = 'force-dynamic';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-[hsl(210,100%,25%)]';

type ClassWithLearner = {
  id: string;
  subject: string;
  grade: number;
  schedule: string | null;
  meet_link: string | null;
  class_label?: string | null;
  learners?: {
    first_name: string;
    last_name: string;
    school_name: string;
  } | null;
};

export default async function TutorSchedulePage() {
  const session = await getTutorSession();
  if (!session) return null;

  const classes = (await getTutorClasses(session.tutor.id).catch(
    () => []
  )) as ClassWithLearner[];

  return (
    <div className='space-y-8'>
      <div>
        <h1 className={pageTitle}>Schedule</h1>
        <p className='mt-2 text-muted-foreground'>
          Your assigned classes and session links.
        </p>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className='py-10 text-center text-sm text-muted-foreground'>
            No classes assigned yet. Once learners are placed in your groups,
            they will appear here.
          </CardContent>
        </Card>
      ) : (
        <ul className='space-y-4'>
          {classes.map((cls) => (
            <li key={cls.id}>
              <Card>
                <CardHeader>
                  <CardTitle className='text-lg'>
                    {cls.class_label ?? cls.subject} · Grade {cls.grade}
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-2 text-sm text-muted-foreground'>
                  {cls.learners ? (
                    <p>
                      Learner: {cls.learners.first_name}{' '}
                      {cls.learners.last_name} ({cls.learners.school_name})
                    </p>
                  ) : null}
                  {cls.schedule ? <p>Schedule: {cls.schedule}</p> : null}
                  {cls.meet_link ? (
                    <p>
                      <Link
                        href={cls.meet_link}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='font-medium text-primary underline-offset-4 hover:underline'
                      >
                        Open Google Meet
                      </Link>
                    </p>
                  ) : (
                    <p className='text-amber-700'>Meet link not set yet.</p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
