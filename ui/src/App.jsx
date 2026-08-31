import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Trains from './pages/Trains';
import Stations from './pages/Stations';
import Scrape from './pages/Scrape';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 ml-60 min-h-screen overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/trains" element={<Trains />} />
            <Route path="/stations" element={<Stations />} />
            <Route path="/scrape" element={<Scrape />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
