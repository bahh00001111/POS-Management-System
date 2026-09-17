import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

export default function ExportMenu({ onExport, loading = false, compact = false }) {
  const [open, setOpen] = useState(false);

  const choose = (format) => {
    setOpen(false);
    onExport(format);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        title="Export to Excel or Word"
        className={`inline-flex items-center gap-2 bg-coffee-600 hover:bg-coffee-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm shadow-sm shadow-coffee-600/20 transition cursor-pointer whitespace-nowrap ${
          compact ? "px-3 py-1.5" : "px-4 py-2"
        }`}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        Export
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 z-30 w-44 bg-white border border-stone-200 rounded-xl shadow-lg p-1.5">
            <button
              type="button"
              onClick={() => choose("excel")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-coffee-50 hover:text-coffee-700 transition cursor-pointer"
            >
              <FileSpreadsheet size={16} className="text-emerald-600" /> Excel (.xls)
            </button>
            <button
              type="button"
              onClick={() => choose("word")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-coffee-50 hover:text-coffee-700 transition cursor-pointer"
            >
              <FileText size={16} className="text-blue-600" /> Word (.doc)
            </button>
          </div>
        </>
      )}
    </div>
  );
}