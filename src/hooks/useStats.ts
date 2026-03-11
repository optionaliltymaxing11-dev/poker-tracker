import { useMemo } from 'react';
import { SessionWithDetails } from './useSessions';
import {
  calculateProfit,
  calculateDuration,
  calculateHours,
  calculateHourlyRate
} from '../utils/calculations';

export interface Stats {
  totalProfit: number;
  totalHours: number;
  hourlyRate: number;
  sessionCount: number;
}

export interface BestResult {
  name: string;
  hourlyRate: number;
  hours: number;
}

export interface BreakdownItem {
  name: string;
  hourlyRate: number;
  hours: number;
  children?: BreakdownItem[];
}

export function useStats(sessions: SessionWithDetails[] | undefined): Stats {
  return useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return {
        totalProfit: 0,
        totalHours: 0,
        hourlyRate: 0,
        sessionCount: 0
      };
    }

    let totalProfit = 0;
    let totalDurationMs = 0;

    sessions.forEach(session => {
      totalProfit += calculateProfit(session);
      totalDurationMs += calculateDuration(session, session.breaks);
    });

    const totalHours = calculateHours(totalDurationMs);
    const hourlyRate = calculateHourlyRate(totalProfit, totalHours);

    return {
      totalProfit,
      totalHours,
      hourlyRate,
      sessionCount: sessions.length
    };
  }, [sessions]);
}

export function useBestGame(sessions: SessionWithDetails[] | undefined): BestResult | null {
  return useMemo(() => {
    if (!sessions || sessions.length === 0) return null;

    const gameStats = new Map<string, { profit: number; durationMs: number }>();

    sessions.forEach(session => {
      const gameName = session.gameName;
      const existing = gameStats.get(gameName) || { profit: 0, durationMs: 0 };
      existing.profit += calculateProfit(session);
      existing.durationMs += calculateDuration(session, session.breaks);
      gameStats.set(gameName, existing);
    });

    let best: BestResult | null = null;
    gameStats.forEach((stats, name) => {
      const hours = calculateHours(stats.durationMs);
      const hourlyRate = calculateHourlyRate(stats.profit, hours);
      if (!best || hourlyRate > best.hourlyRate) {
        best = { name, hourlyRate, hours };
      }
    });

    return best;
  }, [sessions]);
}

export function useBestLocation(sessions: SessionWithDetails[] | undefined): BestResult | null {
  return useMemo(() => {
    if (!sessions || sessions.length === 0) return null;

    const locationStats = new Map<string, { profit: number; durationMs: number }>();

    sessions.forEach(session => {
      const locationName = session.locationName;
      const existing = locationStats.get(locationName) || { profit: 0, durationMs: 0 };
      existing.profit += calculateProfit(session);
      existing.durationMs += calculateDuration(session, session.breaks);
      locationStats.set(locationName, existing);
    });

    let best: BestResult | null = null;
    locationStats.forEach((stats, name) => {
      const hours = calculateHours(stats.durationMs);
      const hourlyRate = calculateHourlyRate(stats.profit, hours);
      if (!best || hourlyRate > best.hourlyRate) {
        best = { name, hourlyRate, hours };
      }
    });

    return best;
  }, [sessions]);
}

