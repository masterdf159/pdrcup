'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Globe, Loader2, Quote } from 'lucide-react';

interface AnalystTake {
  analyst: string;
  angle: string;
  text: string;
}

interface Props {
  homeTeam: string;
  awayTeam: string;
  finished: boolean;
  score?: string;
}

const ANGLE_COLOR: Record<string, string> = {
  'Táctico': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Estadístico': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'Histórico': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Mediático': 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'Apuestas': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function CommentarySection({ homeTeam, awayTeam, finished, score }: Props) {
  const [takes, setTakes] = useState<AnalystTake[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState(0);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/commentary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeTeam, awayTeam, finished, score }),
        });
        const json = await res.json();
        if (!active) return;
        setTakes(json.takes || []);
        setSources(json.sources || 0);
      } catch {
        // silent
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [homeTeam, awayTeam, finished, score]);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Mic className="w-4 h-4 text-pink-400" />
          {finished ? 'Qué Dicen los Analistas del Partido' : 'Qué Opinan los Analistas'}
        </h3>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-full">
          <Globe className="w-3 h-3 text-gray-400" />
          <span className="text-[9px] text-gray-400 font-bold">{sources > 0 ? `${sources} fuentes web` : 'WEB + IA'}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <Loader2 className="w-6 h-6 text-pink-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-500">Buscando opiniones de analistas en internet...</p>
          </div>
        </div>
      ) : takes.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-xs text-gray-500">No se encontraron comentarios en este momento.</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-2.5">
          {takes.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex gap-3 rounded-xl bg-white/[0.03] border border-white/5 p-3"
            >
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center">
                  <span className="text-[11px] font-black text-white">{initials(t.analyst || 'AN')}</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold text-white">{t.analyst}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-bold ${ANGLE_COLOR[t.angle] || 'text-gray-400 bg-white/5 border-white/10'}`}>
                    {t.angle}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <Quote className="w-3 h-3 text-gray-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300 leading-relaxed">{t.text}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="px-5 py-2 border-t border-white/5">
        <p className="text-[9px] text-gray-600 text-center">
          Opiniones generadas por IA a partir de búsquedas en internet. No representan declaraciones reales.
        </p>
      </div>
    </div>
  );
}
