import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fulfillOnboardingChild } from '@/lib/onboarding/fulfill-child';
import { loadSessionForRequestHttp } from '@/lib/onboarding/api-auth';
import {
  subjectIdsFieldSchema,
  withNormalizedSubjectIds,
} from '@/lib/validations/subject-ids';

const bodySchema = withNormalizedSubjectIds(
  z.object({
    sessionId: z.string().uuid(),
    learnerSlot: z.number().int().min(1).max(6),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().min(1),
    schoolName: z.string().min(1),
    grade: z.number().int().min(6).max(12),
    subjects: subjectIdsFieldSchema(),
    preferredDays: z.array(z.string()).optional(),
    level: z.string().nullable().optional(),
  })
);

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid child data' }, { status: 400 });
    }

    const loaded = await loadSessionForRequestHttp(parsed.data.sessionId);
    if (!loaded.ok) return loaded.response;

    const days = parsed.data.preferredDays ?? [];
    const schedule = {
      availableDays: Object.fromEntries(days.map((d) => [d, true])),
      timeSlots: {},
      preferredDays: days,
    };

    const result = await fulfillOnboardingChild(loaded.session, {
      sessionId: parsed.data.sessionId,
      learnerSlot: parsed.data.learnerSlot,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      dateOfBirth: parsed.data.dateOfBirth,
      schoolName: parsed.data.schoolName,
      grade: parsed.data.grade,
      subjects: parsed.data.subjects,
      schedule,
      level: parsed.data.level,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      learnerId: result.learnerId,
      created: result.created,
    });
  } catch (e) {
    console.error('POST /api/onboarding/save-child', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
