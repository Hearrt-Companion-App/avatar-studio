import { RotateCcw, Trash2 } from 'lucide-react';
import type { GeneratedAvatar } from '../types';

interface Props {
  items: GeneratedAvatar[];
  onView: (item: GeneratedAvatar) => void;
  onReuse: (item: GeneratedAvatar) => void;
  onDelete: (item: GeneratedAvatar) => void;
}

export function Gallery({ items, onView, onReuse, onDelete }: Props) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">History · {items.length}</h3>
      <div className="grid grid-cols-4 gap-2">
        {items.map((g) => (
          <div key={g.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
            <button className="block h-full w-full" onClick={() => onView(g)} title={g.prompt}>
              <img src={g.url} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
            </button>
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-0.5 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 transition group-hover:opacity-100">
              <button className="icon-btn !h-6 !w-6 text-slate-200" onClick={() => onReuse(g)} title="Load these selections">
                <RotateCcw size={12} />
              </button>
              <button className="icon-btn !h-6 !w-6 text-slate-200 hover:!text-rose-400" onClick={() => onDelete(g)} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
