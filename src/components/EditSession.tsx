import { useState, useEffect } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../db/schema';
import { SessionWithDetails } from '../hooks/useSessions';
import { formatCurrency } from '../utils/calculations';
import AddNewLocation from './AddNewLocation';
import AddNewGame from './AddNewGame';
import AddNewBlinds from './AddNewBlinds';

interface EditSessionProps {
  session: SessionWithDetails;
  onComplete: () => void;
  onCancel: () => void;
}

function toLocalDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toLocalTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function EditSession({ session, onComplete, onCancel }: EditSessionProps) {
  const locations = useLiveQuery(() => db.locations.toArray());
  const games = useLiveQuery(() => db.games.toArray());
  const blindsList = useLiveQuery(() => db.blinds.toArray());

  const [buyIn, setBuyIn] = useState(String(session.buy_in));
  const [cashOut, setCashOut] = useState(String(session.cash_out));
  const [locationId, setLocationId] = useState<number>(session.location);
  const [gameId, setGameId] = useState<number>(session.game);
  const [blindsId, setBlindsId] = useState<number | ''>(session.blindsId ?? '');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [note, setNote] = useState(session.note || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addingLocation, setAddingLocation] = useState(false);
  const [addingGame, setAddingGame] = useState(false);
  const [addingBlinds, setAddingBlinds] = useState(false);

  useEffect(() => {
    setStartDate(toLocalDate(session.start));
    setStartTime(toLocalTime(session.start));
    setEndDate(toLocalDate(session.end));
    setEndTime(toLocalTime(session.end));
  }, [session]);

  const handleSave = async () => {
    if (!buyIn || !locationId || !gameId || !startDate || !startTime || !endDate || !endTime) {
      alert('Please fill in all required fields');
      return;
    }

    const startTs = new Date(`${startDate}T${startTime}`).getTime();
    const endTs = new Date(`${endDate}T${endTime}`).getTime();

    if (endTs < startTs) {
      alert('End time must be after start time');
      return;
    }

    await db.sessions.update(session.session_id!, {
      buy_in: parseFloat(buyIn),
      cash_out: parseFloat(cashOut),
      location: locationId,
      game: gameId,
      start: startTs,
      end: endTs,
    });

    const existingCash = await db.cash.get(session.session_id!);
    if (blindsId) {
      if (existingCash) {
        await db.cash.update(session.session_id!, { blinds: blindsId as number });
      } else {
        await db.cash.add({ session_id: session.session_id!, blinds: blindsId as number });
      }
    } else if (existingCash) {
      await db.cash.delete(session.session_id!);
    }

    const existingNote = await db.notes.where('session_id').equals(session.session_id!).first();
    if (note.trim()) {
      if (existingNote) {
        await db.notes.update(existingNote.note_id!, { note: note.trim() });
      } else {
        await db.notes.add({ session_id: session.session_id!, note: note.trim() });
      }
    } else if (existingNote) {
      await db.notes.delete(existingNote.note_id!);
    }

    onComplete();
  };

  const handleDelete = async () => {
    const sid = session.session_id!;
    await db.sessions.delete(sid);
    await db.cash.delete(sid);
    await db.breaks.where('session_id').equals(sid).delete();
    await db.notes.where('session_id').equals(sid).delete();
    onComplete();
  };

  const profit = (cashOut ? parseFloat(cashOut) : 0) - (buyIn ? parseFloat(buyIn) : 0);
  const profitColor = profit >= 0 ? 'text-profit' : 'text-loss';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto">
      <div className="bg-card rounded-lg p-6 max-w-sm w-full mx-4 my-8">
        <h2 className="text-xl font-semibold mb-4 text-theme">Edit Session</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-theme">Buy In *</label>
            <input
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(e.target.value)}
              className="w-full px-3 py-2 border border-theme rounded bg-input text-theme"
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-theme">Cash Out *</label>
            <input
              type="number"
              value={cashOut}
              onChange={(e) => setCashOut(e.target.value)}
              className="w-full px-3 py-2 border border-theme rounded bg-input text-theme"
              placeholder="0.00"
              step="0.01"
            />
          </div>

          {buyIn && cashOut && (
            <div className="p-2 bg-hover rounded text-center">
              <span className="text-sm text-theme-secondary">Profit: </span>
              <span className={`font-bold ${profitColor}`}>{formatCurrency(profit)}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-theme">Location *</label>
            {!addingLocation ? (
              <select
                value={locationId}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setAddingLocation(true);
                  } else {
                    setLocationId(Number(e.target.value));
                  }
                }}
                className="w-full px-3 py-2 border border-theme rounded bg-input text-theme"
              >
                <option value="">Select location</option>
                {locations?.map(loc => (
                  <option key={loc.location_id} value={loc.location_id}>
                    {loc.location}
                  </option>
                ))}
                <option value="__new__">+ Add new location...</option>
              </select>
            ) : (
              <AddNewLocation
                onAdded={(id) => { setLocationId(id); setAddingLocation(false); }}
                onCancel={() => setAddingLocation(false)}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-theme">Game *</label>
            {!addingGame ? (
              <select
                value={gameId}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setAddingGame(true);
                  } else {
                    setGameId(Number(e.target.value));
                  }
                }}
                className="w-full px-3 py-2 border border-theme rounded bg-input text-theme"
              >
                <option value="">Select game</option>
                {games?.map(game => (
                  <option key={game.game_id} value={game.game_id}>
                    {game.game}
                  </option>
                ))}
                <option value="__new__">+ Add new game...</option>
              </select>
            ) : (
              <AddNewGame
                onAdded={(id) => { setGameId(id); setAddingGame(false); }}
                onCancel={() => setAddingGame(false)}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-theme">Blinds</label>
            {!addingBlinds ? (
              <select
                value={blindsId}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setAddingBlinds(true);
                  } else {
                    setBlindsId(e.target.value ? Number(e.target.value) : '');
                  }
                }}
                className="w-full px-3 py-2 border border-theme rounded bg-input text-theme"
              >
                <option value="">Select blinds</option>
                {blindsList?.map(blind => {
                  const label = blind.straddle > 0
                    ? `$${blind.sb}/$${blind.bb}/$${blind.straddle}`
                    : `$${blind.sb}/$${blind.bb}`;
                  return (
                    <option key={blind.blind_id} value={blind.blind_id}>
                      {label}
                    </option>
                  );
                })}
                <option value="__new__">+ Add new blinds...</option>
              </select>
            ) : (
              <AddNewBlinds
                onAdded={(id) => { setBlindsId(id); setAddingBlinds(false); }}
                onCancel={() => setAddingBlinds(false)}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-theme">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-theme rounded bg-input text-theme"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-theme">Start Time *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-theme rounded bg-input text-theme"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-theme">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-theme rounded bg-input text-theme"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-theme">End Time *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-theme rounded bg-input text-theme"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-theme">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-theme rounded bg-input text-theme"
              rows={3}
              placeholder="Session notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-teal text-white py-2 rounded font-semibold"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-hover text-theme py-2 rounded font-semibold border border-theme"
            >
              Cancel
            </button>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 text-loss font-semibold border border-loss rounded"
            >
              Delete Session
            </button>
          ) : (
            <div className="border border-loss rounded p-3">
              <p className="text-sm text-theme-secondary mb-2">Are you sure? This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-loss text-white py-2 rounded font-semibold"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-hover text-theme py-2 rounded font-semibold border border-theme"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
