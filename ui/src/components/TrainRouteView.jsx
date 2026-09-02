import { useEffect, useState, lazy, Suspense } from 'react';
import { ArrowLeft, Train, Map as MapIcon, Clock, Ruler, Hash } from 'lucide-react';
import { trainsApi } from '../services/api';

const TrainMapView = lazy(() => import('./TrainMapView'));

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

function calcDayNumber(depOrigin, time) {
  if (!depOrigin || !time) return 1;
  const [oh, om] = depOrigin.split(':').map(Number);
  const [th, tm] = time.split(':').map(Number);
  return (th * 60 + tm) < (oh * 60 + om) ? 2 : 1;
}

const COL = 'grid-cols-[36px_1fr_80px_80px_56px_44px_68px]';

export default function TrainRouteView({ train, onBack }) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('route');
  const [journeyDuration, setJourneyDuration] = useState(null);

  useEffect(() => {
    trainsApi.getById(train.id).then((r) => {
      setStops(r.data.stops || []);
      setJourneyDuration(r.data.journeyDuration ?? null);
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

      {/* ── Top bar ── */}
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
              <div className="text-xs text-slate-400 text-center px-2 space-y-0.5">
                <div className="flex items-center gap-1 justify-center font-semibold text-slate-600">
                  <Ruler size={11} /> {totalDist} km
                </div>
                <div className="flex items-center gap-1 justify-center">
                  <Hash size={11} /> {stops.length} stops
                </div>
                {journeyDuration && (
                  <div className="flex items-center gap-1 justify-center">
                    <Clock size={11} /> {journeyDuration}
                  </div>
                )}
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
            {/* Header */}
            <div className={`grid ${COL} bg-[#c0392b] text-white text-[11px] font-bold uppercase tracking-wide px-3 py-2.5`}>
              <div>#</div>
              <div>Station</div>
              <div className="text-center">Arrives</div>
              <div className="text-center">Departs</div>
              <div className="text-center">Halt</div>
              <div className="text-center">Day</div>
              <div className="text-right">Dist</div>
            </div>

            {stops.flatMap((s, i) => {
              const isFirst = i === 0;
              const isLast = i === stops.length - 1;
              const dayNum = isFirst ? 1 : calcDayNumber(originDep, s.arrivalTime);

              const stopRow = (
                <div
                  key={s.stationId}
                  className={`grid ${COL} px-3 py-2.5 border-b border-slate-100 text-sm items-center
                    ${isFirst ? 'bg-emerald-50' : isLast ? 'bg-blue-50' : 'hover:bg-slate-50'} transition-colors`}
                >
                  {/* # */}
                  <div className="flex items-center justify-center">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                      ${isFirst ? 'bg-emerald-500 text-white' : isLast ? 'bg-[#2980b9] text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {s.stopOrder}
                    </div>
                  </div>

                  {/* Station */}
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
                  </div>

                  {/* Arrives */}
                  <div className="text-center">
                    {isFirst
                      ? <span className="text-xs text-slate-400 italic">—</span>
                      : <span className={`text-sm font-semibold ${isLast ? 'text-[#2980b9]' : 'text-slate-700'}`}>{s.arrivalTime ?? '—'}</span>
                    }
                  </div>

                  {/* Departs */}
                  <div className="text-center">
                    {isLast
                      ? <span className="text-xs text-slate-400 italic">—</span>
                      : <span className={`text-sm font-semibold ${isFirst ? 'text-emerald-600' : 'text-slate-700'}`}>{s.departureTime ?? '—'}</span>
                    }
                  </div>

                  {/* Halt */}
                  <div className="text-center">
                    {s.haltMinutes
                      ? <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          {s.haltMinutes < 60 ? `${s.haltMinutes}m` : `${Math.floor(s.haltMinutes / 60)}h ${s.haltMinutes % 60}m`}
                        </span>
                      : <span className="text-xs text-slate-300">—</span>
                    }
                  </div>

                  {/* Day */}
                  <div className="text-center">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${dayNum > 1 ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'text-slate-500'}`}>
                      D{dayNum}
                    </span>
                  </div>

                  {/* Dist */}
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-600">{s.distanceFromOrigin}</span>
                    <span className="text-[10px] text-slate-400 ml-0.5">km</span>
                  </div>
                </div>
              );

              if (isLast) return [stopRow];

              const next = stops[i + 1];
              const segDist = next.distanceFromOrigin - s.distanceFromOrigin;
              const elapsed = calcElapsed(s.departureTime, next.arrivalTime);

              // Connector row — sits between this stop and the next
              const connectorRow = (
                <div key={`conn-${i}`} className={`grid ${COL} px-3 bg-slate-50/80 items-center h-6`}>
                  {/* vertical line */}
                  <div className="flex justify-center">
                    <div className="w-px h-full bg-slate-200" />
                  </div>
                  {/* station col empty */}
                  <div />
                  {/* elapsed time under Arrives */}
                  <div className="text-center">
                    {elapsed && (
                      <span className="text-[9px] text-indigo-400 font-medium bg-indigo-50 px-1.5 py-0.5 rounded-full">
                        +{elapsed}
                      </span>
                    )}
                  </div>
                  {/* empty departs */}
                  <div />
                  {/* empty halt */}
                  <div />
                  {/* empty day */}
                  <div />
                  {/* segment dist under Dist */}
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400">+{segDist} km</span>
                  </div>
                </div>
              );

              return [stopRow, connectorRow];
            })}
          </div>
        )}
      </div>
    </div>
  );
}
