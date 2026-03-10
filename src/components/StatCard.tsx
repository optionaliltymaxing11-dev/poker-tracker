interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
}

export default function StatCard({ label, value, valueColor }: StatCardProps) {
  return (
    <div className="flex flex-col">
      <span className="text-sm text-theme-secondary mb-1">{label}</span>
      <span className={`text-xl font-semibold ${valueColor || 'text-theme'}`}>
        {value}
      </span>
    </div>
  );
}
