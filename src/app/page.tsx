'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trophy, Brain, ChevronRight, Loader2, WifiOff, Globe, Filter, Star } from 'lucide-react';
import Link from 'next/link';
import { useWorldCup } from '@/hooks/useFixtures';
import type { WCGame } from '@/lib/types';

type ViewMode = 'calendar' | 'groups';
type RoundFilter = 'all' | 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';

const TYPE_TO_FILTER: Record<string, RoundFilter> = {
  group: 'group', r32: 'r32', r16: 'r16', qf: 'qf', sf: 'sf', third: 'final', final: 'final',
};

const ROUND_LABELS: Record<RoundFilter, string> = {
  all: 'Todos', group: 'Grupos', r32: '32avos', r16: 'Octavos', qf: 'Cuartos', sf: 'Semis', final: 'Final',
};

const ROUND_ICON: Record<RoundFilter, string> = {
  all: '⚽', group: '🏟️', r32: '🎯', r16: '🔥', qf: '⚔️', sf: '🥈', final: '🏆',
};

function parseDate(localDate: string): Date {
  const [datePart, timePart] = localDate.split(' ');
  const [month, day, year] = datePart.split('/');
  return new Date(`${year}-${month}-${day}T${timePart}:00`);
}

function formatDay(localDate: string): string {
  const d = parseDate(localDate);
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime(localDate: string): string {
  const [, timePart] = localDate.split(' ');
  return timePart;
}

function dateKey(localDate: string): string {
  return localDate.split(' ')[0];
}

function parseScorers(raw: string): { player: string }[] {
  if (!raw || raw === 'null' || raw === '{}') return [];
  const clean = raw.replace(/[{}"'“”‘’]/g, '');
  return clean.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^(.+?)\s+\d/);
    return { player: m ? m[1].trim() : s };
  });
}

