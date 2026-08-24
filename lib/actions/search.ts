"use server";

import { executeGlobalSearch, SearchResult } from '@/lib/repositories/search';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  return await executeGlobalSearch(user.id, query);
}
