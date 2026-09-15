import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getItems = () => {
    const items = [];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    items.push({ key: 1, value: 1 });
    if (start > 2) items.push({ key: 'left-ellipsis', value: null });
    for (let i = start; i <= end; i++) items.push({ key: i, value: i });
    if (end < totalPages - 1) items.push({ key: 'right-ellipsis', value: null });
    if (totalPages > 1) items.push({ key: totalPages, value: totalPages });

    return items;
  };

  const btn =
    'w-9 h-9 inline-flex items-center justify-center rounded-lg text-xs font-medium transition select-none cursor-pointer';
  const defaultCls = `${btn} text-stone-600 hover:bg-stone-100`;
  const activeCls = `${btn} bg-coffee-600 text-white shadow-sm shadow-coffee-600/20`;
  const disabledCls = `${btn} text-stone-300 cursor-not-allowed`;

  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className={page === 1 ? disabledCls : defaultCls}
        title="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {getItems().map((item) =>
        item.value === null ? (
          <span
            key={item.key}
            className="w-9 h-9 inline-flex items-center justify-center text-xs text-stone-400 select-none"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={item.key}
            onClick={() => onPageChange(item.value)}
            className={item.value === page ? activeCls : defaultCls}
            aria-current={item.value === page ? 'page' : undefined}
          >
            {item.value}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className={page === totalPages ? disabledCls : defaultCls}
        title="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}