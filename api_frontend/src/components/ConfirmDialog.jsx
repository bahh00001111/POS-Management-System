import { Loader2, Trash2, X } from 'lucide-react';

export default function ConfirmDialog({
  open = false,
  title = 'Confirm Delete',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-start justify-center p-4 pt-24 z-50">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl ring-1 ring-stone-200/60 overflow-hidden">
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center shrink-0">
              <Trash2 className="text-red-600" size={20} />
            </span>
            <h3 className="text-base font-bold text-stone-800 leading-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-stone-400 hover:text-stone-600 transition cursor-pointer"
            aria-label="Close confirmation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-stone-600">{message}</p>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 border border-stone-200 bg-white hover:bg-stone-100 transition disabled:opacity-60 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-600/20 transition disabled:opacity-60 cursor-pointer"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}