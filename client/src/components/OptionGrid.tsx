import { Link2, Pencil, Plus, Trash2, WandSparkles, X } from 'lucide-react';
import { useState } from 'react';
import { maxSelect } from '../prompt';
import type { AvatarCategory, AvatarOption, OptionsStore, Selections } from '../types';

interface Props {
  store: OptionsStore;
  category: AvatarCategory;
  selections: Selections;
  onToggle: (optionId: string) => void;
  onClear: () => void;
  onAdd: () => void;
  onQuickAdd: (text: string) => Promise<void>;
  onEdit: (o: AvatarOption) => void;
  onEditCategory: () => void;
  onDelete: (o: AvatarOption) => void;
}

interface Group {
  key: string;
  title: string | null;
  hint: string | null;
  options: AvatarOption[];
}

/**
 * Split a category's options into groups by their dependency.
 * - Options with no dependency form the first (untitled) group.
 * - Options gated on another category's option are grouped under that option's label
 *   (e.g. "Male" / "Female"). When the gating option is not selected the group is still
 *   shown, so the user can pick from it and the dependency gets set automatically.
 * - When the gating category HAS a selection, only the matching group is shown.
 */
function groupOptions(store: OptionsStore, category: AvatarCategory, selections: Selections): Group[] {
  const plain = category.options.filter((o) => !o.dependsOn);
  const groups: Group[] = plain.length ? [{ key: '', title: null, hint: null, options: plain }] : [];

  const byDep = new Map<string, AvatarOption[]>();
  for (const o of category.options) {
    if (!o.dependsOn) continue;
    const key = `${o.dependsOn.category}::${o.dependsOn.option}`;
    byDep.set(key, [...(byDep.get(key) ?? []), o]);
  }

  for (const [key, options] of byDep) {
    const [catId, optId] = key.split('::');
    const depCat = store.categories.find((c) => c.id === catId);
    const depOpt = depCat?.options.find((o) => o.id === optId);
    const depSelection = selections[catId] ?? [];
    if (depSelection.length > 0 && !depSelection.includes(optId)) continue; // gated out
    groups.push({
      key,
      title: depOpt?.label ?? optId,
      hint: depSelection.length === 0 && depCat ? `Picking one of these also sets ${depCat.name} to ${depOpt?.label ?? optId}` : null,
      options,
    });
  }
  return groups;
}

export function OptionGrid({ store, category, selections, onToggle, onClear, onAdd, onQuickAdd, onEdit, onEditCategory, onDelete }: Props) {
  const [custom, setCustom] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = selections[category.id] ?? [];
  const limit = maxSelect(category);
  const groups = groupOptions(store, category, selections);

  const submitCustom = async () => {
    const text = custom.trim();
    if (!text) return;
    setAdding(true);
    setError(null);
    try {
      await onQuickAdd(text);
      setCustom('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const customPreview = category.template.replace(/\{value\}/g, custom.trim() || '…');

  const renderCard = (o: AvatarOption) => {
    const isSelected = selected.includes(o.id);
    const atLimit = !isSelected && limit > 1 && selected.length >= limit;
    return (
      <div
        key={o.id}
        className={`group relative rounded-xl border p-3 text-left transition ${
          isSelected
            ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500'
            : atLimit
              ? 'border-slate-800 bg-slate-900/50 opacity-50'
              : 'border-slate-800 bg-slate-900 hover:border-slate-600'
        }`}
      >
        <button className="block w-full text-left" onClick={() => onToggle(o.id)} title={atLimit ? `Deselect one first (max ${limit})` : undefined}>
          <div className="mb-2 flex items-center gap-2 pr-12">
            {o.swatch ? (
              <span className="h-6 w-6 shrink-0 rounded-full border border-white/20 shadow-inner" style={{ background: o.swatch }} />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300">
                {o.label.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate text-sm font-medium">{o.label}</span>
          </div>
          <p className="line-clamp-2 text-xs text-slate-500">{o.prompt}</p>
        </button>
        <div className="absolute right-1.5 top-1.5 flex rounded-md bg-slate-900/90 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
          <button className="icon-btn" onClick={() => onEdit(o)} title="Edit">
            <Pencil size={13} />
          </button>
          <button className="icon-btn hover:!text-rose-400" onClick={() => onDelete(o)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {category.name}
            {limit > 1 && (
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                choose up to {limit} · {selected.length}/{limit}
              </span>
            )}
            <button className="icon-btn" onClick={onEditCategory} title="Edit category name / question / template">
              <Pencil size={13} />
            </button>
          </h2>
          {category.question && <p className="text-sm text-slate-300">{category.question}</p>}
          <p className="truncate text-xs text-slate-500">
            Template: <span className="text-slate-400">{category.template}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <button className="btn-ghost !py-1 text-xs" onClick={onClear}>
              <X size={12} /> Clear
            </button>
          )}
          <button className="btn-primary !py-1 text-xs" onClick={onAdd}>
            <Plus size={12} /> Add option
          </button>
        </div>
      </div>

      {/* Quick custom value: adds an option to this category and selects it in one go */}
      <div className="mb-3 rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitCustom();
          }}
        >
          <input
            className="field"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={`Type your own ${category.name.toLowerCase()}… e.g. "${category.options[0]?.prompt ?? 'anything'}"`}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={adding || !custom.trim()}>
            <WandSparkles size={14} /> {adding ? 'Adding…' : 'Add & use'}
          </button>
        </form>
        <p className="mt-1.5 text-xs text-slate-500">
          Saved as a new option and selected. Goes into the prompt as: <em className="text-slate-300">{customPreview}</em>
        </p>
        {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
      </div>

      {category.options.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
          No options yet. Type one above or{' '}
          <button className="text-violet-400 hover:underline" onClick={onAdd}>add one with details</button>.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.key}>
              {g.title && (
                <div className="mb-2 flex items-center gap-2">
                  <Link2 size={13} className="text-slate-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">{g.title}</h3>
                  {g.hint && <span className="text-xs text-slate-500">· {g.hint}</span>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{g.options.map(renderCard)}</div>
            </section>
          ))}
          <button
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-700 py-3 text-sm text-slate-400 transition hover:border-violet-500 hover:text-violet-300"
            onClick={onAdd}
          >
            <Plus size={14} /> Add option
          </button>
        </div>
      )}
    </div>
  );
}
