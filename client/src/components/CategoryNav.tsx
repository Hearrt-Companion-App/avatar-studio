import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { selectedLabels } from '../prompt';
import type { AvatarCategory, Selections } from '../types';

interface Props {
  categories: AvatarCategory[];
  activeId: string | null;
  selections: Selections;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (c: AvatarCategory) => void;
  onDelete: (c: AvatarCategory) => void;
}

export function CategoryNav({ categories, activeId, selections, onSelect, onAdd, onEdit, onDelete }: Props) {
  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
      {categories.map((c) => {
        const chosen = selectedLabels(c, selections);
        const active = c.id === activeId;
        return (
          <div
            key={c.id}
            className={`group flex shrink-0 items-center gap-1 rounded-lg border py-2 pl-3 pr-1 text-left transition lg:shrink ${
              active
                ? 'border-violet-500/60 bg-violet-500/10'
                : 'border-transparent hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <button className="min-w-0 flex-1 text-left" onClick={() => onSelect(c.id)}>
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{c.name}</span>
                {chosen.length > 0 && <Check size={14} className="shrink-0 text-emerald-400" />}
              </div>
              <div className="flex items-center gap-1.5 truncate text-xs text-slate-400">
                {chosen[0]?.swatch && (
                  <span className="inline-block h-2.5 w-2.5 rounded-full border border-white/20" style={{ background: chosen[0].swatch }} />
                )}
                <span className="truncate">{chosen.length ? chosen.map((o) => o.label).join(' + ') : 'Not set'}</span>
              </div>
            </button>
            <div className="flex shrink-0 items-center opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
              <button className="icon-btn" onClick={() => onEdit(c)} title="Edit category">
                <Pencil size={13} />
              </button>
              <button className="icon-btn hover:!text-rose-400" onClick={() => onDelete(c)} title="Delete category">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        );
      })}
      <button className="btn-ghost shrink-0 justify-start border-dashed lg:mt-1" onClick={onAdd}>
        <Plus size={14} /> Add category
      </button>
    </nav>
  );
}
