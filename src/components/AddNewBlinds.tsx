import { useState } from 'react';
import { db } from '../db/schema';

interface Props {
  onAdded: (id: number) => void;
  onCancel: () => void;
}

export default function AddNewBlinds({ onAdded, onCancel }: Props) {
  const [sb, setSb] = useState('');
  const [bb, setBb] = useState('');
  const [straddle, setStraddle] = useState('');

  const handleAdd = async () => {
    if (!sb || !bb) return;
    const id = await db.blinds.add({
      sb: parseFloat(sb),
      bb: parseFloat(bb),
      straddle: straddle ? parseFloat(straddle) : 0,
      bring_in: 0,
      ante: 0,
      per_point: 0,
      filtered: 0
    });
    // Add to filters
    const filters = await db.filters.toCollection().first();
    if (filters?.id) {
      await db.filters.update(filters.id, {
        blinds: [...filters.blinds, id as number]
      });
    }
    onAdded(id as number);
  };

  return (
    <div className="mt-1 space-y-2">
      <div className="flex gap-2">
        <input
          type="number"
          value={sb}
          onChange={(e) => setSb(e.target.value)}
          placeholder="SB"
          className="flex-1 px-3 py-2 border border-theme rounded bg-input text-theme text-sm"
          autoFocus
          step="0.5"
        />
        <input
          type="number"
          value={bb}
          onChange={(e) => setBb(e.target.value)}
          placeholder="BB"
          className="flex-1 px-3 py-2 border border-theme rounded bg-input text-theme text-sm"
          step="0.5"
        />
        <input
          type="number"
          value={straddle}
          onChange={(e) => setStraddle(e.target.value)}
          placeholder="Straddle"
          className="flex-1 px-3 py-2 border border-theme rounded bg-input text-theme text-sm"
          step="0.5"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={handleAdd} className="flex-1 px-3 py-2 bg-teal text-white rounded text-sm font-semibold">Add</button>
        <button onClick={onCancel} className="flex-1 px-3 py-2 bg-hover text-theme rounded text-sm border border-theme">Cancel</button>
      </div>
    </div>
  );
}
