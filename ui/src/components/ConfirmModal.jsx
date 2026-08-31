import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="card w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <h3 className="font-semibold text-slate-800">Confirm Delete</h3>
        </div>
        <p className="text-sm text-slate-500 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary bg-red-600 hover:bg-red-700 active:bg-red-800" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
