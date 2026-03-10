import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Section from '../components/Section';
import StatCard from '../components/StatCard';
import EndSession from '../components/EndSession';
import { useActiveSessions, useCompletedSessions } from '../hooks/useSessions';
import { useStats, useBreakdown } from '../hooks/useStats';
import { formatCurrency, formatDuration } from '../utils/calculations';
import { db, Session } from '../db/schema';

export default function Dashboard() {
  const activeSessions = useActiveSessions();
  const completedSessions = useCompletedSessions();
  const stats = useStats(completedSessions);
  const breakdown = useBreakdown(completedSessions);

  const [activeTimers, setActiveTimers] = useState<{ [key: number]: number }>({});
  const [sessionToEnd, setSessionToEnd] = useState<Session | null>(null);
  const [pausedSessions, setPausedSessions] = useState<{ [sessionId: number]: number }>({});

  useEffect(() => {
    if (!activeSessions) return;
    const paused: { [sessionId: number]: number } = {};
    for (const session of activeSessions) {
      const openBreak = session.breaks.find(b => b.start === b.end);
      if (openBreak) {
        paused[session.session_id!] = openBreak.break_id!;
      }
    }
    setPausedSessions(paused);
  }, [activeSessions]);

  const handlePause = async (sessionId: number) => {
    const now = Date.now();
    const breakId = await db.breaks.add({
      session_id: sessionId,
      start: now,
      end: now,
    });
    setPausedSessions(prev => ({ ...prev, [sessionId]: breakId as number }));
  };

  const handleResume = async (sessionId: number) => {
    const breakId = pausedSessions[sessionId];
    if (breakId) {
      await db.breaks.update(breakId, { end: Date.now() });
      setPausedSessions(prev => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
    }
  };

  useEffect(() => {
    if (!activeSessions || activeSessions.length === 0) return;

    const interval = setInterval(() => {
      const newTimers: { [key: number]: number } = {};
      activeSessions.forEach(session => {
        const sid = session.session_id!;
        const isPaused = sid in pausedSessions;
        const now = isPaused ? undefined : Date.now();

        let breakTime = 0;
        for (const b of session.breaks) {
          if (b.start === b.end) {
            breakTime += (now ?? Date.now()) - b.start;
          } else {
            breakTime += b.end - b.start;
          }
        }

        const elapsed = (now ?? Date.now()) - session.start;
        newTimers[sid] = elapsed - breakTime;
      });
      setActiveTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSessions, pausedSessions]);

  const profitColor = stats.totalProfit >= 0 ? 'text-profit' : 'text-loss';
  const hourlyColor = stats.hourlyRate >= 0 ? 'text-profit' : 'text-loss';

  return (
    <Layout title="Poker Tracker">
      {activeSessions && activeSessions.length > 0 && (
        <Section title="Active Games">
          {activeSessions.map(session => (
            <div
              key={session.session_id}
              className="mb-3 pb-3 border-b border-theme last:border-b-0"
            >
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="font-semibold text-lg text-theme">{session.locationName}</div>
                  <div className="text-sm text-theme-secondary">
                    {session.blindsText} {session.gameName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-theme-secondary">Buy In</div>
                  <div className="font-semibold text-theme">{formatCurrency(session.buy_in)}</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-accent font-mono text-lg">
                  {formatDuration(activeTimers[session.session_id!] || 0)}
                  {session.session_id! in pausedSessions && (
                    <span className="text-xs text-theme-secondary ml-2">PAUSED</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {session.session_id! in pausedSessions ? (
                    <button
                      onClick={() => handleResume(session.session_id!)}
                      className="px-4 py-1 bg-teal text-white rounded font-semibold text-sm"
                    >
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePause(session.session_id!)}
                      className="px-4 py-1 bg-amber-500 text-white rounded font-semibold text-sm"
                    >
                      Pause
                    </button>
                  )}
                  <button
                    onClick={() => setSessionToEnd(session)}
                    className="px-4 py-1 bg-loss text-white rounded font-semibold text-sm"
                  >
                    End Session
                  </button>
                </div>
              </div>
            </div>
          ))}
        </Section>
      )}

      {sessionToEnd && (
        <EndSession
          session={sessionToEnd}
          onComplete={() => setSessionToEnd(null)}
          onCancel={() => setSessionToEnd(null)}
        />
      )}

      <Section title="Overview">
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total Profit"
            value={formatCurrency(stats.totalProfit)}
            valueColor={profitColor}
          />
          <StatCard
            label="Time Played"
            value={`${Math.round(stats.totalHours)}h`}
          />
          <StatCard
            label="Hourly Wage"
            value={formatCurrency(stats.hourlyRate)}
            valueColor={hourlyColor}
          />
        </div>
      </Section>

      {breakdown.length > 0 && (
        <Section title="Breakdown">
          <div className="space-y-2">
            {breakdown.map((format, i) => (
              <BreakdownTree key={i} item={format} level={0} />
            ))}
          </div>
        </Section>
      )}
    </Layout>
  );
}

interface BreakdownTreeProps {
  item: {
    name: string;
    hourlyRate: number;
    hours: number;
    children?: { name: string; hourlyRate: number; hours: number; children?: any[] }[];
  };
  level: number;
}

function BreakdownTree({ item, level }: BreakdownTreeProps) {
  const [expanded, setExpanded] = useState(level === 0);
  const hasChildren = item.children && item.children.length > 0;
  const indent = level * 16;
  const rateColor = item.hourlyRate >= 0 ? 'text-profit' : 'text-loss';

  return (
    <div>
      <div
        className="flex justify-between items-center py-1 cursor-pointer"
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="flex items-center">
          {hasChildren && (
            <span className="mr-2 text-theme-secondary">{expanded ? '▼' : '▶'}</span>
          )}
          <span className={`${level === 0 ? 'font-semibold' : ''} text-theme`}>{item.name}</span>
        </div>
        <span className={`text-sm ${rateColor}`}>
          {formatCurrency(item.hourlyRate)}/hr × {Math.round(item.hours)}h
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {item.children!.map((child, i) => (
            <BreakdownTree key={i} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
