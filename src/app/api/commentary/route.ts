import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { searchAnalystOpinions } from '@/lib/web-search';

export const maxDuration = 60;

export interface AnalystTake {
  analyst: string;
  angle: string;
  text: string;
}

function parseJSON<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON');
  return JSON.parse(match[0]);
}

export async function POST(req: NextRequest) {
  try {
    const { homeTeam, awayTeam, finished, score } = await req.json();

    const snippets = await searchAnalystOpinions(homeTeam, awayTeam, !!finished);

    const webBlock = snippets.length
      ? `OPINIONES Y NOTAS ENCONTRADAS EN INTERNET (úsalas como base real):\n${snippets.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : 'No se encontraron notas en internet; usa tu conocimiento futbolístico.';

    const ctx = finished
      ? `El partido ${homeTeam} vs ${awayTeam} del Mundial 2026 YA TERMINÓ${score ? ` (resultado ${score})` : ''}. Genera comentarios POST-PARTIDO de analistas: qué destacaron, claves del resultado, actuaciones.`
      : `El partido ${homeTeam} vs ${awayTeam} del Mundial 2026 aún NO se juega. Genera comentarios PREVIOS de analistas: qué esperan, claves tácticas, favoritismo.`;

    const prompt = `Eres un panel de analistas de fútbol. ${ctx}

${webBlock}

Genera 5 comentarios DISTINTOS de analistas, cada uno desde un ángulo diferente (táctico, estadístico, histórico, mediático, apuestas).
Cada comentario debe sonar como un analista real, en español, 2-3 oraciones, específico y con sustancia.

Responde SOLO con este JSON:
{
  "takes": [
    { "analyst": "<nombre ficticio realista del analista>", "angle": "<Táctico|Estadístico|Histórico|Mediático|Apuestas>", "text": "<comentario de 2-3 oraciones>" }
  ]
}`;

    const response = await chatCompletion([
      { role: 'system', content: 'Eres un panel de analistas de fútbol expertos. Respondes SOLO JSON válido.' },
      { role: 'user', content: prompt },
    ]);

    const parsed = parseJSON<{ takes: AnalystTake[] }>(response);
    return NextResponse.json({ takes: parsed.takes || [], sources: snippets.length });
  } catch (error) {
    console.error('Commentary error:', error);
    return NextResponse.json({ takes: [], sources: 0, error: 'failed' }, { status: 200 });
  }
}
