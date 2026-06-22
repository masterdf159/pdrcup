import type { WCGame, WCTeam, WCStadium, WCGroup } from '@/lib/api-football';

const WC_API = 'https://worldcup26.ir';

export interface WorldCupPayload {
  games: WCGame[];
  teams: WCTeam[];
  groups: WCGroup[];
  fresh: boolean;
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

async function direct<T>(endpoint: string, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${WC_API}${endpoint}`, { signal: AbortSignal.timeout(7_000), cache: 'no-store' });
      if (!res.ok) throw new Error(`WC ${res.status}`);
      return await res.json();
    } catch (err) { lastErr = err; await new Promise(r => setTimeout(r, 250)); }
  }
  throw lastErr instanceof Error ? lastErr : new Error('failed');
}

// Last resort: try fetching the source DIRECTLY from the browser (sometimes the
// browser reaches it when the server momentarily can't).
async function directLoad(): Promise<WorldCupPayload> {
  const [teamsR, gamesR, groupsR] = await Promise.all([
    direct<{ teams: WCTeam[] }>('/get/teams'),
    direct<{ games: WCGame[] }>('/get/games'),
    direct<{ groups: WCGroup[] }>('/get/groups'),
  ]);
  const teams = teamsR.teams || [];
  const rawGames = gamesR.games || [];
  const rawGroups = groupsR.groups || [];
  if (!teams.length || !rawGames.length) throw new Error('empty');
  let stadiums: WCStadium[] = [];
  try { stadiums = (await direct<{ stadiums: WCStadium[] }>('/get/stadiums', 2)).stadiums || []; } catch { /* optional */ }
  return { ...enrich(rawGames, teams, stadiums, rawGroups), fresh: true };
}

/**
 * Load World Cup data. Vercel's servers can't reach the .ir source, but the
 * user's BROWSER usually can — so we fetch it directly from the browser first
 * (live data), and fall back to our server snapshot (always current as of the
 * last deploy) if the browser can't reach it either.
 */
export async function loadWorldCup(): Promise<WorldCupPayload> {
  try {
    return await directLoad();
  } catch {
    const res = await fetch('/api/worldcup', { cache: 'no-store' });
    const json = await res.json();
    return { games: json.games || [], teams: json.teams || [], groups: json.groups || [], fresh: false };
  }
}
