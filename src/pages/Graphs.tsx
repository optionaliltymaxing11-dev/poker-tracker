import { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import CollapsibleSection from '../components/CollapsibleSection';
import { useCompletedSessions, SessionWithDetails } from '../hooks/useSessions';
import {
  calculateProfit,
  calculateDuration,
  calculateHours,
  formatCurrency,
} from '../utils/calculations';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,

} from 'recharts';

// ---------- color helpers ----------
function getCSSColor(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
}
function usePrimaryColor() { return getCSSColor('--color-accent', '') || getCSSColor('--color-primary', '#00796B'); }
function useProfitColor() { return getCSSColor('--color-profit', '#2E7D32'); }
function useLossColor() { return getCSSColor('--color-loss', '#D32F2F'); }
function useTextColor() { return getCSSColor('--color-text', '#111827'); }
function useSecondaryColor() { return getCSSColor('--color-text-secondary', '#6b7280'); }
function useBorderColor() { return getCSSColor('--color-border', '#e5e7eb'); }
function useCardBgColor() { return getCSSColor('--color-card-bg', '#ffffff'); }

// ---------- 1. Session Heatmap Calendar ----------
function SessionHeatmap({ sessions }: { sessions: SessionWithDetails[] }) {
  const profitColor = useProfitColor();
  const lossColor = useLossColor();
  const borderColor = useBorderColor();

  const { cells, monthLabels, weeks } = useMemo(() => {
    // Build day->profit map
    const dayProfit = new Map<string, number>();
    sessions.forEach(s => {
      const d = new Date(s.start);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayProfit.set(key, (dayProfit.get(key) || 0) + calculateProfit(s));
    });

    // Last 6 months of days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setMonth(start.getMonth() - 6);
    // Align start to the most recent Sunday at or before
    start.setDate(start.getDate() - start.getDay());

    const cellSize = 14;
    const gap = 2;

    const allCells: { x: number; y: number; date: string; profit: number | null; dateObj: Date }[] = [];
    const current = new Date(start);
    let weekIdx = 0;

    while (current <= today) {
      const dow = current.getDay(); // 0=Sun
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const profit = dayProfit.has(key) ? dayProfit.get(key)! : null;
      allCells.push({
        x: weekIdx * (cellSize + gap),
        y: dow * (cellSize + gap),
        date: key,
        profit,
        dateObj: new Date(current),
      });

      if (dow === 6) weekIdx++;
      current.setDate(current.getDate() + 1);
    }

    const totalWeeks = weekIdx + 1;

    // month labels
    const labels: { label: string; x: number }[] = [];
    let lastMonth = -1;
    allCells.forEach(c => {
      const m = c.dateObj.getMonth();
      if (m !== lastMonth && c.dateObj.getDay() <= 3) {
        labels.push({
          label: c.dateObj.toLocaleString('en-US', { month: 'short' }),
          x: c.x,
        });
        lastMonth = m;
      }
    });

    return { cells: allCells, monthLabels: labels, weeks: totalWeeks };
  }, [sessions]);

  const cellSize = 14;
  const gap = 2;
  const leftPad = 30;
  const topPad = 20;
  const svgWidth = leftPad + weeks * (cellSize + gap) + 10;
  const svgHeight = topPad + 7 * (cellSize + gap) + 30; // extra room for legend

  function cellColor(profit: number | null): string {
    if (profit === null) return borderColor;
    if (profit === 0) return borderColor;
    if (profit > 0) {
      if (profit < 100) return '#a5d6a7';
      if (profit < 500) return '#66bb6a';
      if (profit < 1000) return '#43a047';
      return profitColor;
    }
    // loss
    const abs = Math.abs(profit);
    if (abs < 100) return '#ef9a9a';
    if (abs < 500) return '#ef5350';
    if (abs < 1000) return '#e53935';
    return lossColor;
  }

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div className="overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} className="block">
        {/* Month labels */}
        {monthLabels.map((ml, i) => (
          <text key={i} x={leftPad + ml.x} y={12} fontSize={10} fill="#6b7280">{ml.label}</text>
        ))}
        {/* Day labels */}
        {dayLabels.map((label, i) => (
          label ? <text key={i} x={0} y={topPad + i * (cellSize + gap) + 11} fontSize={10} fill="#6b7280">{label}</text> : null
        ))}
        {/* Cells */}
        {cells.map((c, i) => (
          <rect
            key={i}
            x={leftPad + c.x}
            y={topPad + c.y}
            width={cellSize}
            height={cellSize}
            rx={2}
            fill={cellColor(c.profit)}
          >
            <title>{`${c.date}: ${c.profit !== null ? (c.profit >= 0 ? '+' : '') + '$' + c.profit.toLocaleString() : 'No session'}`}</title>
          </rect>
        ))}
        {/* Legend */}
        {(() => {
          const ly = topPad + 7 * (cellSize + gap) + 6;
          const legendColors = ['#e5e7eb', '#ef9a9a', '#ef5350', lossColor, '#a5d6a7', '#66bb6a', profitColor];
          const legendLabels = ['None', '', 'Loss', '', '', '', 'Profit'];
          return (
            <>
              <text x={leftPad} y={ly + 10} fontSize={10} fill="#6b7280">Less</text>
              {legendColors.map((color, i) => (
                <rect key={i} x={leftPad + 30 + i * (cellSize + gap)} y={ly} width={cellSize} height={cellSize} rx={2} fill={color}>
                  {legendLabels[i] && <title>{legendLabels[i]}</title>}
                </rect>
              ))}
              <text x={leftPad + 30 + legendColors.length * (cellSize + gap) + 4} y={ly + 10} fontSize={10} fill="#6b7280">More</text>
            </>
          );
        })()}
      </svg>
    </div>
  );
}

