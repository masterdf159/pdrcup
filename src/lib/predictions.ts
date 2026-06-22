import { chatCompletion } from './ai';
import { searchMatchPredictions, formatWebData } from './web-search';
import type { WCGame } from './api-football';

export interface PredictedStats {
  possessionHome: number;
  possessionAway: number;
  shotsHome: number;
  shotsAway: number;
  shotsOnTargetHome: number;
  shotsOnTargetAway: number;
  cornersHome: number;
  cornersAway: number;
  xgHome: number;
  xgAway: number;
  foulsHome: number;
  foulsAway: number;
  yellowCardsHome?: number;
  yellowCardsAway?: number;
  redCardsHome?: number;
  redCardsAway?: number;
}

export interface PredictedScorer {
  team: 'home' | 'away';
  player: string;
  likelihood: number; // 0-100 probability of scoring
}

export interface AttackZones {
  home: { left: number; center: number; right: number };
  away: { left: number; center: number; right: number };
}

export interface DangerZone {
  team: 'home' | 'away';
  zone: string;
  danger: number;
}

export interface PredictedShot {
  team: 'home' | 'away';
  player: string;
  x: number;
  y: number;
  outcome: 'goal' | 'saved' | 'missed' | 'blocked';
  xg: number;
  minute: string;
}

export interface TeamHistory {
  fifaRank?: number;
  worldCupTitles?: number;
  bestFinish?: string;
  appearances?: number;
  recentForm?: string[];
  notableResults?: string[];
  keyPlayers?: string[];
}

export interface H2HRecord {
  summary?: string;
  homeWins?: number;
  draws?: number;
  awayWins?: number;
  lastMeetings?: string[];
}

export interface TeamDeepAnalysis {
  style?: string;
  strengths?: string[];
  weaknesses?: string[];
  verdict?: string;
}

export interface MatchPrediction {
  homeGoals: number;
  awayGoals: number;
  confidence: number;
  analysis: string;
  keyFactors: string[];
  riskAlerts: string[];
  probabilityHome: number;
  probabilityDraw: number;
  probabilityAway: number;
  btts: boolean;
  over25: boolean;
  momentum?: string;
  stats?: PredictedStats;
  attackZones?: AttackZones;
  dangerZones?: DangerZone[];
  shotMap?: PredictedShot[];
  keyPlayerHome?: string;
  keyPlayerAway?: string;
  firstGoalMinute?: string;
  homeHistory?: TeamHistory;
  awayHistory?: TeamHistory;
  h2h?: H2HRecord;
  homeAnalysis?: TeamDeepAnalysis;
  awayAnalysis?: TeamDeepAnalysis;
  predictedScorers?: PredictedScorer[];
}

