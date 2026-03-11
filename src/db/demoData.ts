/**
 * Demo data generator for Poker Tracker PWA.
 * Generates ~312 realistic sessions (2x 8hr/week since Jan 2023).
 * Modeled after real mid-stakes cash game variance.
 */

import { db } from './schema';

// Seeded random for reproducibility
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

function randBetween(min: number, max: number): number {
  return min + rand() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randBetween(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

// Normal distribution via Box-Muller
function randNormal(mean: number, stddev: number): number {
  const u1 = rand();
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

interface StakeConfig {
  blindId: number;
  gameId: number;
  sb: number;
  bb: number;
  straddle: number;
  gameName: string;
  typicalBuyIn: number;
  buyInVariance: number;
  // BB/hr winrate target (15-20 bb/hr) converted to $/hr
  winRatePerHour: number;
  // Standard deviation per hour (high variance for PLO)
  stdDevPerHour: number;
  weight: number; // selection probability
}

export async function loadDemoData(): Promise<void> {
  // Clear existing data
  await db.transaction('rw', [
    db.sessions, db.cash, db.games, db.locations, db.blinds,
    db.game_formats, db.base_formats, db.breaks, db.notes, db.tournament
  ], async () => {
    await db.sessions.clear();
    await db.cash.clear();
    await db.games.clear();
    await db.locations.clear();
    await db.blinds.clear();
    await db.game_formats.clear();
    await db.base_formats.clear();
    await db.breaks.clear();
    await db.notes.clear();
    await db.tournament.clear();

    // Base formats
    await db.base_formats.add({ base_format_id: 1, base_format: 'Cash' });

    // Game formats
    await db.game_formats.add({ game_format_id: 1, game_format: 'Full Ring', base_format: 1, filtered: 0 });

    // Locations
    const locationNames = ['Borgata', 'Parx', 'Maryland Live', 'MGM National Harbor', 'Philly Live'];
    const locationIds: number[] = [];
    for (const name of locationNames) {
      const id = await db.locations.add({ location: name, filtered: 0 });
      locationIds.push(id as number);
    }

    // Games
    const nlId = await db.games.add({ game: 'NL Hold\'em', filtered: 0 }) as number;
    const ploId = await db.games.add({ game: 'Pot Limit Omaha', filtered: 0 }) as number;

    // Blinds
    const blindConfigs = [
      { sb: 2, bb: 5, straddle: 0 },    // 2/5 NL
      { sb: 5, bb: 10, straddle: 10 },   // 10/10 NL (5/10 with straddle)
      { sb: 10, bb: 25, straddle: 0 },   // 10/25 NL
      { sb: 2, bb: 5, straddle: 5 },     // 5/5 PLO (2/5 with straddle)
      { sb: 5, bb: 10, straddle: 25 },   // 10/25 PLO (with straddle)
      { sb: 10, bb: 25, straddle: 50 },  // 25/50 PLO
    ];

    const blindIds: number[] = [];
    for (const bc of blindConfigs) {
      const id = await db.blinds.add({
        sb: bc.sb, bb: bc.bb, straddle: bc.straddle,
        bring_in: 0, ante: 0, per_point: 0, filtered: 0,
      });
      blindIds.push(id as number);
    }

    // Stake configurations with realistic variance
    // Target: 15-20 bb/hr winrate
    // PLO has much higher variance than NLH
    const stakes: StakeConfig[] = [
      {
        blindId: blindIds[0], gameId: nlId, sb: 2, bb: 5, straddle: 0,
        gameName: '2/5 NL',
        typicalBuyIn: 500, buyInVariance: 200,
        winRatePerHour: 17 * 5,       // 17 bb/hr * $5 = $85/hr
        stdDevPerHour: 250,
        weight: 0.30,
      },
      {
        blindId: blindIds[1], gameId: nlId, sb: 5, bb: 10, straddle: 10,
        gameName: '10/10 NL',
        typicalBuyIn: 1500, buyInVariance: 500,
        winRatePerHour: 16 * 10,      // 16 bb/hr * $10 = $160/hr
        stdDevPerHour: 450,
        weight: 0.15,
      },
      {
        blindId: blindIds[2], gameId: nlId, sb: 10, bb: 25, straddle: 0,
        gameName: '10/25 NL',
        typicalBuyIn: 3000, buyInVariance: 1000,
        winRatePerHour: 15 * 25,      // 15 bb/hr * $25 = $375/hr
        stdDevPerHour: 800,
        weight: 0.10,
      },
      {
        blindId: blindIds[3], gameId: ploId, sb: 2, bb: 5, straddle: 5,
        gameName: '5/5 PLO',
        typicalBuyIn: 1000, buyInVariance: 500,
        winRatePerHour: 18 * 5,       // 18 bb/hr * $5 = $90/hr
        stdDevPerHour: 400,
        weight: 0.25,
      },
      {
        blindId: blindIds[4], gameId: ploId, sb: 5, bb: 10, straddle: 25,
        gameName: '10/25 PLO',
        typicalBuyIn: 2500, buyInVariance: 1000,
        winRatePerHour: 16 * 25,      // 16 bb/hr * $25 = $400/hr
        stdDevPerHour: 900,
        weight: 0.12,
      },
      {
        blindId: blindIds[5], gameId: ploId, sb: 10, bb: 25, straddle: 50,
        gameName: '25/50 PLO',
        typicalBuyIn: 5000, buyInVariance: 2000,
        winRatePerHour: 15 * 50,      // 15 bb/hr * $50 = $750/hr
        stdDevPerHour: 1800,
        weight: 0.08,
      },
    ];

    // Weighted random stake selection
    function pickStake(): StakeConfig {
      const r = rand();
      let cum = 0;
      for (const s of stakes) {
        cum += s.weight;
        if (r < cum) return s;
      }
      return stakes[0];
    }

    // Location weights (Borgata and Parx most frequent)
    const locationWeights = [0.35, 0.25, 0.15, 0.15, 0.10];
    function pickLocation(): number {
      const r = rand();
      let cum = 0;
      for (let i = 0; i < locationWeights.length; i++) {
        cum += locationWeights[i];
        if (r < cum) return locationIds[i];
      }
      return locationIds[0];
    }

    // Generate sessions: ~2 per week from Jan 2023 to March 2026
    const startDate = new Date(2023, 0, 5); // Jan 5, 2023
    const endDate = new Date(2026, 2, 10);  // March 10, 2026
    const totalWeeks = Math.floor((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

    let sessionId = 0;
    const notes = [
      'Table was super soft tonight. Multiple fish calling down with bottom pair.',
      'Ran into a cooler set over set. Nothing I could do.',
      'Great session, hit a huge bluff on the river with air.',
      'Tough table, lots of regs. Had to grind it out.',
      'Whale at the table dumping money. Stayed extra hours.',
      'Short session, game broke early.',
      'Moved up in stakes after the 2/5 game was too nitty.',
      'Bad beat: flopped the nut flush, lost to runner runner full house.',
      'Finally cracked aces with my suited connectors.',
      'Played really disciplined today. Folded a lot of marginal spots.',
      'Tilted a bit after a bad beat, need to work on that.',
      'New player at the table was incredibly loose. Adjusted and profited.',
      'Long grind but worth it. Patience paid off in the end.',
      'PLO is such a variance game. Swung up and down all night.',
      'Hit quad kings. Table went nuts.',
    ];

    for (let week = 0; week < totalWeeks; week++) {
      // 2 sessions per week on average (sometimes 1, sometimes 3)
      const sessionsThisWeek = rand() < 0.15 ? 1 : rand() < 0.85 ? 2 : 3;

      for (let s = 0; s < sessionsThisWeek; s++) {
        // Pick a day in this week (prefer Thu-Sun for poker)
        const weekStart = new Date(startDate.getTime() + week * 7 * 24 * 60 * 60 * 1000);
        const dayWeights = [0.05, 0.05, 0.08, 0.12, 0.20, 0.30, 0.20]; // Mon-Sun
        let day = 0;
        const dr = rand();
        let dcum = 0;
        for (let d = 0; d < 7; d++) {
          dcum += dayWeights[d];
          if (dr < dcum) { day = d; break; }
        }

        const sessionDate = new Date(weekStart);
        sessionDate.setDate(sessionDate.getDate() + day);

        // Start time: mostly evening (5-9 PM), sometimes afternoon
        const startHour = rand() < 0.2 ? randInt(12, 15) : randInt(17, 21);
        const startMinute = randInt(0, 59);
        sessionDate.setHours(startHour, startMinute, 0, 0);

        const startTs = sessionDate.getTime();

        // Session duration: target ~8 hours, with variance (5-12 hours)
        const durationHours = Math.max(3, Math.min(14, randNormal(8, 2)));
        const durationMs = durationHours * 60 * 60 * 1000;
        const endTs = startTs + durationMs;

        // Pick stake and location
        const stake = pickStake();
        const locationId = pickLocation();

        // Calculate profit using normal distribution
        // Expected profit = winRate * hours
        // Actual profit = Normal(expected, stdDev * sqrt(hours))
        const expectedProfit = stake.winRatePerHour * durationHours;
        const sessionStdDev = stake.stdDevPerHour * Math.sqrt(durationHours);
        let profit = Math.round(randNormal(expectedProfit, sessionStdDev));

        // Occasional big wins/losses (fat tails)
        if (rand() < 0.05) {
          profit = Math.round(profit * randBetween(2, 3.5));
        } else if (rand() < 0.05) {
          profit = Math.round(profit - stake.stdDevPerHour * randBetween(3, 5));
        }

        // Buy-in
        const buyIn = Math.max(
          stake.typicalBuyIn * 0.5,
          Math.round(randNormal(stake.typicalBuyIn, stake.buyInVariance) / 50) * 50
        );

        // Rebuys: more likely when losing, occasionally when winning
        let totalBuyIn = buyIn;
        if (profit < -buyIn * 0.8) {
          // Lost most of buy-in, probably rebought 1-3 times
          const rebuys = randInt(1, 3);
          for (let r = 0; r < rebuys; r++) {
            totalBuyIn += Math.round(randBetween(buyIn * 0.5, buyIn * 1.2) / 50) * 50;
          }
        } else if (profit < 0 && rand() < 0.3) {
          totalBuyIn += Math.round(randBetween(buyIn * 0.5, buyIn) / 50) * 50;
        }

        const cashOut = Math.max(0, totalBuyIn + profit);

        sessionId++;

        await db.sessions.add({
          session_id: sessionId,
          start: startTs,
          end: endTs,
          buy_in: totalBuyIn,
          cash_out: cashOut,
          game: stake.gameId,
          game_format: 1,
          location: locationId,
          state: 0,
          filtered: 0,
        });

        await db.cash.add({
          session_id: sessionId,
          blinds: stake.blindId,
        });

        // ~30% of sessions have breaks
        if (rand() < 0.3) {
          const breakCount = randInt(1, 2);
          for (let b = 0; b < breakCount; b++) {
            const breakStart = startTs + randBetween(durationMs * 0.2, durationMs * 0.8);
            const breakDuration = randBetween(10, 45) * 60 * 1000;
            await db.breaks.add({
              session_id: sessionId,
              start: breakStart,
              end: breakStart + breakDuration,
            });
          }
        }

        // ~15% of sessions have notes
        if (rand() < 0.15) {
          await db.notes.add({
            session_id: sessionId,
            note: pick(notes),
          });
        }
      }
    }
  });
}
