import { useState } from 'react';
import { Modal } from './Modal';
import type { AvatarCategory, AvatarOption, OptionInput, OptionsStore } from '../types';

interface Props {
  store: OptionsStore;
  category: AvatarCategory;
  option?: AvatarOption;
  onSave: (data: OptionInput) => Promise<void>;
  onClose: () => void;
}

const NONE = '';

export function OptionForm({ store, category, option, onSave, onClose }: Props) {
  const [label, setLabel] = useState(option?.label ?? '');
  const [prompt, setPrompt] = useState(option?.prompt ?? '');
  const [useSwatch, setUseSwatch] = useState(Boolean(option?.swatch));
  const [swatch, setSwatch] = useState(option?.swatch ?? '#8b5cf6');
  const [depends, setDepends] = useState(option?.dependsOn ? `${option.dependsOn.category}::${option.dependsOn.option}` : NONE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherCategories = store.categories.filter((c) => c.id !== category.id && c.options.length > 0);
  const preview = category.template.replace(/\{value\}/g, prompt || label.toLowerCase() || '…');

  const submit = async () => {
    if (!label.trim()) {
      setError('Label is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const [depCat, depOpt] = depends.split('::');
      await onSave({
        label: label.trim(),
        prompt: prompt.trim() || label.trim().toLowerCase(),
        swatch: useSwatch ? swatch : undefined,
        dependsOn: depends && depCat && depOpt ? { category: depCat, option: depOpt } : null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={option ? `Edit option · ${category.name}` : `Add option · ${category.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : option ? 'Save changes' : 'Add option'}
          </button>
        </>
      }
    >
      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Label</span>
        <input className="field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Soft Waves" autoFocus />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Prompt text</span>
        <input
          className="field"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={label ? label.toLowerCase() : 'What gets inserted into the prompt'}
        />
        <span className="block text-xs text-slate-500">
          Goes into <code className="rounded bg-slate-800 px-1">{'{value}'}</code> → <em className="text-slate-300">{preview}</em>
        </span>
      </label>

      {otherCategories.length > 0 && (
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Only show when</span>
          <select className="field" value={depends} onChange={(e) => setDepends(e.target.value)}>
            <option value={NONE}>Always available</option>
            {otherCategories.map((c) => (
              <optgroup key={c.id} label={c.name}>
                {c.options.map((o) => (
                  <option key={o.id} value={`${c.id}::${o.id}`}>
                    {c.name} = {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className="block text-xs text-slate-500">
            Use this to split options by another choice, e.g. male vs female hairstyles.
          </span>
        </label>
      )}

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useSwatch} onChange={(e) => setUseSwatch(e.target.checked)} className="accent-violet-500" />
          Colour swatch
        </label>
        {useSwatch && (
          <>
            <input type="color" value={swatch} onChange={(e) => setSwatch(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent" />
            <input className="field !w-28" value={swatch} onChange={(e) => setSwatch(e.target.value)} />
          </>
        )}
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </Modal>
  );
}
