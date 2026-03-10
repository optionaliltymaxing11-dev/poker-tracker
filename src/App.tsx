import { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import { checkAutoBackup } from './services/autoBackup';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Graphs from './pages/Graphs';
import Filters from './pages/Filters';
import Settings from './pages/Settings';
import Notes from './pages/Notes';
import NewSession from './pages/NewSession';
import AddCompletedSession from './pages/AddCompletedSession';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewSession, setShowNewSession] = useState(false);
  const [showAddCompleted, setShowAddCompleted] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);

  useEffect(() => {
    checkAutoBackup();
  }, []);

  const renderPage = () => {
    if (showNewSession) {
      return (
        <NewSession
          onSave={() => {
            setShowNewSession(false);
            setActiveTab('dashboard');
          }}
          onCancel={() => setShowNewSession(false)}
        />
      );
    }

    if (showAddCompleted) {
      return (
        <AddCompletedSession
          onSave={() => {
            setShowAddCompleted(false);
            setActiveTab('history');
          }}
          onCancel={() => setShowAddCompleted(false)}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'history':
        return <History />;
      case 'graphs':
        return <Graphs />;
      case 'filters':
        return <Filters />;
      case 'settings':
        return <Settings />;
      case 'notes':
        return <Notes />;
      default:
        return <Dashboard />;
    }
  };

  const showFab = !showNewSession && !showAddCompleted && activeTab === 'dashboard';

  return (
    <div className="min-h-screen bg-app">
      {renderPage()}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* FAB Menu overlay */}
      {showFabMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowFabMenu(false)}
        />
      )}

      {/* FAB with expandable menu */}
      {showFab && (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end">
          {showFabMenu && (
            <div className="mb-3 flex flex-col gap-2 items-end">
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  setShowNewSession(true);
                }}
                className="flex items-center gap-2 bg-card border border-theme shadow-lg rounded-full px-4 py-2"
              >
                <span className="text-sm font-semibold text-theme">Start Live Session</span>
                <span className="w-8 h-8 bg-teal text-white rounded-full flex items-center justify-center text-lg">▶</span>
              </button>
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  setShowAddCompleted(true);
                }}
                className="flex items-center gap-2 bg-card border border-theme shadow-lg rounded-full px-4 py-2"
              >
                <span className="text-sm font-semibold text-theme">Add Completed Session</span>
                <span className="w-8 h-8 bg-teal text-white rounded-full flex items-center justify-center text-lg">✓</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setShowFabMenu(!showFabMenu)}
            className={`w-14 h-14 bg-teal text-white rounded-full shadow-lg flex items-center justify-center text-3xl font-bold transition-transform duration-200 ${
              showFabMenu ? 'rotate-45' : ''
            }`}
            aria-label="New Session"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