export function useBreakdown(sessions: SessionWithDetails[] | undefined): BreakdownItem[] {
  return useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    // Group by base format -> game -> blinds
    const formatMap = new Map<string, Map<string, Map<string, { profit: number; durationMs: number }>>>();

    sessions.forEach(session => {
      const formatName = 'All Games';
      const gameName = session.gameName;
      const blindsName = session.blindsText || 'N/A';

      if (!formatMap.has(formatName)) {
        formatMap.set(formatName, new Map());
      }
      const gameMap = formatMap.get(formatName)!;

      if (!gameMap.has(gameName)) {
        gameMap.set(gameName, new Map());
      }
      const blindsMap = gameMap.get(gameName)!;

      const existing = blindsMap.get(blindsName) || { profit: 0, durationMs: 0 };
      existing.profit += calculateProfit(session);
      existing.durationMs += calculateDuration(session, session.breaks);
      blindsMap.set(blindsName, existing);
    });

    const breakdown: BreakdownItem[] = [];

    formatMap.forEach((gameMap, formatName) => {
      const formatChildren: BreakdownItem[] = [];
      let formatProfit = 0;
      let formatDurationMs = 0;

      gameMap.forEach((blindsMap, gameName) => {
        const gameChildren: BreakdownItem[] = [];
        let gameProfit = 0;
        let gameDurationMs = 0;

        blindsMap.forEach((stats, blindsName) => {
          const hours = calculateHours(stats.durationMs);
          const hourlyRate = calculateHourlyRate(stats.profit, hours);
          gameChildren.push({
            name: blindsName,
            hourlyRate,
            hours
          });
          gameProfit += stats.profit;
          gameDurationMs += stats.durationMs;
        });

        const gameHours = calculateHours(gameDurationMs);
        const gameHourlyRate = calculateHourlyRate(gameProfit, gameHours);
        formatChildren.push({
          name: gameName,
          hourlyRate: gameHourlyRate,
          hours: gameHours,
          children: gameChildren
        });

        formatProfit += gameProfit;
        formatDurationMs += gameDurationMs;
      });

      const formatHours = calculateHours(formatDurationMs);
      const formatHourlyRate = calculateHourlyRate(formatProfit, formatHours);
      breakdown.push({
        name: formatName,
        hourlyRate: formatHourlyRate,
        hours: formatHours,
        children: formatChildren
      });
    });

    return breakdown;
  }, [sessions]);
}

export interface WinLossStats {
  wins: number;
  losses: number;
  avgWin: number;
  avgLoss: number;
  biggestWin: number;
  biggestLoss: number;
  avgWinHourly: number;
  avgLossHourly: number;
  bestDay: { date: string; profit: number } | null;
  worstDay: { date: string; profit: number } | null;
}

export function useWinLossStats(sessions: SessionWithDetails[] | undefined): WinLossStats {
  return useMemo(() => {
    const empty: WinLossStats = { wins: 0, losses: 0, avgWin: 0, avgLoss: 0, biggestWin: 0, biggestLoss: 0, avgWinHourly: 0, avgLossHourly: 0, bestDay: null, worstDay: null };
    if (!sessions || sessions.length === 0) return empty;

    let wins = 0, losses = 0;
    let totalWinProfit = 0, totalLossProfit = 0;
    let biggestWin = 0, biggestLoss = 0;
    let winHoursTotal = 0, lossHoursTotal = 0;

    sessions.forEach(session => {
      const profit = calculateProfit(session);
      const hours = calculateHours(calculateDuration(session, session.breaks));

      if (profit >= 0) {
        wins++;
        totalWinProfit += profit;
        winHoursTotal += hours;
        if (profit > biggestWin) biggestWin = profit;
      } else {
        losses++;
        totalLossProfit += profit;
        lossHoursTotal += hours;
        if (profit < biggestLoss) biggestLoss = profit;
      }
    });

    // Best/worst day (sum all sessions per calendar day)
    const dayMap = new Map<string, number>();
    sessions.forEach(session => {
      const d = new Date(session.start);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayMap.set(key, (dayMap.get(key) || 0) + calculateProfit(session));
    });

    let bestDay: { date: string; profit: number } | null = null;
    let worstDay: { date: string; profit: number } | null = null;
    dayMap.forEach((profit, date) => {
      if (!bestDay || profit > bestDay.profit) bestDay = { date, profit };
      if (!worstDay || profit < worstDay.profit) worstDay = { date, profit };
    });

    return {
      wins,
      losses,
      avgWin: wins > 0 ? totalWinProfit / wins : 0,
      avgLoss: losses > 0 ? totalLossProfit / losses : 0,
      biggestWin,
      biggestLoss,
      avgWinHourly: winHoursTotal > 0 ? totalWinProfit / winHoursTotal : 0,
      avgLossHourly: lossHoursTotal > 0 ? totalLossProfit / lossHoursTotal : 0,
      bestDay,
      worstDay,
    };
  }, [sessions]);
}
