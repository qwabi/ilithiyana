import { createServiceClient } from '@/lib/supabase/server';

export async function getTutorSchedule(tutorId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('classes')
    .select(
      `
      id,
      subject,
      grade,
      level,
      band,
      schedule,
      schedule_day,
      schedule_time,
      meet_link,
      class_label,
      learners (id, first_name, last_name)
    `
    )
    .eq('tutor_id', tutorId)
    .eq('is_active', true)
    .order('subject', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
