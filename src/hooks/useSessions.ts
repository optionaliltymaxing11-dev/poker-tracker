import { useLiveQuery } from './useLiveQuery';
import { db, Session, Break } from '../db/schema';
import { useFilters } from './useFilters';

export interface SessionWithDetails extends Session {
  locationName: string;
  gameName: string;
  gameFormatName: string;
  baseFormat: number;
  blindsText: string;
  blindsId: number | null;
  breaks: Break[];
  note?: string;
}

export function useSessions(state?: number) {
  const filters = useFilters();

  const sessions = useLiveQuery(async () => {
    if (!filters) return [];

    let allSessions: Session[];
    if (state !== undefined) {
      allSessions = await db.sessions.where('state').equals(state).toArray();
    } else {
      allSessions = await db.sessions.toArray();
    }

    // Pre-fetch lookup tables for performance
    const locationMap = new Map((await db.locations.toArray()).map(l => [l.location_id!, l]));
    const gameMap = new Map((await db.games.toArray()).map(g => [g.game_id!, g]));
    const gameFormatMap = new Map((await db.game_formats.toArray()).map(gf => [gf.game_format_id!, gf]));
    const blindMap = new Map((await db.blinds.toArray()).map(b => [b.blind_id!, b]));
    const cashMap = new Map((await db.cash.toArray()).map(c => [c.session_id, c.blinds]));
    const allBreaks = await db.breaks.toArray();
    const breaksBySession = new Map<number, Break[]>();
    allBreaks.forEach(b => {
      const arr = breaksBySession.get(b.session_id) || [];
      arr.push(b);
      breaksBySession.set(b.session_id, arr);
    });
    const allNotes = await db.notes.toArray();
    const notesBySession = new Map(allNotes.map(n => [n.session_id, n.note]));

    // Filter and enhance
    const enhanced: SessionWithDetails[] = [];
    for (const session of allSessions) {
      if (session.filtered !== 0) continue;
      if (!filters.locations.includes(session.location)) continue;
      if (!filters.games.includes(session.game)) continue;
      const blindsId = cashMap.get(session.session_id!) ?? null;
      // Filter by blinds if this session has blinds info
      if (blindsId !== null && !filters.blinds.includes(blindsId)) continue;

      const blind = blindsId !== null ? blindMap.get(blindsId) : null;
      const blindsText = blind
        ? blind.straddle > 0
          ? `$${blind.sb}/$${blind.bb}/$${blind.straddle}`
          : `$${blind.sb}/$${blind.bb}`
        : '';

      const location = locationMap.get(session.location);
      const game = gameMap.get(session.game);
      const gameFormat = gameFormatMap.get(session.game_format);

      enhanced.push({
        ...session,
        locationName: location?.location || '',
        gameName: game?.game || '',
        gameFormatName: gameFormat?.game_format || '',
        baseFormat: gameFormat?.base_format || 0,
        blindsText,
        blindsId,
        breaks: breaksBySession.get(session.session_id!) || [],
        note: notesBySession.get(session.session_id!)
      });
    }

    return enhanced.sort((a, b) => b.start - a.start);
  }, [filters, state]);

  return sessions;
}

export function useActiveSessions() {
  return useSessions(1);
}

export function useCompletedSessions() {
  return useSessions(0);
}
