import { useState } from 'react';
import {
  Search, Train as TrainIcon, MapPin, Download, CheckCircle,
  AlertTriangle, Loader, ChevronRight, ArrowRight
} from 'lucide-react';
import { scrapeApi, trainsApi, stationsApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';

const STEPS = ['Enter Train No', 'Preview Stops', 'Import'];

export default function Scrape() {
  const [trainNo, setTrainNo] = useState('');
  const [step, setStep] = useState(0);
  const [trainInfo, setTrainInfo] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [importResult, setImportResult] = useState(null);

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

      const created = [];
      const skipped = [];
      const stopsWithIds = [];

      for (const stop of stops) {
        const code = stop.code.toUpperCase();
        let station = stationMap[code];

        if (!station) {
          // Create station from scraped data
          const res = await stationsApi.create({
            name: stop.name,
            code: code,
            city: stop.name,
            latitude: stop.latitude,
            longitude: stop.longitude,
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

      // Create the train
      await trainsApi.create({
        trainNumber: trainInfo.trainNumber,
        name: trainInfo.trainName,
        type: 'Express',
        status: 'active',
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
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Route Scraper"
        subtitle="Fetch and import train routes from erail.in"
      />

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
          {/* Train Info Card */}
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

          {/* Stops Table */}
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

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
