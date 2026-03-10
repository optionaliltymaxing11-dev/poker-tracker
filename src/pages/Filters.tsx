import { useState, useEffect } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import Layout from '../components/Layout';
import Section from '../components/Section';
import { db } from '../db/schema';

export default function Filters() {
  const locations = useLiveQuery(() => db.locations.toArray());
  const games = useLiveQuery(() => db.games.toArray());
  const blinds = useLiveQuery(() => db.blinds.toArray());
  const currentFilters = useLiveQuery(() => db.filters.toCollection().first());

  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [selectedGames, setSelectedGames] = useState<number[]>([]);
  const [selectedBlinds, setSelectedBlinds] = useState<number[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentFilters) {
      setSelectedLocations(currentFilters.locations);
      setSelectedGames(currentFilters.games);
      setSelectedBlinds(currentFilters.blinds);
      setDirty(false);
    }
  }, [currentFilters]);

  const handleToggle = (
    id: number,
    selected: number[],
    setSelected: (ids: number[]) => void
  ) => {
    setDirty(true);
    setSaved(false);
    if (selected.includes(id)) {
      setSelected(selected.filter(x => x !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const handleSave = async () => {
    const filterData = {
      locations: selectedLocations,
      games: selectedGames,
      game_formats: currentFilters?.game_formats || [],
      blinds: selectedBlinds
    };

    if (currentFilters?.id) {
      await db.filters.update(currentFilters.id, filterData);
    } else {
      await db.filters.add(filterData);
    }
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSelectAll = (
    items: { id: number }[],
    setSelected: (ids: number[]) => void
  ) => {
    setDirty(true);
    setSaved(false);
    setSelected(items.map(i => i.id));
  };

  const handleDeselectAll = (
    setSelected: (ids: number[]) => void
  ) => {
    setDirty(true);
    setSaved(false);
    setSelected([]);
  };

  return (
    <Layout title="Filters">
      <Section title="Locations">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => handleSelectAll(
              (locations || []).map(l => ({ id: l.location_id! })),
              setSelectedLocations
            )}
            className="text-xs px-2 py-1 bg-hover rounded border border-theme text-theme"
          >
            All
          </button>
          <button
            onClick={() => handleDeselectAll(setSelectedLocations)}
            className="text-xs px-2 py-1 bg-hover rounded border border-theme text-theme"
          >
            None
          </button>
        </div>
        <div className="space-y-2">
          {locations?.map(loc => (
            <label key={loc.location_id} className="flex items-center py-1">
              <input
                type="checkbox"
                checked={selectedLocations.includes(loc.location_id!)}
                onChange={() =>
                  handleToggle(loc.location_id!, selectedLocations, setSelectedLocations)
                }
                className="mr-3 w-5 h-5 accent-teal"
              />
              <span className="text-base text-theme">{loc.location}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Games">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => handleSelectAll(
              (games || []).map(g => ({ id: g.game_id! })),
              setSelectedGames
            )}
            className="text-xs px-2 py-1 bg-hover rounded border border-theme text-theme"
          >
            All
          </button>
          <button
            onClick={() => handleDeselectAll(setSelectedGames)}
            className="text-xs px-2 py-1 bg-hover rounded border border-theme text-theme"
          >
            None
          </button>
        </div>
        <div className="space-y-2">
          {games?.map(game => (
            <label key={game.game_id} className="flex items-center py-1">
              <input
                type="checkbox"
                checked={selectedGames.includes(game.game_id!)}
                onChange={() =>
                  handleToggle(game.game_id!, selectedGames, setSelectedGames)
                }
                className="mr-3 w-5 h-5 accent-teal"
              />
              <span className="text-base text-theme">{game.game}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Blinds">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => handleSelectAll(
              (blinds || []).map(b => ({ id: b.blind_id! })),
              setSelectedBlinds
            )}
            className="text-xs px-2 py-1 bg-hover rounded border border-theme text-theme"
          >
            All
          </button>
          <button
            onClick={() => handleDeselectAll(setSelectedBlinds)}
            className="text-xs px-2 py-1 bg-hover rounded border border-theme text-theme"
          >
            None
          </button>
        </div>
        <div className="space-y-2">
          {blinds?.map(blind => {
            const label =
              blind.straddle > 0
                ? `$${blind.sb}/$${blind.bb}/$${blind.straddle}`
                : `$${blind.sb}/$${blind.bb}`;
            return (
              <label key={blind.blind_id} className="flex items-center py-1">
                <input
                  type="checkbox"
                  checked={selectedBlinds.includes(blind.blind_id!)}
                  onChange={() =>
                    handleToggle(blind.blind_id!, selectedBlinds, setSelectedBlinds)
                  }
                  className="mr-3 w-5 h-5 accent-teal"
                />
                <span className="text-base text-theme">{label}</span>
              </label>
            );
          })}
        </div>
      </Section>

      <div className="px-4 pt-4 pb-6">
        <button
          onClick={handleSave}
          className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
            saved
              ? 'bg-profit text-white'
              : dirty
              ? 'bg-teal text-white animate-pulse'
              : 'bg-teal text-white'
          }`}
        >
          {saved ? '✓ Filters Applied!' : 'Apply Filters'}
        </button>
      </div>
    </Layout>
  );
}
