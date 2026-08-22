import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL, otherwise go to dashboard
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    // Exchange the auth code for a user session
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && sessionData?.user) {
      // Check if user is registered in the system
      const { data: userRecord } = await supabase
        .from('user_master')
        .select('id, is_active, is_deleted')
        .eq('id', sessionData.user.id)
        .maybeSingle();

      if (!userRecord) {
        // User not found in user_master
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=not-registered`);
      }

      if (userRecord.is_deleted || userRecord.is_active === false) {
        // User is deactivated or deleted
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=account-disabled`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("Auth Callback Error:", error?.message || "User data missing in session");
    }
  }

  // If there's an error or no code, redirect back to login
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
