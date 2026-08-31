import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Train as TrainIcon, ChevronRight, Map } from 'lucide-react';
import { trainsApi, stationsApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import TrainForm from '../components/TrainForm';
import TrainMapView from '../components/TrainMapView';

const emptyTrain = { trainNumber: '', name: '', type: '', status: 'active' };

// ─── Expanded Stop Preview Row ────────────────────────────────────────────────
function TrainRow({ train, onEdit, onDelete, onView }) {
  const [expanded, setExpanded] = useState(false);
  const [stops, setStops] = useState([]);
  const [loadingStops, setLoadingStops] = useState(false);

  const toggleExpand = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    setLoadingStops(true);
    const res = await trainsApi.getById(train.id);
    setStops(res.data.stops || []);
    setLoadingStops(false);
  };

  return (
    <>
      <tr className="hover:bg-slate-50/60 transition-colors cursor-pointer" onClick={toggleExpand}>
        <td className="td w-8">
          <ChevronRight size={15} className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        </td>
        <td className="td">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <TrainIcon size={14} className="text-indigo-600" />
            </div>
            <span className="font-mono font-semibold text-slate-800">{train.trainNumber}</span>
          </div>
        </td>
        <td className="td font-medium">{train.name}</td>
        <td className="td">
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">{train.type}</span>
        </td>
        <td className="td">
          <span className={train.status === 'active' ? 'badge-active' : 'badge-inactive'}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${train.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {train.status}
          </span>
        </td>
        <td className="td" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-600 text-xs font-medium rounded-lg hover:bg-violet-100 transition"
              onClick={() => onView(train)}>
              <Map size={13} /> View
            </button>
            <button className="btn-edit" onClick={() => onEdit(train)}><Pencil size={13} /> Edit</button>
            <button className="btn-danger" onClick={() => onDelete(train.id)}><Trash2 size={13} /> Delete</button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={6} className="bg-slate-50/80 px-8 py-4 border-t border-slate-100">
            {loadingStops ? (
              <p className="text-sm text-slate-400">Loading stops...</p>
            ) : stops.length === 0 ? (
              <p className="text-sm text-slate-400 flex items-center gap-2">
                No stops configured.
                <button className="text-indigo-600 hover:underline" onClick={() => onEdit(train)}>Edit train to add stops</button>
              </p>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-400 mb-3">{stops.length} stops</p>
                <div className="flex items-center flex-wrap gap-0">
                  {stops.map((s, i) => (
                    <div key={s.stationId} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full border-2
                          ${i === 0 ? 'border-emerald-500 bg-emerald-500'
                          : i === stops.length - 1 ? 'border-indigo-600 bg-indigo-600'
                          : 'border-slate-400 bg-white'}`} />
                        <span title={s.stationName} className="text-xs text-slate-600 font-mono mt-1 whitespace-nowrap cursor-help">{s.code}</span>
                        {s.departureTime && <span className="text-xs text-slate-400">{s.departureTime}</span>}
                        {!s.departureTime && s.arrivalTime && <span className="text-xs text-slate-400">{s.arrivalTime}</span>}
                      </div>
                      {i < stops.length - 1 && <div className="w-8 h-px bg-slate-300 mb-4" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Trains() {
  const [trains, setTrains] = useState([]);
  const [stations, setStations] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'form' | 'view'
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [editId, setEditId] = useState(null);
  const [initialTrain, setInitialTrain] = useState(emptyTrain);
  const [initialStops, setInitialStops] = useState([]);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    const [t, s] = await Promise.all([trainsApi.getAll(), stationsApi.getAll()]);
    setTrains(t.data);
    setStations(s.data);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditId(null);
    setInitialTrain(emptyTrain);
    setInitialStops([]);
    setView('form');
  };

  const openEdit = async (t) => {
    setEditId(t.id);
    setInitialTrain({ trainNumber: t.trainNumber, name: t.name, type: t.type, status: t.status });
    const res = await trainsApi.getById(t.id);
    setInitialStops(res.data.stops.map((s) => ({
      stationId: String(s.stationId),
      distanceFromOrigin: s.distanceFromOrigin,
      arrivalTime: s.arrivalTime || '',
      departureTime: s.departureTime || '',
    })));
    setView('form');
  };

  const openView = (t) => {
    setSelectedTrain(t);
    setView('view');
  };

  const handleSaved = () => {
    setView('list');
    load();
    setToast({ message: `Train ${editId ? 'updated' : 'added'} successfully`, type: 'success' });
  };

  const handleDelete = (id) => {
    setConfirm({
      message: 'This will permanently delete the train and all its stops.',
      onConfirm: async () => {
        await trainsApi.remove(id);
        setConfirm(null);
        load();
        setToast({ message: 'Train deleted', type: 'success' });
      },
    });
  };

  if (view === 'form') {
    return (
      <TrainForm
        editId={editId}
        initialTrain={initialTrain}
        initialStops={initialStops}
        stations={stations}
        onSave={handleSaved}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'view') {
    return (
      <TrainMapView
        train={selectedTrain}
        onBack={() => setView('list')}
      />
    );
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Trains"
        subtitle={`${trains.length} train${trains.length !== 1 ? 's' : ''} registered`}
        action={
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Train
          </button>
        }
      />

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="th w-8" />
              {['Train Number', 'Name', 'Type', 'Status', 'Actions'].map((h) => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trains.map((t) => (
              <TrainRow key={t.id} train={t} onEdit={openEdit} onDelete={handleDelete} onView={openView} />
            ))}
            {!trains.length && (
              <tr>
                <td colSpan={6} className="td text-center text-slate-400 py-16">
                  <TrainIcon size={36} className="mx-auto mb-3 text-slate-200" />
                  <p className="font-medium">No trains found</p>
                  <p className="text-xs mt-1">Click "Add Train" to get started</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
