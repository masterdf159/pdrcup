'use client';
import { useState, useEffect, useCallback } from 'react';
import { loadWorldCup } from '@/lib/wc-client';
import type { WCGame, WCTeam, WCGroup } from '@/lib/types';

interface WorldCupData {
  games: WCGame[];
  teams: WCTeam[];
  groups: WCGroup[];
  loading: boolean;
  error: string | null;
  fresh: boolean;
  refetch: () => void;
}

export function useWorldCup(): WorldCupData {
  const [games, setGames] = useState<WCGame[]>([]);
  const [teams, setTeams] = useState<WCTeam[]>([]);
  const [groups, setGroups] = useState<WCGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);

  // A counter we bump to trigger a manual refetch from the effect.
  const [refetchSignal, setRefetchSignal] = useState(0);
  const refetch = useCallback(() => setRefetchSignal(s => s + 1), []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await loadWorldCup();
        if (!active) return;
        setGames(data.games);
        setTeams(data.teams);
        setGroups(data.groups);
        setFresh(data.fresh);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Error al cargar');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 45_000); // refresh live scores

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refetchSignal]);

  return { games, teams, groups, loading, error, fresh, refetch };
}
