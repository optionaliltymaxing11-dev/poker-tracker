interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'history', label: 'History', icon: '📋' },
    { id: 'graphs', label: 'Graphs', icon: '📈' },
    { id: 'filters', label: 'Filters', icon: '🔍' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-theme shadow-lg z-20"
         style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex justify-around">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center py-2 px-3 flex-1 ${
              activeTab === tab.id ? 'text-accent' : 'text-theme-secondary'
            }`}
          >
            <span className="text-2xl mb-1">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
