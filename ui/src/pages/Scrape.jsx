import { useState } from 'react';
import {
  Search, Train as TrainIcon, MapPin, Download, CheckCircle,
  AlertTriangle, Loader, ChevronRight, ArrowRight, Layers
} from 'lucide-react';
import { scrapeApi, trainsApi, stationsApi, zonesApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';

const STEPS = ['Enter Train No', 'Preview Stops', 'Import'];
const COUNT_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

const STATUS_STYLE = {
  imported: 'bg-emerald-100 text-emerald-700',
  skipped:  'bg-slate-100 text-slate-500',
  notFound: 'bg-amber-100 text-amber-700',
  failed:   'bg-red-100 text-red-600',
};

function BulkScrape() {
  const [startSeries, setStartSeries] = useState('');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const handleBulk = async () => {
    if (!startSeries.trim()) return;
    setError('');
    setResults(null);
    setLoading(true);
    try {
      const res = await scrapeApi.bulkScrape({ startSeries: parseInt(startSeries), count });
      setResults(res.data.results);
      const imported = res.data.results.filter(r => r.status === 'imported').length;
      setToast({ message: `Bulk scrape done — ${imported} imported`, type: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk scrape failed');
    } finally {
      setLoading(false);
    }
  };

  const summary = results ? {
    imported: results.filter(r => r.status === 'imported').length,
    skipped:  results.filter(r => r.status === 'skipped').length,
    notFound: results.filter(r => r.status === 'notFound').length,
    failed:   results.filter(r => r.status === 'failed').length,
  } : null;

  return (
    <div className="space-y-5">
      <div className="card p-6 max-w-md">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Bulk Scrape Settings</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Start Series</label>
            <input
              className="input w-full font-mono"
              placeholder="e.g. 11000"
              value={startSeries}
              onChange={(e) => setStartSeries(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBulk()}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Number of Routes</label>
            <select
              className="input w-full"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {COUNT_OPTIONS.map(n => (
                <option key={n} value={n}>
                  {n} routes ({startSeries ? `${startSeries} – ${parseInt(startSeries || 0) + n - 1}` : `+${n}`})
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle size={15} /> {error}
          </div>
        )}
        <button
          className="btn-primary w-full mt-4"
          onClick={handleBulk}
          disabled={loading || !startSeries.trim()}
        >
          {loading
            ? <><Loader size={15} className="animate-spin" /> Scraping...</>
            : <><Layers size={15} /> Start Bulk Scrape</>}
        </button>
      </div>

      {loading && (
        <div className="card p-5 flex items-center gap-3 text-sm text-slate-500">
          <Loader size={16} className="animate-spin text-indigo-500" />
          Scraping routes {startSeries} to {parseInt(startSeries) + count - 1}… this may take a moment.
        </div>
      )}

      {results && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3 text-sm">
            {[
              ['imported', 'Imported',  'bg-emerald-50 border-emerald-200 text-emerald-700'],
              ['skipped',  'Skipped',   'bg-slate-50 border-slate-200 text-slate-600'],
              ['notFound', 'Not Found', 'bg-amber-50 border-amber-200 text-amber-700'],
              ['failed',   'Failed',    'bg-red-50 border-red-200 text-red-600'],
            ].map(([key, label, cls]) => (
              <div key={key} className={`border rounded-lg p-3 ${cls}`}>
                <p className="text-2xl font-bold">{summary[key]}</p>
                <p className="text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-700">Results</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {results.map((r) => (
                <div key={r.trainNumber} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-700">{r.trainNumber}</span>
                    {r.trainName && <span className="text-slate-500">{r.trainName}</span>}
                    {r.reason && <span className="text-xs text-slate-400">— {r.reason}</span>}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function Scrape() {
  const [trainNo, setTrainNo] = useState('');
  const [mode, setMode] = useState('single');
  const [step, setStep] = useState(0);
  const [trainInfo, setTrainInfo] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [runningDays, setRunningDays] = useState(127);

  const handleFetch = async () => {
    if (!trainNo.trim()) return;
    setError('');
    setLoading(true);
    setStops([]);
    setTrainInfo(null);
    try {
      const infoRes = await scrapeApi.getTrainInfo(trainNo.trim());
      const info = infoRes.data;
      setTrainInfo(info);
      setRunningDays(info.runningDays ?? 127);

      const stopsRes = await scrapeApi.getStops(info.internalId);
      setStops(stopsRes.data);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch train data');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError('');
    try {
      const allStations = await stationsApi.getAll();
      const stationMap = Object.fromEntries(allStations.data.map((s) => [s.code.toUpperCase(), s]));
      const allZones = await zonesApi.getAll();
      const zoneMap = Object.fromEntries(allZones.data.map(z => [z.code.toUpperCase(), z.id]));

      const created = [];
      const skipped = [];
      const stopsWithIds = [];

      for (const stop of stops) {
        const code = stop.code.toUpperCase();
        let station = stationMap[code];

        if (!station) {
          const res = await stationsApi.create({
            name: stop.name,
            code: code,
            city: stop.name,
            latitude: stop.latitude,
            longitude: stop.longitude,
            zoneId: zoneMap[stop.zone?.toUpperCase()] ?? null,
            division: stop.division ?? null,
          });
          station = res.data;
          stationMap[code] = station;
          created.push(code);
        } else {
          skipped.push(code);
        }

        stopsWithIds.push({
          stationId: station.id,
          stopOrder: stop.stopOrder,
          distanceFromOrigin: stop.distanceFromOrigin,
          arrivalTime: stop.arrivalTime || null,
          departureTime: stop.departureTime || null,
        });
      }

      await trainsApi.create({
        trainNumber: trainInfo.trainNumber,
        name: trainInfo.trainName,
        type: 'Express',
        status: 'active',
        runningDays,
        zoneId: zoneMap[stops[0]?.zone?.toUpperCase()] ?? null,
        stops: stopsWithIds,
      });

      setImportResult({ created, skipped });
      setStep(2);
      setToast({ message: `Train ${trainInfo.trainNumber} imported successfully`, type: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setTrainNo('');
    setStep(0);
    setTrainInfo(null);
    setStops([]);
    setError('');
    setImportResult(null);
    setRunningDays(127);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Route Scraper"
        subtitle="Fetch and import train routes from erail.in"
      />

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        {[['single', 'Single Route'], ['bulk', 'Bulk Scrape']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setMode(key); reset(); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              mode === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'bulk' && <BulkScrape />}

      {mode === 'single' && (
        <>
          {/* Stepper */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition
                  ${step === i ? 'bg-indigo-600 text-white'
                  : step > i ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-400'}`}>
                  {step > i ? <CheckCircle size={13} /> : <span className="w-4 text-center">{i + 1}</span>}
                  {s}
                </div>
                {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-300" />}
              </div>
            ))}
          </div>

          {/* Step 0 — Input */}
          {step === 0 && (
            <div className="card p-6 max-w-md">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Enter Train Number</h2>
              <div className="flex gap-3">
                <input
                  className="input flex-1 font-mono"
                  placeholder="e.g. 16128"
                  value={trainNo}
                  onChange={(e) => setTrainNo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                />
                <button className="btn-primary px-5" onClick={handleFetch} disabled={loading || !trainNo.trim()}>
                  {loading ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
                  {loading ? 'Fetching...' : 'Fetch'}
                </button>
              </div>
              {error && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={15} /> {error}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-3">
                Data is fetched from erail.in. Experimental — results may vary.
              </p>
            </div>
          )}

          {/* Step 1 — Preview */}
          {step === 1 && trainInfo && (
            <div className="space-y-4">
              <div className="card p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <TrainIcon size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{trainInfo.trainName}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      #{trainInfo.trainNumber} · Internal ID: {trainInfo.internalId} · {stops.length} stops
                    </p>
                    <div className="flex gap-1 mt-2">
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => {
                        const active = (runningDays >> i & 1) === 1;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setRunningDays((prev) => prev ^ (1 << i))}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                              active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary text-sm" onClick={reset}>Change</button>
                  <button className="btn-primary text-sm" onClick={handleImport} disabled={importing}>
                    {importing
                      ? <><Loader size={14} className="animate-spin" /> Importing...</>
                      : <><Download size={14} /> Import to DB</>}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <AlertTriangle size={15} /> {error}
                </div>
              )}

              <div className="card overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Stops Preview</span>
                  <span className="text-xs text-slate-400">{stops.length} stations</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {['#', 'Code', 'Station', 'Arrival', 'Departure', 'Distance', 'Coordinates'].map((h) => (
                          <th key={h} className="th">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stops.map((s, i) => (
                        <tr key={s.code} className="hover:bg-slate-50/60">
                          <td className="td">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                              ${i === 0 ? 'bg-emerald-500 text-white'
                              : i === stops.length - 1 ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'}`}>
                              {s.stopOrder}
                            </div>
                          </td>
                          <td className="td">
                            <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded tracking-widest">{s.code}</span>
                          </td>
                          <td className="td font-medium">{s.name}</td>
                          <td className="td font-mono text-slate-500">{s.arrivalTime ?? <span className="text-slate-300">—</span>}</td>
                          <td className="td font-mono text-slate-500">{s.departureTime ?? <span className="text-slate-300">—</span>}</td>
                          <td className="td text-slate-500">{s.distanceFromOrigin} km</td>
                          <td className="td">
                            {s.latitude != null
                              ? <span className="flex items-center gap-1 text-xs text-emerald-600"><MapPin size={11} />{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</span>
                              : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Done */}
          {step === 2 && importResult && (
            <div className="card p-8 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">Import Complete</h2>
              <p className="text-sm text-slate-500 mb-5">
                Train <span className="font-mono font-semibold">{trainInfo.trainNumber}</span> has been added to the database.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-2xl font-bold text-emerald-700">{importResult.created.length}</p>
                  <p className="text-emerald-600 text-xs mt-0.5">New stations created</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-2xl font-bold text-slate-700">{importResult.skipped.length}</p>
                  <p className="text-slate-500 text-xs mt-0.5">Existing stations reused</p>
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <button className="btn-secondary" onClick={reset}>
                  Scrape Another
                </button>
                <a href="/trains" className="btn-primary">
                  <ArrowRight size={15} /> View Trains
                </a>
              </div>
            </div>
          )}
        </>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
