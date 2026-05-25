
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  
  // Create an anon client that relies on the user's browser cookies
  const { createServerClient } = await import('@supabase/ssr');
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      }
    }
  );

  const { data: user, error: authErr } = await supabase.auth.getUser();
  
  if (authErr || !user.user) {
    return NextResponse.json({ error: 'Not authenticated', details: authErr });
  }

  // Attempt to insert into status_master using the user's auth context
  const { data, error } = await supabase.from('status_master').insert([
    { status_code: 'DEBUG_TEST', status_name: 'DEBUG_TEST', module: 'tickets', is_active: true }
  ]).select();

  // Attempt to delete it immediately if it succeeded
  if (!error && data && data.length > 0) {
    await supabase.from('status_master').delete().eq('id', data[0].id);
  }

  return NextResponse.json({
    user: user.user.email,
    insert_result: data,
    insert_error: error
  });
}
