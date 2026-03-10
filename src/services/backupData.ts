import { db } from '../db/schema';

export interface BackupData {
  version: number;
  timestamp: string;
  sessions: unknown[];
  cash: unknown[];
  games: unknown[];
  locations: unknown[];
  blinds: unknown[];
  game_formats: unknown[];
  base_formats: unknown[];
  tournament: unknown[];
  breaks: unknown[];
  notes: unknown[];
  filters: unknown[];
}

export async function createBackupData(): Promise<BackupData> {
  return {
    version: 1,
    timestamp: new Date().toISOString(),
    sessions: await db.sessions.toArray(),
    cash: await db.cash.toArray(),
    games: await db.games.toArray(),
    locations: await db.locations.toArray(),
    blinds: await db.blinds.toArray(),
    game_formats: await db.game_formats.toArray(),
    base_formats: await db.base_formats.toArray(),
    tournament: await db.tournament.toArray(),
    breaks: await db.breaks.toArray(),
    notes: await db.notes.toArray(),
    filters: await db.filters.toArray(),
  };
}

export async function restoreBackupData(data: BackupData): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.sessions,
      db.cash,
      db.games,
      db.locations,
      db.blinds,
      db.game_formats,
      db.base_formats,
      db.tournament,
      db.breaks,
      db.notes,
      db.filters,
    ],
    async () => {
      await db.sessions.clear();
      await db.cash.clear();
      await db.games.clear();
      await db.locations.clear();
      await db.blinds.clear();
      await db.game_formats.clear();
      await db.base_formats.clear();
      await db.tournament.clear();
      await db.breaks.clear();
      await db.notes.clear();
      await db.filters.clear();

      if (data.base_formats?.length) await db.base_formats.bulkAdd(data.base_formats as never[]);
      if (data.locations?.length) await db.locations.bulkAdd(data.locations as never[]);
      if (data.games?.length) await db.games.bulkAdd(data.games as never[]);
      if (data.blinds?.length) await db.blinds.bulkAdd(data.blinds as never[]);
      if (data.game_formats?.length) await db.game_formats.bulkAdd(data.game_formats as never[]);
      if (data.sessions?.length) await db.sessions.bulkAdd(data.sessions as never[]);
      if (data.cash?.length) await db.cash.bulkAdd(data.cash as never[]);
      if (data.tournament?.length) await db.tournament.bulkAdd(data.tournament as never[]);
      if (data.breaks?.length) await db.breaks.bulkAdd(data.breaks as never[]);
      if (data.notes?.length) await db.notes.bulkAdd(data.notes as never[]);
      if (data.filters?.length) await db.filters.bulkAdd(data.filters as never[]);
    }
  );
}

export function downloadBackupFile(data: BackupData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `poker-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function getDbStats(): Promise<{ sessions: number; locations: number; games: number; notes: number }> {
  return {
    sessions: await db.sessions.count(),
    locations: await db.locations.count(),
    games: await db.games.count(),
    notes: await db.notes.count(),
  };
}
