import { useEffect } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    bar: "bg-emerald-500",
    ring: "ring-emerald-100",
    title: "text-slate-800",
  },
  error: {
    icon: XCircle,
    iconColor: "text-rose-600",
    bar: "bg-rose-500",
    ring: "ring-rose-100",
    title: "text-rose-800",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-600",
    bar: "bg-blue-500",
    ring: "ring-blue-100",
    title: "text-slate-800",
  },
};

export default function Toast({ toast, onClose }) {
  const duration = toast.duration || 5000;

  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), duration);
    return () => clearTimeout(timer);
  }, [duration, onClose, toast.id]);

  const variant = VARIANTS[toast.type] || VARIANTS.info;
  const Icon = variant.icon;

  return (
    <div className="toast-enter pointer-events-auto relative overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${variant.bar}`} />
      <div className="flex items-start gap-3 py-3 pl-4 pr-3">
        <Icon size={20} className={`mt-0.5 flex-shrink-0 ${variant.iconColor}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${variant.title}`}>
            {toast.title}
          </p>
          {toast.message && (
            <p className="mt-0.5 text-sm text-slate-600 break-words">
              {toast.message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onClose(toast.id)}
          className="text-slate-400 hover:text-slate-600 transition flex-shrink-0"
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}