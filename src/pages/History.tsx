import { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import EditSession from '../components/EditSession';
import { useCompletedSessions, SessionWithDetails } from '../hooks/useSessions';
import { useStats } from '../hooks/useStats';
import {
  formatCurrency,
  formatDate,
  formatDuration,
  calculateProfit,
  calculateDuration
} from '../utils/calculations';

type Period = 'weekly' | 'monthly' | 'yearly' | 'all';

export default function History() {
  const allSessions = useCompletedSessions();
  const [period, setPeriod] = useState<Period>('all');
  const [offset, setOffset] = useState(0);
  const [editingSession, setEditingSession] = useState<SessionWithDetails | null>(null);

  const { filteredSessions, periodLabel } = useMemo(() => {
    if (!allSessions || period === 'all') {
      return { filteredSessions: allSessions || [], periodLabel: 'All Time' };
    }

    const now = new Date();
    let start: Date;
    let end: Date;
    let label: string;

    if (period === 'weekly') {
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      start = new Date(now.getTime() - (offset + 1) * weekMs);
      end = new Date(now.getTime() - offset * weekMs);
      label = `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (period === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
      label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      start = new Date(now.getFullYear() - offset, 0, 1);
      end = new Date(now.getFullYear() - offset + 1, 0, 1);
      label = `${start.getFullYear()}`;
    }

    const filtered = allSessions.filter(
      s => s.start >= start.getTime() && s.start < end.getTime()
    );

    return { filteredSessions: filtered, periodLabel: label };
  }, [allSessions, period, offset]);

  const stats = useStats(filteredSessions);

  const handlePrevious = () => setOffset(offset + 1);
  const handleNext = () => {
    if (offset > 0) setOffset(offset - 1);
  };

  const profitColor = stats.totalProfit >= 0 ? 'text-profit' : 'text-loss';
  const hourlyColor = stats.hourlyRate >= 0 ? 'text-profit' : 'text-loss';

  return (
    <Layout title="History">
      <div className="px-4 py-3 bg-hover border-b border-theme">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <StatCard
            label="Profit"
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

        <div className="flex gap-2 mb-3">
          {(['weekly', 'monthly', 'yearly', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setOffset(0); }}
              className={`px-3 py-1 rounded ${
                period === p ? 'bg-teal text-white' : 'bg-card border border-theme text-theme'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {period !== 'all' && (
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrevious}
              className="flex-1 py-3 bg-card border border-theme rounded-lg text-center text-lg font-semibold text-theme active:bg-hover"
            >
              ◀
            </button>
            <span className="font-semibold text-center min-w-[140px] text-theme">{periodLabel}</span>
            <button
              onClick={handleNext}
              disabled={offset === 0}
              className={`flex-1 py-3 rounded-lg text-center text-lg font-semibold ${
                offset === 0
                  ? 'bg-hover text-theme-secondary'
                  : 'bg-card border border-theme text-theme active:bg-hover'
              }`}
            >
              ▶
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-2">
        {filteredSessions.length === 0 ? (
          <div className="text-center text-theme-secondary py-8">
            No sessions for this period
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSessions.map(session => {
              const profit = calculateProfit(session);
              const duration = calculateDuration(session, session.breaks);
              const profitColor = profit >= 0 ? 'text-profit' : 'text-loss';

              return (
                <div
                  key={session.session_id}
                  className="border border-theme rounded p-3 cursor-pointer bg-card active:bg-hover"
                  onClick={() => setEditingSession(session)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-theme">{session.locationName}</div>
                      <div className="text-sm text-theme-secondary">
                        {session.blindsText} {session.gameName}
                      </div>
                    </div>
                    <div className={`font-semibold text-lg ${profitColor}`}>
                      {formatCurrency(profit)}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-theme-secondary">
                    <span>{formatDate(session.start)}</span>
                    <div className="text-right">
                      <span>{formatDuration(duration)}</span>
                      {duration > 0 && (
                        <span className={`ml-2 ${profit / (duration / 3600000) >= 0 ? 'text-profit' : 'text-loss'}`}>
                          ({formatCurrency(profit / (duration / 3600000))}/hr)
                        </span>
                      )}
                    </div>
                  </div>
                  {session.note && (
                    <div className="mt-2 text-sm italic text-theme-secondary border-t border-theme pt-2">
                      {session.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingSession && (
        <EditSession
          session={editingSession}
          onComplete={() => setEditingSession(null)}
          onCancel={() => setEditingSession(null)}
        />
      )}
    </Layout>
  );
}
