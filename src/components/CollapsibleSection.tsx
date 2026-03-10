import { ReactNode, useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-4">
      <div
        className="bg-section px-4 py-2 border-b border-theme cursor-pointer select-none flex items-center justify-between"
        onClick={() => setOpen(o => !o)}
      >
        <h2 className="font-bold text-theme">{title}</h2>
        <span className="text-theme text-sm">{open ? '▲' : '▼'}</span>
      </div>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}
