// Reads raw JSON fetched by curl (in /tmp) and writes the enriched snapshot
// to src/data/wc-fallback.json. Run by the GitHub Action (curl does the
// fetching because Node's fetch is blocked by the source).
import { readFileSync, writeFileSync } from 'fs';

function read(p) {
  const raw = readFileSync(p, 'utf-8');
  if (!raw.trim().startsWith('{')) throw new Error(`Not JSON: ${p}`);
  return JSON.parse(raw);
}

const teams = read('/tmp/teams.json').teams || [];
const rawGames = read('/tmp/games.json').games || [];
const rawGroups = read('/tmp/groups.json').groups || [];
let stadiums = [];
try { stadiums = read('/tmp/stadiums.json').stadiums || []; } catch { /* optional */ }

if (!teams.length || !rawGames.length) {
  console.error('Empty payload — aborting, keeping previous snapshot.');
  process.exit(1);
}

const teamMap = new Map(teams.map(t => [t.id, t]));
const stadiumMap = new Map(stadiums.map(s => [s.id, s]));

const games = rawGames.map(g => {
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

const groups = rawGroups.map(g => ({
  ...g,
  teams: g.teams.map(gt => {
    const t = teamMap.get(gt.team_id);
    return { ...gt, team_name: t?.name_en || 'TBD', team_flag: t?.flag || '', team_fifa_code: t?.fifa_code || '' };
  }),
}));

writeFileSync('src/data/wc-fallback.json', JSON.stringify({ games, teams, groups }));

const live = games.filter(g => g.time_elapsed === 'live').length;
const finished = games.filter(g => g.finished === 'TRUE').length;
console.log(`Snapshot written: ${games.length} games, ${finished} finished, ${live} live`);
