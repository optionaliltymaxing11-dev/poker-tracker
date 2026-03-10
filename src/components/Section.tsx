import { ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode;
}

export default function Section({ title, children }: SectionProps) {
  return (
    <div className="mb-4">
      <div className="bg-section px-4 py-2 border-b border-theme">
        <h2 className="font-bold text-theme">{title}</h2>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