// ---------- 2. Stake Progression / Rolling Hourly Rate ----------
const STAKE_COLORS = ['#00796B', '#1565C0', '#6A1B9A', '#E65100', '#2E7D32', '#C62828', '#00838F', '#4E342E'];

interface RollingData {
  session: number;
  overall: number;
  [key: string]: number;
}

function StakeProgression({ sessions }: { sessions: SessionWithDetails[] }) {
  const primaryColor = usePrimaryColor();
  const textColor = useTextColor();
  const secondaryColor = useSecondaryColor();
  const gridColor = useBorderColor();
  const [hiddenStakes, setHiddenStakes] = useState<Set<string>>(new Set());
  const [overallHidden, setOverallHidden] = useState(false);

  const { data, overallRate, stakeKeys } = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => a.start - b.start);

    // Overall hourly rate
    let totalProfit = 0;
    let totalHours = 0;
    sorted.forEach(s => {
      totalProfit += calculateProfit(s);
      totalHours += calculateHours(calculateDuration(s, s.breaks));
    });
    const overallRate = totalHours > 0 ? Math.round(totalProfit / totalHours) : 0;

    // Group by stake
    const stakeGroups = new Map<string, { profit: number; hours: number }[]>();
    sorted.forEach(s => {
      const key = s.blindsText || 'Unknown';
      if (!stakeGroups.has(key)) stakeGroups.set(key, []);
      stakeGroups.get(key)!.push({
        profit: calculateProfit(s),
        hours: calculateHours(calculateDuration(s, s.breaks)),
      });
    });

    // Only stakes with 10+ sessions
    const qualifiedStakes = [...stakeGroups.entries()].filter(([, arr]) => arr.length >= 10);
    const showPerStake = qualifiedStakes.length > 1;

    // Build rolling data for overall
    const windowSize = 20;
    const data: RollingData[] = [];

    // Per-stake session counters for rolling calc
    const stakeCounters = new Map<string, { profits: number[]; hours: number[] }>();
    if (showPerStake) {
      qualifiedStakes.forEach(([key]) => stakeCounters.set(key, { profits: [], hours: [] }));
    }

    sorted.forEach((s, idx) => {
      const profit = calculateProfit(s);
      const hours = calculateHours(calculateDuration(s, s.breaks));

      // Overall rolling
      const startIdx = Math.max(0, idx - windowSize + 1);
      let windowProfit = 0;
      let windowHours = 0;
      for (let i = startIdx; i <= idx; i++) {
        windowProfit += calculateProfit(sorted[i]);
        windowHours += calculateHours(calculateDuration(sorted[i], sorted[i].breaks));
      }
      const rollingRate = windowHours > 0 ? Math.round(windowProfit / windowHours) : 0;

      const point: RollingData = { session: idx + 1, overall: rollingRate };

      // Per-stake rolling
      if (showPerStake) {
        const stakeKey = s.blindsText || 'Unknown';
        if (stakeCounters.has(stakeKey)) {
          const counter = stakeCounters.get(stakeKey)!;
          counter.profits.push(profit);
          counter.hours.push(hours);

          const start = Math.max(0, counter.profits.length - windowSize);
          let sp = 0, sh = 0;
          for (let i = start; i < counter.profits.length; i++) {
            sp += counter.profits[i];
            sh += counter.hours[i];
          }
          point[stakeKey] = sh > 0 ? Math.round(sp / sh) : 0;
        }
      }

      data.push(point);
    });

    const stakeKeys = showPerStake ? qualifiedStakes.map(([key]) => key) : [];

    return { data, overallRate, stakeKeys };
  }, [sessions]);

  if (data.length === 0) return <p className="text-sm text-theme-secondary">Not enough data</p>;

  const toggleStake = (key: string) => {
    setHiddenStakes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div>
      {/* Stake toggles */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setOverallHidden(!overallHidden)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-opacity"
          style={{
            borderColor: primaryColor,
            backgroundColor: overallHidden ? 'transparent' : primaryColor,
            color: overallHidden ? primaryColor : '#fff',
            opacity: overallHidden ? 0.5 : 1,
          }}
        >
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: primaryColor }} />
          Overall
        </button>
        {stakeKeys.map((key, i) => {
          const color = STAKE_COLORS[i % STAKE_COLORS.length];
          const hidden = hiddenStakes.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleStake(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-opacity"
              style={{
                borderColor: color,
                backgroundColor: hidden ? 'transparent' : color,
                color: hidden ? color : '#fff',
                opacity: hidden ? 0.5 : 1,
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
              {key}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="session" tick={{ fill: textColor }} label={{ value: 'Session #', position: 'insideBottom', offset: -5, fill: secondaryColor }} />
          <YAxis tick={{ fill: textColor }} label={{ value: '$/hr', angle: -90, position: 'insideLeft', fill: secondaryColor }} />
          <Tooltip formatter={(value) => [`$${value}/hr`]} />
          {!overallHidden && (
            <ReferenceLine y={overallRate} stroke={secondaryColor} strokeDasharray="6 3" label={{ value: `Avg $${overallRate}/hr`, position: 'right', fontSize: 11 }} />
          )}
          {!overallHidden && (
            <Line type="monotone" dataKey="overall" stroke={primaryColor} strokeWidth={2} dot={false} name="Overall" />
          )}
          {stakeKeys.map((key, i) => {
            if (hiddenStakes.has(key)) return null;
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={STAKE_COLORS[i % STAKE_COLORS.length]}
                strokeWidth={1.5}
                dot={false}
                name={key}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- 3. Session Length vs Hourly Rate ----------
interface ScatterPoint {
  duration: number;
  hourlyRate: number;
  profit: number;
}

interface BucketData {
  bucket: string;
  avgRate: number;
  count: number;
}

function SessionLengthVsRate({ sessions }: { sessions: SessionWithDetails[] }) {
  const [view, setView] = useState<'scatter' | 'bar'>('scatter');
  const [selectedStake, setSelectedStake] = useState<string>('all');
  const profitColor = useProfitColor();
  const lossColor = useLossColor();
  const primaryColor = usePrimaryColor();
  const textColor = useTextColor();
  const secondaryColor = useSecondaryColor();
  const gridColor = useBorderColor();
  const cardBg = useCardBgColor();

  const stakeOptions = useMemo(() => {
    const stakes = new Set<string>();
    sessions.forEach(s => { if (s.blindsText) stakes.add(s.blindsText); });
    return [...stakes].sort();
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (selectedStake === 'all') return sessions;
    return sessions.filter(s => s.blindsText === selectedStake);
  }, [sessions, selectedStake]);

  const scatterData = useMemo<ScatterPoint[]>(() => {
    return filteredSessions.map(s => {
      const profit = calculateProfit(s);
      const hours = calculateHours(calculateDuration(s, s.breaks));
      return {
        duration: Math.round(hours * 100) / 100,
        hourlyRate: hours > 0 ? Math.round(profit / hours) : 0,
        profit,
      };
    });
  }, [filteredSessions]);

  const bucketData = useMemo<BucketData[]>(() => {
    const buckets: [string, number, number][] = [
      ['0-4h', 0, 4],
      ['4-8h', 4, 8],
      ['8-12h', 8, 12],
      ['12-16h', 12, 16],
      ['16h+', 16, Infinity],
    ];

    return buckets.map(([label, min, max]) => {
      const matching = scatterData.filter(d => d.duration >= min && d.duration < max);
      const totalProfit = matching.reduce((s, d) => s + d.profit, 0);
      const totalHours = matching.reduce((s, d) => s + d.duration, 0);
      return {
        bucket: label,
        avgRate: totalHours > 0 ? Math.round(totalProfit / totalHours) : 0,
        count: matching.length,
      };
    }).filter(b => b.count > 0);
  }, [scatterData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0].payload as ScatterPoint;
    return (
      <div className="bg-card p-2 border border-theme rounded shadow text-xs text-theme">
        <p>Duration: {data.duration.toFixed(1)}h</p>
        <p>Hourly Rate: ${data.hourlyRate}/hr</p>
        <p>Profit: {formatCurrency(data.profit)}</p>
      </div>
    );
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setView('scatter')}
          className={`px-3 py-1 text-xs rounded ${view === 'scatter' ? 'bg-teal text-white' : 'bg-hover text-theme-secondary border border-theme'}`}
        >
          Scatter
        </button>
        <button
          onClick={() => setView('bar')}
          className={`px-3 py-1 text-xs rounded ${view === 'bar' ? 'bg-teal text-white' : 'bg-hover text-theme-secondary border border-theme'}`}
        >
          By Duration Bucket
        </button>
      </div>

      {/* Stake filter */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          onClick={() => setSelectedStake('all')}
          className={`px-2.5 py-1 text-xs rounded-full font-medium ${selectedStake === 'all' ? 'bg-teal text-white' : 'bg-hover text-theme-secondary border border-theme'}`}
        >
          All Stakes ({sessions.length})
        </button>
        {stakeOptions.map(stake => (
          <button
            key={stake}
            onClick={() => setSelectedStake(stake)}
            className={`px-2.5 py-1 text-xs rounded-full font-medium ${selectedStake === stake ? 'bg-teal text-white' : 'bg-hover text-theme-secondary border border-theme'}`}
          >
            {stake} ({sessions.filter(s => s.blindsText === stake).length})
          </button>
        ))}
      </div>

      {view === 'scatter' ? (
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis tick={{ fill: textColor }} type="number" dataKey="duration" name="Duration" unit="h" label={{ value: 'Duration (hours)', position: 'insideBottom', offset: -5, fill: secondaryColor }} />
            <YAxis tick={{ fill: textColor }} type="number" dataKey="hourlyRate" name="Rate" unit="$/hr" label={{ value: '$/hr', angle: -90, position: 'insideLeft', fill: secondaryColor }} />
            <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: gridColor, color: textColor }} content={<CustomScatterTooltip />} />
            <ReferenceLine y={0} stroke={secondaryColor} strokeDasharray="3 3" />
            <Scatter data={scatterData} fill={primaryColor}>
              {scatterData.map((entry, i) => (
                <Cell key={i} fill={entry.profit >= 0 ? profitColor : lossColor} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={bucketData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis tick={{ fill: textColor }} dataKey="bucket" />
            <YAxis tick={{ fill: textColor }} label={{ value: 'Avg $/hr', angle: -90, position: 'insideLeft', fill: secondaryColor }} />
            <Tooltip formatter={(value, _name, props) => {
              const d = (props as { payload: BucketData }).payload;
              return [`$${value}/hr (${d.count} sessions)`, 'Avg Rate'];
            }} />
            <ReferenceLine y={0} stroke={secondaryColor} strokeDasharray="3 3" />
            <Bar dataKey="avgRate" fill={primaryColor}>
              {bucketData.map((entry, i) => (
                <Cell key={i} fill={entry.avgRate >= 0 ? profitColor : lossColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ---------- 4. Downswing/Upswing Tracker ----------
interface SwingStats {
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';
  biggestDownswing: number;
  biggestUpswing: number;
  currentDrawdown: number;
  downswingStart: number;
  downswingEnd: number;
  cumulativeData: { session: number; profit: number; peak: number; date: string }[];
  downswingAreas: { x1: number; x2: number }[];
}

function useSwingStats(sessions: SessionWithDetails[]): SwingStats {
  return useMemo(() => {
    const sorted = [...sessions].sort((a, b) => a.start - b.start);

    // Current streak
    let currentStreak = 0;
    let streakType: 'win' | 'loss' | 'none' = 'none';
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = calculateProfit(sorted[i]);
      const isWin = p >= 0;
      if (i === sorted.length - 1) {
        streakType = isWin ? 'win' : 'loss';
        currentStreak = 1;
      } else if ((streakType === 'win' && isWin) || (streakType === 'loss' && !isWin)) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Cumulative profit, peak, trough tracking
    let cumProfit = 0;
    let peak = 0;
    let peakIdx = 0;
    let biggestDownswing = 0;
    let biggestUpswing = 0;
    let dsStart = 0;
    let dsEnd = 0;
    let trough = 0;

    const cumulativeData: { session: number; profit: number; peak: number; date: string }[] = [];

    sorted.forEach((s, idx) => {
      cumProfit += calculateProfit(s);
      const sessionNum = idx + 1;
      const dateStr = new Date(s.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (cumProfit > peak) {
        // Check upswing from trough to here
        const upswing = cumProfit - trough;
        if (upswing > biggestUpswing) biggestUpswing = upswing;

        peak = cumProfit;
        peakIdx = sessionNum;
        trough = cumProfit; // reset trough after new peak
      }

      const drawdown = peak - cumProfit;
      if (drawdown > biggestDownswing) {
        biggestDownswing = drawdown;
        dsStart = peakIdx;
        dsEnd = sessionNum;
      }

      if (cumProfit < trough) {
        trough = cumProfit;
      }

      cumulativeData.push({
        session: sessionNum,
        profit: Math.round(cumProfit),
        peak: Math.round(peak),
        date: dateStr,
      });
    });

    const currentDrawdown = Math.round(peak - cumProfit);

    // Build downswing highlight areas: find contiguous regions where profit < peak
    const downswingAreas: { x1: number; x2: number }[] = [];
    if (dsStart > 0 && dsEnd > dsStart) {
      downswingAreas.push({ x1: dsStart, x2: dsEnd });
    }

    return {
      currentStreak,
      streakType: sorted.length === 0 ? 'none' : streakType,
      biggestDownswing: Math.round(biggestDownswing),
      biggestUpswing: Math.round(biggestUpswing),
      currentDrawdown,
      downswingStart: dsStart,
      downswingEnd: dsEnd,
      cumulativeData,
      downswingAreas,
    };
  }, [sessions]);
}

function DownswingTracker({ sessions }: { sessions: SessionWithDetails[] }) {
  const stats = useSwingStats(sessions);
  const primaryColor = usePrimaryColor();
  const lossColor = useLossColor();
  const textColor = useTextColor();
  const secondaryColor = useSecondaryColor();
  const gridColor = useBorderColor();
  const cardBg = useCardBgColor();

  if (sessions.length === 0) return <p className="text-sm text-theme-secondary">No sessions</p>;

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-hover rounded-lg p-3 text-center">
          <div className="text-xs text-theme-secondary mb-1">Current Streak</div>
          <div className={`text-lg font-bold ${stats.streakType === 'win' ? 'text-profit' : stats.streakType === 'loss' ? 'text-loss' : 'text-theme-secondary'}`}>
            {stats.currentStreak} {stats.streakType === 'win' ? 'W' : stats.streakType === 'loss' ? 'L' : '—'}
          </div>
        </div>
        <div className="bg-hover rounded-lg p-3 text-center">
          <div className="text-xs text-theme-secondary mb-1">Current Drawdown</div>
          <div className={`text-lg font-bold ${stats.currentDrawdown > 0 ? 'text-loss' : 'text-profit'}`}>
            {stats.currentDrawdown > 0 ? `-$${stats.currentDrawdown.toLocaleString()}` : 'At Peak ✓'}
          </div>
        </div>
        <div className="bg-hover rounded-lg p-3 text-center">
          <div className="text-xs text-theme-secondary mb-1">Biggest Downswing</div>
          <div className="text-lg font-bold text-loss">-${stats.biggestDownswing.toLocaleString()}</div>
        </div>
        <div className="bg-hover rounded-lg p-3 text-center">
          <div className="text-xs text-theme-secondary mb-1">Biggest Upswing</div>
          <div className="text-lg font-bold text-profit">+${stats.biggestUpswing.toLocaleString()}</div>
        </div>
      </div>

      {/* Chart with downswing highlight */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={stats.cumulativeData}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="session" tick={{ fill: textColor }} label={{ value: 'Session #', position: 'insideBottom', offset: -5, fill: secondaryColor }} />
          <YAxis tick={{ fill: textColor }} label={{ value: 'Profit ($)', angle: -90, position: 'insideLeft', fill: secondaryColor }} />
          <Tooltip
            contentStyle={{ backgroundColor: cardBg, borderColor: gridColor, color: textColor }}
            formatter={(value, name) => {
              const v = Number(value);
              if (name === 'Peak') return [`$${v.toLocaleString()}`, 'Peak'];
              return [`$${v.toLocaleString()}`, 'Cumulative Profit'];
            }}
            labelFormatter={(label) => `Session ${label}`}
          />
          {stats.downswingAreas.map((area, i) => (
            <ReferenceArea key={i} x1={area.x1} x2={area.x2} fill={lossColor} fillOpacity={0.1} />
          ))}
          <ReferenceLine y={0} stroke={secondaryColor} strokeDasharray="3 3" />
          <Line type="monotone" dataKey="peak" stroke={secondaryColor} strokeWidth={1} strokeDasharray="4 2" dot={false} name="Peak" />
          <Line type="monotone" dataKey="profit" stroke={primaryColor} strokeWidth={2} dot={false} name="Profit" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- 5. Location Comparison ----------
interface LocationData {
  location: string;
  hourlyRate: number;
  totalHours: number;
  sessions: number;
}

function LocationComparison({ sessions }: { sessions: SessionWithDetails[] }) {
  const profitColor = useProfitColor();
  const lossColor = useLossColor();
  const textColor = useTextColor();
  const secondaryColor = useSecondaryColor();
  const gridColor = useBorderColor();
  const cardBg = useCardBgColor();

  const data = useMemo<LocationData[]>(() => {
    const locMap = new Map<string, { profit: number; hours: number; count: number }>();

    sessions.forEach(s => {
      const name = s.locationName || 'Unknown';
      const profit = calculateProfit(s);
      const hours = calculateHours(calculateDuration(s, s.breaks));
      const existing = locMap.get(name) || { profit: 0, hours: 0, count: 0 };
      existing.profit += profit;
      existing.hours += hours;
      existing.count += 1;
      locMap.set(name, existing);
    });

    return [...locMap.entries()]
      .filter(([, v]) => v.count >= 5)
      .map(([location, v]) => ({
        location,
        hourlyRate: v.hours > 0 ? Math.round(v.profit / v.hours) : 0,
        totalHours: Math.round(v.hours),
        sessions: v.count,
      }))
      .sort((a, b) => b.hourlyRate - a.hourlyRate);
  }, [sessions]);

  if (data.length === 0) return <p className="text-sm text-theme-secondary">Need 5+ sessions at a location to show comparison</p>;

  const barHeight = Math.max(250, data.length * 50);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomLocationTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload as LocationData;
    return (
      <div className="bg-card p-2 border border-theme rounded shadow text-xs text-theme">
        <p className="font-bold">{d.location}</p>
        <p>${d.hourlyRate}/hr</p>
        <p>{d.totalHours}h played • {d.sessions} sessions</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={barHeight}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis tick={{ fill: textColor }} type="number" label={{ value: '$/hr', position: 'insideBottom', offset: -5, fill: secondaryColor }} />
        <YAxis type="category" dataKey="location" width={120} tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: gridColor, color: textColor }} content={<CustomLocationTooltip />} />
        <ReferenceLine x={0} stroke={secondaryColor} strokeDasharray="3 3" />
        <Bar dataKey="hourlyRate" name="Hourly Rate">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.hourlyRate >= 0 ? profitColor : lossColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------- Main Graphs Page ----------
export default function Graphs() {
  const sessions = useCompletedSessions();

  const cumulativeData = useMemo(() => {
    if (!sessions) return [];

    const sorted = [...sessions].sort((a, b) => a.start - b.start);
    let cumulativeProfit = 0;
    let cumulativeHours = 0;

    return sorted.map(session => {
      const profit = calculateProfit(session);
      const duration = calculateDuration(session, session.breaks);
      const hours = calculateHours(duration);

      cumulativeProfit += profit;
      cumulativeHours += hours;

      return {
        hours: Math.round(cumulativeHours),
        profit: Math.round(cumulativeProfit)
      };
    });
  }, [sessions]);

  const formatTooltipValue = (value: unknown) => [`$${value}`, 'Profit'];

  const primaryColor = usePrimaryColor();
  const textColor = useTextColor();
  const secondaryColor = useSecondaryColor();
  const gridColor = useBorderColor();
  const cardBg = useCardBgColor();

  return (
    <Layout title="Graphs">
      <CollapsibleSection title="Profit Over Time" defaultOpen>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis tick={{ fill: textColor }}
              dataKey="hours"
              label={{ value: 'Hours Played', position: 'insideBottom', offset: -5, fill: secondaryColor }}
            />
            <YAxis tick={{ fill: textColor }}
              label={{ value: 'Profit ($)', angle: -90, position: 'insideLeft', fill: secondaryColor }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: cardBg, borderColor: gridColor, color: textColor }}
              formatter={formatTooltipValue}
              labelFormatter={(label) => `${label} hours`}
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke={primaryColor}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CollapsibleSection>

      {sessions && sessions.length > 0 && (
        <>
          <CollapsibleSection title="Session Heatmap">
            <SessionHeatmap sessions={sessions} />
          </CollapsibleSection>

          <CollapsibleSection title="Rolling Hourly Rate by Stake">
            <StakeProgression sessions={sessions} />
          </CollapsibleSection>

          <CollapsibleSection title="Session Length vs Hourly Rate">
            <SessionLengthVsRate sessions={sessions} />
          </CollapsibleSection>

          <CollapsibleSection title="Downswing / Upswing Tracker">
            <DownswingTracker sessions={sessions} />
          </CollapsibleSection>

          <CollapsibleSection title="Location Comparison">
            <LocationComparison sessions={sessions} />
          </CollapsibleSection>
        </>
      )}

      {sessions && sessions.length > 0 && (
        <div className="px-4 py-3 text-sm text-theme-secondary">
          <p>Total sessions analyzed: {sessions.length}</p>
        </div>
      )}
    </Layout>
  );
}
