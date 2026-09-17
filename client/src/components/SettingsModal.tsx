import { Download, RefreshCw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Modal } from './Modal';
import type { Health, ImageQuality, ImageSize, Settings } from '../types';

interface Props {
  settings: Settings;
  health: Health | null;
  basePrompt: string;
  onSave: (s: Settings, basePrompt: string) => Promise<void>;
  onReset: () => Promise<void>;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onClose: () => void;
}

const SIZES: { value: ImageSize; label: string }[] = [
  { value: '1024x1024', label: 'Square · 1024×1024' },
  { value: '1024x1536', label: 'Portrait · 1024×1536' },
  { value: '1536x1024', label: 'Landscape · 1536×1024' },
];
const QUALITIES: ImageQuality[] = ['low', 'medium', 'high', 'auto'];

export function SettingsModal({ settings, health, basePrompt, onSave, onReset, onExport, onImport, onClose }: Props) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [base, setBase] = useState(basePrompt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const models = health?.models?.length ? health.models : [settings.model];

  const save = async () => {
    if (!base.trim()) {
      setError('Base prompt cannot be empty');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft, base.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      await onImport(file);
      setNotice(`Imported options from ${file.name}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Modal
      title="Settings"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">OpenAI API key</span>
        <input
          className="field"
          type="password"
          value={draft.apiKey}
          onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
          placeholder="sk-…"
          autoComplete="off"
        />
        <span className="block text-xs text-slate-500">
          Required. Stored only in this browser and sent straight to OpenAI when you generate.
        </span>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Model</span>
        <select className="field" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}>
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Size</span>
          <select className="field" value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value as ImageSize })}>
            {SIZES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Quality</span>
          <select className="field" value={draft.quality} onChange={(e) => setDraft({ ...draft, quality: e.target.value as ImageQuality })}>
            {QUALITIES.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Base prompt</span>
        <textarea className="field min-h-[88px] resize-y" value={base} onChange={(e) => setBase(e.target.value)} />
        <span className="block text-xs text-slate-500">Always sent first. Every selected option is appended after it.</span>
      </label>

      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Share options with someone</p>
        <p className="text-xs text-slate-500">Options live in this browser. Export a file, send it, and they import it to get the same categories and options.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost !py-1 text-xs" onClick={onExport}>
            <Download size={12} /> Export options
          </button>
          <button className="btn-ghost !py-1 text-xs" onClick={() => fileRef.current?.click()}>
            <Upload size={12} /> Import options
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
        </div>
        {notice && <p className="text-xs text-emerald-400">{notice}</p>}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-rose-900/50 bg-rose-950/20 px-3 py-2">
        <span className="text-xs text-slate-400">Restore the built-in categories and options</span>
        <button
          className="btn-danger !py-1 text-xs"
          onClick={async () => {
            await onReset();
            onClose();
          }}
        >
          <RefreshCw size={12} /> Reset to defaults
        </button>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}
    </Modal>
  );
}
