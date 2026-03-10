import { useState } from 'react';
import { db, Session } from '../db/schema';
import { formatCurrency } from '../utils/calculations';

interface EndSessionProps {
  session: Session;
  onComplete: () => void;
  onCancel: () => void;
}

export default function EndSession({ session, onComplete, onCancel }: EndSessionProps) {
  const [cashOut, setCashOut] = useState('');

  const handleEnd = async () => {
    if (!cashOut) {
      alert('Please enter cash out amount');
      return;
    }

    const cashOutAmount = parseFloat(cashOut);
    const now = Date.now();

    await db.sessions.update(session.session_id!, {
      end: now,
      cash_out: cashOutAmount,
      state: 0
    });

    onComplete();
  };

  const profit = cashOut ? parseFloat(cashOut) - session.buy_in : 0;
  const profitColor = profit >= 0 ? 'text-profit' : 'text-loss';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 max-w-sm w-full mx-4">
        <h2 className="text-xl font-semibold mb-4 text-theme">End Session</h2>

        <div className="mb-4">
          <div className="text-sm text-theme-secondary mb-1">Buy In</div>
          <div className="font-semibold text-theme">{formatCurrency(session.buy_in)}</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-theme">Cash Out *</label>
          <input
            type="number"
            value={cashOut}
            onChange={(e) => setCashOut(e.target.value)}
            className="w-full px-3 py-2 border border-theme rounded bg-input text-theme"
            placeholder="0.00"
            step="0.01"
            autoFocus
          />
        </div>

        {cashOut && (
          <div className="mb-4 p-3 bg-hover rounded">
            <div className="text-sm text-theme-secondary mb-1">Profit/Loss</div>
            <div className={`text-2xl font-bold ${profitColor}`}>
              {formatCurrency(profit)}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleEnd}
            className="flex-1 bg-teal text-white py-2 rounded font-semibold"
          >
            End Session
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-hover text-theme py-2 rounded font-semibold border border-theme"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
