import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Train, MapPin, Zap, Activity, CircleOff, Route, Plus, ArrowRight } from 'lucide-react';
import { trainsApi, stationsApi } from '../services/api';

export default function Dashboard() {
  const [trains, setTrains] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([trainsApi.getAll(), stationsApi.getAll()]).then(([t, s]) => {
      setTrains(t.data);
      setStations(s.data);
      setLoading(false);
    });
  }, []);

  const activeTrains = trains.filter((t) => t.status === 'active').length;
  const inactiveTrains = trains.filter((t) => t.status !== 'active').length;
  const trainTypes = [...new Set(trains.map((t) => t.type).filter(Boolean))];
  const recentTrains = [...trains].slice(-5).reverse();

  return (
    <div className="min-h-screen bg-[#f7f8fc] p-6 lg:p-8">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-7 py-8 mb-7 shadow-xl shadow-indigo-950/10">
        <div className="absolute -right-16 -top-24 w-72 h-72 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="absolute right-24 -bottom-28 w-64 h-64 rounded-full bg-violet-500/10 blur-2xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-indigo-200 text-xs font-semibold mb-3">
            <Train size={13} /> Railway Operations
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Welcome back</h1>
          <p className="text-sm text-slate-300 mt-1.5">Here's an overview of your railway management system.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total Trains', value: trains.length, icon: Train, color: 'indigo', onClick: () => navigate('/trains') },
          { label: 'Active Trains', value: activeTrains, icon: Activity, color: 'emerald', onClick: () => navigate('/trains') },
          { label: 'Inactive Trains', value: inactiveTrains, icon: CircleOff, color: 'slate', onClick: () => navigate('/trains') },
          { label: 'Total Stations', value: stations.length, icon: MapPin, color: 'violet', onClick: () => navigate('/stations') },
        ].map(({ label, value, icon: Icon, color, onClick }) => (
          <button key={label} onClick={onClick} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition text-left group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className={`text-3xl font-bold mt-2 ${color === 'indigo' ? 'text-slate-800' : color === 'emerald' ? 'text-emerald-600' : color === 'violet' ? 'text-violet-600' : 'text-slate-500'}`}>
                  {loading ? '—' : value}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition group-hover:scale-110 ${color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : color === 'violet' ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-500'}`}>
                <Icon size={19} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent Trains */}
        <div className="xl:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-700">Recent Trains</p>
              <p className="text-xs text-slate-400 mt-0.5">Latest registered trains</p>
            </div>
            <button onClick={() => navigate('/trains')} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Loading...</div>
            ) : recentTrains.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No trains yet</div>
            ) : recentTrains.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <Train size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{t.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{t.trainNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  {t.type && <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-lg font-medium">{t.type}</span>}
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions + Train Types */}
        <div className="flex flex-col gap-6">

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5">
            <p className="text-sm font-bold text-slate-700 mb-4">Quick Actions</p>
            <div className="space-y-2.5">
              {[
                { label: 'Add New Train', icon: Plus, color: 'indigo', onClick: () => navigate('/trains') },
                { label: 'Add New Station', icon: MapPin, color: 'violet', onClick: () => navigate('/stations') },
                { label: 'Scrape Route', icon: Zap, color: 'amber', onClick: () => navigate('/scrape') },
              ].map(({ label, icon: Icon, color, onClick }) => (
                <button key={label} onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition hover:-translate-y-0.5 ${color === 'indigo' ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : color === 'violet' ? 'bg-violet-50 text-violet-700 hover:bg-violet-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Train Types */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-700">Train Types</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Route size={13} /> {trainTypes.length} types
              </div>
            </div>
            {loading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : trainTypes.length === 0 ? (
              <p className="text-sm text-slate-400">No types yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trainTypes.map((type) => (
                  <span key={type} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">{type}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