function parseScorers(raw: string): string {
  if (!raw || raw === 'null' || raw === '{}') return 'ninguno';
  return raw.replace(/[{}""""]/g, '');
}

function buildTeamProfile(teamName: string, allGames: WCGame[]): string {
  const finished = allGames.filter(
    g => g.finished === 'TRUE' &&
    (g.home_team_name_en === teamName || g.away_team_name_en === teamName)
  );

  if (finished.length === 0) return `  Sin partidos jugados aún en este Mundial.`;

  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  const details: string[] = [];

  finished.forEach(g => {
    const isH = g.home_team_name_en === teamName;
    const scored = Number(isH ? g.home_score : g.away_score);
    const conceded = Number(isH ? g.away_score : g.home_score);
    gf += scored; ga += conceded;
    if (scored > conceded) w++; else if (scored === conceded) d++; else l++;

    const opp = isH ? g.away_team_name_en : g.home_team_name_en;
    const res = scored > conceded ? '✅ VICTORIA' : scored === conceded ? '🟡 EMPATE' : '❌ DERROTA';
    const scorers = isH ? parseScorers(g.home_scorers) : parseScorers(g.away_scorers);

    details.push(`  ${res} ${scored}-${conceded} vs ${opp} (Goles: ${scorers})`);
  });

  return `  ${w}V ${d}E ${l}D | GF:${gf} GC:${ga} DG:${gf - ga >= 0 ? '+' : ''}${gf - ga} | Prom: ${(gf / finished.length).toFixed(1)} goles/partido
${details.join('\n')}`;
}

async function buildPrompt(game: WCGame, allGames: WCGame[]): Promise<string> {
  const finished = allGames.filter(g => g.finished === 'TRUE');
  const isLive = game.time_elapsed === 'live';
  const isFinished = game.finished === 'TRUE';

  // Tournament stats
  let totalGoals = 0, btts = 0, over25 = 0;
  finished.forEach(g => {
    const hg = Number(g.home_score), ag = Number(g.away_score);
    totalGoals += hg + ag;
    if (hg > 0 && ag > 0) btts++;
    if (hg + ag > 2) over25++;
  });
  const n = finished.length || 1;

  // Team profiles from tournament
  const homeProfile = buildTeamProfile(game.home_team_name_en, allGames);
  const awayProfile = buildTeamProfile(game.away_team_name_en, allGames);

  // Group context
  const groupGames = finished
    .filter(g => g.group === game.group && g.type === 'group')
    .map(g => `  ${g.home_team_name_en} ${g.home_score}-${g.away_score} ${g.away_team_name_en} (${parseScorers(g.home_scorers)} / ${parseScorers(g.away_scorers)})`)
    .join('\n');

  // Web search for expert predictions
  let webSection = '';
  try {
    const webData = await searchMatchPredictions(game.home_team_name_en, game.away_team_name_en);
    const formatted = formatWebData(webData);
    if (formatted !== 'No se encontraron predicciones externas.') {
      webSection = `\n══ PREDICCIONES DE EXPERTOS Y CASAS DE APUESTAS (INTERNET) ══\n${formatted}`;
    }
  } catch { /* web search is optional */ }

  // Live match section
  let liveSection = '';
  if (isLive) {
    liveSection = `
⚠️ ¡¡PARTIDO EN VIVO!! Score actual: ${game.home_team_name_en} ${game.home_score} - ${game.away_score} ${game.away_team_name_en}
Goleadores ${game.home_team_name_en}: ${parseScorers(game.home_scorers)}
Goleadores ${game.away_team_name_en}: ${parseScorers(game.away_scorers)}
→ Predice el RESULTADO FINAL basándote en el marcador actual y el momentum.
`;
  }

  // ── FINISHED MATCH: post-match ANALYSIS mode (not a prediction) ──
  if (isFinished) {
    return `Eres el mejor analista de fútbol del mundo. Realiza un ANÁLISIS POST-PARTIDO (no una predicción) de este partido del Mundial 2026 que YA TERMINÓ.

RESULTADO REAL FINAL: ${game.home_team_name_en} ${game.home_score} - ${game.away_score} ${game.away_team_name_en}
Goleadores ${game.home_team_name_en}: ${parseScorers(game.home_scorers)}
Goleadores ${game.away_team_name_en}: ${parseScorers(game.away_scorers)}
FASE: ${game.type === 'group' ? `Grupo ${game.group} — Jornada ${game.matchday}` : game.type}
ESTADIO: ${game.stadium_name || '?'}, ${game.stadium_city || '?'}

INSTRUCCIONES:
1. "homeGoals" y "awayGoals" DEBEN ser el marcador real final (${game.home_score}-${game.away_score}).
2. El campo "analysis" debe ser una CRÓNICA en PASADO: qué pasó, quién dominó, momentos clave, por qué se dio ese resultado.
3. Estima ESTADÍSTICAS REALISTAS coherentes con el resultado (posesión, tiros, xG, córners, faltas).
4. "shotMap" debe reflejar los GOLES REALES (un tiro con outcome "goal" por cada gol real, con el goleador real) más algunas ocasiones.
5. "keyFactors" = razones REALES por las que ganó/empató el equipo. "riskAlerts" = momentos de peligro o lo que pudo cambiar.
6. Incluye historial de ambas selecciones en otras Copas del Mundo y su cara a cara histórico.
7. Usa tu conocimiento de los jugadores reales de cada selección en 2026.

Responde ÚNICAMENTE con el JSON especificado abajo. ${buildJsonSpec(game, false)}`;
  }

  return `Eres el mejor analista de fútbol del mundo. Tu trabajo es predecir partidos de la Copa del Mundo FIFA 2026 con la MÁXIMA PRECISIÓN posible.

REGLAS DE ANÁLISIS (MUY IMPORTANTE — NO te limites al Mundial 2026):
1. Tu análisis debe basarse PRINCIPALMENTE en el HISTORIAL COMPLETO de cada selección, NO solo en los partidos del Mundial 2026:
   • Copas del Mundo anteriores (2022 Qatar, 2018 Rusia, 2014 Brasil, 2010, 2006...)
   • Copas continentales recientes (Eurocopa, Copa América, Copa Africana, Copa Asiática)
   • Eliminatorias mundialistas y partidos amistosos previos
   • Nations League / clasificatorias
2. Considera ranking FIFA actual, títulos, palmarés, plantilla 2026, jugadores estrella y técnico
3. HISTORIAL DIRECTO (cara a cara): resultados históricos entre ambas selecciones en todas las competencias
4. Los datos del Mundial 2026 (abajo) son un complemento, NO la única fuente — pésalos junto con la trayectoria histórica
5. Si un equipo es históricamente potente (ej. Brasil, Alemania, Argentina, Francia) pero tuvo mal arranque, considéralo igualmente favorito según su nivel real
6. Las predicciones de casas de apuestas son indicadores importantes — úsalas como referencia
7. Sé ESPECÍFICO con DATOS CONCRETOS de tu conocimiento histórico (años, marcadores, torneos)
${liveSection}
══════════════════════════════════════════════════════════════
PARTIDO: ${game.home_team_name_en} vs ${game.away_team_name_en}
FASE: ${game.type === 'group' ? `Grupo ${game.group} — Jornada ${game.matchday}` : game.type === 'r32' ? '32avos de Final' : game.type === 'r16' ? 'Octavos' : game.type === 'qf' ? 'Cuartos' : game.type === 'sf' ? 'Semifinal' : game.type === 'final' ? 'Final' : game.type}
ESTADIO: ${game.stadium_name || '?'}, ${game.stadium_city || '?'}
══════════════════════════════════════════════════════════════

══ RENDIMIENTO EN ESTE MUNDIAL 2026 ══

${game.home_team_name_en}:
${homeProfile}

${game.away_team_name_en}:
${awayProfile}

${groupGames ? `══ TODOS LOS RESULTADOS DEL GRUPO ${game.group} ══\n${groupGames}` : ''}

══ ESTADÍSTICAS GENERALES MUNDIAL 2026 (${n} partidos jugados) ══
- Promedio goles/partido: ${(totalGoals / n).toFixed(2)}
- Ambos anotan (BTTS): ${((btts / n) * 100).toFixed(0)}%
- Over 2.5 goles: ${((over25 / n) * 100).toFixed(0)}%
${webSection}

══ TU PREDICCIÓN ══
Predice también ESTADÍSTICAS AVANZADAS realistas del partido (posesión, tiros, xG, zonas de ataque).
- attackZones: intensidad 0-100 de ataque por banda (izquierda/centro/derecha) de cada equipo
- dangerZones: las 2-3 zonas de mayor peligro de gol con su % de peligro
- keyPlayer: jugador clave real de cada selección que probablemente influya
- shotMap: 4-6 tiros/ocasiones CLAVE previstas del partido. Para cada uno:
  · x = posición horizontal 0-100 (0=campo propio, 100=portería rival), normalmente entre 60-95
  · y = posición vertical 0-100 (0=arriba, 50=centro, 100=abajo)
  · outcome = "goal" | "saved" | "missed" | "blocked"
  · xg = probabilidad de gol 0.0-1.0
  · player = nombre real del jugador rematador
  El nº de "goal" en shotMap debe coincidir con homeGoals/awayGoals.

Responde ÚNICAMENTE con este JSON (sin texto extra, sin markdown):
${buildJsonSpec(game, isLive)}`;
}

function buildJsonSpec(game: WCGame, isLive: boolean): string {
  return `{
  "homeGoals": <goles ${game.home_team_name_en}>,
  "awayGoals": <goles ${game.away_team_name_en}>,
  "confidence": <0-100>,
  "analysis": "<3-4 oraciones EN ESPAÑOL con datos concretos>",
  "keyFactors": ["<dato 1>", "<dato 2>", "<dato 3>"],
  "riskAlerts": ["<momento clave o factor de riesgo>"],
  "probabilityHome": <0-100>,
  "probabilityDraw": <0-100>,
  "probabilityAway": <0-100>,
  "btts": <true/false>,
  "over25": <true/false>,
  "firstGoalMinute": "<rango ej. 20-35>",
  "keyPlayerHome": "<jugador clave ${game.home_team_name_en}>",
  "keyPlayerAway": "<jugador clave ${game.away_team_name_en}>",
  "stats": {
    "possessionHome": <%>, "possessionAway": <%>,
    "shotsHome": <num>, "shotsAway": <num>,
    "shotsOnTargetHome": <num>, "shotsOnTargetAway": <num>,
    "cornersHome": <num>, "cornersAway": <num>,
    "xgHome": <ej. 1.8>, "xgAway": <ej. 0.9>,
    "foulsHome": <num>, "foulsAway": <num>,
    "yellowCardsHome": <num tarjetas amarillas esperadas>, "yellowCardsAway": <num>,
    "redCardsHome": <0 o 1>, "redCardsAway": <0 o 1>
  },
  "predictedScorers": [
    { "team": "home", "player": "<jugador real con probabilidad de marcar>", "likelihood": <0-100> },
    { "team": "away", "player": "<jugador real>", "likelihood": <0-100> }
  ],
  "attackZones": {
    "home": { "left": <0-100>, "center": <0-100>, "right": <0-100> },
    "away": { "left": <0-100>, "center": <0-100>, "right": <0-100> }
  },
  "dangerZones": [
    { "team": "home", "zone": "<ej. Banda derecha>", "danger": <0-100> },
    { "team": "away", "zone": "<ej. Centro del área>", "danger": <0-100> }
  ],
  "shotMap": [
    { "team": "home", "player": "<nombre>", "x": <60-95>, "y": <0-100>, "outcome": "goal|saved|missed|blocked", "xg": <0.0-1.0>, "minute": "<ej. 34>" }
  ],
  "homeHistory": {
    "fifaRank": <ranking FIFA actual de ${game.home_team_name_en}>,
    "worldCupTitles": <nº títulos mundiales>,
    "bestFinish": "<mejor actuación histórica, ej. Campeón 2014>",
    "appearances": <nº participaciones en mundiales>,
    "recentForm": ["<resultado reciente fuera de este mundial 1>", "<2>", "<3>"],
    "notableResults": ["<actuación histórica destacada en otra copa>"],
    "keyPlayers": ["<estrella 1>", "<estrella 2>"]
  },
  "awayHistory": {
    "fifaRank": <ranking FIFA actual de ${game.away_team_name_en}>,
    "worldCupTitles": <nº títulos>,
    "bestFinish": "<mejor actuación>",
    "appearances": <nº participaciones>,
    "recentForm": ["<resultado reciente 1>", "<2>", "<3>"],
    "notableResults": ["<actuación histórica destacada>"],
    "keyPlayers": ["<estrella 1>", "<estrella 2>"]
  },
  "h2h": {
    "summary": "<resumen del historial directo entre ambas selecciones>",
    "homeWins": <victorias históricas ${game.home_team_name_en}>,
    "draws": <empates>,
    "awayWins": <victorias ${game.away_team_name_en}>,
    "lastMeetings": ["<último enfrentamiento ej. 2018: Brasil 2-0 Serbia>", "<otro>"]
  },
  "homeAnalysis": {
    "style": "<estilo de juego de ${game.home_team_name_en}: esquema táctico, forma de jugar, identidad>",
    "strengths": ["<fortaleza 1>", "<fortaleza 2>", "<fortaleza 3>"],
    "weaknesses": ["<debilidad 1>", "<debilidad 2>"],
    "verdict": "<veredicto/conclusión en 1-2 oraciones sobre el nivel y momento de ${game.home_team_name_en}>"
  },
  "awayAnalysis": {
    "style": "<estilo de juego de ${game.away_team_name_en}>",
    "strengths": ["<fortaleza 1>", "<fortaleza 2>", "<fortaleza 3>"],
    "weaknesses": ["<debilidad 1>", "<debilidad 2>"],
    "verdict": "<veredicto sobre ${game.away_team_name_en}>"
  }${isLive ? ',\n  "momentum": "home|away|balanced"' : ''}
}`;
}

function parseJSON<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in response');
  return JSON.parse(match[0]);
}

// Throws if the AI is unavailable/times out — the caller decides whether to use
// a cached prediction or report unavailability (we never serve a weak guess).
export async function generatePrediction(game: WCGame, allGames: WCGame[]): Promise<MatchPrediction> {
  const prompt = await buildPrompt(game, allGames);
  const response = await chatCompletion([
    { role: 'system', content: 'Eres un analista de fútbol de élite. Respondes SOLO con JSON válido, sin texto extra.' },
    { role: 'user', content: prompt },
  ]);
  return parseJSON<MatchPrediction>(response);
}

