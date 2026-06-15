import { cache } from 'react';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const getCachedUser = cache(async () => {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
});
