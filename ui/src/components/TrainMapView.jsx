import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, MapPin, Clock, Ruler } from 'lucide-react';
import { trainsApi } from '../services/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const makeIcon = (color, size = [25, 41]) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: size,
  iconAnchor: [size[0] / 2, size[1]],
  popupAnchor: [1, -size[1] + 7],
  shadowSize: [41, 41],
});

const icons = {
  origin:  makeIcon('green'),
  dest:    makeIcon('blue'),
  mid:     makeIcon('grey', [18, 30]),
  active:  makeIcon('red'),
};

// Fly to a position and open the marker popup
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

export default function TrainMapView({ train, onBack }) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStop, setActiveStop] = useState(null);
  const markerRefs = useRef({});
  const listRefs = useRef({});

  useEffect(() => {
    trainsApi.getById(train.id).then((r) => {
      setStops(r.data.stops || []);
      setLoading(false);
    });
  }, [train.id]);

  const handleStopClick = useCallback((s) => {
    setActiveStop((prev) => prev?.stationId === s.stationId ? null : s);
    // Scroll the list item into view
    listRefs.current[s.stationId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const geoStops = stops.filter((s) => s.latitude != null && s.longitude != null);
  const positions = geoStops.map((s) => [s.latitude, s.longitude]);
  const totalDist = stops.at(-1)?.distanceFromOrigin ?? 0;

  const getIcon = (s, i) => {
    if (activeStop?.stationId === s.stationId) return icons.active;
    if (i === 0) return icons.origin;
    if (i === geoStops.length - 1) return icons.dest;
    return icons.mid;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 transition text-slate-500">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">
              <span className="font-mono text-indigo-600">{train.trainNumber}</span>
              <span className="mx-2 text-slate-300">—</span>
              {train.name}
            </h1>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">{train.type}</span>
            <span className={train.status === 'active' ? 'badge-active' : 'badge-inactive'}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${train.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {train.status}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1"><MapPin size={11} /> {stops.length} stops</span>
            <span className="flex items-center gap-1"><Ruler size={11} /> {totalDist} km total</span>
            <span className="flex items-center gap-1"><Clock size={11} />
              {stops[0]?.departureTime ?? '—'} → {stops.at(-1)?.arrivalTime ?? '—'}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-16 text-center text-slate-400">Loading...</div>
      ) : (
        <div className="flex gap-5" style={{ height: 'calc(100vh - 220px)', minHeight: 520 }}>

          {/* Stops list */}
          <div className="w-72 flex-shrink-0 card overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Stops
                {activeStop && (
                  <button className="ml-2 text-indigo-500 hover:text-indigo-700 normal-case font-normal"
                    onClick={() => setActiveStop(null)}>
                    clear
                  </button>
                )}
              </p>
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
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 transition-colors flex gap-3 items-start
                      ${isActive ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-slate-50 border-l-2 border-l-transparent'}
                      ${!hasGeo ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}>
                    <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                      <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors
                        ${isActive ? 'border-red-500 bg-red-500'
                        : isFirst ? 'border-emerald-500 bg-emerald-500'
                        : isLast ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300 bg-white'}`} />
                      {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1" style={{ minHeight: 16 }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded
                          ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                          {s.code}
                        </span>
                        {isFirst && <span className="text-xs text-emerald-600 font-medium">Origin</span>}
                        {isLast && <span className="text-xs text-indigo-600 font-medium">Destination</span>}
                        {!hasGeo && <span className="text-xs text-slate-300">No GPS</span>}
                      </div>
                      <p className={`text-sm font-medium mt-0.5 truncate ${isActive ? 'text-indigo-800' : 'text-slate-800'}`}>
                        {s.stationName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        {!isFirst && s.arrivalTime && <span>Arr {s.arrivalTime}</span>}
                        {!isLast && s.departureTime && <span>Dep {s.departureTime}</span>}
                        <span>{s.distanceFromOrigin} km</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 card overflow-hidden relative">
            {geoStops.length < 2 && (
              <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <div className="text-center text-slate-400">
                  <MapPin size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-medium">No coordinates available</p>
                  <p className="text-sm mt-1">Add GPS coordinates to stops to see the route on map</p>
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
                  <Polyline positions={positions} pathOptions={{ color: '#4f46e5', weight: 3, opacity: 0.8 }} />
                  <FitBounds positions={positions} />
                </>
              )}
              {geoStops.map((s, i) => (
                <Marker
                  key={s.stationId}
                  position={[s.latitude, s.longitude]}
                  icon={getIcon(s, i)}
                  ref={(ref) => { if (ref) markerRefs.current[s.stationId] = ref; }}
                  eventHandlers={{
                    click: () => handleStopClick(s),
                  }}
                >
                  <Popup>
                    <div className="text-sm min-w-[140px]">
                      <p className="font-bold text-slate-800">{s.stationName}</p>
                      <p className="font-mono text-xs text-slate-500 mb-1">{s.code}</p>
                      {s.arrivalTime && <p className="text-xs text-slate-500">Arr: <b>{s.arrivalTime}</b></p>}
                      {s.departureTime && <p className="text-xs text-slate-500">Dep: <b>{s.departureTime}</b></p>}
                      <p className="text-xs text-slate-500 mt-1">{s.distanceFromOrigin} km from origin</p>
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
