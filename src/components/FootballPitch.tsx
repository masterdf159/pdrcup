'use client';
import { motion } from 'framer-motion';
import { Crosshair, Target } from 'lucide-react';
import type { AttackZones, DangerZone, PredictedShot } from '@/lib/predictions';

interface GoalEvent {
  player: string;
  minute: string;
  side: 'home' | 'away';
}

interface FootballPitchProps {
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  homeScore: string;
  awayScore: string;
  homeGoals: GoalEvent[];
  awayGoals: GoalEvent[];
  isLive: boolean;
  momentum?: string;
  attackZones?: AttackZones;
  dangerZones?: DangerZone[];
  shotMap?: PredictedShot[];
  possessionHome?: number;
  possessionAway?: number;
  hasPrediction?: boolean;
}

function zoneColor(intensity: number, home: boolean): string {
  const alpha = Math.min(0.5, (intensity / 100) * 0.5);
  return home ? `rgba(16,185,129,${alpha})` : `rgba(59,130,246,${alpha})`;
}

const OUTCOME_STYLE: Record<string, { color: string; ring: string; label: string }> = {
  goal: { color: '#fbbf24', ring: '#f59e0b', label: 'Gol' },
  saved: { color: '#38bdf8', ring: '#0ea5e9', label: 'Atajado' },
  missed: { color: '#9ca3af', ring: '#6b7280', label: 'Desviado' },
  blocked: { color: '#f87171', ring: '#ef4444', label: 'Bloqueado' },
};

