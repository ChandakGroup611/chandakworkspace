import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next');

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

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      const redirectOrigin = (forwardedHost && !isLocalEnv) ? `https://${forwardedHost}` : origin;

      if (!userRecord) {
        // User not found in user_master
        await supabase.auth.signOut();
        return NextResponse.redirect(`${redirectOrigin}/login?error=not-registered`);
      }

      if (userRecord.is_deleted || userRecord.is_active === false) {
        // User is deactivated or deleted
        await supabase.auth.signOut();
        return NextResponse.redirect(`${redirectOrigin}/login?error=account-disabled`);
      }

      // Determine proper landing destination for registered user
      let destination = '/workspaces/tasks';
      let activeModuleCode = 'TASK_WORKFLOW';

      if (rawNext && rawNext !== '/' && rawNext !== '/select-module' && !rawNext.includes('/login')) {
        destination = rawNext;
        if (rawNext.startsWith('/vehicle')) activeModuleCode = 'VEHICLE_DESK';
        else if (rawNext.startsWith('/design')) activeModuleCode = 'DESIGN_TRACKING';
      } else {
        // Resolve user's preferred or assigned default module
        const { supabaseAdmin } = await import('@/lib/supabase/service_role');
        const { data: defaultUserModule } = await supabaseAdmin
          .from('user_modules')
          .select('module:modules_master(code, route_path)')
          .eq('user_id', sessionData.user.id)
          .eq('is_default', true)
          .maybeSingle();

        const modCode = (defaultUserModule?.module as any)?.code;
        const modRoute = (defaultUserModule?.module as any)?.route_path;

        if (modCode === 'VEHICLE_DESK') {
          destination = '/vehicle/dashboard';
          activeModuleCode = 'VEHICLE_DESK';
        } else if (modCode === 'DESIGN_TRACKING') {
          destination = '/design/dashboard';
          activeModuleCode = 'DESIGN_TRACKING';
        } else if (modRoute) {
          destination = modRoute;
          activeModuleCode = modCode || 'TASK_WORKFLOW';
        } else {
          destination = '/workspaces/tasks';
          activeModuleCode = 'TASK_WORKFLOW';
        }
      }

      // Check if user has an active session on another device/browser
      const { supabaseAdmin } = await import('@/lib/supabase/service_role');
      const { data: activeSession } = await supabaseAdmin
        .from('active_sessions')
        .select('session_token, last_active_at')
        .eq('user_id', sessionData.user.id)
        .maybeSingle();

      if (activeSession && activeSession.session_token) {
        const lastActive = activeSession.last_active_at ? new Date(activeSession.last_active_at).getTime() : 0;
        const isRecent = (Date.now() - lastActive) < 24 * 60 * 60 * 1000;
        if (isRecent) {
          return NextResponse.redirect(`${redirectOrigin}/login?oauth_conflict=1&next=${encodeURIComponent(destination)}`);
        }
      }

      const response = NextResponse.redirect(`${redirectOrigin}${destination}`);
      response.cookies.set('active_module', activeModuleCode, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
        httpOnly: false,
      });

      return response;
    } else {
      console.error("Auth Callback Error:", error?.message || "User data missing in session");
    }
  }

  // If there's an error or no code, redirect back to login
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const redirectOrigin = (forwardedHost && !isLocalEnv) ? `https://${forwardedHost}` : origin;
  return NextResponse.redirect(`${redirectOrigin}/login?error=auth-callback-failed`);
}
