'use client';
import { motion } from 'framer-motion';
import { BarChart3, Sparkles } from 'lucide-react';
import type { PredictedStats } from '@/lib/predictions';

interface Props {
  stats: PredictedStats;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  finished?: boolean;
}

interface Row {
  label: string;
  home: number;
  away: number;
  decimals?: boolean;
  highlight?: boolean;
}

export default function PredictedStatsPanel({ stats, homeTeam, awayTeam, homeFlag, awayFlag, finished }: Props) {
  // Derived precision metrics (% shots on target)
  const accHome = stats.shotsHome > 0 ? Math.round((stats.shotsOnTargetHome / stats.shotsHome) * 100) : 0;
  const accAway = stats.shotsAway > 0 ? Math.round((stats.shotsOnTargetAway / stats.shotsAway) * 100) : 0;

  const rows: Row[] = [
    { label: 'Goles Esperados (xG)', home: stats.xgHome, away: stats.xgAway, decimals: true, highlight: true },
    { label: 'Posesión %', home: stats.possessionHome, away: stats.possessionAway },
    { label: 'Tiros Totales', home: stats.shotsHome, away: stats.shotsAway },
    { label: 'Tiros a Puerta', home: stats.shotsOnTargetHome, away: stats.shotsOnTargetAway },
    { label: 'Precisión de Tiro %', home: accHome, away: accAway },
    { label: 'Córners', home: stats.cornersHome, away: stats.cornersAway },
    { label: 'Faltas', home: stats.foulsHome, away: stats.foulsAway },
  ];

  return (
    <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          {finished ? 'Estadísticas del Partido (IA)' : 'Estadísticas Predichas por IA'}
        </h3>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 rounded-full">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span className="text-[9px] text-purple-400 font-bold">{finished ? 'ANÁLISIS' : 'PROYECCIÓN'}</span>
        </div>
      </div>

      <div className="p-5">
        {/* Team headers */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {homeFlag && <img src={homeFlag} alt="" className="w-6 h-4 object-cover rounded-sm" />}
            <span className="text-xs font-bold text-emerald-400">{homeTeam}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-400">{awayTeam}</span>
            {awayFlag && <img src={awayFlag} alt="" className="w-6 h-4 object-cover rounded-sm" />}
          </div>
        </div>

        <div className="space-y-4">
          {rows.map((row, i) => {
            const total = row.home + row.away || 1;
            const homePct = (row.home / total) * 100;
            const awayPct = (row.away / total) * 100;
            const homeWins = row.home > row.away;
            const awayWins = row.away > row.home;

            return (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-sm font-black ${homeWins ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {row.decimals ? row.home.toFixed(1) : row.home}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wide ${row.highlight ? 'text-purple-300 font-bold' : 'text-gray-500'}`}>
                    {row.label}
                  </span>
                  <span className={`text-sm font-black ${awayWins ? 'text-blue-400' : 'text-gray-400'}`}>
                    {row.decimals ? row.away.toFixed(1) : row.away}
                  </span>
                </div>
                <div className="flex gap-1 h-2">
                  <div className="flex-1 bg-gray-800 rounded-full overflow-hidden flex justify-end">
                    <motion.div
                      className={`h-full rounded-full ${row.highlight ? 'bg-gradient-to-r from-purple-600 to-emerald-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${homePct}%` }}
                      transition={{ duration: 0.7, delay: i * 0.05 }}
                    />
                  </div>
                  <div className="flex-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${row.highlight ? 'bg-gradient-to-r from-blue-400 to-purple-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${awayPct}%` }}
                      transition={{ duration: 0.7, delay: i * 0.05 }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
