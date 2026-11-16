import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Safety net for sign-in links that point to an /auth/... address this app has no page for,
 * e.g. an email template written for Supabase's guides (/auth/confirm?token_hash=…&type=invite)
 * or a link to /auth/v1/verify on this domain. Without it such invite links showed "page not found".
 * Every form is passed on to the one real handler, /auth/callback.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const forwardedHost = request.headers.get('x-forwarded-host');
  const origin = forwardedHost && process.env.NODE_ENV !== 'development' ? `https://${forwardedHost}` : url.origin;
  const next = p.get('next') || p.get('redirect_to_next') || '/select-module';

  // token_hash flow (Supabase SSR email templates) or PKCE code
  if ((p.get('token_hash') && p.get('type')) || p.get('code') || p.get('error') || p.get('error_code')) {
    const q = new URLSearchParams(p);
    if (!q.get('next')) q.set('next', next);
    return NextResponse.redirect(`${origin}/auth/callback?${q.toString()}`);
  }

  // A raw verify link on this domain (/auth/v1/verify?token=…&type=invite): send it to Supabase,
  // which verifies it and comes back to /auth/callback.
  if (p.get('token') && p.get('type')) {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkovzymkubxtpcgynkgd.supabase.co').replace(/\/+$/, '');
    const q = new URLSearchParams({
      token: p.get('token')!,
      type: p.get('type')!,
      redirect_to: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    });
    return NextResponse.redirect(`${supabaseUrl}/auth/v1/verify?${q.toString()}`);
  }

  // Nothing in the query: the session may be in the #fragment, which only the browser can read.
  return NextResponse.redirect(`${origin}/auth/accept?next=${encodeURIComponent(next)}`);
}
