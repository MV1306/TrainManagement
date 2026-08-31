import { NavLink } from 'react-router-dom';
import { Train, MapPin, Zap } from 'lucide-react';

const links = [
  { to: '/trains', label: 'Trains', icon: Train },
  { to: '/stations', label: 'Stations', icon: MapPin },
  { to: '/scrape', label: 'Route Scraper', icon: Zap },
];

export default function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-slate-900 flex flex-col z-10">
      <div className="px-6 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Train size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">TrainAdmin</p>
            <p className="text-slate-400 text-xs">Management Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-slate-700/60">
        <p className="text-slate-500 text-xs">v1.0.0</p>
      </div>
    </aside>
  );
}
