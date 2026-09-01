import { lazy, Suspense, useEffect, useMemo, useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Train as TrainIcon, ChevronRight,
  Search, SlidersHorizontal, Activity, CircleOff, Route, X,
  Copy, Download, ChevronUp, ChevronDown, ChevronLeft,
  ToggleLeft, ToggleRight, Clock, Ruler, Hash,
} from 'lucide-react';
import { trainsApi, stationsApi } from '../services/api';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import TrainForm from '../components/TrainForm';
const TrainRouteView = lazy(() => import('../components/TrainRouteView'));

const emptyTrain = { trainNumber: '', name: '', type: '', status: 'active' };
const PAGE_SIZE = 10;

function calcDuration(departure, arrival) {
  if (!departure || !arrival) return null;
  const [dh, dm] = departure.split(':').map(Number);
  const [ah, am] = arrival.split(':').map(Number);
  let mins = (ah * 60 + am) - (dh * 60 + dm);
  if (mins <= 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronUp size={12} className="text-slate-300" />;
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-indigo-500" />
    : <ChevronDown size={12} className="text-indigo-500" />;
}

function TrainRow({ train, onEdit, onDelete, onView, onDuplicate, onToggleStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [stops, setStops] = useState(null);
  const [loadingStops, setLoadingStops] = useState(false);
  const [toggling, setToggling] = useState(false);

  const toggleExpand = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (stops !== null) return;
    setLoadingStops(true);
    try {
      const res = await trainsApi.getById(train.id);
      setStops(res.data.stops || []);
    } finally {
      setLoadingStops(false);
    }
  };

  const handleToggle = async (e) => {
    e.stopPropagation();
    setToggling(true);
    try { await onToggleStatus(train.id); } finally { setToggling(false); }
  };

  const firstDep = stops?.[0]?.departureTime;
  const lastArr = stops?.at(-1)?.arrivalTime;
  const duration = calcDuration(firstDep, lastArr);
  const totalDist = stops?.at(-1)?.distanceFromOrigin;

  return (
    <>
      <tr className={`group border-b border-slate-100 transition-colors cursor-pointer ${expanded ? 'bg-indigo-50/20' : 'hover:bg-slate-50'}`} onClick={toggleExpand}>
        <td className="px-4 py-3.5 w-10">
          <ChevronRight size={14} className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        </td>

        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <TrainIcon size={15} className="text-white" />
            </div>
            <div>
              <div className="font-mono font-bold text-slate-800">{train.trainNumber}</div>
              <div className="text-[11px] text-slate-400">{new Date(train.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        </td>

        <td className="px-4 py-3.5">
          <div className="font-semibold text-slate-700">{train.name}</div>
          <div className="flex gap-0.5 mt-1.5">
            {['M','T','W','T','F','S','S'].map((d, i) => {
              const active = (train.runningDays >> i & 1) === 1;
              return (
                <span key={i} className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center ${
                  active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-300'
                }`}>{d}</span>
              );
            })}
          </div>
        </td>

        <td className="px-4 py-3.5">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">
            {train.type || '—'}
          </span>
        </td>

        <td className="px-4 py-3.5">
          <button
            onClick={handleToggle}
            disabled={toggling}
            title="Click to toggle status"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${train.status === 'active' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'} ${toggling ? 'opacity-50' : ''}`}
          >
            {train.status === 'active'
              ? <ToggleRight size={13} />
              : <ToggleLeft size={13} />}
            {train.status === 'active' ? 'Active' : 'Inactive'}
          </button>
        </td>

        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button title="View route" className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition" onClick={() => onView(train)}>
              <Route size={14} />
            </button>
            <button title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition" onClick={() => onEdit(train)}>
              <Pencil size={14} />
            </button>
            <button title="Duplicate" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition" onClick={() => onDuplicate(train.id)}>
              <Copy size={14} />
            </button>
            <button title="Delete" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition" onClick={() => onDelete(train.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-slate-50/60">
          <td colSpan={6} className="px-8 py-4">
            {loadingStops ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
                Loading route...
              </div>
            ) : !stops || stops.length === 0 ? (
              <div className="flex items-center justify-between bg-white border border-dashed border-slate-300 rounded-xl px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-600">No route configured</p>
                  <p className="text-xs text-slate-400 mt-0.5">Add stations to define this train's route.</p>
                </div>
                <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700" onClick={() => onEdit(train)}>
                  Configure route &rarr;
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {/* Route meta */}
                <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Hash size={12} /> <span className="font-semibold">{stops.length}</span> stops
                  </div>
                  {totalDist && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Ruler size={12} /> <span className="font-semibold">{totalDist} km</span>
                    </div>
                  )}
                  {duration && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock size={12} /> <span className="font-semibold">{duration}</span> journey
                    </div>
                  )}
                  {firstDep && lastArr && (
                    <div className="text-xs text-slate-400">{firstDep} &rarr; {lastArr}</div>
                  )}
                </div>
                {/* Timeline */}
                <div className="px-5 py-4">
                  <div className="flex flex-wrap gap-x-1 gap-y-3">
                    {stops.map((s, i) => {
                      const isFirst = i === 0;
                      const isLast = i === stops.length - 1;
                      return (
                        <div key={`${s.stationId}-${i}`} className="flex items-center">
                          <div className="flex flex-col items-center w-16">
                            <div className={`w-2.5 h-2.5 rounded-full border-2 ${isFirst ? 'bg-emerald-500 border-emerald-300' : isLast ? 'bg-indigo-600 border-indigo-300' : 'bg-white border-slate-400'}`} />
                            <div className="mt-1 text-[11px] font-mono font-bold text-slate-700 text-center">{s.code}</div>
                            {(s.departureTime || s.arrivalTime) && (
                              <div className="text-[9px] text-slate-400 text-center">{s.departureTime || s.arrivalTime}</div>
                            )}
                          </div>
                          {!isLast && <div className="w-4 h-px bg-slate-300 mx-0.5" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function Trains() {
  const [trains, setTrains] = useState([]);
  const [stations, setStations] = useState([]);
  const [view, setView] = useState('list');
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [editId, setEditId] = useState(null);
  const [initialTrain, setInitialTrain] = useState(emptyTrain);
  const [initialStops, setInitialStops] = useState([]);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const load = async () => {
    const [t, s] = await Promise.all([trainsApi.getAll(), stationsApi.getAll()]);
    setTrains(t.data);
    setStations(s.data);
  };

  useEffect(() => { load(); }, []);

  // Keyboard shortcut N → Add Train
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
        openAdd();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const trainTypes = useMemo(() => [...new Set(trains.map((t) => t.type).filter(Boolean))], [trains]);

  const sorted = useMemo(() => {
    return [...trains].sort((a, b) => {
      let av = a[sortField] ?? '';
      let bv = b[sortField] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [trains, sortField, sortDir]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((t) => {
      const matchSearch = !q || t.trainNumber?.toLowerCase().includes(q) || t.name?.toLowerCase().includes(q) || t.type?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchType = typeFilter === 'all' || t.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [sorted, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const resetFilters = () => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setPage(1); };

  const exportCSV = useCallback(() => {
    const rows = [['ID', 'Train Number', 'Name', 'Type', 'Status', 'Created At']];
    filtered.forEach((t) => rows.push([t.id, t.trainNumber, t.name, t.type, t.status, new Date(t.createdAt).toLocaleDateString()]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'trains.csv';
    a.click();
  }, [filtered]);

  const openAdd = () => { setEditId(null); setInitialTrain(emptyTrain); setInitialStops([]); setView('form'); };

  const openEdit = async (t) => {
    setEditId(t.id);
    setInitialTrain({ trainNumber: t.trainNumber, name: t.name, type: t.type, status: t.status, runningDays: t.runningDays ?? 127 });
    const res = await trainsApi.getById(t.id);
    setInitialStops(res.data.stops.map((s) => ({ stationId: String(s.stationId), distanceFromOrigin: s.distanceFromOrigin, arrivalTime: s.arrivalTime || '', departureTime: s.departureTime || '' })));
    setView('form');
  };

  const openView = (t) => { setSelectedTrain(t); setView('view'); };

  const handleSaved = () => { setView('list'); load(); setToast({ message: `Train ${editId ? 'updated' : 'added'} successfully`, type: 'success' }); };

  const handleDelete = (id) => {
    setConfirm({
      message: 'This will permanently delete the train and all its stops.',
      onConfirm: async () => { await trainsApi.remove(id); setConfirm(null); load(); setToast({ message: 'Train deleted', type: 'success' }); },
    });
  };

  const handleDuplicate = async (id) => {
    await trainsApi.duplicate(id);
    load();
    setToast({ message: 'Train duplicated as inactive copy', type: 'success' });
  };

  const handleToggleStatus = async (id) => {
    await trainsApi.toggleStatus(id);
    load();
  };

  if (view === 'form') return <TrainForm editId={editId} initialTrain={initialTrain} initialStops={initialStops} stations={stations} onSave={handleSaved} onCancel={() => setView('list')} />;
  if (view === 'view') return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-slate-400">Loading...</div>}>
      <TrainRouteView train={selectedTrain} onBack={() => setView('list')} />
    </Suspense>
  );

  const activeCount = trains.filter((t) => t.status === 'active').length;

  const SortTh = ({ field, label }) => (
    <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600">
        {label} <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="min-h-screen bg-[#f7f8fc] p-6 lg:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Trains</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {trains.length} total &middot; {activeCount} active
            <span className="ml-2 text-slate-300 text-xs">Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-mono">N</kbd> to add</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} title="Export CSV" className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition">
            <Download size={15} /> Export
          </button>
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-sm shadow-indigo-200">
            <Plus size={16} /> Add Train
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search number, name or type..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-slate-400 hidden sm:block" />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-300">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-300">
              <option value="all">All Types</option>
              {trainTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Result bar */}
        <div className="px-5 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-600">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-slate-600">{filtered.length}</span> trains
          </p>
          {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button onClick={resetFilters} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Clear filters</button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="w-10 px-4 py-3" />
                <SortTh field="trainNumber" label="Train" />
                <SortTh field="name" label="Name" />
                <SortTh field="type" label="Type" />
                <SortTh field="status" label="Status" />
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((train) => (
                <TrainRow
                  key={train.id}
                  train={train}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onView={openView}
                  onDuplicate={handleDuplicate}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="py-16 text-center">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                        <TrainIcon size={24} className="text-slate-300" />
                      </div>
                      <p className="font-semibold text-slate-600">{trains.length ? 'No trains match your filters' : 'No trains registered'}</p>
                      <p className="text-xs text-slate-400 mt-1">{trains.length ? 'Try changing your search or filters.' : 'Click Add Train or press N to get started.'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${p === page ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
