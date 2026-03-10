import { useState } from 'react';
import { db } from '../db/schema';

interface Props {
  onAdded: (id: number) => void;
  onCancel: () => void;
}

export default function AddNewLocation({ onAdded, onCancel }: Props) {
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    const id = await db.locations.add({ location: name.trim(), filtered: 0 });
    // Also add to filters so new location is visible
    const filters = await db.filters.toCollection().first();
    if (filters?.id) {
      await db.filters.update(filters.id, {
        locations: [...filters.locations, id as number]
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
        placeholder="Location name"
        className="flex-1 px-3 py-2 border border-theme rounded bg-input text-theme text-sm"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <button onClick={handleAdd} className="px-3 py-2 bg-teal text-white rounded text-sm font-semibold">Add</button>
      <button onClick={onCancel} className="px-3 py-2 bg-hover text-theme rounded text-sm border border-theme">Cancel</button>
    </div>
  );
}
