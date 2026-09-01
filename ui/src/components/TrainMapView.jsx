import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, MapPin, Clock, Ruler, Train, Navigation } from 'lucide-react';
import { trainsApi } from '../services/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeIcon(color, size = [25, 41]) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [1, -size[1] + 7],
    shadowSize: [41, 41],
  });
}

function FlyToStop({ stop, markerRefs }) {
  const map = useMap();
  useEffect(() => {
    if (!stop?.latitude) return;
    map.flyTo([stop.latitude, stop.longitude], Math.max(map.getZoom(), 10), { duration: 0.8 });
    const ref = markerRefs.current[stop.stationId];
    if (ref) setTimeout(() => ref.openPopup(), 850);
  }, [stop, map, markerRefs]);
  return null;
}

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1)
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
  }, [positions, map]);
  return null;
}

function StatPill({ icon: Icon, label, value, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${colors[color]}`}>
      <Icon size={14} />
      <div>
        <p className="text-xs opacity-60 leading-none mb-0.5">{label}</p>
        <p className="text-sm font-semibold leading-none">{value}</p>
      </div>
    </div>
  );
}

export default function TrainMapView({ train, onBack }) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStop, setActiveStop] = useState(null);
  const markerRefs = useRef({});
  const listRefs = useRef({});

  const icons = useMemo(() => ({
    origin: makeIcon('green'),
    dest:   makeIcon('blue'),
    mid:    makeIcon('grey', [18, 30]),
    active: makeIcon('red'),
  }), []);

  useEffect(() => {
    trainsApi.getById(train.id).then((r) => {
      setStops(r.data.stops || []);
      setLoading(false);
    });
  }, [train.id]);

  const handleStopClick = useCallback((s) => {
    setActiveStop((prev) => prev?.stationId === s.stationId ? null : s);
    listRefs.current[s.stationId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const geoStops = stops.filter((s) => s.latitude != null && s.longitude != null);
  const positions = geoStops.map((s) => [s.latitude, s.longitude]);
  const totalDist = stops.at(-1)?.distanceFromOrigin ?? 0;
  const origin = stops[0];
  const destination = stops.at(-1);

  const getIcon = (s, i) => {
    if (activeStop?.stationId === s.stationId) return icons.active;
    if (i === 0) return icons.origin;
    if (i === geoStops.length - 1) return icons.dest;
    return icons.mid;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex-shrink-0">
        <div className="flex items-start gap-4">
          <button onClick={onBack}
            className="mt-0.5 w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition text-slate-500 flex-shrink-0">
            <ArrowLeft size={17} />
          </button>

          <div className="flex-1 min-w-0">
            {/* Train identity */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Train size={18} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-indigo-600">{train.trainNumber}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-lg font-bold text-slate-900 truncate">{train.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-medium">{train.type}</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border
                      ${train.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${train.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {train.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Route summary + stats */}
            {!loading && stops.length > 0 && (
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                {/* Origin → Destination */}
                <div className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-50 to-indigo-50 border border-slate-200 rounded-xl">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 leading-none mb-0.5">From</p>
                    <p className="font-mono text-sm font-bold text-emerald-700">{origin?.code}</p>
                    <p className="text-xs text-slate-500 max-w-[80px] truncate">{origin?.stationName}</p>
                  </div>
                  <div className="flex items-center gap-1 px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <div className="w-12 h-px bg-gradient-to-r from-emerald-400 to-indigo-400" />
                    <Navigation size={12} className="text-indigo-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 leading-none mb-0.5">To</p>
                    <p className="font-mono text-sm font-bold text-indigo-700">{destination?.code}</p>
                    <p className="text-xs text-slate-500 max-w-[80px] truncate">{destination?.stationName}</p>
                  </div>
                </div>

                <StatPill icon={MapPin} label="Stops" value={stops.length} color="slate" />
                <StatPill icon={Ruler} label="Distance" value={`${totalDist} km`} color="indigo" />
                <StatPill icon={Clock} label="Departure" value={origin?.departureTime ?? '—'} color="emerald" />
                <StatPill icon={Clock} label="Arrival" value={destination?.arrivalTime ?? '—'} color="amber" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading route...</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 gap-0 overflow-hidden">

          {/* ── Stops Sidebar ──────────────────────────────────────────────── */}
          <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Route Stops</p>
              {activeStop && (
                <button className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                  onClick={() => setActiveStop(null)}>
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {stops.map((s, i) => {
                const isFirst = i === 0;
                const isLast = i === stops.length - 1;
                const isActive = activeStop?.stationId === s.stationId;
                const hasGeo = s.latitude != null;

                return (
                  <button
                    key={s.stationId}
                    ref={(el) => { listRefs.current[s.stationId] = el; }}
                    onClick={() => hasGeo && handleStopClick(s)}
                    className={`w-full text-left px-4 py-3 transition-all flex gap-3 items-start border-b border-slate-50
                      ${isActive ? 'bg-indigo-50 border-l-[3px] border-l-indigo-500' : 'hover:bg-slate-50 border-l-[3px] border-l-transparent'}
                      ${!hasGeo ? 'opacity-40 cursor-default' : 'cursor-pointer'}`}>

                    {/* Timeline dot */}
                    <div className="flex flex-col items-center flex-shrink-0 pt-1">
                      <div className={`w-3 h-3 rounded-full border-2 transition-all
                        ${isActive ? 'border-indigo-500 bg-indigo-500 scale-125'
                        : isFirst ? 'border-emerald-500 bg-emerald-500'
                        : isLast ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300 bg-white'}`} />
                      {!isLast && <div className="w-px bg-slate-200 mt-1" style={{ height: 32 }} />}
                    </div>

                    {/* Stop info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded
                          ${isActive ? 'bg-indigo-100 text-indigo-700'
                          : isFirst ? 'bg-emerald-100 text-emerald-700'
                          : isLast ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-500'}`}>
                          {s.code}
                        </span>
                        {isFirst && <span className="text-xs text-emerald-600 font-semibold">Origin</span>}
                        {isLast && <span className="text-xs text-indigo-600 font-semibold">Destination</span>}
                      </div>
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {s.stationName}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        {!isFirst && s.arrivalTime && (
                          <span className="flex items-center gap-0.5"><Clock size={10} /> {s.arrivalTime}</span>
                        )}
                        {!isLast && s.departureTime && (
                          <span className="flex items-center gap-0.5"><Clock size={10} /> {s.departureTime}</span>
                        )}
                        <span className="flex items-center gap-0.5 ml-auto"><Ruler size={10} /> {s.distanceFromOrigin} km</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Map ────────────────────────────────────────────────────────── */}
          <div className="flex-1 relative">
            {geoStops.length < 2 && (
              <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/80 backdrop-blur-sm">
                <div className="text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
                  <MapPin size={36} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-semibold text-slate-600">No coordinates available</p>
                  <p className="text-sm mt-1 text-slate-400">Add GPS coordinates to stops to see the route</p>
                </div>
              </div>
            )}
            <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {positions.length > 1 && (
                <>
                  <Polyline positions={positions} pathOptions={{ color: '#4f46e5', weight: 3.5, opacity: 0.85 }} />
                  <FitBounds positions={positions} />
                </>
              )}
              {geoStops.map((s, i) => (
                <Marker
                  key={s.stationId}
                  position={[s.latitude, s.longitude]}
                  icon={getIcon(s, i)}
                  ref={(ref) => { if (ref) markerRefs.current[s.stationId] = ref; }}
                  eventHandlers={{ click: () => handleStopClick(s) }}
                >
                  <Popup>
                    <div className="text-sm min-w-[150px]">
                      <p className="font-bold text-slate-800">{s.stationName}</p>
                      <p className="font-mono text-xs text-slate-500 mb-2">{s.code}</p>
                      {s.arrivalTime && <p className="text-xs text-slate-500">Arr: <b>{s.arrivalTime}</b></p>}
                      {s.departureTime && <p className="text-xs text-slate-500">Dep: <b>{s.departureTime}</b></p>}
                      <p className="text-xs text-slate-400 mt-1 border-t border-slate-100 pt-1">{s.distanceFromOrigin} km from origin</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
              <FlyToStop stop={activeStop} markerRefs={markerRefs} />
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
