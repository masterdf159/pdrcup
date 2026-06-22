import { NextRequest, NextResponse } from 'next/server';
import { generatePrediction, type MatchPrediction } from '@/lib/predictions';
import type { WCGame } from '@/lib/api-football';

// Allow the AI call enough time on Vercel (avoids the function "hanging"/timing out).
export const maxDuration = 60;

// In-memory cache of the last successful AI prediction per match state.
// Survives across requests within a warm serverless instance.
const cache = new Map<string, { prediction: MatchPrediction; ts: number }>();

function cacheKey(game: WCGame): string {
  // Key by match + state + score so live/finished updates get their own entry,
  // but we can still fall back to ANY cached prediction for the same match id.
  return `${game.id}:${game.finished}:${game.time_elapsed}:${game.home_score}-${game.away_score}`;
}

function findAnyCached(gameId: string): MatchPrediction | null {
  let latest: { prediction: MatchPrediction; ts: number } | null = null;
  for (const [key, val] of cache) {
    if (key.startsWith(`${gameId}:`) && (!latest || val.ts > latest.ts)) latest = val;
  }
  return latest?.prediction || null;
}

export async function POST(req: NextRequest) {
  let game: WCGame;
  let allGames: WCGame[];
  try {
    ({ game, allGames } = (await req.json()) as { game: WCGame; allGames: WCGame[] });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const key = cacheKey(game);

  // 1. Fresh exact-state cache → return immediately (no AI call needed).
  const exact = cache.get(key);
  if (exact && Date.now() - exact.ts < 6 * 60 * 60 * 1000) {
    return NextResponse.json({ prediction: exact.prediction, cached: true });
  }

  // 2. Try the AI.
  try {
    const prediction = await generatePrediction(game, allGames);
    cache.set(key, { prediction, ts: Date.now() });
    return NextResponse.json({ prediction });
  } catch (error) {
    console.error('AI unavailable:', error instanceof Error ? error.message : error);
    // 3. AI down → serve the last cached prediction for this match if we have one.
    const cached = findAnyCached(game.id);
    if (cached) {
      return NextResponse.json({ prediction: cached, cached: true, stale: true });
    }
    // 4. No cache and AI down → do NOT show a weak guess.
    return NextResponse.json({ unavailable: true }, { status: 200 });
  }
}
