import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Train, MapPin, Ruler, Eye, EyeOff, Layers, Search, X } from 'lucide-react';
import { trainsApi, stationsApi } from '../services/api';

// 20 distinct colors for train routes
const PALETTE = [
  '#4f46e5','#0891b2','#059669','#d97706','#dc2626',
  '#7c3aed','#db2777','#0284c7','#16a34a','#ca8a04',
  '#9333ea','#e11d48','#0369a1','#15803d','#b45309',
  '#6d28d9','#be185d','#0e7490','#166534','#92400e',
];

function FitBounds({ positions }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || positions.length < 2) return;
    map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    fitted.current = true;
  }, [positions, map]);
  return null;
}

export default function CoverageMap() {
  const [trains, setTrains] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(new Set());
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    Promise.all([trainsApi.getCoverage(), stationsApi.getAll()]).then(([t, s]) => {
      setTrains(t.data);
      setStations(s.data);
      setLoading(false);
    });
  }, []);

  const toggle = (id) => setHidden((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = (show) => setHidden(show ? new Set() : new Set(trains.map((t) => t.id)));

  const filteredTrains = useMemo(() => trains.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.trainNumber.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
    const matchActive = !activeOnly || t.status === 'active';
    return matchSearch && matchActive;
  }), [trains, search, activeOnly]);

  // Build station → trains index for popup
  const stationTrainIndex = useMemo(() => {
    const idx = {};
    trains.forEach((t) => {
      t.stops.forEach((s) => {
        if (!idx[s.stationId]) idx[s.stationId] = [];
        idx[s.stationId].push({ id: t.id, number: t.trainNumber, name: t.name, status: t.status });
      });
    });
    return idx;
  }, [trains]);

  // All geo positions for initial fit
  const allPositions = useMemo(() =>
    trains.flatMap((t) => t.stops.filter((s) => s.latitude && s.longitude).map((s) => [s.latitude, s.longitude])),
    [trains]
  );

  // Stats
  const visibleTrains = trains.filter((t) => !hidden.has(t.id));
  const geoStations = stations.filter((s) => s.latitude != null && s.longitude != null);
  const totalNetworkKm = useMemo(() =>
    trains.reduce((sum, t) => {
      const last = t.stops.at(-1);
      return sum + (last ? Number(last.distanceFromOrigin) : 0);
    }, 0),
    [trains]
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Sidebar ── */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Layers size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Coverage Map</p>
              <p className="text-xs text-slate-400">Network overview</p>
            </div>
          </div>

          {/* Stats pills */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
              <p className="text-xs font-bold text-slate-700">{trains.length}</p>
              <p className="text-[10px] text-slate-400">Trains</p>
            </div>
            <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
              <p className="text-xs font-bold text-slate-700">{geoStations.length}</p>
              <p className="text-[10px] text-slate-400">Stations</p>
            </div>
            <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
              <p className="text-xs font-bold text-slate-700">{Math.round(totalNetworkKm).toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">km</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trains..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
              <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="rounded" />
              Active only
            </label>
            <div className="flex gap-2">
              <button onClick={() => toggleAll(true)} className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium">Show all</button>
              <span className="text-slate-300">·</span>
              <button onClick={() => toggleAll(false)} className="text-[11px] text-slate-400 hover:text-slate-600 font-medium">Hide all</button>
            </div>
          </div>
        </div>

        {/* Train list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-xs">Loading...</div>
          ) : filteredTrains.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-xs">No trains found</div>
          ) : filteredTrains.map((t, idx) => {
            const color = PALETTE[trains.indexOf(t) % PALETTE.length];
            const isHidden = hidden.has(t.id);
            const geoCount = t.stops.filter((s) => s.latitude && s.longitude).length;
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 text-left transition-all
                  ${isHidden ? 'opacity-40' : 'hover:bg-slate-50'}`}
              >
                {/* Color swatch */}
                <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
                  <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
                  <div className="w-px h-3 opacity-30" style={{ backgroundColor: color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-700">{t.trainNumber}</span>
                    <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{t.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t.stops.length} stops · {geoCount} mapped</p>
                </div>

                <div className="flex-shrink-0 text-slate-300">
                  {isHidden ? <EyeOff size={13} /> : <Eye size={13} className="text-slate-400" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">Legend</p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" /> Origin station
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" /> Destination station
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <div className="w-3 h-3 rounded-full bg-slate-400 border-2 border-white shadow-sm" /> Intermediate stop
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow-sm" /> Station (no route)
            </div>
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="text-center text-slate-400">
              <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Loading coverage data...</p>
            </div>
          </div>
        )}

        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {allPositions.length > 1 && <FitBounds positions={allPositions} />}

          {/* Train route polylines */}
          {trains.map((t, idx) => {
            if (hidden.has(t.id)) return null;
            const color = PALETTE[idx % PALETTE.length];
            const positions = t.stops
              .filter((s) => s.latitude && s.longitude)
              .map((s) => [s.latitude, s.longitude]);
            if (positions.length < 2) return null;
            return (
              <Polyline
                key={t.id}
                positions={positions}
                pathOptions={{ color, weight: 2.5, opacity: 0.75 }}
              />
            );
          })}

          {/* Station markers */}
          {stations.filter((s) => s.latitude != null && s.longitude != null).map((s) => {
            const servingTrains = stationTrainIndex[s.id] || [];
            const visibleServingTrains = servingTrains.filter((t) => !hidden.has(t.id));

            // Color: amber if no visible routes pass through, else use first visible train's color
            let fillColor = '#f59e0b';
            let radius = 4;
            if (visibleServingTrains.length > 0) {
              const tIdx = trains.findIndex((t) => t.id === visibleServingTrains[0].id);
              fillColor = PALETTE[tIdx % PALETTE.length];
              radius = visibleServingTrains.length > 1 ? 6 : 5;
            }

            return (
              <CircleMarker
                key={s.id}
                center={[s.latitude, s.longitude]}
                radius={radius}
                pathOptions={{ color: '#fff', weight: 1.5, fillColor, fillOpacity: 0.9 }}
              >
                <Popup>
                  <div className="min-w-[180px]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <MapPin size={13} className="text-slate-500" />
                      <span className="font-mono text-xs font-bold text-slate-600">{s.code}</span>
                    </div>
                    <p className="font-bold text-slate-800 text-sm mb-0.5">{s.name}</p>
                    <p className="text-xs text-slate-400 mb-2">{s.city}</p>
                    {servingTrains.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                          {servingTrains.length} train{servingTrains.length > 1 ? 's' : ''} serve this station
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {servingTrains.map((t) => {
                            const tIdx = trains.findIndex((tr) => tr.id === t.id);
                            const color = PALETTE[tIdx % PALETTE.length];
                            return (
                              <div key={t.id} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                <span className="font-mono text-[10px] font-bold text-slate-600">{t.number}</span>
                                <span className="text-[10px] text-slate-500 truncate">{t.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No routes assigned</p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Visible routes counter overlay */}
        <div className="absolute bottom-4 right-4 z-[1000] bg-white border border-slate-200 rounded-xl shadow-md px-3 py-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Train size={13} className="text-indigo-500" />
            <span className="font-semibold">{visibleTrains.length}</span>
            <span className="text-slate-400">/ {trains.length} routes visible</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Ruler size={13} className="text-indigo-500" />
            <span className="font-semibold">{Math.round(totalNetworkKm).toLocaleString()} km</span>
            <span className="text-slate-400">network</span>
          </div>
        </div>
      </div>
    </div>
  );
}
