import { useState, useEffect } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import Layout from '../components/Layout';
import AddNewLocation from '../components/AddNewLocation';
import AddNewGame from '../components/AddNewGame';
import AddNewBlinds from '../components/AddNewBlinds';
import { db } from '../db/schema';

interface NewSessionProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function NewSession({ onSave, onCancel }: NewSessionProps) {
  const locations = useLiveQuery(() => db.locations.toArray());
  const games = useLiveQuery(() => db.games.toArray());
  const blinds = useLiveQuery(() => db.blinds.toArray());

  const [buyIn, setBuyIn] = useState('');
  const [locationId, setLocationId] = useState<number | ''>('');
  const [gameId, setGameId] = useState<number | ''>('');
  const [blindsId, setBlindsId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');

  const [addingLocation, setAddingLocation] = useState(false);
  const [addingGame, setAddingGame] = useState(false);
  const [addingBlinds, setAddingBlinds] = useState(false);

  useEffect(() => {
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setStartDate(localDate);
    setStartTime(now.toTimeString().slice(0, 5));
  }, []);

  const handleSave = async () => {
    if (!buyIn || !locationId || !gameId || !startDate || !startTime) {
      alert('Please fill in all required fields');
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`).getTime();

    const sessionId = await db.sessions.add({
      start: startDateTime,
      end: startDateTime,
      buy_in: parseFloat(buyIn),
      cash_out: 0,
      game: gameId as number,
      game_format: 1,
      location: locationId as number,
      state: 1,
      filtered: 0
    });

    if (blindsId) {
      await db.cash.add({
        session_id: sessionId as number,
        blinds: blindsId as number
      });
    }

    onSave();
  };

  return (
    <Layout title="New Session">
      <div className="px-4 py-4">
        <div className="space-y-4">
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
                {blinds?.map(blind => {
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

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-teal text-white py-2 rounded font-semibold"
            >
              Start Session
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
    </Layout>
  );
}
