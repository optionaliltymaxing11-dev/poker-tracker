import { useState, useEffect } from 'react';
import { db } from '../db/schema';
import { liveQuery } from 'dexie';

export interface FilterState {
  locations: number[];
  games: number[];
  game_formats: number[];
  blinds: number[];
}

export function useFilters(): FilterState | undefined {
  const [filters, setFilters] = useState<FilterState | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    // First ensure filters exist
    async function initFilters() {
      const existing = await db.filters.toCollection().first();
      if (!existing) {
        const locations = await db.locations.toArray();
        const games = await db.games.toArray();
        const gameFormats = await db.game_formats.toArray();
        const blinds = await db.blinds.toArray();

        await db.filters.add({
          locations: locations.map(l => l.location_id!),
          games: games.map(g => g.game_id!),
          game_formats: gameFormats.map(gf => gf.game_format_id!),
          blinds: blinds.map(b => b.blind_id!)
        });
      }
    }

    initFilters().then(() => {
      // Now subscribe to live changes
      const subscription = liveQuery(() => db.filters.toCollection().first()).subscribe({
        next: (filter) => {
          if (!cancelled && filter) {
            setFilters(filter as FilterState);
          }
        },
        error: (err) => console.error('useFilters error:', err)
      });

      return () => {
        cancelled = true;
        subscription.unsubscribe();
      };
    });

    return () => { cancelled = true; };
  }, []);

  return filters;
}
