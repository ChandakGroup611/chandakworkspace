import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = 'https://v9tbp89l-8083.inc1.devtunnels.ms/healthz';
  const out: Record<string, any> = { url };

  try {
    const res = await fetch(url, {
      headers: { 'x-tunnel-skip-antiphishing-page': 'true' },
      signal: AbortSignal.timeout(10000),
    });
    out.ok = res.ok;
    out.status = res.status;
    out.statusText = res.statusText;
    out.body = (await res.text()).slice(0, 500);
  } catch (err: any) {
    out.error = err?.message || String(err);
    out.cause = err?.cause ? String(err.cause) : null;
    out.code = err?.code || (err?.cause as any)?.code || null;
  }

  return NextResponse.json(out);
}
