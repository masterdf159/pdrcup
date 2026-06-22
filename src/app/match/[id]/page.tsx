'use client';
import { use, useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, MapPin, Brain, Loader2, Zap, Target, AlertTriangle, TrendingUp, Globe, RefreshCw, Trophy, Star, Timer, Goal, Flag, CornerDownRight as CornerIcon, Bookmark, Check } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { loadWorldCup } from '@/lib/wc-client';
import type { WCGame } from '@/lib/types';
import type { MatchPrediction } from '@/lib/predictions';
import FootballPitch from '@/components/FootballPitch';
import PredictedStatsPanel from '@/components/PredictedStats';
import TeamHistorySection from '@/components/TeamHistory';
import TeamAnalysisSection from '@/components/TeamAnalysis';
import CommentarySection from '@/components/CommentarySection';

function parseScorers(raw: string): { player: string; minute: string }[] {
  if (!raw || raw === 'null' || raw === '{}') return [];
  // Strip braces and all quote variants (straight + curly) the API mixes in
  const clean = raw.replace(/[{}"'“”‘’]/g, '');
  return clean.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const match = s.match(/^(.+?)\s+(\d+(?:\+\d+)?'?)$/);
    if (match) return { player: match[1].trim(), minute: match[2] };
    return { player: s, minute: '' };
  });
}

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [game, setGame] = useState<WCGame | null>(null);
  const [allGames, setAllGames] = useState<WCGame[]>([]);
  const [prediction, setPrediction] = useState<MatchPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [savedToAccount, setSavedToAccount] = useState(false);
  const { isSignedIn } = useUser();

  // Load any locally cached prediction for this match so the user always sees the
  // last good analysis even if the AI is currently down.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(`pred:${id}`);
        if (raw) setPrediction(JSON.parse(raw));
      } catch { /* ignore */ }
    });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await loadWorldCup();
        if (!active) return;
        setGame(data.games.find(g => g.id === id) || null);
        setAllGames(data.games);
      } catch {
        // network error — keep last known data
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 45_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id]);

  const handlePredict = useCallback(async () => {
    if (!game) return;
    setPredicting(true);
    setUnavailable(false);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game, allGames }),
      });
      const json = await res.json();
      if (json.prediction) {
        setPrediction(json.prediction);
        try { localStorage.setItem(`pred:${game.id}`, JSON.stringify(json.prediction)); } catch { /* ignore */ }
      } else if (json.unavailable) {
        // AI down and no server cache. Keep any locally cached prediction;
        // only show "unavailable" if we have nothing at all to display.
        setPrediction(prev => {
          if (!prev) setUnavailable(true);
          return prev;
        });
      }
    } catch {
      setPrediction(prev => {
        if (!prev) setUnavailable(true);
        return prev;
      });
    } finally {
      setPredicting(false);
    }
  }, [game, allGames]);

  const saveToAccount = useCallback(async () => {
    if (!game || !prediction) return;
    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveMatch',
          match: {
            matchId: game.id,
            home: game.home_team_name_en,
            away: game.away_team_name_en,
            homeFlag: game.home_flag,
            awayFlag: game.away_flag,
            homeGoals: prediction.homeGoals,
            awayGoals: prediction.awayGoals,
            confidence: prediction.confidence,
            analysis: prediction.analysis,
            finished: game.finished === 'TRUE',
            savedAt: Date.now(),
          },
        }),
      });
      if (res.ok) setSavedToAccount(true);
    } catch { /* ignore */ }
  }, [game, prediction]);

  // Auto-generate the AI analysis/prediction once when the match loads.
  // Finished → post-match analysis; upcoming/live → prediction.
  const autoTriggered = useRef(false);
  useEffect(() => {
    if (autoTriggered.current || !game) return;
    autoTriggered.current = true;
    // Defer so the first setState isn't synchronous within the effect body.
    const t = setTimeout(() => handlePredict(), 0);
    return () => clearTimeout(t);
  }, [game, handlePredict]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <Trophy className="w-10 h-10 text-gray-700" />
        <p className="text-gray-400">Partido no encontrado</p>
        <Link href="/" className="text-amber-400 hover:underline text-sm">Volver al calendario</Link>
      </div>
    );
  }

  const isLive = game.time_elapsed === 'live';
  const isFinished = game.finished === 'TRUE';
  const isUpcoming = !isLive && !isFinished;
  const homeScorers = parseScorers(game.home_scorers);
  const awayScorers = parseScorers(game.away_scorers);
  const roundLabel = game.type === 'group' ? `Grupo ${game.group} · Jornada ${game.matchday}` : game.type === 'r32' ? '32avos de Final' : game.type === 'r16' ? 'Octavos de Final' : game.type === 'qf' ? 'Cuartos de Final' : game.type === 'sf' ? 'Semifinal' : game.type === 'final' ? 'Gran Final' : game.type === 'third' ? 'Tercer Puesto' : game.type;

  const homeResults = allGames.filter(g => g.finished === 'TRUE' && (g.home_team_name_en === game.home_team_name_en || g.away_team_name_en === game.home_team_name_en));
  const awayResults = allGames.filter(g => g.finished === 'TRUE' && (g.home_team_name_en === game.away_team_name_en || g.away_team_name_en === game.away_team_name_en));

  function teamStats(teamName: string, teamGames: WCGame[]) {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    teamGames.forEach(g => {
      const isH = g.home_team_name_en === teamName;
      const s = Number(isH ? g.home_score : g.away_score);
      const c = Number(isH ? g.away_score : g.home_score);
      gf += s; ga += c;
      if (s > c) w++; else if (s === c) d++; else l++;
    });
    return { w, d, l, gf, ga, played: teamGames.length };
  }

  const hs = teamStats(game.home_team_name_en, homeResults);
  const as_ = teamStats(game.away_team_name_en, awayResults);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />Volver al calendario
      </Link>

      {/* Match header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className={`relative rounded-3xl overflow-hidden mb-6 glass ${isLive ? 'border border-red-500/30 live-shine' : ''}`}>
        {/* Ambient glows behind flags */}
        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-emerald-500/[0.07] to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/[0.07] to-transparent pointer-events-none" />

        <div className="relative p-6 md:p-8">
          <div className="flex items-center justify-center gap-3 mb-7">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-amber-300 font-bold">{roundLabel}</span>
            </div>
            {isLive && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-[10px] font-black text-red-300">EN VIVO</span>
              </span>
            )}
            {isFinished && <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-400 font-medium">Finalizado</span>}
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Home */}
            <div className="flex-1 flex flex-col items-center gap-2.5">
              <div className="relative">
                {game.home_flag && <img src={game.home_flag} alt="" className="w-24 h-16 object-cover rounded-xl shadow-2xl ring-1 ring-white/10" />}
                <div className="absolute -inset-2 bg-emerald-500/15 blur-xl -z-10 rounded-full" />
              </div>
              <p className="font-black text-white text-base md:text-lg text-center leading-tight">{game.home_team_name_en}</p>
              <span className="text-[10px] text-gray-500 font-bold tracking-widest px-2 py-0.5 rounded bg-white/5">{game.home_fifa_code}</span>
              {homeScorers.length > 0 && (
                <div className="space-y-0.5 mt-1">
                  {homeScorers.map((s, i) => <p key={i} className="text-xs text-emerald-400/80 text-center">⚽ {s.player} {s.minute}</p>)}
                </div>
              )}
            </div>

            {/* Score */}
            <div className="px-3 md:px-6 text-center flex-shrink-0">
              {isUpcoming ? (
                <div>
                  <p className="text-4xl md:text-5xl font-black text-gray-600">VS</p>
                  <div className="mt-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-xs text-gray-300 font-medium">{game.local_date.split(' ')[1]}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 md:gap-5">
                  <span className={`text-5xl md:text-7xl font-black tabular-nums ${Number(game.home_score) > Number(game.away_score) ? 'text-gold' : 'text-white'}`}>{game.home_score}</span>
                  <span className="text-2xl md:text-3xl text-gray-700">:</span>
                  <span className={`text-5xl md:text-7xl font-black tabular-nums ${Number(game.away_score) > Number(game.home_score) ? 'text-gold' : 'text-white'}`}>{game.away_score}</span>
                </div>
              )}
            </div>

            {/* Away */}
            <div className="flex-1 flex flex-col items-center gap-2.5">
              <div className="relative">
                {game.away_flag && <img src={game.away_flag} alt="" className="w-24 h-16 object-cover rounded-xl shadow-2xl ring-1 ring-white/10" />}
                <div className="absolute -inset-2 bg-blue-500/15 blur-xl -z-10 rounded-full" />
              </div>
              <p className="font-black text-white text-base md:text-lg text-center leading-tight">{game.away_team_name_en}</p>
              <span className="text-[10px] text-gray-500 font-bold tracking-widest px-2 py-0.5 rounded bg-white/5">{game.away_fifa_code}</span>
              {awayScorers.length > 0 && (
                <div className="space-y-0.5 mt-1">
                  {awayScorers.map((s, i) => <p key={i} className="text-xs text-blue-400/80 text-center">⚽ {s.player} {s.minute}</p>)}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-7 pt-4 border-t border-white/5 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-600" /><span>{game.local_date}</span></div>
            {game.stadium_name && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-600" /><span>{game.stadium_name}, {game.stadium_city}</span></div>}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Prediction (only for upcoming/live) */}
        <div className="lg:col-span-1 space-y-6">
          {isFinished && (
            /* Finished match: result summary card */
            <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-700/20 to-transparent px-5 py-3 border-b border-gray-800">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Resultado Final
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-5">
                    <div className="text-center">
                      {game.home_flag && <img src={game.home_flag} alt="" className="w-10 h-7 object-cover rounded mx-auto mb-1" />}
                      <p className="text-[10px] text-gray-400">{game.home_fifa_code}</p>
                    </div>
                    <span className={`text-4xl font-black ${Number(game.home_score) > Number(game.away_score) ? 'text-amber-400' : 'text-white'}`}>{game.home_score}</span>
                    <span className="text-lg text-gray-600">-</span>
                    <span className={`text-4xl font-black ${Number(game.away_score) > Number(game.home_score) ? 'text-amber-400' : 'text-white'}`}>{game.away_score}</span>
                    <div className="text-center">
                      {game.away_flag && <img src={game.away_flag} alt="" className="w-10 h-7 object-cover rounded mx-auto mb-1" />}
                      <p className="text-[10px] text-gray-400">{game.away_fifa_code}</p>
                    </div>
                  </div>
                </div>
                {homeScorers.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase mb-1">Goles {game.home_team_name_en}</p>
                    {homeScorers.map((s, i) => <p key={i} className="text-xs text-emerald-400/80">⚽ {s.player} {s.minute}</p>)}
                  </div>
                )}
                {awayScorers.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase mb-1">Goles {game.away_team_name_en}</p>
                    {awayScorers.map((s, i) => <p key={i} className="text-xs text-blue-400/80">⚽ {s.player} {s.minute}</p>)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI panel: prediction for upcoming/live, post-match analysis for finished */}
          <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-purple-950/30 rounded-2xl border border-purple-500/20 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 px-5 py-3 border-b border-purple-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5 text-gray-950" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{isFinished ? 'Análisis IA del Partido' : 'Predicción IA'}</h3>
                  <p className="text-[10px] text-gray-400">{isLive ? 'Ajustada en vivo' : isFinished ? 'Análisis post-partido' : 'Pre-partido'}</p>
                </div>
              </div>
              {prediction && (
                <button onClick={handlePredict} className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors" title="Regenerar">
                  <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${predicting ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            <div className="p-5">
              {unavailable && !prediction && !predicting && (
                <div className="text-center py-6">
                  <AlertTriangle className="w-10 h-10 text-yellow-500/70 mx-auto mb-3" />
                  <p className="text-yellow-400/90 text-sm font-medium mb-1">IA no disponible ahora</p>
                  <p className="text-gray-500 text-xs mb-4">
                    El servicio de IA está saturado o sin cupo temporalmente. No mostramos una predicción imprecisa — intenta de nuevo en unos minutos.
                  </p>
                  <button onClick={handlePredict} className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-200 text-sm font-bold rounded-xl hover:bg-white/10 transition-colors">
                    <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" />Reintentar</span>
                  </button>
                </div>
              )}

              {!unavailable && !prediction && !predicting && (
                <div className="text-center py-6">
                  <Brain className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 text-xs mb-4">
                    {isLive ? 'Analizar partido en vivo y predecir el resultado final' :
                     isFinished ? 'Análisis del partido con estadísticas, momentos clave e historial' :
                     'Predecir resultado usando historial FIFA, datos del torneo y rendimiento de cada equipo'}
                  </p>
                  <button onClick={handlePredict} className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity">
                    <span className="flex items-center gap-2"><Zap className="w-4 h-4" />
                      {isLive ? 'Predecir Resultado Final' : isFinished ? 'Generar Análisis' : 'Generar Predicción'}
                    </span>
                  </button>
                </div>
              )}

              {predicting && !prediction && (
                <div className="text-center py-8">
                  <div className="relative w-14 h-14 mx-auto mb-3">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                    <Brain className="absolute inset-0 m-auto w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-purple-400 text-sm font-medium">Analizando...</p>
                  <p className="text-[10px] text-gray-500 mt-1">Procesando historial + {homeResults.length + awayResults.length} partidos del torneo</p>
                </div>
              )}

              {prediction && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                      {isLive ? 'Resultado Final Predicho' : isFinished ? 'Resultado Final' : 'Predicción Pre-Partido'}
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        {game.home_flag && <img src={game.home_flag} alt="" className="w-8 h-5 object-cover rounded mx-auto mb-1" />}
                        <p className="text-[9px] text-gray-400">{game.home_fifa_code}</p>
                      </div>
                      <span className="text-4xl font-black text-amber-400">{prediction.homeGoals}</span>
                      <span className="text-lg text-gray-600">-</span>
                      <span className="text-4xl font-black text-cyan-400">{prediction.awayGoals}</span>
                      <div className="text-center">
                        {game.away_flag && <img src={game.away_flag} alt="" className="w-8 h-5 object-cover rounded mx-auto mb-1" />}
                        <p className="text-[9px] text-gray-400">{game.away_fifa_code}</p>
                      </div>
                    </div>
                    {prediction.momentum && (
                      <p className={`text-[10px] mt-2 font-medium ${prediction.momentum === 'home' ? 'text-emerald-400' : prediction.momentum === 'away' ? 'text-blue-400' : 'text-gray-400'}`}>
                        Momentum: {prediction.momentum === 'home' ? game.home_team_name_en : prediction.momentum === 'away' ? game.away_team_name_en : 'Equilibrado'}
                      </p>
                    )}
                  </div>

                  {/* Probabilities (only for upcoming/live — a finished match already happened) */}
                  {!isFinished && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-emerald-500/10 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-black text-emerald-400">{prediction.probabilityHome}%</p>
                        <p className="text-[9px] text-gray-500">{game.home_fifa_code}</p>
                      </div>
                      <div className="bg-gray-700/30 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-black text-gray-300">{prediction.probabilityDraw}%</p>
                        <p className="text-[9px] text-gray-500">Empate</p>
                      </div>
                      <div className="bg-blue-500/10 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-black text-blue-400">{prediction.probabilityAway}%</p>
                        <p className="text-[9px] text-gray-500">{game.away_fifa_code}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className={`flex-1 rounded-lg p-2.5 text-center border ${prediction.btts ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-gray-800/50 border-gray-700'}`}>
                      <p className={`text-xs font-bold ${prediction.btts ? 'text-emerald-400' : 'text-gray-500'}`}>{prediction.btts ? 'Sí' : 'No'}</p>
                      <p className="text-[9px] text-gray-500">Ambos anotan</p>
                    </div>
                    <div className={`flex-1 rounded-lg p-2.5 text-center border ${prediction.over25 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-gray-800/50 border-gray-700'}`}>
                      <p className={`text-xs font-bold ${prediction.over25 ? 'text-emerald-400' : 'text-gray-500'}`}>{prediction.over25 ? 'Sí' : 'No'}</p>
                      <p className="text-[9px] text-gray-500">Over 2.5</p>
                    </div>
                    <div className="flex-1 rounded-lg p-2.5 text-center bg-gray-800/50 border border-gray-700">
                      <p className="text-xs font-bold text-yellow-400">{prediction.confidence}%</p>
                      <p className="text-[9px] text-gray-500">{isFinished ? 'Certeza' : 'Confianza'}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                      <p className="text-xs font-medium text-white">{isFinished ? 'Crónica del Partido' : 'Análisis'}</p>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{prediction.analysis}</p>
                  </div>

                  {prediction.keyFactors?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider">Factores clave</p>
                      {prediction.keyFactors.map((f, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                          <Target className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" /><span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {prediction.riskAlerts?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider">Alertas</p>
                      {prediction.riskAlerts.map((a, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-yellow-400/80">
                          <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" /><span>{a}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isLive && (
                    <button onClick={handlePredict} disabled={predicting}
                      className="w-full py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                      {predicting ? 'Actualizando...' : '🔄 Actualizar Predicción en Vivo'}
                    </button>
                  )}

                  {/* Save to account (signed in) */}
                  {isSignedIn ? (
                    <button onClick={saveToAccount} disabled={savedToAccount}
                      className="w-full py-2.5 bg-white/5 border border-white/10 text-gray-200 text-xs font-bold rounded-xl hover:bg-white/10 transition-colors disabled:opacity-60">
                      <span className="flex items-center justify-center gap-2">
                        {savedToAccount ? <><Check className="w-4 h-4 text-emerald-400" />Guardada en tu cuenta</> : <><Bookmark className="w-4 h-4" />Guardar en mis predicciones</>}
                      </span>
                    </button>
                  ) : (
                    <p className="text-[10px] text-gray-600 text-center">Inicia sesión para guardar esta predicción en tu cuenta</p>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Pitch + Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Football Pitch */}
          <FootballPitch
            homeTeam={game.home_team_name_en}
            awayTeam={game.away_team_name_en}
            homeFlag={game.home_flag || ''}
            awayFlag={game.away_flag || ''}
            homeScore={game.home_score}
            awayScore={game.away_score}
            homeGoals={homeScorers.map(s => ({ ...s, side: 'home' as const }))}
            awayGoals={awayScorers.map(s => ({ ...s, side: 'away' as const }))}
            isLive={isLive}
            momentum={prediction?.momentum}
            attackZones={prediction?.attackZones}
            dangerZones={prediction?.dangerZones}
            shotMap={prediction?.shotMap}
            possessionHome={prediction?.stats?.possessionHome}
            possessionAway={prediction?.stats?.possessionAway}
            hasPrediction={!!prediction}
          />

          {/* Analyst commentary from the web (below the map) */}
          <CommentarySection
            homeTeam={game.home_team_name_en}
            awayTeam={game.away_team_name_en}
            finished={isFinished}
            score={isFinished || isLive ? `${game.home_score}-${game.away_score}` : undefined}
          />

          {/* Advanced stats (predicted for upcoming/live, analyzed for finished) */}
          {prediction?.stats && (
            <PredictedStatsPanel
              stats={prediction.stats}
              homeTeam={game.home_team_name_en}
              awayTeam={game.away_team_name_en}
              homeFlag={game.home_flag || ''}
              awayFlag={game.away_flag || ''}
              finished={isFinished}
            />
          )}

          {/* Match props: scorers, cards, corners (pre-match / live only) */}
          {prediction && !isFinished && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
                <Goal className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Pronósticos del Partido</h3>
              </div>
              <div className="p-5 space-y-5">
                {/* Likely scorers */}
                {prediction.predictedScorers && prediction.predictedScorers.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Goal className="w-3 h-3 text-amber-400" /> Posibles Goleadores
                    </p>
                    <div className="space-y-2">
                      {prediction.predictedScorers.map((s, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.team === 'home' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                          <span className="text-xs text-white font-medium flex-1 truncate">{s.player}</span>
                          <span className="text-[10px] text-gray-500">{s.team === 'home' ? game.home_fifa_code : game.away_fifa_code}</span>
                          <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${s.team === 'home' ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${s.likelihood}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-gray-300 w-8 text-right tabular-nums">{s.likelihood}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Corners + cards quick stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
                    <CornerIcon className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
                    <p className="text-lg font-black text-white tabular-nums">{(prediction.stats?.cornersHome ?? 0) + (prediction.stats?.cornersAway ?? 0)}</p>
                    <p className="text-[9px] text-gray-500">Córners totales</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
                    <div className="w-3 h-4 bg-yellow-400 rounded-sm mx-auto mb-1" />
                    <p className="text-lg font-black text-white tabular-nums">{(prediction.stats?.yellowCardsHome ?? 0) + (prediction.stats?.yellowCardsAway ?? 0)}</p>
                    <p className="text-[9px] text-gray-500">Amarillas</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
                    <div className="w-3 h-4 bg-red-500 rounded-sm mx-auto mb-1" />
                    <p className="text-lg font-black text-white tabular-nums">{(prediction.stats?.redCardsHome ?? 0) + (prediction.stats?.redCardsAway ?? 0)}</p>
                    <p className="text-[9px] text-gray-500">Rojas</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
                    <Flag className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                    <p className="text-lg font-black text-white tabular-nums">{(prediction.stats?.foulsHome ?? 0) + (prediction.stats?.foulsAway ?? 0)}</p>
                    <p className="text-[9px] text-gray-500">Faltas</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Key players + first goal */}
          {prediction && (prediction.keyPlayerHome || prediction.firstGoalMinute) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {prediction.keyPlayerHome && (
                <div className="bg-gray-900/60 rounded-xl border border-emerald-500/20 p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Star className="w-3.5 h-3.5 text-emerald-400" />
                    <p className="text-[9px] text-gray-500 uppercase tracking-wide">Jugador Clave</p>
                  </div>
                  <p className="text-sm font-bold text-white">{prediction.keyPlayerHome}</p>
                  <p className="text-[10px] text-emerald-400/70">{game.home_team_name_en}</p>
                </div>
              )}
              {prediction.keyPlayerAway && (
                <div className="bg-gray-900/60 rounded-xl border border-blue-500/20 p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Star className="w-3.5 h-3.5 text-blue-400" />
                    <p className="text-[9px] text-gray-500 uppercase tracking-wide">Jugador Clave</p>
                  </div>
                  <p className="text-sm font-bold text-white">{prediction.keyPlayerAway}</p>
                  <p className="text-[10px] text-blue-400/70">{game.away_team_name_en}</p>
                </div>
              )}
              {prediction.firstGoalMinute && (
                <div className="bg-gray-900/60 rounded-xl border border-amber-500/20 p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Timer className="w-3.5 h-3.5 text-amber-400" />
                    <p className="text-[9px] text-gray-500 uppercase tracking-wide">Primer Gol</p>
                  </div>
                  <p className="text-sm font-bold text-white">Min {prediction.firstGoalMinute}</p>
                  <p className="text-[10px] text-amber-400/70">Ventana estimada</p>
                </div>
              )}
            </div>
          )}

          {/* Detailed team analysis (style, strengths, weaknesses, verdict) */}
          {prediction && (prediction.homeAnalysis || prediction.awayAnalysis) && (
            <TeamAnalysisSection
              home={{ name: game.home_team_name_en, flag: game.home_flag || '', code: game.home_fifa_code || '', analysis: prediction.homeAnalysis }}
              away={{ name: game.away_team_name_en, flag: game.away_flag || '', code: game.away_fifa_code || '', analysis: prediction.awayAnalysis }}
            />
          )}

          {/* Team history, palmarés & head-to-head from past cups */}
          {prediction && (prediction.homeHistory || prediction.awayHistory || prediction.h2h) && (
            <TeamHistorySection
              home={{ name: game.home_team_name_en, flag: game.home_flag || '', code: game.home_fifa_code || '', history: prediction.homeHistory }}
              away={{ name: game.away_team_name_en, flag: game.away_flag || '', code: game.away_fifa_code || '', history: prediction.awayHistory }}
              h2h={prediction.h2h}
            />
          )}

          {/* Tournament performance comparison */}
          <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-full" />
              Rendimiento en el Mundial 2026
            </h3>

            {/* Stat bars */}
            <div className="space-y-4">
              <StatBar label="Victorias" homeVal={hs.w} awayVal={as_.w} homeName={game.home_fifa_code || ''} awayName={game.away_fifa_code || ''} />
              <StatBar label="Goles a Favor" homeVal={hs.gf} awayVal={as_.gf} homeName={game.home_fifa_code || ''} awayName={game.away_fifa_code || ''} />
              <StatBar label="Goles en Contra" homeVal={hs.ga} awayVal={as_.ga} homeName={game.home_fifa_code || ''} awayName={game.away_fifa_code || ''} invert />
              <StatBar label="Diferencia de Goles" homeVal={hs.gf - hs.ga} awayVal={as_.gf - as_.ga} homeName={game.home_fifa_code || ''} awayName={game.away_fifa_code || ''} signed />
              <StatBar label="Partidos Jugados" homeVal={hs.played} awayVal={as_.played} homeName={game.home_fifa_code || ''} awayName={game.away_fifa_code || ''} />
            </div>
          </div>

          {/* Recent results */}
          <div className="grid grid-cols-2 gap-4">
            <TeamResults teamName={game.home_team_name_en} flag={game.home_flag || ''} code={game.home_fifa_code || ''} games={homeResults} />
            <TeamResults teamName={game.away_team_name_en} flag={game.away_flag || ''} code={game.away_fifa_code || ''} games={awayResults} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBar({ label, homeVal, awayVal, homeName, awayName, invert, signed }: {
  label: string; homeVal: number; awayVal: number; homeName: string; awayName: string; invert?: boolean; signed?: boolean;
}) {
  const max = Math.max(Math.abs(homeVal), Math.abs(awayVal), 1);
  const homeBetter = invert ? homeVal < awayVal : homeVal > awayVal;
  const awayBetter = invert ? awayVal < homeVal : awayVal > homeVal;

  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className={`font-bold ${homeBetter ? 'text-emerald-400' : 'text-gray-400'}`}>
          {signed && homeVal > 0 ? '+' : ''}{homeVal} {homeName}
        </span>
        <span className="text-gray-500">{label}</span>
        <span className={`font-bold ${awayBetter ? 'text-blue-400' : 'text-gray-400'}`}>
          {awayName} {signed && awayVal > 0 ? '+' : ''}{awayVal}
        </span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 bg-gray-800 rounded-full overflow-hidden flex justify-end">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(Math.abs(homeVal) / max) * 100}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        <div className="flex-1 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(Math.abs(awayVal) / max) * 100}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      </div>
    </div>
  );
}

function TeamResults({ teamName, flag, code, games }: { teamName: string; flag: string; code: string; games: WCGame[] }) {
  return (
    <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        {flag && <img src={flag} alt="" className="w-5 h-3.5 object-cover rounded-sm" />}
        <span className="text-xs font-bold text-white">{teamName}</span>
        <span className="text-[10px] text-gray-500">{code}</span>
      </div>
      {games.length === 0 ? (
        <p className="text-xs text-gray-500">Sin partidos jugados</p>
      ) : (
        <div className="space-y-1.5">
          {games.map(g => {
            const isHome = g.home_team_name_en === teamName;
            const scored = Number(isHome ? g.home_score : g.away_score);
            const conceded = Number(isHome ? g.away_score : g.home_score);
            const result = scored > conceded ? 'V' : scored === conceded ? 'E' : 'D';
            const opponent = isHome ? g.away_team_name_en : g.home_team_name_en;
            const oppFlag = isHome ? g.away_flag : g.home_flag;
            return (
              <div key={g.id} className="flex items-center gap-2 py-1.5 border-b border-gray-800/30">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${
                  result === 'V' ? 'bg-emerald-500/20 text-emerald-400' : result === 'E' ? 'bg-gray-700 text-gray-400' : 'bg-red-500/20 text-red-400'
                }`}>{result}</span>
                {oppFlag && <img src={oppFlag} alt="" className="w-4 h-3 object-cover rounded-sm" />}
                <span className="text-[11px] text-gray-300 flex-1">{opponent}</span>
                <span className="text-[11px] font-bold text-white">{g.home_score}-{g.away_score}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
