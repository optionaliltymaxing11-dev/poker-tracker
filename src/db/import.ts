import { db } from './schema';

export interface ImportStats {
  sessions: number;
  locations: number;
  games: number;
  blinds: number;
  game_formats: number;
  base_formats: number;
  breaks: number;
  notes: number;
  cash: number;
  tournament: number;
}

export async function importSQLiteDatabase(file: File): Promise<ImportStats> {
  const sqlJsModule = await import('sql.js');
  const initSqlJs = sqlJsModule.default || sqlJsModule;
  const SQL = await initSqlJs({
    locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`
  });

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const sqlDb = new SQL.Database(uint8Array);

  const stats: ImportStats = {
    sessions: 0,
    locations: 0,
    games: 0,
    blinds: 0,
    game_formats: 0,
    base_formats: 0,
    breaks: 0,
    notes: 0,
    cash: 0,
    tournament: 0
  };

  // Clear existing data
  await db.transaction('rw', [
    db.sessions, db.cash, db.games, db.locations, db.blinds,
    db.game_formats, db.base_formats, db.tournament, db.breaks, db.notes
  ], async () => {
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
  });

  // Import base_formats
  const baseFormatsResult = sqlDb.exec('SELECT * FROM base_formats');
  if (baseFormatsResult.length > 0) {
    const baseFormats = baseFormatsResult[0].values.map((row: any[]) => ({
      base_format_id: row[0] as number,
      base_format: row[1] as string
    }));
    await db.base_formats.bulkAdd(baseFormats);
    stats.base_formats = baseFormats.length;
  }

  // Import locations
  const locationsResult = sqlDb.exec('SELECT * FROM locations');
  if (locationsResult.length > 0) {
    const locations = locationsResult[0].values.map((row: any[]) => ({
      location_id: row[0] as number,
      location: row[1] as string,
      filtered: row[2] as number
    }));
    await db.locations.bulkAdd(locations);
    stats.locations = locations.length;
  }

  // Import games
  const gamesResult = sqlDb.exec('SELECT * FROM games');
  if (gamesResult.length > 0) {
    const games = gamesResult[0].values.map((row: any[]) => ({
      game_id: row[0] as number,
      game: row[1] as string,
      filtered: row[2] as number
    }));
    await db.games.bulkAdd(games);
    stats.games = games.length;
  }

  // Import blinds
  const blindsResult = sqlDb.exec('SELECT * FROM blinds');
  if (blindsResult.length > 0) {
    const blinds = blindsResult[0].values.map((row: any[]) => ({
      blind_id: row[0] as number,
      sb: row[1] as number,
      bb: row[2] as number,
      straddle: row[3] as number,
      bring_in: row[4] as number,
      ante: row[5] as number,
      per_point: row[6] as number,
      filtered: row[7] as number
    }));
    await db.blinds.bulkAdd(blinds);
    stats.blinds = blinds.length;
  }

  // Import game_formats
  const gameFormatsResult = sqlDb.exec('SELECT * FROM game_formats');
  if (gameFormatsResult.length > 0) {
    const gameFormats = gameFormatsResult[0].values.map((row: any[]) => ({
      game_format_id: row[0] as number,
      game_format: row[1] as string,
      base_format: row[2] as number,
      filtered: row[3] as number
    }));
    await db.game_formats.bulkAdd(gameFormats);
    stats.game_formats = gameFormats.length;
  }

  // Import sessions
  const sessionsResult = sqlDb.exec('SELECT * FROM sessions');
  if (sessionsResult.length > 0) {
    const sessions = sessionsResult[0].values.map((row: any[]) => ({
      session_id: row[0] as number,
      start: row[1] as number,
      end: row[2] as number,
      buy_in: row[3] as number,
      cash_out: row[4] as number,
      game: row[5] as number,
      game_format: row[6] as number,
      location: row[7] as number,
      state: row[8] as number,
      filtered: row[9] as number
    }));
    await db.sessions.bulkAdd(sessions);
    stats.sessions = sessions.length;
  }

  // Import cash
  const cashResult = sqlDb.exec('SELECT * FROM cash');
  if (cashResult.length > 0) {
    const cash = cashResult[0].values.map((row: any[]) => ({
      session_id: row[0] as number,
      blinds: row[1] as number
    }));
    await db.cash.bulkAdd(cash);
    stats.cash = cash.length;
  }

  // Import tournament
  const tournamentResult = sqlDb.exec('SELECT * FROM tournament');
  if (tournamentResult.length > 0) {
    const tournament = tournamentResult[0].values.map((row: any[]) => ({
      session_id: row[0] as number,
      entrants: row[1] as number,
      placed: row[2] as number
    }));
    await db.tournament.bulkAdd(tournament);
    stats.tournament = tournament.length;
  }

  // Import breaks
  const breaksResult = sqlDb.exec('SELECT * FROM breaks');
  if (breaksResult.length > 0) {
    const breaks = breaksResult[0].values.map((row: any[]) => ({
      break_id: row[0] as number,
      session_id: row[1] as number,
      start: row[2] as number,
      end: row[3] as number
    }));
    await db.breaks.bulkAdd(breaks);
    stats.breaks = breaks.length;
  }

  // Import notes
  const notesResult = sqlDb.exec('SELECT * FROM notes');
  if (notesResult.length > 0) {
    const notes = notesResult[0].values.map((row: any[]) => ({
      note_id: row[0] as number,
      session_id: row[1] as number,
      note: row[2] as string
    }));
    await db.notes.bulkAdd(notes);
    stats.notes = notes.length;
  }

  // Initialize filters (all checked by default)
  const allLocations = await db.locations.toArray();
  const allGames = await db.games.toArray();
  const allGameFormats = await db.game_formats.toArray();
  const allBlinds = await db.blinds.toArray();

  await db.filters.clear();
  await db.filters.add({
    locations: allLocations.map(l => l.location_id!),
    games: allGames.map(g => g.game_id!),
    game_formats: allGameFormats.map(gf => gf.game_format_id!),
    blinds: allBlinds.map(b => b.blind_id!)
  });

  sqlDb.close();
  return stats;
}
