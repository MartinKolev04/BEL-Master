import { useEffect, useState } from 'react';
import { leaderboardRepository } from '../services/repositories/LeaderboardRepository';
import type { LeaderboardEntry } from '../types';

export function useLeaderboard(limit: number = 10): {
  entries: LeaderboardEntry[];
  loading: boolean;
} {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = leaderboardRepository.observeTop(
      (data) => {
        setEntries(data);
        setLoading(false);
      },
      { limit },
    );
    return () => unsubscribe();
  }, [limit]);

  return { entries, loading };
}
