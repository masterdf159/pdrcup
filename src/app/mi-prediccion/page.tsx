'use client';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, ChevronUp, ChevronDown, Save, RotateCcw, Sparkles, Check, Cloud } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useWorldCup } from '@/hooks/useFixtures';
import type { WCGroup, WCGroupTeam } from '@/lib/types';

const STORAGE_KEY = 'mi-prediccion-v1';

function officialOrder(teams: WCGroupTeam[]): WCGroupTeam[] {
  return [...teams].sort(
    (a, b) => Number(b.pts) - Number(a.pts) || Number(b.gd) - Number(a.gd) || Number(b.gf) - Number(a.gf)
  );
}

export default function MiPrediccionPage() {
  const { groups, loading } = useWorldCup();
  const { isSignedIn } = useUser();
  const [order, setOrder] = useState<Record<string, string[]>>({}); // group -> [team_id...]
  const [saved, setSaved] = useState(false);
  const [cloudBracket, setCloudBracket] = useState<Record<string, string[]> | null>(null);

  // If signed in, pull the bracket saved in the account.
  useEffect(() => {
    if (!isSignedIn) return;
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.bracket) setCloudBracket(j.bracket); })
      .catch(() => {});
  }, [isSignedIn]);

  const sortedGroups = useMemo(
    () => [...groups].filter(g => g.name.length === 1).sort((a, b) => a.name.localeCompare(b.name)),
    [groups]
  );

  // Load saved order: account bracket takes priority, else localStorage.
  useEffect(() => {
    if (!sortedGroups.length) return;
    queueMicrotask(() => {
      let stored: Record<string, string[]> = cloudBracket || {};
      if (!cloudBracket) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) stored = JSON.parse(raw);
        } catch { /* ignore */ }
      }
      const next: Record<string, string[]> = {};
      for (const g of sortedGroups) {
        const ids = officialOrder(g.teams).map(t => t.team_id);
        const savedIds = stored[g.name]?.filter(id => ids.includes(id)) || [];
        next[g.name] = [...savedIds, ...ids.filter(id => !savedIds.includes(id))];
      }
      setOrder(next);
    });
  }, [sortedGroups, cloudBracket]);

  const move = useCallback((groupName: string, idx: number, dir: -1 | 1) => {
    setOrder(prev => {
      const arr = [...(prev[groupName] || [])];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return prev;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      setSaved(false);
      return { ...prev, [groupName]: arr };
    });
  }, []);

  const save = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch { /* ignore */ }
    setSaved(true);
    // Also sync to the account if signed in.
    if (isSignedIn) {
      fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveBracket', bracket: order }),
      }).catch(() => {});
    }
  }, [order, isSignedIn]);

  const resetToOfficial = useCallback(() => {
    const next: Record<string, string[]> = {};
    for (const g of sortedGroups) next[g.name] = officialOrder(g.teams).map(t => t.team_id);
    setOrder(next);
    setSaved(false);
  }, [sortedGroups]);

  const teamById = useCallback((group: WCGroup, id: string) => group.teams.find(t => t.team_id === id), []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/clasificaciones" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />Volver a clasificaciones
      </Link>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 bg-purple-500/15 border border-purple-500/25">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[11px] font-bold text-purple-300 tracking-[0.15em] uppercase">Tu Clasificación</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
          Arma tu <span className="text-gold">Clasificación</span>
        </h1>
        <p className="text-gray-500 text-sm max-w-lg mx-auto">
          Ordena cada grupo como tú crees que terminará. Los 2 primeros clasifican.
          {isSignedIn ? ' Se guarda en tu cuenta.' : ' Se guarda en tu navegador (inicia sesión para sincronizar).'}
        </p>
        {isSignedIn && (
          <div className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400">
            <Cloud className="w-3.5 h-3.5" />Sincronizado con tu cuenta
          </div>
        )}
      </motion.div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-2 mb-7">
        <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold hover:opacity-90 transition-opacity">
          {saved ? <><Check className="w-4 h-4" />Guardado</> : <><Save className="w-4 h-4" />Guardar mi predicción</>}
        </button>
        <button onClick={resetToOfficial} className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-gray-300 text-sm font-bold hover:text-white transition-colors">
          <RotateCcw className="w-4 h-4" />Reiniciar
        </button>
      </div>

      {loading && <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>}

      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedGroups.map((group, gi) => {
            const ids = order[group.name] || [];
            return (
              <motion.div key={group.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.04 }} className="glass rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500/15 to-transparent px-4 py-3 border-b border-white/5">
                  <span className="text-sm font-black text-white">Grupo {group.name}</span>
                </div>
                <div className="p-2">
                  {ids.map((id, i) => {
                    const t = teamById(group, id);
                    if (!t) return null;
                    const qualifies = i < 2;
                    return (
                      <div key={id} className={`flex items-center gap-2 rounded-lg px-2 py-2 ${qualifies ? 'bg-emerald-500/[0.07]' : ''}`}>
                        <span className={`w-4 text-center text-[11px] font-black ${qualifies ? 'text-emerald-400' : 'text-gray-600'}`}>{i + 1}</span>
                        {t.team_flag && <img src={t.team_flag} alt="" className="w-6 h-4 object-cover rounded-sm" />}
                        <span className={`text-xs font-medium flex-1 truncate ${qualifies ? 'text-white' : 'text-gray-400'}`}>{t.team_name}</span>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => move(group.name, i, -1)} disabled={i === 0}
                            className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors">
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button onClick={() => move(group.name, i, 1)} disabled={i === ids.length - 1}
                            className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors">
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* My qualified teams summary */}
      {!loading && sortedGroups.length > 0 && (
        <div className="mt-8 glass rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />Tus 16 clasificados
          </h3>
          <div className="flex flex-wrap gap-2">
            {sortedGroups.flatMap(group => {
              const ids = (order[group.name] || []).slice(0, 2);
              return ids.map((id, pos) => {
                const t = group.teams.find(x => x.team_id === id);
                if (!t) return null;
                return (
                  <div key={`${group.name}-${id}`} className="flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/10 px-2.5 py-1">
                    {t.team_flag && <img src={t.team_flag} alt="" className="w-4 h-3 object-cover rounded-sm" />}
                    <span className="text-[11px] text-white">{t.team_name}</span>
                    <span className="text-[9px] text-gray-500">{group.name}{pos + 1}</span>
                  </div>
                );
              });
            })}
          </div>
        </div>
      )}
    </div>
  );
}
