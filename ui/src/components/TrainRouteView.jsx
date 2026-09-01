import { useEffect, useState, lazy, Suspense } from 'react';
import { ArrowLeft, Train, Map as MapIcon } from 'lucide-react';
import { trainsApi } from '../services/api';

const TrainMapView = lazy(() => import('./TrainMapView'));

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function calcHalt(arr, dep) {
  if (!arr || !dep) return null;
  const [ah, am] = arr.split(':').map(Number);
  const [dh, dm] = dep.split(':').map(Number);
  const mins = (dh * 60 + dm) - (ah * 60 + am);
  if (mins <= 0) return null;
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function calcElapsed(depOrigin, time) {
  if (!depOrigin || !time) return null;
  const [oh, om] = depOrigin.split(':').map(Number);
  const [th, tm] = time.split(':').map(Number);
  let mins = (th * 60 + tm) - (oh * 60 + om);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TrainRouteView({ train, onBack }) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('route'); // 'route' | 'map'

  useEffect(() => {
    trainsApi.getById(train.id).then((r) => {
      setStops(r.data.stops || []);
      setLoading(false);
    });
  }, [train.id]);

  const origin = stops[0];
  const dest = stops.at(-1);
  const totalDist = dest?.distanceFromOrigin ?? 0;
  const originDep = origin?.departureTime;

  if (tab === 'map') return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-slate-400">Loading map...</div>}>
      <TrainMapView train={train} onBack={() => setTab('route')} />
    </Suspense>
  );

  return (
    <div className="min-h-screen bg-[#f0f2f5]">

      {/* ── Top bar (IRI-style orange/red header) ── */}
      <div className="bg-[#c0392b] text-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/20 transition flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <Train size={20} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-lg leading-tight">{train.trainNumber}</span>
              <span className="text-white/60">·</span>
              <span className="font-semibold text-base leading-tight truncate">{train.name}</span>
              {train.type && (
                <span className="text-xs px-2 py-0.5 bg-white/20 rounded font-medium">{train.type}</span>
              )}
            </div>
            {/* Running days */}
            <div className="flex items-center gap-1 mt-1.5">
              {DAYS.map((d, i) => {
                const runs = (train.runningDays >> i & 1) === 1;
                return (
                  <span key={i} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${runs ? 'bg-white text-[#c0392b]' : 'bg-white/20 text-white/50'}`}>
                    {d}
                  </span>
                );
              })}
            </div>
          </div>
          <button
            onClick={() => setTab('map')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition flex-shrink-0"
          >
            <MapIcon size={14} /> Map
          </button>
        </div>
      </div>

      {/* ── Origin → Destination banner ── */}
      {!loading && stops.length > 0 && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wide">From</p>
              <p className="font-mono font-bold text-base text-[#c0392b]">{origin?.code}</p>
              <p className="text-xs text-slate-600 font-medium max-w-[100px] truncate">{origin?.stationName}</p>
              <p className="text-xs text-slate-400">{origin?.departureTime ?? '—'}</p>
            </div>
            <div className="flex-1 flex items-center gap-1">
              <div className="flex-1 border-t-2 border-dashed border-slate-300" />
              <div className="text-xs text-slate-400 text-center px-2">
                <div className="font-semibold text-slate-600">{totalDist} km</div>
                <div>{stops.length} stops</div>
              </div>
              <div className="flex-1 border-t-2 border-dashed border-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wide">To</p>
              <p className="font-mono font-bold text-base text-[#2980b9]">{dest?.code}</p>
              <p className="text-xs text-slate-600 font-medium max-w-[100px] truncate">{dest?.stationName}</p>
              <p className="text-xs text-slate-400">{dest?.arrivalTime ?? '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Route Table ── */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-[#c0392b] rounded-full animate-spin mr-3" />
            Loading route...
          </div>
        ) : stops.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No stops configured for this train.</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
            {/* Table header */}
            <div className="grid grid-cols-[40px_1fr_90px_90px_60px_70px_70px] bg-[#c0392b] text-white text-[11px] font-bold uppercase tracking-wide px-3 py-2.5">
              <div>#</div>
              <div>Station</div>
              <div className="text-center">Arrives</div>
              <div className="text-center">Departs</div>
              <div className="text-center">Halt</div>
              <div className="text-center">Day</div>
              <div className="text-right">Dist</div>
            </div>

            {stops.map((s, i) => {
              const isFirst = i === 0;
              const isLast = i === stops.length - 1;
              const halt = calcHalt(s.arrivalTime, s.departureTime);
              const elapsed = calcElapsed(originDep, isFirst ? s.departureTime : s.arrivalTime);

              return (
                <div
                  key={s.stationId}
                  className={`grid grid-cols-[40px_1fr_90px_90px_60px_70px_70px] px-3 py-2.5 border-b border-slate-100 text-sm items-center
                    ${isFirst ? 'bg-emerald-50' : isLast ? 'bg-blue-50' : 'hover:bg-slate-50'} transition-colors`}
                >
                  {/* Stop number with timeline dot */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                      ${isFirst ? 'bg-emerald-500 text-white' : isLast ? 'bg-[#2980b9] text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {s.stopOrder}
                    </div>
                  </div>

                  {/* Station name + code */}
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded
                        ${isFirst ? 'bg-emerald-100 text-emerald-700' : isLast ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.code}
                      </span>
                      {isFirst && <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">SOURCE</span>}
                      {isLast && <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">DEST</span>}
                    </div>
                    <p className="text-slate-800 font-medium text-xs mt-0.5 truncate">{s.stationName}</p>
                    {elapsed && !isFirst && (
                      <p className="text-[10px] text-slate-400 mt-0.5">+{elapsed} from origin</p>
                    )}
                  </div>

                  {/* Arrival */}
                  <div className="text-center">
                    {isFirst ? (
                      <span className="text-xs text-slate-400 italic">—</span>
                    ) : (
                      <span className={`text-sm font-semibold ${isLast ? 'text-[#2980b9]' : 'text-slate-700'}`}>
                        {s.arrivalTime ?? <span className="text-slate-300">—</span>}
                      </span>
                    )}
                  </div>

                  {/* Departure */}
                  <div className="text-center">
                    {isLast ? (
                      <span className="text-xs text-slate-400 italic">—</span>
                    ) : (
                      <span className={`text-sm font-semibold ${isFirst ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {s.departureTime ?? <span className="text-slate-300">—</span>}
                      </span>
                    )}
                  </div>

                  {/* Halt */}
                  <div className="text-center">
                    {halt ? (
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        {halt}
                      </span>
                    ) : (isFirst || isLast) ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>

                  {/* Day */}
                  <div className="text-center">
                    <span className="text-xs font-semibold text-slate-500">D1</span>
                  </div>

                  {/* Distance */}
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-600">{s.distanceFromOrigin}</span>
                    <span className="text-[10px] text-slate-400 ml-0.5">km</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
