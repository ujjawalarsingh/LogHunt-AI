import { useState } from 'react';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';

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
      <Dashboard />
    </div>
  );
}

export default App;