import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-in
      ${type === 'success' ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-white border-red-200 text-red-700'}`}>
      {type === 'success' ? <CheckCircle size={18} className="text-emerald-500" /> : <XCircle size={18} className="text-red-500" />}
      {message}
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600"><X size={14} /></button>
    </div>
  );
}
