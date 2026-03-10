import { useState } from 'react';
import { db } from '../db/schema';

interface Props {
  onAdded: (id: number) => void;
  onCancel: () => void;
}

export default function AddNewGame({ onAdded, onCancel }: Props) {
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    const id = await db.games.add({ game: name.trim(), filtered: 0 });
    // Add to filters
    const filters = await db.filters.toCollection().first();
    if (filters?.id) {
      await db.filters.update(filters.id, {
        games: [...filters.games, id as number]
      });
    }
    onAdded(id as number);
  };

  return (
    <div className="flex gap-2 mt-1">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Game name"
        className="flex-1 px-3 py-2 border border-theme rounded bg-input text-theme text-sm"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <button onClick={handleAdd} className="px-3 py-2 bg-teal text-white rounded text-sm font-semibold">Add</button>
      <button onClick={onCancel} className="px-3 py-2 bg-hover text-theme rounded text-sm border border-theme">Cancel</button>
    </div>
  );
}
