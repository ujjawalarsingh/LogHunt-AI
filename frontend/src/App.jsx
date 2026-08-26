import { useState } from 'react';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Logs from './components/Logs';
import Alerts from './components/Alerts';
import LLMAnalysis from './components/LLMAnalysis';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import QueryLab from './components/QueryLab';

function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'app'
  const [page, setPage] = useState('Dashboard');

  if (view === 'landing') {
    return <LandingPage onEnter={() => setView('app')} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#050303]">
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        onLanding={() => setView('landing')}
      />
      {page === 'Dashboard' && <Dashboard />}
      {page === 'Logs' && <Logs />}
      {page === 'Alerts' && <Alerts />}
      {page === 'SQL Query Lab' && <QueryLab />}
      {page === 'LLM Analysis' && <LLMAnalysis />}
      {page === 'Analytics' && <Analytics />}
      {page === 'Settings' && <Settings />}
    </div>
  );
}

export default App;