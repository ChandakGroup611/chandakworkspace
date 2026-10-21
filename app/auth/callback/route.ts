import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { syncMicrosoftUserToMaster } from '@/lib/auth/microsoft-graph';
import { supabaseAdmin } from '@/lib/supabase/service_role';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next');

  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const redirectOrigin = (forwardedHost && !isLocalEnv) ? `https://${forwardedHost}` : origin;

  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const errorCode = searchParams.get('error_code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as any;

  if (errorParam || errorCode) {
    const isExpired = (errorCode && errorCode.includes('expired')) || (errorDescription && errorDescription.toLowerCase().includes('expired'));
    const errCode = isExpired ? 'invitation-expired' : 'invitation-error';
    const errDesc = encodeURIComponent(errorDescription || errorParam || 'Authentication failed');
    return NextResponse.redirect(`${redirectOrigin}/login?error=${errCode}&error_description=${errDesc}`);
  }

  if (code || (tokenHash && type)) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    let sessionData: any = null;
    let authError: any = null;

    if (code) {
      // Exchange the auth code for a user session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      sessionData = data;
      authError = error;
    } else if (tokenHash && type) {
      // Exchange token_hash (e.g. email invitation or magic link) for a user session
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      sessionData = data;
      authError = error;
    }
    
    if (!authError && sessionData?.user) {
      // Step 1: Automatically sync Microsoft identity & profile claims into user_master
      const syncResult = await syncMicrosoftUserToMaster({
        authUserId: sessionData.user.id,
        email: sessionData.user.email,
        userMetadata: sessionData.user.user_metadata,
        providerToken: sessionData.session?.provider_token,
      });

      const userRecord = syncResult.userRecord;

      if (!userRecord) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${redirectOrigin}/login?error=not-registered`);
      }

      if (userRecord.is_deleted || userRecord.is_active === false) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${redirectOrigin}/login?error=account-disabled`);
      }

      // Step 2: Determine Super Admin role
      let isSuperAdmin = false;
      if (userRecord.role_id) {
        const { data: roleData } = await supabaseAdmin
          .from('roles')
          .select('code')
          .eq('id', userRecord.role_id)
          .maybeSingle();
        
        const roleCode = String(roleData?.code || '').toUpperCase();
        isSuperAdmin = ['SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'ADMIN_ROLE', 'ROLE_ADMIN', 'ADMIN'].includes(roleCode);
      }

      // Step 3: Fetch authoritative assigned modules from user_modules
      const { data: userModuleRows } = await supabaseAdmin
        .from('user_modules')
        .select('module_id, is_default, module:modules_master(id, code, route_path, is_active)')
        .eq('user_id', sessionData.user.id);

      const assignedModules: { code: string; route: string; is_default: boolean }[] = [];
      for (const row of userModuleRows || []) {
        const mod = row.module as any;
        if (mod && mod.is_active) {
          let route = mod.route_path || '/';
          if (mod.code === 'TASK_WORKFLOW' && (route === '/workspaces/tasks' || !route)) route = '/';
          if (mod.code === 'VEHICLE_DESK' && (!route || route === '/vehicle/dashboard')) route = '/vehicle';
          if (mod.code === 'DESIGN_TRACKING' && (!route || route === '/design/dashboard')) route = '/design/matrix';
          if (mod.code === 'DASHBOARDS' && !route) route = '/dashboards';
          assignedModules.push({
            code: mod.code,
            route,
            is_default: Boolean(row.is_default),
          });
        }
      }

      // Step 4: Strict Module Resolution (Non-negotiable governance)
      let destination = '/select-module';
      let activeModuleCode = 'TASK_WORKFLOW';

      if (!isSuperAdmin) {
        if (assignedModules.length === 0) {
          // User has zero authorized modules: deny entry
          await supabase.auth.signOut();
          return NextResponse.redirect(`${redirectOrigin}/login?error=no-module-access`);
        } else if (assignedModules.length === 1) {
          // Exactly 1 module authorized: automatically land on that module
          destination = assignedModules[0].route;
          activeModuleCode = assignedModules[0].code;
        } else {
          // Multiple modules authorized: check for explicit default module
          const explicitDefault = assignedModules.find((m) => m.is_default);
          if (explicitDefault) {
            destination = explicitDefault.route;
            activeModuleCode = explicitDefault.code;
          } else {
            // No default module configured: open Module Selection screen
            destination = '/select-module';
            activeModuleCode = assignedModules[0].code;
          }
        }
      } else {
        // Super Admin: check for explicit default module
        const explicitDefault = assignedModules.find((m) => m.is_default);
        if (explicitDefault) {
          destination = explicitDefault.route;
          activeModuleCode = explicitDefault.code;
        } else {
          // No explicit default: open Module Selection screen
          destination = '/select-module';
          activeModuleCode = 'TASK_WORKFLOW';
        }
      }

      // Step 5: Validate rawNext if requested
      if (rawNext && rawNext !== '/' && rawNext !== '/select-module' && !rawNext.includes('/login')) {
        let requestedModule = 'TASK_WORKFLOW';
        if (rawNext.startsWith('/vehicle')) requestedModule = 'VEHICLE_DESK';
        else if (rawNext.startsWith('/design')) requestedModule = 'DESIGN_TRACKING';
        else if (rawNext.startsWith('/dashboards')) requestedModule = 'DASHBOARDS';

        const isAuthorizedForNext = isSuperAdmin || assignedModules.some((m) => m.code === requestedModule);
        if (isAuthorizedForNext) {
          destination = rawNext;
          activeModuleCode = requestedModule;
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
      console.error("Auth Callback Error:", authError?.message || "User data missing in session");
    }
  }

  // If there's an error or no code, redirect back to login
  return NextResponse.redirect(`${redirectOrigin}/login?error=auth-callback-failed`);
}

