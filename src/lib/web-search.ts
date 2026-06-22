export interface WebPredictionData {
  odds: string;
  expertPredictions: string[];
  recentNews: string[];
  source: string;
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** Fetch real news headlines/snippets from Google News RSS (reliable, no blocking). */
async function googleNews(query: string, limit: number, lang: 'en' | 'es' = 'en'): Promise<string[]> {
  const ceid = lang === 'es' ? 'US:es-419' : 'US:en';
  const hl = lang === 'es' ? 'es-419' : 'en-US';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=US&ceid=${ceid}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    const out: string[] = [];
    for (const it of items) {
      const block = it[1];
      const titleM = block.match(/<title>([\s\S]*?)<\/title>/);
      if (!titleM) continue;
      const title = titleM[1]
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\s+-\s+[^-]+$/, '') // strip trailing " - Source"
        .trim();
      if (title.length > 15) out.push(title);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

export async function searchMatchPredictions(homeTeam: string, awayTeam: string): Promise<WebPredictionData> {
  const news = await googleNews(`${homeTeam} ${awayTeam} World Cup 2026`, 6);
  return {
    odds: 'No odds data found',
    expertPredictions: news,
    recentNews: news,
    source: 'Google News',
  };
}

/** Real news headlines about the matchup for the analyst commentary section. */
export async function searchAnalystOpinions(
  homeTeam: string,
  awayTeam: string,
  finished: boolean
): Promise<string[]> {
  const tail = finished ? 'match report result' : 'preview prediction';
  const [en, es] = await Promise.all([
    googleNews(`${homeTeam} ${awayTeam} ${tail}`, 6, 'en'),
    googleNews(`${homeTeam} ${awayTeam} Mundial 2026`, 4, 'es'),
  ]);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const s of [...es, ...en]) {
    const key = s.slice(0, 40).toLowerCase();
    if (!seen.has(key)) { seen.add(key); unique.push(s); }
  }
  return unique.slice(0, 8);
}

export function formatWebData(data: WebPredictionData): string {
  if (data.expertPredictions.length === 0) return 'No se encontraron noticias externas.';
  return `NOTICIAS RECIENTES (Google News):\n${data.expertPredictions.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
}
