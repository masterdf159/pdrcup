'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bookmark, Loader2, Trash2, Brain, ListOrdered, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useUser, SignInButton } from '@clerk/nextjs';

interface SavedMatch {
  matchId: string;
  home: string;
  away: string;
  homeFlag?: string;
  awayFlag?: string;
  homeGoals: number;
  awayGoals: number;
  confidence?: number;
  analysis?: string;
  finished: boolean;
  savedAt: number;
}

function MisPredicciones() {
  const { user } = useUser();
  const [matches, setMatches] = useState<SavedMatch[]>([]);
  const [hasBracket, setHasBracket] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (j) {
          setMatches(j.matches || []);
          setHasBracket(!!j.bracket);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const removeMatch = useCallback(async (matchId: string) => {
    setMatches(prev => prev.filter(m => m.matchId !== matchId));
    try {
      await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeMatch', matchId }),
      });
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />Volver al inicio
      </Link>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 bg-purple-500/15 border border-purple-500/25">
          <Bookmark className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[11px] font-bold text-purple-300 tracking-[0.15em] uppercase">Mi Cuenta</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white">
          Hola{user?.firstName ? `, ${user.firstName}` : ''} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Tus predicciones guardadas y tu clasificación personalizada</p>
      </motion.div>

      {/* My bracket link */}
      <Link href="/mi-prediccion">
        <div className="glass glass-hover rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <ListOrdered className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Mi Clasificación del Torneo</p>
            <p className="text-xs text-gray-500">{hasBracket ? 'Tienes una clasificación guardada — toca para editarla' : 'Aún no has creado tu clasificación — créala ahora'}</p>
          </div>
          <span className="text-amber-400 text-sm">→</span>
        </div>
      </Link>

      <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Brain className="w-4 h-4 text-purple-400" />Predicciones de Partidos Guardadas
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 text-purple-400 animate-spin" /></div>
      ) : matches.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Bookmark className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-1">No has guardado predicciones todavía</p>
          <p className="text-gray-600 text-xs mb-4">Entra a cualquier partido y toca &ldquo;Guardar en mis predicciones&rdquo;</p>
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-[#1a1206] text-sm font-bold">
            Ver partidos
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {matches.map((m, i) => (
            <motion.div key={m.matchId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="glass glass-hover rounded-2xl overflow-hidden flex items-center">
                <Link href={`/match/${m.matchId}`} className="flex items-center flex-1 min-w-0 p-3.5 gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-sm font-bold text-white truncate text-right">{m.home}</span>
                    {m.homeFlag && <img src={m.homeFlag} alt="" className="w-7 h-5 object-cover rounded shadow flex-shrink-0" />}
                  </div>
                  <div className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-1.5 flex-shrink-0">
                    <span className="text-lg font-black text-amber-300 tabular-nums">{m.homeGoals}–{m.awayGoals}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {m.awayFlag && <img src={m.awayFlag} alt="" className="w-7 h-5 object-cover rounded shadow flex-shrink-0" />}
                    <span className="text-sm font-bold text-white truncate">{m.away}</span>
                  </div>
                </Link>
                <div className="flex items-center gap-2 pr-3 flex-shrink-0">
                  <span className={`hidden sm:inline text-[9px] px-2 py-0.5 rounded-full ${m.finished ? 'bg-gray-600/30 text-gray-400' : 'bg-purple-500/15 text-purple-300'}`}>
                    {m.finished ? 'Análisis' : 'Predicción'}
                  </span>
                  <button onClick={() => removeMatch(m.matchId)} className="text-gray-600 hover:text-red-400 transition-colors p-1.5" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>;
  }

  if (isSignedIn) return <MisPredicciones />;

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
        <Bookmark className="w-8 h-8 text-amber-400" />
      </div>
      <h1 className="text-2xl font-black text-white mb-2">Inicia sesión</h1>
      <p className="text-gray-500 text-sm mb-6">Crea tu cuenta para guardar tus predicciones y tu clasificación, y verlas desde cualquier dispositivo.</p>
      <SignInButton mode="modal">
        <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-[#1a1206] font-bold hover:opacity-90 transition-opacity">
          <LogIn className="w-4 h-4" />Entrar / Registrarse
        </button>
      </SignInButton>
    </div>
  );
}
