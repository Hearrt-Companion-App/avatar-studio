import { Dices, Eraser, Settings as SettingsIcon, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { CategoryForm } from './components/CategoryForm';
import { CategoryNav } from './components/CategoryNav';
import { Gallery } from './components/Gallery';
import { GeneratePanel } from './components/GeneratePanel';
import { OptionForm } from './components/OptionForm';
import { OptionGrid } from './components/OptionGrid';
import { SettingsModal } from './components/SettingsModal';
import { buildPrompt, maxSelect, normaliseSelections, pruneSelections, randomSelections } from './prompt';
import type {
  AvatarCategory,
  AvatarOption,
  CategoryInput,
  GeneratedAvatar,
  Health,
  OptionInput,
  OptionsStore,
  Selections,
  Settings,
} from './types';
import { useLocalStorage } from './useLocalStorage';

type ModalState =
  | { kind: 'none' }
  | { kind: 'settings' }
  | { kind: 'category'; category?: AvatarCategory }
  | { kind: 'option'; category: AvatarCategory; option?: AvatarOption };

const DEFAULT_SETTINGS: Settings = { apiKey: '', model: 'gpt-image-2', size: '1024x1024', quality: 'medium' };

export default function App() {
  const [store, setStore] = useState<OptionsStore | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selections, setSelections] = useLocalStorage<Selections>('avatar-studio:selections', {});
  const [extra, setExtra] = useLocalStorage<string>('avatar-studio:extra', '');
  const [settings, setSettings] = useLocalStorage<Settings>('avatar-studio:settings', DEFAULT_SETTINGS);
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedAvatar | null>(null);
  const [gallery, setGallery] = useState<GeneratedAvatar[]>([]);

  const reload = useCallback(async () => {
    try {
      const s = await api.getOptions();
      setStore(s);
      setLoadError(null);
      setActiveId((prev) => (prev && s.categories.some((c) => c.id === prev) ? prev : s.categories[0]?.id ?? null));
      // Migrate old single-value selections and drop anything that no longer exists.
      setSelections((prev) => pruneSelections(s, normaliseSelections(prev)));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load options');
    }
  }, [setSelections]);

  useEffect(() => {
    reload();
    api.getGallery().then(setGallery).catch(() => {});
    api
      .health()
      .then((h) => {
        setHealth(h);
        setSettings((prev) => (h.models.includes(prev.model) ? prev : { ...prev, model: h.model }));
      })
      .catch(() => {});
  }, [reload, setSettings]);

  const active = useMemo(() => store?.categories.find((c) => c.id === activeId) ?? null, [store, activeId]);
  const prompt = useMemo(() => (store ? buildPrompt(store, selections, extra) : ''), [store, selections, extra]);
  const selectedCount = store ? store.categories.filter((c) => (selections[c.id] ?? []).length > 0).length : 0;

  /** Toggle an option. Single-select categories replace; multi-select append up to the limit. Gated options auto-set their dependency. */
  const toggle = (category: AvatarCategory, optionId: string) => {
    if (!store) return;
    setSelections((prev) => {
      const next: Selections = { ...prev };
      const current = next[category.id] ?? [];
      const option = category.options.find((o) => o.id === optionId);
      if (current.includes(optionId)) {
        const rest = current.filter((id) => id !== optionId);
        if (rest.length) next[category.id] = rest;
        else delete next[category.id];
      } else {
        const limit = maxSelect(category);
        if (limit === 1) next[category.id] = [optionId];
        else if (current.length < limit) next[category.id] = [...current, optionId];
        else return prev; // at limit; user must deselect first
        if (option?.dependsOn && !(next[option.dependsOn.category] ?? []).includes(option.dependsOn.option)) {
          next[option.dependsOn.category] = [option.dependsOn.option];
        }
      }
      return pruneSelections(store, next);
    });
  };

  const clearCategory = (categoryId: string) =>
    setSelections((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return store ? pruneSelections(store, next) : next;
    });

  const generate = async () => {
    if (!store) return;
    setGenerating(true);
    setGenError(null);
    try {
      const item = await api.generate(selections, extra, settings);
      setResult(item);
      setGallery((g) => [item, ...g]);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // ----- editing -----
  const saveCategory = async (data: CategoryInput, existing?: AvatarCategory) => {
    if (existing) await api.updateCategory(existing.id, data);
    else {
      const created = await api.createCategory(data);
      setActiveId(created.id);
    }
    await reload();
  };

  const deleteCategory = async (c: AvatarCategory) => {
    if (!confirm(`Delete category "${c.name}" and its ${c.options.length} options?`)) return;
    await api.deleteCategory(c.id);
    await reload();
  };

  const saveOption = async (category: AvatarCategory, data: OptionInput, existing?: AvatarOption) => {
    if (existing) await api.updateOption(category.id, existing.id, data);
    else {
      const created = await api.createOption(category.id, data);
      await reload();
      toggleAfterReload(category.id, created.id);
      return;
    }
    await reload();
  };

  /** Select a freshly created option once the store has been refreshed. */
  const toggleAfterReload = (categoryId: string, optionId: string) => {
    setSelections((prev) => {
      const next = { ...prev };
      const cat = store?.categories.find((c) => c.id === categoryId);
      const limit = cat ? maxSelect(cat) : 1;
      const current = next[categoryId] ?? [];
      next[categoryId] = limit === 1 ? [optionId] : [...current.slice(0, limit - 1), optionId];
      return next;
    });
  };

  const deleteOption = async (category: AvatarCategory, o: AvatarOption) => {
    if (!confirm(`Delete option "${o.label}"?`)) return;
    await api.deleteOption(category.id, o.id);
    await reload();
  };

  const quickAdd = async (category: AvatarCategory, text: string) => {
    const label = text.length > 40 ? `${text.slice(0, 37)}…` : text;
    // If the category is currently filtered by a dependency (e.g. Gender = Female), inherit it.
    const gate = category.options.find((o) => o.dependsOn && (selections[o.dependsOn.category] ?? []).includes(o.dependsOn.option))?.dependsOn;
    const created = await api.createOption(category.id, { label, prompt: text, dependsOn: gate ?? null });
    await reload();
    toggleAfterReload(category.id, created.id);
  };

  const resetDefaults = async () => {
    if (!confirm('Reset all categories and options to the built-in defaults? Your custom options will be lost.')) return;
    const s = await api.resetOptions();
    setStore(s);
    setSelections({});
    setActiveId(s.categories[0]?.id ?? null);
  };

  const exportOptions = () => {
    const blob = new Blob([api.exportOptions()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `avatar-studio-options-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importOptions = async (file: File) => {
    if (!confirm(`Replace your current categories and options with the ones in "${file.name}"?`)) return;
    await api.importOptions(await file.text());
    setSelections({});
    await reload();
  };

  const saveSettings = async (next: Settings, basePrompt: string) => {
    setSettings(next);
    if (store && basePrompt !== store.basePrompt) setStore(await api.updateBasePrompt(basePrompt));
  };

  const deleteFromGallery = async (g: GeneratedAvatar) => {
    if (!confirm('Delete this avatar?')) return;
    await api.deleteFromGallery(g.id);
    setGallery((list) => list.filter((x) => x.id !== g.id));
    if (result?.id === g.id) setResult(null);
  };

  // ----- render -----
  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="mb-2 text-rose-400">Could not load your options: {loadError}</p>
          <p className="text-sm text-slate-400">
            Try refreshing the page.
          </p>
        </div>
      </div>
    );
  }
  if (!store) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2 px-4 py-3">
          <div className="mr-auto flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white">
              <UserRound size={18} />
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight">Avatar Studio</h1>
              <p className="text-xs text-slate-500">
                {selectedCount}/{store.categories.length} categories set
              </p>
            </div>
          </div>
          <button className="btn-ghost" onClick={() => setSelections(randomSelections(store))} title="Pick random options">
            <Dices size={15} /> Randomise
          </button>
          <button className="btn-ghost" onClick={() => setSelections({})} disabled={selectedCount === 0}>
            <Eraser size={15} /> Clear
          </button>
          <button className="btn-ghost" onClick={() => setModal({ kind: 'settings' })} title="Base prompt, model, size, quality, API key">
            <SettingsIcon size={15} /> Settings
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[230px_minmax(0,1fr)_400px]">
        <aside className="lg:sticky lg:top-[68px] lg:self-start">
          <CategoryNav
            categories={store.categories}
            activeId={activeId}
            selections={selections}
            onSelect={setActiveId}
            onAdd={() => setModal({ kind: 'category' })}
            onEdit={(category) => setModal({ kind: 'category', category })}
            onDelete={deleteCategory}
          />
        </aside>

        <section className="min-w-0">
          {active ? (
            <OptionGrid
              store={store}
              category={active}
              selections={selections}
              onToggle={(optionId) => toggle(active, optionId)}
              onClear={() => clearCategory(active.id)}
              onAdd={() => setModal({ kind: 'option', category: active })}
              onQuickAdd={(text) => quickAdd(active, text)}
              onEdit={(option) => setModal({ kind: 'option', category: active, option })}
              onEditCategory={() => setModal({ kind: 'category', category: active })}
              onDelete={(o) => deleteOption(active, o)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
              No categories yet. Click "Add category" to create one.
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-[68px] lg:self-start">
          <GeneratePanel
            prompt={prompt}
            extra={extra}
            onExtraChange={setExtra}
            settings={settings}
            generating={generating}
            error={genError}
            result={result}
            onGenerate={generate}
          />
          <Gallery
            items={gallery}
            onView={setResult}
            onReuse={(g) => {
              setSelections(pruneSelections(store, normaliseSelections(g.selections)));
              setResult(g);
            }}
            onDelete={deleteFromGallery}
          />
        </aside>
      </main>

      {modal.kind === 'settings' && (
        <SettingsModal
          settings={settings}
          health={health}
          basePrompt={store.basePrompt}
          onSave={saveSettings}
          onReset={resetDefaults}
          onExport={exportOptions}
          onImport={importOptions}
          onClose={() => setModal({ kind: 'none' })}
        />
      )}
      {modal.kind === 'category' && (
        <CategoryForm
          category={modal.category}
          onSave={(data) => saveCategory(data, modal.category)}
          onClose={() => setModal({ kind: 'none' })}
        />
      )}
      {modal.kind === 'option' && (
        <OptionForm
          store={store}
          category={modal.category}
          option={modal.option}
          onSave={(data) => saveOption(modal.category, data, modal.option)}
          onClose={() => setModal({ kind: 'none' })}
        />
      )}
    </div>
  );
}
