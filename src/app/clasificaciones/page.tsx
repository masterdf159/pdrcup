'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Loader2, WifiOff, Star, ArrowLeft, ListOrdered } from 'lucide-react';
import Link from 'next/link';
import { useWorldCup } from '@/hooks/useFixtures';
import type { WCGroupTeam } from '@/lib/types';

function sortTeams(teams: WCGroupTeam[]): WCGroupTeam[] {
  return [...teams].sort(
    (a, b) =>
      Number(b.pts) - Number(a.pts) ||
      Number(b.gd) - Number(a.gd) ||
      Number(b.gf) - Number(a.gf)
  );
}

export default function ClasificacionesPage() {
  const { groups, loading, error } = useWorldCup();

  const sortedGroups = useMemo(
    () => [...groups].filter(g => g.name.length === 1).sort((a, b) => a.name.localeCompare(b.name)),
    [groups]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />Volver al inicio
      </Link>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 bg-amber-500/15 border border-amber-500/25">
          <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-bold text-amber-300 tracking-[0.15em] uppercase">Clasificaciones</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
          Tabla de <span className="text-gold">Posiciones</span>
        </h1>
        <p className="text-gray-500 text-sm">Posiciones oficiales por grupo del Mundial 2026</p>
      </motion.div>

      {/* Qualification legend */}
      <div className="flex items-center justify-center gap-5 mb-6 text-[11px]">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500/40" /><span className="text-gray-400">Clasifica (1º–2º)</span></div>
        <div className="flex items-center gap-1.5"><Star className="w-3 h-3 text-amber-400" /><span className="text-gray-400">Líder de grupo</span></div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>
      )}
      {error && (
        <div className="flex items-center justify-center py-20 flex-col gap-2"><WifiOff className="w-8 h-8 text-red-400" /><p className="text-red-400 text-sm">{error}</p></div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedGroups.map((group, gi) => {
            const teams = sortTeams(group.teams);
            return (
              <motion.div
                key={group.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.04 }}
                className="glass rounded-2xl overflow-hidden"
              >
                <div className="bg-gradient-to-r from-amber-500/15 to-transparent px-4 py-3 border-b border-white/5 flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm font-black text-gold">Grupo {group.name}</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/5">
                      <th className="text-left py-2 px-3 font-medium">Equipo</th>
                      <th className="w-7 text-center font-medium">PJ</th>
                      <th className="w-7 text-center font-medium">G</th>
                      <th className="w-7 text-center font-medium">E</th>
                      <th className="w-7 text-center font-medium">P</th>
                      <th className="w-8 text-center font-medium">DG</th>
                      <th className="w-9 text-center font-bold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((t, i) => (
                      <tr key={t.team_id} className={`border-b border-white/5 ${i < 2 ? 'bg-emerald-500/[0.06]' : ''}`}>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-4 text-center text-[10px] font-bold ${i < 2 ? 'text-emerald-400' : 'text-gray-600'}`}>{i + 1}</span>
                            {t.team_flag && <img src={t.team_flag} alt="" className="w-5 h-3.5 object-cover rounded-sm" />}
                            <span className={`font-medium truncate ${i < 2 ? 'text-white' : 'text-gray-400'}`}>{t.team_name}</span>
                            {i === 0 && <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                          </div>
                        </td>
                        <td className="text-center text-gray-400">{t.mp}</td>
                        <td className="text-center text-emerald-400">{t.w}</td>
                        <td className="text-center text-gray-400">{t.d}</td>
                        <td className="text-center text-red-400">{t.l}</td>
                        <td className="text-center text-gray-300">{Number(t.gd) > 0 ? '+' : ''}{t.gd}</td>
                        <td className="text-center font-black text-white">{t.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link href="/mi-prediccion" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-sm font-bold hover:opacity-90 transition-opacity">
          <ListOrdered className="w-4 h-4" />Crea tu propia clasificación
        </Link>
      </div>
    </div>
  );
}
