'use client';
import { motion } from 'framer-motion';
import { ClipboardList, TrendingUp, TrendingDown, Compass } from 'lucide-react';
import type { TeamDeepAnalysis } from '@/lib/predictions';

interface Props {
  home: { name: string; flag: string; code: string; analysis?: TeamDeepAnalysis };
  away: { name: string; flag: string; code: string; analysis?: TeamDeepAnalysis };
}

function Card({ team, accent }: { team: Props['home']; accent: 'emerald' | 'blue' }) {
  const a = team.analysis;
  const ring = accent === 'emerald' ? 'border-emerald-500/20' : 'border-blue-500/20';
  const txt = accent === 'emerald' ? 'text-emerald-400' : 'text-blue-400';

  return (
    <div className={`glass rounded-2xl border ${ring} p-4`}>
      <div className="flex items-center gap-2.5 mb-3">
        {team.flag && <img src={team.flag} alt="" className="w-8 h-5.5 object-cover rounded shadow-md" />}
        <div>
          <p className="text-sm font-black text-white leading-tight">{team.name}</p>
          <p className="text-[10px] text-gray-500 tracking-wider">{team.code}</p>
        </div>
      </div>

      {!a ? (
        <p className="text-xs text-gray-500">Análisis no disponible</p>
      ) : (
        <div className="space-y-3">
          {a.style && (
            <div className="flex items-start gap-2">
              <Compass className={`w-3.5 h-3.5 ${txt} mt-0.5 flex-shrink-0`} />
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Estilo de juego</p>
                <p className="text-xs text-gray-300 leading-relaxed">{a.style}</p>
              </div>
            </div>
          )}

          {a.strengths && a.strengths.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" /> Fortalezas
              </p>
              <div className="space-y-1">
                {a.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                    <span className="text-emerald-400 mt-0.5">+</span><span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {a.weaknesses && a.weaknesses.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-red-400" /> Debilidades
              </p>
              <div className="space-y-1">
                {a.weaknesses.map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                    <span className="text-red-400 mt-0.5">−</span><span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {a.verdict && (
            <div className={`rounded-lg p-2.5 ${accent === 'emerald' ? 'bg-emerald-500/[0.07] border border-emerald-500/15' : 'bg-blue-500/[0.07] border border-blue-500/15'}`}>
              <p className="text-[11px] text-gray-200 leading-relaxed italic">&ldquo;{a.verdict}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamAnalysisSection({ home, away }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
          <ClipboardList className="w-3 h-3 text-cyan-400" />
        </div>
        <h3 className="text-sm font-bold text-white">Análisis Detallado de los Equipos</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card team={home} accent="emerald" />
        <Card team={away} accent="blue" />
      </div>
    </motion.div>
  );
}
