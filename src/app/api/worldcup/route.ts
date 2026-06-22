import { NextResponse } from 'next/server';
import fallbackRaw from '@/data/wc-fallback.json';
import type { WCGame, WCTeam, WCGroup, WCStadium } from '@/lib/api-football';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const WC_API = 'https://worldcup26.ir';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// In-memory last-good cache (warm instance) so a momentary source outage
// still serves recent live data instead of the ancient bundled snapshot.
let lastGood: { games: WCGame[]; teams: WCTeam[]; groups: WCGroup[]; ts: number } | null = null;

const fallback = {
  games: (fallbackRaw.games as unknown as WCGame[]).map(g =>
    g.time_elapsed === 'live'
      ? { ...g, time_elapsed: g.finished === 'TRUE' ? 'finished' : 'notstarted' }
      : g
  ),
  teams: fallbackRaw.teams as unknown as WCTeam[],
  groups: fallbackRaw.groups as unknown as WCGroup[],
};

// The source is flaky (intermittent TLS/connection errors). Retry each
// endpoint independently several times so a single failure doesn't poison
// the whole request.
// Vercel's network usually CANNOT reach this .ir source, so keep server attempts
// short (best-effort) and fail fast — the browser does the reliable live fetch.
// Single quick best-effort attempt — Vercel rarely reaches this source, so fail
// fast to the (current) snapshot instead of making the user wait.
async function wcFetch(endpoint: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${WC_API}${endpoint}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(3_500),
  });
  if (!res.ok) throw new Error(`WC ${res.status}`);
  return await res.json();
}

function enrich(rawGames: WCGame[], teams: WCTeam[], stadiums: WCStadium[], rawGroups: WCGroup[]) {
  const teamMap = new Map(teams.map(t => [t.id, t]));
  const stadiumMap = new Map(stadiums.map(s => [s.id, s]));

  const games: WCGame[] = rawGames.map(g => {
    const ht = teamMap.get(g.home_team_id);
    const at = teamMap.get(g.away_team_id);
    const st = stadiumMap.get(g.stadium_id);
    return {
      ...g,
      home_flag: ht?.flag || '',
      away_flag: at?.flag || '',
      home_fifa_code: ht?.fifa_code || '',
      away_fifa_code: at?.fifa_code || '',
      stadium_name: st?.name_en || st?.fifa_name || '',
      stadium_city: st?.city_en || '',
    };
  });

  const groups: WCGroup[] = rawGroups.map(g => ({
    ...g,
    teams: g.teams.map(gt => {
      const t = teamMap.get(gt.team_id);
      return { ...gt, team_name: t?.name_en || 'TBD', team_flag: t?.flag || '', team_fifa_code: t?.fifa_code || '' };
    }),
  }));

  return { games, teams, groups };
}

export async function GET() {
  try {
    // Fetch the 3 core endpoints, each with its own retries.
    const [teamsRes, gamesRes, groupsRes] = await Promise.all([
      wcFetch('/get/teams'),
      wcFetch('/get/games'),
      wcFetch('/get/groups'),
    ]);

    const teams = (teamsRes.teams as WCTeam[]) || [];
    const rawGames = (gamesRes.games as WCGame[]) || [];
    const rawGroups = (groupsRes.groups as WCGroup[]) || [];
    if (!teams.length || !rawGames.length) throw new Error('Empty WC payload');

    let stadiums: WCStadium[] = [];
    try {
      stadiums = ((await wcFetch('/get/stadiums')).stadiums as WCStadium[]) || [];
    } catch { /* optional */ }

    const data = enrich(rawGames, teams, stadiums, rawGroups);
    lastGood = { ...data, ts: Date.now() };
    return NextResponse.json(
      { ...data, stale: false },
      { headers: { 'Cache-Control': 'public, max-age=20, stale-while-revalidate=90' } }
    );
  } catch (err) {
    console.error('WC fetch failed after retries:', err instanceof Error ? err.message : err);
    // Prefer the last good live data this instance saw; else bundled snapshot.
    if (lastGood) {
      return NextResponse.json({ games: lastGood.games, teams: lastGood.teams, groups: lastGood.groups, stale: true });
    }
    return NextResponse.json({ ...fallback, stale: true });
  }
}
