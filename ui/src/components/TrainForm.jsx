import { useState } from 'react';
import {
  Plus, X, ChevronDown, GripVertical, Check, ArrowLeft, Save, MapPin
} from 'lucide-react';
import { trainsApi, stationsApi } from '../services/api';
import { parseCoordinates, recalcDistances } from '../services/coordinates';

const TYPES = ['Express', 'Superfast', 'Local', 'Passenger', 'Freight'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const emptyStop = { stationId: '', distanceFromOrigin: '', arrivalTime: '', departureTime: '' };
const emptyNewStation = { name: '', code: '', city: '', coordinates: '' };

// ─── Inline New Station ───────────────────────────────────────────────────────
function NewStationInline({ onSave, onCancel }) {
  const [form, setForm] = useState(emptyNewStation);
  const [coordError, setCoordError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name || !form.code || !form.city) return;
    const { latitude, longitude } = parseCoordinates(form.coordinates);
    if (form.coordinates.trim() && latitude === null) {
      setCoordError('Use format: lat, lng');
      return;
    }
    setSaving(true);
    try {
      const res = await stationsApi.create({ name: form.name, code: form.code, city: form.city, latitude, longitude });
      onSave(res.data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
      <p className="text-xs font-semibold text-indigo-700">New Station</p>
      <div className="grid grid-cols-3 gap-2">
        <input className="input py-1.5 text-xs" placeholder="Name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input py-1.5 text-xs uppercase" placeholder="Code" value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={10} />
        <input className="input py-1.5 text-xs" placeholder="City" value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      <div>
        <input
          className={`input py-1.5 text-xs font-mono w-full ${coordError ? 'border-red-400' : ''}`}
          placeholder="Coordinates: lat, lng (optional)"
          value={form.coordinates}
          onChange={(e) => { setForm({ ...form, coordinates: e.target.value }); setCoordError(''); }}
        />
        {coordError && <p className="text-xs text-red-500 mt-0.5">{coordError}</p>}
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary text-xs py-1 px-2.5" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-primary text-xs py-1 px-2.5" onClick={handleSave} disabled={saving}>
          <Check size={12} /> {saving ? 'Saving...' : 'Add Station'}
        </button>
      </div>
    </div>
  );
}

// ─── Stop Row ─────────────────────────────────────────────────────────────────
function StopRow({ stop, index, total, stations, onUpdate, onRemove, onStationCreated }) {
  const [showNewStation, setShowNewStation] = useState(false);
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const selectedStation = stations.find((s) => String(s.id) === String(stop.stationId));
  const hasCoords = selectedStation?.latitude != null && selectedStation?.longitude != null;

  const halt = stop.arrivalTime && stop.departureTime ? (() => {
    const [ah, am] = stop.arrivalTime.split(':').map(Number);
    const [dh, dm] = stop.departureTime.split(':').map(Number);
    const diff = (dh * 60 + dm) - (ah * 60 + am);
    return diff > 0 ? `${diff} min` : null;
  })() : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <GripVertical size={13} className="text-slate-300 flex-shrink-0" />
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
          ${isFirst ? 'bg-emerald-500 text-white' : isLast ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
          {index + 1}
        </div>
        <div className="relative flex-1">
          <select className="input py-1.5 text-sm appearance-none pr-8" value={stop.stationId}
            onChange={(e) => onUpdate('stationId', e.target.value)} required>
            <option value="">Select station</option>
            {stations.map((st) => <option key={st.id} value={st.id}>{st.name} ({st.code})</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        {stop.stationId && (
          <span title={hasCoords ? 'Coordinates available' : 'No coordinates — distance cannot be auto-calculated'}
            className={`flex-shrink-0 flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md ${hasCoords ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
            <MapPin size={11} />
            {hasCoords ? 'GPS' : 'No GPS'}
          </span>
        )}
        <button type="button"
          className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap flex-shrink-0 flex items-center gap-1"
          onClick={() => setShowNewStation((v) => !v)}>
          <Plus size={12} /> New
        </button>
        <input type="number" className="input py-1.5 text-sm w-24 flex-shrink-0" placeholder="km" min="0"
          value={stop.distanceFromOrigin}
          onChange={(e) => onUpdate('distanceFromOrigin', e.target.value)} />
        <button type="button" onClick={onRemove} className="text-slate-300 hover:text-red-500 transition flex-shrink-0">
          <X size={15} />
        </button>
      </div>

      {showNewStation && (
        <NewStationInline
          onSave={(newStation) => {
            onStationCreated(newStation);
            onUpdate('stationId', String(newStation.id));
            setShowNewStation(false);
          }}
          onCancel={() => setShowNewStation(false)}
        />
      )}

      <div className="grid grid-cols-3 gap-3 pl-8 mt-2">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Arrival</label>
          {isFirst ? <span className="text-xs text-slate-300">—</span> : (
            <input type="time" className="input py-1.5 text-sm"
              value={stop.arrivalTime} onChange={(e) => onUpdate('arrivalTime', e.target.value)} />
          )}
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Departure</label>
          {isLast ? <span className="text-xs text-slate-300">—</span> : (
            <input type="time" className="input py-1.5 text-sm"
              value={stop.departureTime} onChange={(e) => onUpdate('departureTime', e.target.value)} />
          )}
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Halt</label>
          {halt
            ? <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{halt}</span>
            : <span className="text-xs text-slate-300">—</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Full Page Train Form ─────────────────────────────────────────────────────
export default function TrainForm({ editId, initialTrain, initialStops, stations: initStations, onSave, onCancel }) {
  const [trainForm, setTrainForm] = useState({ ...initialTrain, runningDays: initialTrain.runningDays ?? 127 });
  const [stops, setStops] = useState(initialStops);
  const [stations, setStations] = useState(initStations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const stationsMap = Object.fromEntries(stations.map((s) => [String(s.id), s]));

  const updateStop = (i, field, value) => {
    let updated = [...stops];
    updated[i] = { ...updated[i], [field]: value };
    if (field === 'stationId') updated = recalcDistances(updated, stationsMap);
    setStops(updated);
  };

  const addStop = () => setStops([...stops, { ...emptyStop }]);
  const removeStop = (i) => setStops(stops.filter((_, idx) => idx !== i));
  const handleStationCreated = (s) => setStations((prev) => [...prev, s]);

  const fixDistances = () => setStops(recalcDistances(stops, stationsMap));

  const canFix = stops.length >= 2 &&
    stops.some((s) => {
      const st = stationsMap[s.stationId];
      return st?.latitude != null && st?.longitude != null;
    });

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...trainForm,
        runningDays: trainForm.runningDays ?? 127,
        stops: stops.map((s, i) => ({
          stationId: parseInt(s.stationId),
          stopOrder: i + 1,
          distanceFromOrigin: parseFloat(s.distanceFromOrigin) || 0,
          arrivalTime: s.arrivalTime || null,
          departureTime: s.departureTime || null,
        })),
      };
      if (editId) await trainsApi.update(editId, payload);
      else await trainsApi.create(payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving train');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 transition text-slate-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{editId ? 'Edit Train' : 'Add New Train'}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{editId ? 'Update train details and stops' : 'Fill in details and add stops'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={loading}>
            <Save size={15} /> {loading ? 'Saving...' : editId ? 'Update Train' : 'Save Train'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-6">
        {/* Train Details */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">Train Details</h2>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="label">Train Number</label>
              <input className="input" placeholder="e.g. 16127" value={trainForm.trainNumber}
                onChange={(e) => setTrainForm({ ...trainForm, trainNumber: e.target.value })} required />
            </div>
            <div>
              <label className="label">Train Name</label>
              <input className="input" placeholder="e.g. Chennai Express" value={trainForm.name}
                onChange={(e) => setTrainForm({ ...trainForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Type</label>
              <div className="relative">
                <select className="input appearance-none pr-8" value={trainForm.type}
                  onChange={(e) => setTrainForm({ ...trainForm, type: e.target.value })} required>
                  <option value="">Select type</option>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="label">Running Days</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((day, i) => {
                  const bit = 1 << i;
                  const active = (trainForm.runningDays & bit) !== 0;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setTrainForm({ ...trainForm, runningDays: trainForm.runningDays ^ bit })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setTrainForm({ ...trainForm, runningDays: 127 })} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition">Daily</button>
                <button type="button" onClick={() => setTrainForm({ ...trainForm, runningDays: 0 })} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition">Clear</button>
              </div>
            </div>

            <div>
              <label className="label">Status</label>
              <div className="flex gap-3">
                {['active', 'inactive'].map((s) => (
                  <label key={s} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border cursor-pointer text-sm font-medium transition
                    ${trainForm.status === s ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <input type="radio" className="hidden" value={s} checked={trainForm.status === s}
                      onChange={() => setTrainForm({ ...trainForm, status: s })} />
                    <span className={`w-2 h-2 rounded-full ${s === 'active' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stops */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">
              Stops <span className="text-slate-400 font-normal">— with timings & distances</span>
            </h2>
            <div className="flex gap-2">
              {canFix && (
                <button type="button"
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition"
                  onClick={fixDistances}>
                  <MapPin size={12} /> Fix Distances
                </button>
              )}
              <button type="button" className="btn-secondary text-xs py-1.5 px-3" onClick={addStop}>
                <Plus size={13} /> Add Stop
              </button>
            </div>
          </div>

          {stops.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400">
              <MapPin size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No stops yet. Click "Add Stop" to begin.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stops.map((stop, i) => (
                <StopRow
                  key={i} stop={stop} index={i} total={stops.length}
                  stations={stations}
                  onUpdate={(field, value) => updateStop(i, field, value)}
                  onRemove={() => removeStop(i)}
                  onStationCreated={handleStationCreated}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
