import { Copy, Download, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useState } from 'react';
import type { GeneratedAvatar, Settings } from '../types';

interface Props {
  prompt: string;
  extra: string;
  onExtraChange: (v: string) => void;
  settings: Settings;
  generating: boolean;
  error: string | null;
  result: GeneratedAvatar | null;
  onGenerate: () => void;
}

export function GeneratePanel({ prompt, extra, onExtraChange, settings, generating, error, result, onGenerate }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prompt preview</h3>
          <button className="icon-btn" onClick={copy} title="Copy prompt">
            <Copy size={14} />
          </button>
        </div>
        <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{prompt}</p>
        {copied && <p className="mt-1 text-xs text-emerald-400">Copied</p>}
        <textarea
          className="field mt-3 min-h-[64px] resize-y"
          placeholder="Extra details (optional): glasses, freckles, smiling, beard…"
          value={extra}
          onChange={(e) => onExtraChange(e.target.value)}
        />
      </section>

      <button className="btn-primary !py-3 text-base" onClick={onGenerate} disabled={generating}>
        {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
        {generating ? 'Generating…' : 'Generate avatar'}
      </button>
      <p className="-mt-2 text-center text-xs text-slate-500">
        {settings.apiKey ? `${settings.model} · ${settings.size} · ${settings.quality}` : 'Add your OpenAI API key in Settings to generate'}
      </p>

      {error && <p className="rounded-lg border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">{error}</p>}

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        {generating ? (
          <div className="flex aspect-square items-center justify-center bg-[linear-gradient(110deg,#0f172a_40%,#1e293b_50%,#0f172a_60%)] bg-[length:200%_100%] animate-shimmer">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Wand2 size={28} className="animate-pulse" />
              <span className="text-sm">Painting your avatar…</span>
            </div>
          </div>
        ) : result ? (
          <>
            <img src={result.url} alt="Generated avatar" className="block w-full animate-pop" />
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="truncate text-xs text-slate-500">
                {new Date(result.createdAt).toLocaleString()} · {result.model}
              </span>
              <a className="btn-ghost !py-1 text-xs" href={result.url} download={`avatar-${result.id.slice(0, 8)}.png`}>
                <Download size={13} /> Download
              </a>
            </div>
          </>
        ) : (
          <div className="flex aspect-square items-center justify-center text-sm text-slate-500">
            Your avatar will appear here
          </div>
        )}
      </section>
    </div>
  );
}