export default function FootballPitch({
  homeTeam,
  awayTeam,
  homeFlag,
  awayFlag,
  homeScore,
  awayScore,
  homeGoals,
  awayGoals,
  isLive,
  momentum,
  attackZones,
  dangerZones,
  shotMap,
  possessionHome,
  possessionAway,
  hasPrediction,
}: FootballPitchProps) {
  const allEvents = [
    ...homeGoals.map(g => ({ ...g, side: 'home' as const })),
    ...awayGoals.map(g => ({ ...g, side: 'away' as const })),
  ].sort((a, b) => parseInt(a.minute) - parseInt(b.minute));

  const hasGoals = allEvents.length > 0;
  const showZones = hasPrediction && !!attackZones;
  const shots = hasPrediction ? (shotMap || []) : [];

  // Map shot coords. Home attacks right goal (x:800), away attacks left goal (x:0).
  // shot.x: 0=own field, 100=rival goal. shot.y: 0=top, 100=bottom.
  function shotPos(s: PredictedShot) {
    const px = s.team === 'home' ? 400 + (s.x / 100) * 380 : 400 - (s.x / 100) * 380;
    const py = 30 + (s.y / 100) * 440;
    const goalX = s.team === 'home' ? 792 : 8;
    const goalY = 250;
    return { px, py, goalX, goalY };
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="text-base">⚽</span>
          {showZones ? 'Mapa de Tiros y Zonas de Peligro' : 'Vista de Campo'}
        </h3>
        {isLive && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[10px] text-red-400 font-bold">EN VIVO</span>
          </div>
        )}
      </div>

      {/* Possession bar */}
      {showZones && possessionHome != null && possessionAway != null && (
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              {homeFlag && <img src={homeFlag} alt="" className="w-4 h-3 object-cover rounded-sm" />}
              {possessionHome}%
            </span>
            <span className="text-gray-500 uppercase tracking-wider">Posesión</span>
            <span className="font-bold text-blue-400 flex items-center gap-1.5">
              {possessionAway}%
              {awayFlag && <img src={awayFlag} alt="" className="w-4 h-3 object-cover rounded-sm" />}
            </span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-800">
            <motion.div className="bg-gradient-to-r from-emerald-600 to-emerald-400" initial={{ width: 0 }} animate={{ width: `${possessionHome}%` }} transition={{ duration: 0.8 }} />
            <motion.div className="bg-gradient-to-r from-blue-400 to-blue-600" initial={{ width: 0 }} animate={{ width: `${possessionAway}%` }} transition={{ duration: 0.8 }} />
          </div>
        </div>
      )}

      {/* Pitch SVG */}
      <div className="relative mx-4 my-4">
        <svg viewBox="0 0 800 500" className="w-full rounded-xl overflow-hidden">
          <defs>
            <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d6e34" />
              <stop offset="100%" stopColor="#16562a" />
            </linearGradient>
            <radialGradient id="homeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(16,185,129,0.55)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0)" />
            </radialGradient>
            <radialGradient id="awayGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(59,130,246,0.55)" />
              <stop offset="100%" stopColor="rgba(59,130,246,0)" />
            </radialGradient>
            <filter id="ballShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Grass */}
          <rect width="800" height="500" rx="12" fill="url(#pitchGrad)" />
          {[0, 89, 178, 267, 356, 445, 534, 623, 712].map((x, i) => (
            <rect key={x} x={x} y="0" width="89" height="500" fill={i % 2 === 0 ? '#ffffff' : '#000000'} opacity="0.025" />
          ))}

          {/* Attack heatmap */}
          {showZones && attackZones && (
            <g>
              <rect x="400" y="20" width="380" height="153" fill={zoneColor(attackZones.home.left, true)} />
              <rect x="400" y="173" width="380" height="154" fill={zoneColor(attackZones.home.center, true)} />
              <rect x="400" y="327" width="380" height="153" fill={zoneColor(attackZones.home.right, true)} />
              <rect x="20" y="20" width="380" height="153" fill={zoneColor(attackZones.away.left, false)} />
              <rect x="20" y="173" width="380" height="154" fill={zoneColor(attackZones.away.center, false)} />
              <rect x="20" y="327" width="380" height="153" fill={zoneColor(attackZones.away.right, false)} />
            </g>
          )}

          {/* Field lines */}
          <rect x="20" y="20" width="760" height="460" rx="4" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" />
          <line x1="400" y1="20" x2="400" y2="480" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          <circle cx="400" cy="250" r="62" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          <circle cx="400" cy="250" r="4" fill="rgba(255,255,255,0.7)" />
          <rect x="20" y="130" width="130" height="240" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          <rect x="20" y="185" width="50" height="130" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          <path d="M 150 200 A 50 50 0 0 1 150 300" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          <rect x="650" y="130" width="130" height="240" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          <rect x="730" y="185" width="50" height="130" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          <path d="M 650 200 A 50 50 0 0 0 650 300" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          <rect x="6" y="210" width="14" height="80" rx="2" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
          <rect x="780" y="210" width="14" height="80" rx="2" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />

          {/* Danger zone glows */}
          {showZones && dangerZones?.map((dz, i) => {
            const isHome = dz.team === 'home';
            const cx = isHome ? 705 : 95;
            const cy = 140 + (i % 3) * 110;
            const radius = 28 + (dz.danger / 100) * 32;
            return (
              <g key={`dz-${i}`}>
                <circle cx={cx} cy={cy} r={radius} fill={`url(#${isHome ? 'homeGlow' : 'awayGlow'})`}>
                  <animate attributeName="opacity" values="0.35;0.85;0.35" dur="2.4s" repeatCount="indefinite" />
                </circle>
              </g>
            );
          })}

          {/* SHOT MAP — trajectory + ball */}
          {shots.map((s, i) => {
            const { px, py, goalX, goalY } = shotPos(s);
            const st = OUTCOME_STYLE[s.outcome] || OUTCOME_STYLE.missed;
            const isGoal = s.outcome === 'goal';
            return (
              <g key={`shot-${i}`}>
                {/* trajectory */}
                <motion.line
                  x1={px} y1={py} x2={goalX} y2={goalY}
                  stroke={st.color}
                  strokeWidth={isGoal ? 2.5 : 1.5}
                  strokeDasharray={isGoal ? '0' : '5 4'}
                  strokeLinecap="round"
                  opacity={isGoal ? 0.85 : 0.45}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: isGoal ? 0.85 : 0.45 }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.12 }}
                />
                {/* ball at shot origin */}
                <motion.g
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.12, type: 'spring', stiffness: 260 }}
                  style={{ transformOrigin: `${px}px ${py}px` }}
                >
                  {isGoal && (
                    <circle cx={px} cy={py} r="13" fill={st.color} opacity="0.25">
                      <animate attributeName="r" values="10;16;10" dur="1.8s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* soccer ball */}
                  <circle cx={px} cy={py} r={isGoal ? 7 : 5.5} fill="#fff" stroke={st.ring} strokeWidth="2" filter="url(#ballShadow)" />
                  <path
                    d={`M ${px} ${py - (isGoal ? 7 : 5.5)} l ${(isGoal ? 4 : 3)} ${(isGoal ? 3 : 2.5)} l ${-(isGoal ? 1.5 : 1)} ${(isGoal ? 4.5 : 3.5)} h ${-(isGoal ? 5 : 4)} l ${-(isGoal ? 1.5 : 1)} ${-(isGoal ? 4.5 : 3.5)} z`}
                    fill={st.ring}
                    opacity="0.85"
                  />
                </motion.g>
              </g>
            );
          })}

          {/* Momentum overlay */}
          {isLive && momentum && momentum !== 'balanced' && (
            <rect x={momentum === 'home' ? 400 : 20} y="20" width="380" height="460" fill={momentum === 'home' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)'} />
          )}
        </svg>

        {/* Team labels */}
        <div className="absolute top-3 left-5 flex items-center gap-2 bg-black/55 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
          {awayFlag && <img src={awayFlag} alt="" className="w-5 h-3.5 object-cover rounded-sm" />}
          <span className="text-[11px] font-bold text-blue-300">{awayTeam}</span>
        </div>
        <div className="absolute top-3 right-5 flex items-center gap-2 bg-black/55 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
          <span className="text-[11px] font-bold text-emerald-300">{homeTeam}</span>
          {homeFlag && <img src={homeFlag} alt="" className="w-5 h-3.5 object-cover rounded-sm" />}
        </div>

        {/* Score overlay */}
        {(isLive || hasGoals) && !showZones && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className={`flex items-center gap-3 rounded-2xl px-5 py-2.5 backdrop-blur-md ${isLive ? 'bg-red-950/80 border border-red-500/30' : 'bg-black/70 border border-white/10'}`}>
              <span className="text-3xl font-black text-white">{homeScore}</span>
              <span className="text-lg text-gray-400">-</span>
              <span className="text-3xl font-black text-white">{awayScore}</span>
            </div>
          </div>
        )}

        {/* Goal markers (real events, not prediction) */}
        {!showZones && allEvents.map((evt, i) => {
          const isHome = evt.side === 'home';
          const xBase = isHome ? 58 : 12;
          const yPos = 28 + (i * 13) % 48;
          return (
            <motion.div
              key={`${evt.player}-${evt.minute}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="absolute"
              style={{ left: `${xBase}%`, top: `${yPos}%` }}
            >
              <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${isHome ? 'bg-emerald-500/95' : 'bg-blue-500/95'} shadow-lg`}>
                <span className="text-xs">⚽</span>
                <span className="text-[10px] font-bold text-white whitespace-nowrap">{evt.player}</span>
                <span className="text-[9px] text-white/70">{evt.minute}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Shot legend */}
      {showZones && shots.length > 0 && (
        <div className="px-5 pb-1 flex items-center justify-center gap-4 flex-wrap">
          {Object.entries(OUTCOME_STYLE).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2" style={{ background: '#fff', borderColor: v.ring }} />
              <span className="text-[9px] text-gray-400">{v.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Shot list */}
      {showZones && shots.length > 0 && (
        <div className="px-5 py-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {[...shots].sort((a, b) => b.xg - a.xg).slice(0, 6).map((s, i) => {
            const st = OUTCOME_STYLE[s.outcome] || OUTCOME_STYLE.missed;
            return (
              <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-white/[0.03] border border-white/5">
                <span className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-[7px]" style={{ background: '#fff', borderColor: st.ring }}>⚽</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white font-medium truncate">{s.player || (s.team === 'home' ? homeTeam : awayTeam)}</p>
                  <p className="text-[9px]" style={{ color: st.ring }}>{st.label} · {s.minute}&apos;</p>
                </div>
                <span className="text-[10px] font-black text-gray-400 tabular-nums">xG {s.xg.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Danger zone details */}
      {showZones && dangerZones && dangerZones.length > 0 && (
        <div className="px-5 pb-4 grid grid-cols-2 gap-2">
          {dangerZones.map((dz, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${dz.team === 'home' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
              <Target className={`w-3.5 h-3.5 ${dz.team === 'home' ? 'text-emerald-400' : 'text-blue-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-white font-medium truncate">{dz.zone}</p>
                <p className="text-[9px] text-gray-500">{dz.team === 'home' ? homeTeam : awayTeam}</p>
              </div>
              <span className={`text-sm font-black ${dz.team === 'home' ? 'text-emerald-400' : 'text-blue-400'}`}>{dz.danger}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Goal timeline — running scoreboard */}
      {hasGoals && (() => {
        let hRun = 0;
        let aRun = 0;
        const rows = allEvents.map((evt) => {
          if (evt.side === 'home') hRun++; else aRun++;
          return { evt, h: hRun, a: aRun };
        });
        return (
          <div className="px-5 pb-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Crosshair className="w-3 h-3" /> Cronología de Goles
            </p>
            <div className="relative pl-1">
              {/* vertical line */}
              <div className="absolute left-[6px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-500/40 via-gray-700 to-blue-500/40 rounded-full" />
              <div className="space-y-2.5">
                {rows.map(({ evt, h, a }, i) => {
                  const isHome = evt.side === 'home';
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="relative flex items-center gap-3"
                    >
                      {/* node */}
                      <div className={`relative z-10 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${isHome ? 'bg-emerald-500 border-emerald-300' : 'bg-blue-500 border-blue-300'}`} />
                      {/* minute */}
                      <span className="text-xs font-black text-white tabular-nums w-9 flex-shrink-0">{evt.minute}{evt.minute.includes("'") ? '' : "'"}</span>
                      {/* ball + scorer */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm flex-shrink-0">⚽</span>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isHome ? 'text-emerald-300' : 'text-blue-300'}`}>{evt.player || (isHome ? homeTeam : awayTeam)}</p>
                          <p className="text-[9px] text-gray-500 truncate">{isHome ? homeTeam : awayTeam}</p>
                        </div>
                      </div>
                      {/* running score */}
                      <span className="flex-shrink-0 text-sm font-black tabular-nums bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1">
                        <span className={isHome ? 'text-emerald-300' : 'text-white'}>{h}</span>
                        <span className="text-gray-600 mx-0.5">-</span>
                        <span className={!isHome ? 'text-blue-300' : 'text-white'}>{a}</span>
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
