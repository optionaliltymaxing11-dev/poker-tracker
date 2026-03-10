import Dexie, { Table } from 'dexie';

// Database schema interfaces
export interface Session {
  session_id?: number;
  start: number;
  end: number;
  buy_in: number;
  cash_out: number;
  game: number;
  game_format: number;
  location: number;
  state: number; // 0 = completed, 1 = active
  filtered: number;
}

export interface Cash {
  session_id: number;
  blinds: number;
}

export interface Game {
  game_id?: number;
  game: string;
  filtered: number;
}

export interface Location {
  location_id?: number;
  location: string;
  filtered: number;
}

export interface Blind {
  blind_id?: number;
  sb: number;
  bb: number;
  straddle: number;
  bring_in: number;
  ante: number;
  per_point: number;
  filtered: number;
}

export interface GameFormat {
  game_format_id?: number;
  game_format: string;
  base_format: number;
  filtered: number;
}

export interface BaseFormat {
  base_format_id?: number;
  base_format: string;
}

export interface Tournament {
  session_id: number;
  entrants: number;
  placed: number;
}

export interface Break {
  break_id?: number;
  session_id: number;
  start: number;
  end: number;
}

export interface Note {
  note_id?: number;
  session_id: number;
  note: string;
}

export interface Filter {
  id?: number;
  locations: number[];
  games: number[];
  game_formats: number[];
  blinds: number[];
}

// Dexie database class
export class PokerDatabase extends Dexie {
  sessions!: Table<Session>;
  cash!: Table<Cash>;
  games!: Table<Game>;
  locations!: Table<Location>;
  blinds!: Table<Blind>;
  game_formats!: Table<GameFormat>;
  base_formats!: Table<BaseFormat>;
  tournament!: Table<Tournament>;
  breaks!: Table<Break>;
  notes!: Table<Note>;
  filters!: Table<Filter>;

  constructor() {
    super('PokerTrackerDB');
    this.version(1).stores({
      sessions: '++session_id, start, end, game, game_format, location, state, filtered',
      cash: 'session_id, blinds',
      games: '++game_id, game, filtered',
      locations: '++location_id, location, filtered',
      blinds: '++blind_id, filtered',
      game_formats: '++game_format_id, game_format, base_format, filtered',
      base_formats: '++base_format_id, base_format',
      tournament: 'session_id',
      breaks: '++break_id, session_id',
      notes: '++note_id, session_id',
      filters: '++id'
    });
  }
}

export const db = new PokerDatabase();
