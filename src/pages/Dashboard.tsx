import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Section from '../components/Section';
import CollapsibleSection from '../components/CollapsibleSection';
import StatCard from '../components/StatCard';
import EndSession from '../components/EndSession';
import { useActiveSessions, useCompletedSessions } from '../hooks/useSessions';
import { useStats, useBreakdown, useWinLossStats } from '../hooks/useStats';
import { formatCurrency, formatDuration } from '../utils/calculations';
import { db, Session } from '../db/schema';

export default function Dashboard() {
  const activeSessions = useActiveSessions();
  const completedSessions = useCompletedSessions();
  const stats = useStats(completedSessions);
  const breakdown = useBreakdown(completedSessions);
  const wl = useWinLossStats(completedSessions);

  const [activeTimers, setActiveTimers] = useState<{ [key: number]: number }>({});
  const [sessionToEnd, setSessionToEnd] = useState<Session | null>(null);
  const [pausedSessions, setPausedSessions] = useState<{ [sessionId: number]: number }>({});
  const [rebuySession, setRebuySession] = useState<Session | null>(null);
  const [rebuyAmount, setRebuyAmount] = useState('');

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

  const handleRebuy = async () => {
    if (!rebuySession || !rebuyAmount) return;
    const amount = parseFloat(rebuyAmount);
    if (isNaN(amount) || amount <= 0) return;
    await db.sessions.update(rebuySession.session_id!, {
      buy_in: rebuySession.buy_in + amount,
    });
    setRebuySession(null);
    setRebuyAmount('');
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
                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    onClick={() => { setRebuySession(session); setRebuyAmount(''); }}
                    className="px-3 py-1 bg-blue-600 text-white rounded font-semibold text-sm"
                  >
                    Rebuy
                  </button>
                  {session.session_id! in pausedSessions ? (
                    <button
                      onClick={() => handleResume(session.session_id!)}
                      className="px-3 py-1 bg-teal text-white rounded font-semibold text-sm"
                    >
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePause(session.session_id!)}
                      className="px-3 py-1 bg-amber-500 text-white rounded font-semibold text-sm"
                    >
                      Pause
                    </button>
                  )}
                  <button
                    onClick={() => setSessionToEnd(session)}
                    className="px-3 py-1 bg-loss text-white rounded font-semibold text-sm"
                  >
                    End
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

      {rebuySession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border border-theme rounded-lg p-5 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-theme">Rebuy / Add-on</h3>
            <p className="text-sm text-theme-secondary">
              Current buy-in: <strong className="text-theme">{formatCurrency(rebuySession.buy_in)}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium mb-1 text-theme">Amount</label>
              <input
                type="number"
                value={rebuyAmount}
                onChange={(e) => setRebuyAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                autoFocus
                className="w-full px-3 py-2 border border-theme rounded bg-input text-theme text-lg"
              />
            </div>
            {rebuyAmount && parseFloat(rebuyAmount) > 0 && (
              <p className="text-sm text-theme-secondary">
                New total: <strong className="text-theme">{formatCurrency(rebuySession.buy_in + parseFloat(rebuyAmount))}</strong>
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setRebuySession(null)}
                className="flex-1 py-2 rounded font-semibold bg-hover text-theme border border-theme"
              >
                Cancel
              </button>
              <button
                onClick={handleRebuy}
                disabled={!rebuyAmount || parseFloat(rebuyAmount) <= 0}
                className="flex-1 py-2 rounded font-semibold bg-blue-600 text-white disabled:opacity-50"
              >
                Add {rebuyAmount && parseFloat(rebuyAmount) > 0 ? formatCurrency(parseFloat(rebuyAmount)) : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      <CollapsibleSection title="Overview" defaultOpen>
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
      </CollapsibleSection>

      {completedSessions && completedSessions.length > 0 && (
        <CollapsibleSection title="Win / Loss" defaultOpen>
          <div className="space-y-3">
            {/* Win/Loss counts */}
            <div className="flex gap-3">
              <div className="flex-1 bg-hover rounded-lg p-3 text-center">
                <div className="text-xs text-theme-secondary mb-1">Wins</div>
                <div className="text-2xl font-bold text-profit">{wl.wins}</div>
              </div>
              <div className="flex-1 bg-hover rounded-lg p-3 text-center">
                <div className="text-xs text-theme-secondary mb-1">Losses</div>
                <div className="text-2xl font-bold text-loss">{wl.losses}</div>
              </div>
              <div className="flex-1 bg-hover rounded-lg p-3 text-center">
                <div className="text-xs text-theme-secondary mb-1">Win %</div>
                <div className="text-2xl font-bold text-theme">
                  {wl.wins + wl.losses > 0 ? Math.round((wl.wins / (wl.wins + wl.losses)) * 100) : 0}%
                </div>
              </div>
            </div>

            {/* Averages */}
            <div className="flex gap-3">
              <div className="flex-1 bg-hover rounded-lg p-3 text-center">
                <div className="text-xs text-theme-secondary mb-1">Avg Win</div>
                <div className="text-lg font-bold text-profit">{formatCurrency(wl.avgWin)}</div>
              </div>
              <div className="flex-1 bg-hover rounded-lg p-3 text-center">
                <div className="text-xs text-theme-secondary mb-1">Avg Loss</div>
                <div className="text-lg font-bold text-loss">{formatCurrency(wl.avgLoss)}</div>
              </div>
            </div>

            {/* Biggest */}
            <div className="flex gap-3">
              <div className="flex-1 bg-hover rounded-lg p-3 text-center">
                <div className="text-xs text-theme-secondary mb-1">Biggest Win</div>
                <div className="text-lg font-bold text-profit">{formatCurrency(wl.biggestWin)}</div>
              </div>
              <div className="flex-1 bg-hover rounded-lg p-3 text-center">
                <div className="text-xs text-theme-secondary mb-1">Biggest Loss</div>
                <div className="text-lg font-bold text-loss">{formatCurrency(wl.biggestLoss)}</div>
              </div>
            </div>

            {/* Hourly rates */}
            <div className="flex gap-3">
              <div className="flex-1 bg-hover rounded-lg p-3 text-center">
                <div className="text-xs text-theme-secondary mb-1">Avg Win $/hr</div>
                <div className="text-lg font-bold text-profit">{formatCurrency(wl.avgWinHourly)}</div>
              </div>
              <div className="flex-1 bg-hover rounded-lg p-3 text-center">
                <div className="text-xs text-theme-secondary mb-1">Avg Loss $/hr</div>
                <div className="text-lg font-bold text-loss">{formatCurrency(wl.avgLossHourly)}</div>
              </div>
            </div>

            {/* Avg Session Length */}
            <div className="flex gap-3">
              <div className="flex-1 bg-hover rounded-lg p-3 text-center">
                <div className="text-xs text-theme-secondary mb-1">Avg Win Length</div>
                <div className="text-lg font-bold text-profit">{wl.avgWinLength.toFixed(1)}h</div>
              </div>
              <div className="flex-1 bg-hover rounded-lg p-3 text-center">
                <div className="text-xs text-theme-secondary mb-1">Avg Loss Length</div>
                <div className="text-lg font-bold text-loss">{wl.avgLossLength.toFixed(1)}h</div>
              </div>
            </div>

            {/* Best/Worst Day */}
            <div className="flex gap-3">
              <div className="flex-1 bg-hover rounded-lg p-3 text-center">
                <div className="text-xs text-theme-secondary mb-1">Best Day</div>
                <div className="text-lg font-bold text-profit">{wl.bestDay ? formatCurrency(wl.bestDay.profit) : '--'}</div>
                {wl.bestDay && <div className="text-xs text-theme-secondary mt-1">{new Date(wl.bestDay.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
              </div>
              <div className="flex-1 bg-hover rounded-lg p-3 text-center">
                <div className="text-xs text-theme-secondary mb-1">Worst Day</div>
                <div className="text-lg font-bold text-loss">{wl.worstDay ? formatCurrency(wl.worstDay.profit) : '--'}</div>
                {wl.worstDay && <div className="text-xs text-theme-secondary mt-1">{new Date(wl.worstDay.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {breakdown.length > 0 && (
        <CollapsibleSection title="Breakdown" defaultOpen>
          <div className="space-y-2">
            {breakdown.map((format, i) => (
              <BreakdownTree key={i} item={format} level={0} />
            ))}
          </div>
        </CollapsibleSection>
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
  const [expanded, setExpanded] = useState(true);
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
