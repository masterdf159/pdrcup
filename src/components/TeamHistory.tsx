'use client';
import { motion } from 'framer-motion';
import { Trophy, Medal, Hash, History, Star, Swords } from 'lucide-react';
import type { TeamHistory, H2HRecord } from '@/lib/predictions';

interface Props {
  home: { name: string; flag: string; code: string; history?: TeamHistory };
  away: { name: string; flag: string; code: string; history?: TeamHistory };
  h2h?: H2HRecord;
}

function formPill(r: string) {
  const up = r.toUpperCase();
  if (up.startsWith('V') || up.startsWith('W') || up.includes('GANÓ') || up.includes('WIN')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (up.startsWith('E') || up.startsWith('D') || up.includes('EMPAT') || up.includes('DRAW')) return 'bg-gray-600/30 text-gray-300 border-gray-600/40';
  if (up.startsWith('P') || up.startsWith('L') || up.includes('PERD') || up.includes('LOSS')) return 'bg-red-500/20 text-red-400 border-red-500/30';
  return 'bg-white/5 text-gray-300 border-white/10';
}

function HistoryCard({ team, accent }: { team: Props['home']; accent: 'emerald' | 'blue' }) {
  const h = team.history;
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

      {!h ? (
        <p className="text-xs text-gray-500">Sin datos históricos disponibles</p>
      ) : (
        <>
          {/* Quick badges */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2 text-center">
              <Hash className={`w-3 h-3 mx-auto mb-0.5 ${txt}`} />
              <p className="text-base font-black text-white tabular-nums">{h.fifaRank ?? '—'}</p>
              <p className="text-[8px] text-gray-500 uppercase">Ranking</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2 text-center">
              <Trophy className="w-3 h-3 mx-auto mb-0.5 text-amber-400" />
              <p className="text-base font-black text-white tabular-nums">{h.worldCupTitles ?? 0}</p>
              <p className="text-[8px] text-gray-500 uppercase">Títulos</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2 text-center">
              <History className={`w-3 h-3 mx-auto mb-0.5 ${txt}`} />
              <p className="text-base font-black text-white tabular-nums">{h.appearances ?? '—'}</p>
              <p className="text-[8px] text-gray-500 uppercase">Mundiales</p>
            </div>
          </div>

          {h.bestFinish && (
            <div className="flex items-center gap-2 mb-2.5 rounded-lg bg-amber-500/[0.07] border border-amber-500/15 px-2.5 py-1.5">
              <Medal className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-[11px] text-amber-200/90">{h.bestFinish}</span>
            </div>
          )}

          {h.recentForm && h.recentForm.length > 0 && (
            <div className="mb-2.5">
              <p className="text-[9px] text-gray-500 uppercase tracking-wide mb-1">Forma reciente (otras competencias)</p>
              <div className="flex flex-wrap gap-1">
                {h.recentForm.map((r, i) => (
                  <span key={i} className={`text-[9px] px-2 py-0.5 rounded-md border ${formPill(r)}`}>{r}</span>
                ))}
              </div>
            </div>
          )}

          {h.notableResults && h.notableResults.length > 0 && (
            <div className="mb-2.5">
              <p className="text-[9px] text-gray-500 uppercase tracking-wide mb-1">Hito histórico</p>
              {h.notableResults.map((r, i) => (
                <p key={i} className="text-[11px] text-gray-300 leading-snug">• {r}</p>
              ))}
            </div>
          )}

          {h.keyPlayers && h.keyPlayers.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wide mb-1">Figuras</p>
              <div className="flex flex-wrap gap-1.5">
                {h.keyPlayers.map((p, i) => (
                  <span key={i} className="flex items-center gap-1 text-[10px] text-white bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                    <Star className={`w-2.5 h-2.5 ${txt}`} />{p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TeamHistorySection({ home, away, h2h }: Props) {
  const hasH2H = h2h && (h2h.summary || (h2h.lastMeetings && h2h.lastMeetings.length > 0) ||
    h2h.homeWins != null || h2h.awayWins != null);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
          <History className="w-3 h-3 text-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-white">Historial & Palmarés en Copas del Mundo</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HistoryCard team={home} accent="emerald" />
        <HistoryCard team={away} accent="blue" />
      </div>

      {/* Head to head */}
      {hasH2H && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Swords className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm font-bold text-white">Cara a Cara Histórico</h4>
          </div>

          {(h2h.homeWins != null || h2h.awayWins != null) && (
            <div className="flex items-stretch gap-2 mb-3">
              <div className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-center">
                <p className="text-2xl font-black text-emerald-400 tabular-nums">{h2h.homeWins ?? 0}</p>
                <p className="text-[9px] text-gray-400 truncate">{home.code} gana</p>
              </div>
              <div className="flex-1 rounded-xl bg-gray-600/20 border border-gray-600/30 p-2.5 text-center">
                <p className="text-2xl font-black text-gray-300 tabular-nums">{h2h.draws ?? 0}</p>
                <p className="text-[9px] text-gray-400">Empates</p>
              </div>
              <div className="flex-1 rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5 text-center">
                <p className="text-2xl font-black text-blue-400 tabular-nums">{h2h.awayWins ?? 0}</p>
                <p className="text-[9px] text-gray-400 truncate">{away.code} gana</p>
              </div>
            </div>
          )}

          {h2h.summary && <p className="text-xs text-gray-400 leading-relaxed mb-3">{h2h.summary}</p>}

          {h2h.lastMeetings && h2h.lastMeetings.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wide mb-1.5">Últimos enfrentamientos</p>
              <div className="space-y-1">
                {h2h.lastMeetings.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-gray-300 bg-white/[0.03] border border-white/5 rounded-lg px-2.5 py-1.5">
                    <Swords className="w-3 h-3 text-purple-400/60 flex-shrink-0" />
                    {m}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
