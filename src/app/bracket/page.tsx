'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, WifiOff, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useWorldCup } from '@/hooks/useFixtures';
import type { WCGame } from '@/lib/types';

const ROUNDS: { type: string; label: string }[] = [
  { type: 'r32', label: '32avos' },
  { type: 'r16', label: 'Octavos' },
  { type: 'qf', label: 'Cuartos' },
  { type: 'sf', label: 'Semifinales' },
  { type: 'final', label: 'Final' },
];

function TeamRow({ name, flag, score, winner }: { name?: string; flag?: string; score?: string; winner?: boolean }) {
  const tbd = !name || name === 'TBD';
  return (
    <div className="flex items-center gap-2 py-1">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border ${winner ? 'border-amber-400' : 'border-white/15'} bg-white/5`}>
        {flag && !tbd ? <img src={flag} alt="" className="w-full h-full object-cover" /> : <span className="text-[9px] text-gray-600">?</span>}
      </div>
      <span className={`text-xs flex-1 truncate ${tbd ? 'text-gray-600 italic' : winner ? 'text-amber-300 font-bold' : 'text-white font-medium'}`}>
        {tbd ? 'Por definir' : name}
      </span>
      {score != null && score !== '' && <span className={`text-xs font-black tabular-nums ${winner ? 'text-amber-300' : 'text-gray-400'}`}>{score}</span>}
    </div>
  );
}

function MatchCard({ game, index }: { game: WCGame; index: number }) {
  const played = game.finished === 'TRUE' || game.time_elapsed === 'live';
  const hs = Number(game.home_score), as_ = Number(game.away_score);
  const homeWin = played && hs > as_;
  const awayWin = played && as_ > hs;
  const date = game.local_date?.split(' ')[0]?.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      className="glass rounded-xl p-2.5 w-48 flex-shrink-0"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-black text-amber-400/80">M{game.id}</span>
        <span className="text-[8px] text-gray-600">{date}</span>
      </div>
      <TeamRow name={game.home_team_name_en} flag={game.home_flag} score={played ? game.home_score : ''} winner={homeWin} />
      <div className="h-px bg-white/5 my-0.5" />
      <TeamRow name={game.away_team_name_en} flag={game.away_flag} score={played ? game.away_score : ''} winner={awayWin} />
    </motion.div>
  );
}

export default function BracketPage() {
  const { games, loading, error } = useWorldCup();

  const byRound = useMemo(() => {
    const map: Record<string, WCGame[]> = {};
    for (const r of ROUNDS) {
      map[r.type] = games
        .filter(g => g.type === r.type)
        .sort((a, b) => Number(a.id) - Number(b.id));
    }
    return map;
  }, [games]);

  const third = useMemo(() => games.find(g => g.type === 'third'), [games]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href="/clasificaciones" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />Volver a clasificaciones
      </Link>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 bg-amber-500/15 border border-amber-500/25">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-bold text-amber-300 tracking-[0.15em] uppercase">FIFA World Cup 2026</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mb-2">
          Llaves de <span className="text-gold">Eliminatorias</span>
        </h1>
        <p className="text-gray-500 text-sm">El cuadro se completa automáticamente al avanzar la fase de grupos</p>
      </motion.div>

      {loading && <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>}
      {error && <div className="flex items-center justify-center py-20 flex-col gap-2"><WifiOff className="w-8 h-8 text-red-400" /><p className="text-red-400 text-sm">{error}</p></div>}

      {!loading && !error && (
        <>
          {/* Horizontal bracket: each round is a column */}
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-5 min-w-max">
              {ROUNDS.map(round => {
                const list = byRound[round.type] || [];
                if (!list.length) return null;
                return (
                  <div key={round.type} className="flex flex-col">
                    <div className="text-center mb-3">
                      <span className="text-xs font-black text-white uppercase tracking-wider">{round.label}</span>
                      <p className="text-[9px] text-gray-600">{list.length} {list.length === 1 ? 'partido' : 'partidos'}</p>
                    </div>
                    <div className="flex flex-col justify-around gap-2 h-full">
                      {list.map((g, i) => <MatchCard key={g.id} game={g} index={i} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Third place */}
          {third && (
            <div className="mt-8 max-w-xs mx-auto">
              <div className="text-center mb-3">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">🥉 Tercer Puesto</span>
              </div>
              <MatchCard game={third} index={0} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
