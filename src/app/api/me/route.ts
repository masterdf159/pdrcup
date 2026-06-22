import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export interface SavedMatch {
  matchId: string;
  home: string;
  away: string;
  homeFlag?: string;
  awayFlag?: string;
  homeGoals: number;
  awayGoals: number;
  confidence?: number;
  analysis?: string;
  finished: boolean;
  savedAt: number;
}

interface UserData {
  bracket?: Record<string, string[]>;
  matches?: SavedMatch[];
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const data = (user.publicMetadata?.prd as UserData) || {};
  return NextResponse.json({ bracket: data.bracket || null, matches: data.matches || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { action: string; bracket?: Record<string, string[]>; match?: SavedMatch; matchId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const current = (user.publicMetadata?.prd as UserData) || {};
  const next: UserData = { bracket: current.bracket, matches: current.matches || [] };

  if (body.action === 'saveBracket' && body.bracket) {
    next.bracket = body.bracket;
  } else if (body.action === 'saveMatch' && body.match) {
    const others = (next.matches || []).filter(m => m.matchId !== body.match!.matchId);
    next.matches = [{ ...body.match, savedAt: Date.now() }, ...others].slice(0, 100);
  } else if (body.action === 'removeMatch' && body.matchId) {
    next.matches = (next.matches || []).filter(m => m.matchId !== body.matchId);
  } else {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  }

  await client.users.updateUserMetadata(userId, { publicMetadata: { prd: next } });
  return NextResponse.json({ ok: true, bracket: next.bracket || null, matches: next.matches || [] });
}
