import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { LearnerRow } from '@/lib/types/database';

/** Resolve parent row and verify learner belongs to that parent. */
export async function getLearnerForParentUser(
  userId: string,
  learnerId: string
): Promise<{ parentId: string; learner: Pick<LearnerRow, 'id' | 'first_name' | 'last_name' | 'grade'> } | null> {
  const supabase = createServerSupabaseClient();

  const { data: parentRow } = await supabase
    .from('parents')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!parentRow) return null;

  const { data: learner } = await supabase
    .from('learners')
    .select('id, first_name, last_name, grade')
    .eq('id', learnerId)
    .eq('parent_id', parentRow.id)
    .maybeSingle();

  if (!learner) return null;

  return { parentId: parentRow.id, learner };
}
