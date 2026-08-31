import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, MapPin, X } from 'lucide-react';
import { stationsApi } from '../services/api';
import { parseCoordinates, formatCoordinates } from '../services/coordinates';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

const empty = { name: '', code: '', city: '', coordinates: '' };

export default function Stations() {
  const [stations, setStations] = useState([]);
  const [form, setForm] = useState(empty);
  const [coordError, setCoordError] = useState('');
  const [editId, setEditId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await stationsApi.getAll();
    setStations(res.data);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(empty); setCoordError(''); setEditId(null); setPanelOpen(true); };

  const openEdit = (s) => {
    setForm({ name: s.name, code: s.code, city: s.city, coordinates: formatCoordinates(s.latitude, s.longitude) });
    setCoordError('');
    setEditId(s.id);
    setPanelOpen(true);
  };

  const closePanel = () => { setPanelOpen(false); setEditId(null); setForm(empty); setCoordError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCoordError('');

    const { latitude, longitude } = parseCoordinates(form.coordinates);
    if (form.coordinates.trim() && (latitude === null || longitude === null)) {
      setCoordError('Enter valid coordinates as: lat, lng (e.g. 13.0827, 80.2707)');
      return;
    }

    setLoading(true);
    try {
      const payload = { name: form.name, code: form.code, city: form.city, latitude, longitude };
      if (editId) await stationsApi.update(editId, payload);
      else await stationsApi.create(payload);
      closePanel();
      load();
      setToast({ message: `Station ${editId ? 'updated' : 'added'} successfully`, type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Error saving station', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setConfirm({
      message: 'This will permanently delete the station.',
      onConfirm: async () => {
        await stationsApi.remove(id);
        setConfirm(null);
        load();
        setToast({ message: 'Station deleted', type: 'success' });
      },
    });
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Stations"
        subtitle={`${stations.length} station${stations.length !== 1 ? 's' : ''} registered`}
        action={
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Station
          </button>
        }
      />

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Station Name', 'Code', 'City', 'Coordinates', 'Actions'].map((h) => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stations.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="td">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <MapPin size={14} className="text-amber-600" />
                    </div>
                    <span className="font-medium">{s.name}</span>
                  </div>
                </td>
                <td className="td">
                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-xs tracking-widest">{s.code}</span>
                </td>
                <td className="td text-slate-500">{s.city}</td>
                <td className="td">
                  {s.latitude != null && s.longitude != null
                    ? <span className="font-mono text-xs text-slate-500">{s.latitude}, {s.longitude}</span>
                    : <span className="text-slate-300 text-xs">—</span>}
                </td>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <button className="btn-edit" onClick={() => openEdit(s)}><Pencil size={13} /> Edit</button>
                    <button className="btn-danger" onClick={() => handleDelete(s.id)}><Trash2 size={13} /> Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!stations.length && (
              <tr><td colSpan={5} className="td text-center text-slate-400 py-12">
                <MapPin size={32} className="mx-auto mb-2 text-slate-300" />
                No stations found. Add your first station.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closePanel} />
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">{editId ? 'Edit Station' : 'Add New Station'}</h2>
              <button onClick={closePanel} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 px-6 py-5 space-y-4">
              <div>
                <label className="label">Station Name</label>
                <input className="input" placeholder="e.g. Chennai Central" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Station Code</label>
                <input className="input font-mono tracking-widest uppercase" placeholder="e.g. MAS" value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={10} required />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" placeholder="e.g. Chennai" value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })} required />
              </div>
              <div>
                <label className="label">Coordinates <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                <input
                  className={`input font-mono ${coordError ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="e.g. 13.0827, 80.2707"
                  value={form.coordinates}
                  onChange={(e) => { setForm({ ...form, coordinates: e.target.value }); setCoordError(''); }}
                />
                {coordError
                  ? <p className="text-xs text-red-500 mt-1">{coordError}</p>
                  : <p className="text-xs text-slate-400 mt-1">Enter as latitude, longitude</p>}
              </div>
            </form>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
              <button className="btn-secondary flex-1" onClick={closePanel}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : editId ? 'Update Station' : 'Add Station'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