function groupByDate(games: WCGame[]): Map<string, WCGame[]> {
  const map = new Map<string, WCGame[]>();
  games.forEach(g => {
    const key = dateKey(g.local_date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  });
  return map;
}

export default function Home() {
  const { games, groups, loading, error } = useWorldCup();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [roundFilter, setRoundFilter] = useState<RoundFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = games;
    if (roundFilter !== 'all') {
      list = list.filter(g => TYPE_TO_FILTER[g.type] === roundFilter);
    }
    return list.sort((a, b) => parseDate(a.local_date).getTime() - parseDate(b.local_date).getTime());
  }, [games, roundFilter]);

  const dateGroups = useMemo(() => groupByDate(filtered), [filtered]);
  const allDates = useMemo(() => Array.from(dateGroups.keys()).sort((a, b) => {
    const [am, ad, ay] = a.split('/'); const [bm, bd, by] = b.split('/');
    return new Date(`${ay}-${am}-${ad}`).getTime() - new Date(`${by}-${bm}-${bd}`).getTime();
  }), [dateGroups]);
  const visibleDates = selectedDate ? allDates.filter(d => d === selectedDate) : allDates;

  const liveGames = useMemo(() => games.filter(g => g.time_elapsed === 'live'), [games]);
  const finishedCount = useMemo(() => games.filter(g => g.finished === 'TRUE').length, [games]);
  const upcomingCount = useMemo(() => games.filter(g => g.finished !== 'TRUE' && g.time_elapsed !== 'live').length, [games]);

  const sortedGroups = useMemo(() => {
    return [...groups]
      .filter(g => g.name.length === 1)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groups]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/25 glow-amber">
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-bold text-amber-300 tracking-[0.15em] uppercase">FIFA World Cup 2026 · USA · México · Canadá</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight leading-[1.05]">
          Predicciones del Mundial<br />
          <span className="text-gold">con Inteligencia Artificial</span>
        </h2>
        <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
          Análisis profundo de cada partido: resultado proyectado, mapa de ataque,
          estadísticas avanzadas y zonas de peligro en tiempo real.
        </p>
      </motion.div>

      {/* Live banner */}
      {liveGames.length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-6">
          <div className="relative rounded-3xl p-5 overflow-hidden live-shine border border-red-500/25 bg-gradient-to-br from-red-950/50 via-[#0d0a12]/80 to-red-950/30">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-sm font-black text-red-400 tracking-wide">EN VIVO AHORA</span>
              <span className="text-[11px] text-red-400/50 font-medium">{liveGames.length} {liveGames.length === 1 ? 'partido' : 'partidos'}</span>
            </div>
            <div className="grid gap-2.5 md:grid-cols-2 relative">
              {liveGames.map(g => (
                <Link key={g.id} href={`/match/${g.id}`}>
                  <div className="flex items-center gap-3 rounded-2xl p-3.5 bg-white/[0.03] border border-white/5 hover:border-red-500/30 hover:bg-red-500/[0.06] transition-all duration-200 group">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {g.home_flag && <img src={g.home_flag} alt="" className="w-7 h-5 object-cover rounded shadow-md flex-shrink-0" />}
                      <span className="text-sm font-bold text-white truncate">{g.home_team_name_en}</span>
                    </div>
                    <div className="bg-red-500/20 border border-red-500/20 rounded-xl px-3.5 py-1.5 flex-shrink-0">
                      <span className="text-lg font-black text-red-300 tabular-nums">{g.home_score}–{g.away_score}</span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-1 justify-end min-w-0">
                      <span className="text-sm font-bold text-white truncate text-right">{g.away_team_name_en}</span>
                      {g.away_flag && <img src={g.away_flag} alt="" className="w-7 h-5 object-cover rounded shadow-md flex-shrink-0" />}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      {!loading && games.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-7">
          {[
            { val: games.length, label: 'Partidos', color: 'text-white', accent: 'from-gray-500/10' },
            { val: finishedCount, label: 'Jugados', color: 'text-emerald-400', accent: 'from-emerald-500/10' },
            { val: liveGames.length, label: 'En Vivo', color: 'text-red-400', accent: 'from-red-500/10' },
            { val: upcomingCount, label: 'Próximos', color: 'text-cyan-400', accent: 'from-cyan-500/10' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass rounded-2xl p-4 text-center relative overflow-hidden bg-gradient-to-b ${s.accent} to-transparent`}
            >
              <p className={`text-2xl md:text-3xl font-black ${s.color} tabular-nums`}>{s.val}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5 font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-5 p-1 rounded-2xl bg-white/[0.03] border border-white/5 w-fit">
        <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${viewMode === 'calendar' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-[#1a1206] shadow-md shadow-amber-500/20' : 'text-gray-400 hover:text-white'}`}>
          <Calendar className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />Calendario
        </button>
        <button onClick={() => setViewMode('groups')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${viewMode === 'groups' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-[#1a1206] shadow-md shadow-amber-500/20' : 'text-gray-400 hover:text-white'}`}>
          <Trophy className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />Tabla de Grupos
        </button>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 mb-6 text-amber-400/70">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-medium">Cargando Mundial 2026...</span>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl h-[68px] flex items-center px-4 gap-4">
              <div className="skeleton w-12 h-8 rounded-lg" />
              <div className="flex-1 flex items-center gap-2.5">
                <div className="skeleton w-8 h-5 rounded" />
                <div className="skeleton h-3.5 w-28 rounded" />
              </div>
              <div className="skeleton w-16 h-9 rounded-xl" />
              <div className="flex-1 flex items-center gap-2.5 justify-end">
                <div className="skeleton h-3.5 w-28 rounded" />
                <div className="skeleton w-8 h-5 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <WifiOff className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-medium">Error al cargar</p>
            <p className="text-gray-500 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* GROUPS VIEW */}
      {!loading && !error && viewMode === 'groups' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedGroups.map(group => (
            <motion.div key={group.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass glass-hover rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500/15 to-transparent px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-sm font-black text-gold">Grupo {group.name}</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800/50">
                    <th className="text-left py-2 px-3 font-medium">Equipo</th>
                    <th className="w-8 text-center font-medium">PJ</th>
                    <th className="w-8 text-center font-medium">G</th>
                    <th className="w-8 text-center font-medium">E</th>
                    <th className="w-8 text-center font-medium">P</th>
                    <th className="w-8 text-center font-medium">GD</th>
                    <th className="w-10 text-center font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {[...group.teams].sort((a, b) => Number(b.pts) - Number(a.pts) || Number(b.gd) - Number(a.gd) || Number(b.gf) - Number(a.gf)).map((t, i) => (
                    <tr key={t.team_id} className={`border-b border-gray-800/30 ${i < 2 ? 'bg-emerald-500/5' : ''}`}>
                      <td className="py-2 px-3 flex items-center gap-2">
                        {t.team_flag && <img src={t.team_flag} alt="" className="w-5 h-3.5 object-cover rounded-sm" />}
                        <span className={`font-medium ${i < 2 ? 'text-white' : 'text-gray-400'}`}>{t.team_name || `Team ${t.team_id}`}</span>
                        {i < 2 && <Star className="w-3 h-3 text-emerald-400" />}
                      </td>
                      <td className="text-center text-gray-400">{t.mp}</td>
                      <td className="text-center text-emerald-400">{t.w}</td>
                      <td className="text-center text-gray-400">{t.d}</td>
                      <td className="text-center text-red-400">{t.l}</td>
                      <td className="text-center text-gray-300">{t.gd}</td>
                      <td className="text-center font-black text-white">{t.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          ))}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {!loading && !error && viewMode === 'calendar' && (
        <>
          {/* Round filter — futbolero pills */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                <Filter className="w-3 h-3 text-amber-400" />
              </div>
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Ronda del Torneo</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ROUND_LABELS) as RoundFilter[]).map(r => {
                const count = r === 'all' ? games.length : games.filter(g => TYPE_TO_FILTER[g.type] === r).length;
                if (count === 0 && r !== 'all') return null;
                const active = roundFilter === r;
                return (
                  <button key={r} onClick={() => { setRoundFilter(r); setSelectedDate(null); }}
                    className={`group relative flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-[#1a1206] shadow-lg shadow-amber-500/25 scale-105'
                        : 'glass text-gray-400 hover:text-white hover:border-amber-500/25'
                    }`}>
                    <span className="text-sm leading-none">{ROUND_ICON[r]}</span>
                    {ROUND_LABELS[r]}
                    <span className={`min-w-[20px] text-center text-[10px] font-black px-1.5 py-0.5 rounded-md ${active ? 'bg-[#1a1206]/20 text-[#1a1206]' : 'bg-white/5 text-gray-500'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date pills — match-day style */}
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <Calendar className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Jornadas</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              <button onClick={() => setSelectedDate(null)} className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 ${!selectedDate ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25' : 'glass text-gray-400 hover:text-white hover:border-emerald-500/25'}`}>
                Todas
              </button>
              {allDates.map(d => {
                const parts = formatDay(d + ' 00:00').split(' ');
                const active = selectedDate === d;
                return (
                  <button key={d} onClick={() => setSelectedDate(d === selectedDate ? null : d)}
                    className={`flex-shrink-0 flex flex-col items-center px-3.5 py-1.5 rounded-xl transition-all duration-200 min-w-[58px] ${active ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25' : 'glass text-gray-400 hover:text-white hover:border-emerald-500/25'}`}>
                    <span className="text-[9px] uppercase tracking-wide opacity-70 capitalize">{parts[0]?.slice(0, 3)}</span>
                    <span className="text-sm font-black leading-tight">{parts[1]}</span>
                    <span className="text-[8px] uppercase opacity-70 capitalize">{parts[3]?.slice(0, 3)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Match list by date */}
          <div className="space-y-8">
            <AnimatePresence>
              {visibleDates.map(date => {
                const matches = dateGroups.get(date) || [];
                return (
                  <motion.div key={date} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl">
                        <Calendar className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-bold text-white capitalize">{formatDay(date + ' 00:00')}</span>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                      <span className="text-xs text-gray-500 font-medium">{matches.length} {matches.length === 1 ? 'partido' : 'partidos'}</span>
                    </div>
                    <div className="space-y-2">
                      {matches.map((g, i) => (
                        <MatchRow key={g.id} game={g} index={i} />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      <div className="mt-16 text-center border-t border-gray-800 pt-6 pb-4">
        <p className="text-xs text-gray-600">PRD CUP &bull; Datos en tiempo real &bull; Predicciones generadas por IA &bull; Los resultados no están garantizados</p>
      </div>
    </div>
  );
}

function MatchRow({ game: g, index }: { game: WCGame; index: number }) {
  const isLive = g.time_elapsed === 'live';
  const isFinished = g.finished === 'TRUE';
  const homeScorers = parseScorers(g.home_scorers);
  const awayScorers = parseScorers(g.away_scorers);

  const roundLabel = g.type === 'group' ? `Grupo ${g.group} · J${g.matchday}` : g.type === 'r32' ? '32avos' : g.type === 'r16' ? 'Octavos' : g.type === 'qf' ? 'Cuartos' : g.type === 'sf' ? 'Semifinal' : g.type === 'final' ? 'Final' : g.type === 'third' ? '3er puesto' : g.type;

  const homeWon = isFinished && Number(g.home_score) > Number(g.away_score);
  const awayWon = isFinished && Number(g.away_score) > Number(g.home_score);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}>
      <Link href={`/match/${g.id}`}>
        <div className={`group relative flex items-center rounded-2xl transition-all duration-250 overflow-hidden glass-hover ${isLive ? 'border border-red-500/30 bg-gradient-to-r from-red-950/30 to-transparent live-shine' : 'glass'}`}>
          {/* Accent edge */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${isLive ? 'bg-red-500' : isFinished ? 'bg-gray-700' : 'bg-gradient-to-b from-amber-400 to-yellow-600'}`} />

          {/* Time + round */}
          <div className="flex-shrink-0 w-24 text-center py-4 pl-2">
            {isLive ? (
              <div className="flex items-center justify-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-[11px] font-black text-red-400">VIVO</span>
              </div>
            ) : (
              <p className="text-base font-bold text-gray-200 tabular-nums">{formatTime(g.local_date)}</p>
            )}
            <p className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-wide font-medium">{roundLabel}</p>
          </div>

          {/* Home */}
          <div className="flex-1 px-3 py-3 min-w-0">
            <div className="flex items-center gap-2.5">
              {g.home_flag && <img src={g.home_flag} alt="" className="w-8 h-5.5 object-cover rounded shadow-md flex-shrink-0" />}
              <div className="min-w-0">
                <span className={`text-sm font-bold truncate block ${homeWon ? 'text-amber-300' : 'text-white'}`}>
                  {g.home_team_name_en}
                </span>
                {homeScorers.length > 0 && (
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">⚽ {homeScorers.map(s => s.player).join(', ')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="flex-shrink-0 px-2">
            {isFinished || isLive ? (
              <div className={`flex items-center gap-2 rounded-xl px-3.5 py-2 ${isLive ? 'bg-red-500/20 border border-red-500/20' : 'bg-white/[0.04] border border-white/5'}`}>
                <span className={`text-xl font-black tabular-nums ${isLive ? 'text-red-300' : homeWon ? 'text-amber-300' : 'text-white'}`}>{g.home_score}</span>
                <span className="text-gray-600 text-sm">:</span>
                <span className={`text-xl font-black tabular-nums ${isLive ? 'text-red-300' : awayWon ? 'text-amber-300' : 'text-white'}`}>{g.away_score}</span>
              </div>
            ) : (
              <div className="rounded-xl px-4 py-2 bg-white/[0.03] border border-white/5">
                <span className="text-xs font-black text-gray-500 tracking-wider">VS</span>
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 px-3 py-3 min-w-0">
            <div className="flex items-center gap-2.5 justify-end">
              <div className="text-right min-w-0">
                <span className={`text-sm font-bold truncate block ${awayWon ? 'text-amber-300' : 'text-white'}`}>
                  {g.away_team_name_en}
                </span>
                {awayScorers.length > 0 && (
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">⚽ {awayScorers.map(s => s.player).join(', ')}</p>
                )}
              </div>
              {g.away_flag && <img src={g.away_flag} alt="" className="w-8 h-5.5 object-cover rounded shadow-md flex-shrink-0" />}
            </div>
          </div>

          {/* AI button */}
          <div className="flex-shrink-0 pr-4 pl-1">
            {isFinished ? (
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/15 to-cyan-500/10 border border-purple-500/20 group-hover:border-purple-400/40 transition-colors">
                <Brain className="w-3.5 h-3.5 text-purple-300" />
                <span className="text-[10px] text-purple-200 font-bold hidden sm:inline">{isLive ? 'En Vivo' : 'Predecir'}</span>
                <ChevronRight className="w-3 h-3 text-purple-300/50 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-transform" />
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
