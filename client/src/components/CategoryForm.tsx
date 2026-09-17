import { useState } from 'react';
import { Modal } from './Modal';
import type { AvatarCategory, CategoryInput } from '../types';

interface Props {
  category?: AvatarCategory;
  onSave: (data: CategoryInput) => Promise<void>;
  onClose: () => void;
}

export function CategoryForm({ category, onSave, onClose }: Props) {
  const [name, setName] = useState(category?.name ?? '');
  const [question, setQuestion] = useState(category?.question ?? '');
  const [template, setTemplate] = useState(category?.template ?? '');
  const [maxSelect, setMaxSelect] = useState(String(category?.maxSelect ?? 1));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveTemplate = template.trim() || (name ? `${name}: {value}.` : '');

  const submit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (effectiveTemplate && !effectiveTemplate.includes('{value}')) {
      setError('Template must contain {value}');
      return;
    }
    const max = Math.max(1, parseInt(maxSelect, 10) || 1);
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), template: effectiveTemplate, question: question.trim() || undefined, maxSelect: max });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={category ? 'Edit category' : 'New category'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : category ? 'Save changes' : 'Create category'}
          </button>
        </>
      }
    >
      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Name</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Outfit" autoFocus />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Question (shown to the user)</span>
        <input className="field" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. What should they wear?" />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Prompt template</span>
        <input
          className="field"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder={name ? `${name}: {value}.` : 'They are wearing {value}.'}
        />
        <span className="block text-xs text-slate-500">
          Sentence added to the prompt when an option is selected. <code className="rounded bg-slate-800 px-1">{'{value}'}</code> is replaced with the option's prompt text. With multiple picks they are joined with "and".
        </span>
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Max selections</span>
        <input className="field !w-24" type="number" min={1} max={10} value={maxSelect} onChange={(e) => setMaxSelect(e.target.value)} />
        <span className="block text-xs text-slate-500">1 = single choice. Set 2 for "choose up to 2".</span>
      </label>
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </Modal>
  );
}
