/**
 * Browser-only data layer. Everything lives in this browser:
 *  - options (categories, options, base prompt) in localStorage
 *  - gallery metadata in localStorage, image blobs in IndexedDB
 *  - image generation calls the OpenAI Images API directly with the key from Settings
 * The function names mirror the old server API so the UI code didn't need to change.
 */
import { deleteImage, getImage, putImage } from './db';
import { DEFAULT_STORE } from './defaults';
import { buildPrompt } from './prompt';
import type {
  AvatarCategory,
  AvatarOption,
  CategoryInput,
  Dependency,
  GeneratedAvatar,
  Health,
  OptionInput,
  OptionsStore,
  Selections,
  Settings,
} from './types';

export const MODELS = [
  'gpt-image-2',
  'gpt-image-2.5-flare',
  'gpt-image-2.5-sunburst',
  'gpt-image-1.5',
  'gpt-image-1',
  'gpt-image-1-mini',
] as const;
export const DEFAULT_MODEL = MODELS[0];

const OPTIONS_KEY = 'avatar-studio:options';
const GALLERY_KEY = 'avatar-studio:gallery';

type GalleryMeta = Omit<GeneratedAvatar, 'url'>;

// ---------- helpers ----------

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function uniqueId(base: string, taken: Set<string>) {
  let id = slug(base) || crypto.randomUUID().slice(0, 8);
  let n = 2;
  while (taken.has(id)) id = `${slug(base)}-${n++}`;
  return id;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isStore(v: unknown): v is OptionsStore {
  if (!v || typeof v !== 'object') return false;
  const s = v as OptionsStore;
  return typeof s.basePrompt === 'string' && Array.isArray(s.categories) && s.categories.every((c) => c && typeof c.id === 'string' && Array.isArray(c.options));
}

/** Load options; add any built-in category not seen before (so new defaults appear, deleted ones stay deleted). */
function loadOptions(): OptionsStore {
  const raw = readJson<unknown>(OPTIONS_KEY, null);
  let store: OptionsStore = isStore(raw) ? raw : structuredClone(DEFAULT_STORE);
  const have = new Set(store.categories.map((c) => c.id));
  const seeded = new Set(store.seeded ?? [...have]);
  const missing = DEFAULT_STORE.categories.filter((c) => !have.has(c.id) && !seeded.has(c.id));
  if (missing.length || !store.seeded || !isStore(raw)) {
    const merged = [...store.categories];
    for (const cat of missing) {
      const idx = DEFAULT_STORE.categories.findIndex((c) => c.id === cat.id);
      const after = DEFAULT_STORE.categories.slice(0, idx).map((c) => c.id).reverse().find((id) => have.has(id));
      const pos = after ? merged.findIndex((c) => c.id === after) + 1 : merged.length;
      merged.splice(pos, 0, structuredClone(cat));
      have.add(cat.id);
    }
    store = { ...store, categories: merged, seeded: [...new Set([...seeded, ...merged.map((c) => c.id)])] };
    writeJson(OPTIONS_KEY, store);
  }
  return store;
}

let options: OptionsStore = loadOptions();

function saveOptions(next: OptionsStore): OptionsStore {
  options = next;
  writeJson(OPTIONS_KEY, options);
  return options;
}

function updateCategoryAt(idx: number, fn: (c: AvatarCategory) => AvatarCategory) {
  const categories = [...options.categories];
  categories[idx] = fn(categories[idx]);
  return saveOptions({ ...options, categories });
}

function stripDependency(o: AvatarOption): AvatarOption {
  const { dependsOn: _drop, ...rest } = o;
  return rest;
}

// ---------- gallery ----------

const urlCache = new Map<string, string>();

async function withUrl(meta: GalleryMeta): Promise<GeneratedAvatar | null> {
  let url = urlCache.get(meta.id);
  if (!url) {
    const blob = await getImage(meta.id);
    if (!blob) return null;
    url = URL.createObjectURL(blob);
    urlCache.set(meta.id, url);
  }
  return { ...meta, url };
}

// ---------- public API ----------

export const api = {
  async health(): Promise<Health> {
    return { status: 'ok', model: DEFAULT_MODEL, models: [...MODELS], hasKey: false };
  },

  // Options store
  async getOptions() {
    return options;
  },
  async resetOptions() {
    const fresh = structuredClone(DEFAULT_STORE);
    return saveOptions({ ...fresh, seeded: fresh.categories.map((c) => c.id) });
  },
  async updateBasePrompt(basePrompt: string) {
    if (!basePrompt.trim()) throw new Error('basePrompt is required');
    return saveOptions({ ...options, basePrompt: basePrompt.trim() });
  },

  async createCategory(data: CategoryInput): Promise<AvatarCategory> {
    const name = data.name.trim();
    if (!name) throw new Error('name is required');
    const category: AvatarCategory = {
      id: uniqueId(name, new Set(options.categories.map((c) => c.id))),
      name,
      template: data.template?.trim() || `${name}: {value}.`,
      options: [],
    };
    if (data.question?.trim()) category.question = data.question.trim();
    if (data.maxSelect && data.maxSelect > 1) category.maxSelect = Math.floor(data.maxSelect);
    saveOptions({ ...options, categories: [...options.categories, category] });
    return category;
  },

  async updateCategory(id: string, data: CategoryInput): Promise<AvatarCategory> {
    const idx = options.categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Category not found');
    updateCategoryAt(idx, (current) => {
      const updated: AvatarCategory = {
        ...current,
        name: data.name.trim() || current.name,
        template: data.template.trim() || current.template,
      };
      if (data.question?.trim()) updated.question = data.question.trim();
      else delete updated.question;
      if (data.maxSelect && data.maxSelect > 1) updated.maxSelect = Math.floor(data.maxSelect);
      else delete updated.maxSelect;
      return updated;
    });
    return options.categories[idx];
  },

  async deleteCategory(id: string) {
    if (!options.categories.some((c) => c.id === id)) throw new Error('Category not found');
    saveOptions({
      ...options,
      categories: options.categories
        .filter((c) => c.id !== id)
        .map((c) => ({ ...c, options: c.options.map((o) => (o.dependsOn?.category === id ? stripDependency(o) : o)) })),
    });
  },

  async createOption(categoryId: string, data: OptionInput): Promise<AvatarOption> {
    const idx = options.categories.findIndex((c) => c.id === categoryId);
    if (idx === -1) throw new Error('Category not found');
    const label = data.label.trim();
    if (!label) throw new Error('label is required');
    const category = options.categories[idx];
    const option: AvatarOption = {
      id: uniqueId(label, new Set(category.options.map((o) => o.id))),
      label,
      prompt: data.prompt?.trim() || label.toLowerCase(),
    };
    if (data.swatch?.trim()) option.swatch = data.swatch.trim();
    const dep = validDependency(data.dependsOn, categoryId);
    if (dep) option.dependsOn = dep;
    updateCategoryAt(idx, (c) => ({ ...c, options: [...c.options, option] }));
    return option;
  },

  async updateOption(categoryId: string, optionId: string, data: OptionInput): Promise<AvatarOption> {
    const cIdx = options.categories.findIndex((c) => c.id === categoryId);
    if (cIdx === -1) throw new Error('Category not found');
    const oIdx = options.categories[cIdx].options.findIndex((o) => o.id === optionId);
    if (oIdx === -1) throw new Error('Option not found');
    updateCategoryAt(cIdx, (c) => {
      const current = c.options[oIdx];
      const updated: AvatarOption = {
        ...current,
        label: data.label.trim() || current.label,
        prompt: data.prompt.trim() || current.prompt,
      };
      if (data.swatch?.trim()) updated.swatch = data.swatch.trim();
      else delete updated.swatch;
      const dep = validDependency(data.dependsOn, categoryId);
      if (dep) updated.dependsOn = dep;
      else delete updated.dependsOn;
      const opts = [...c.options];
      opts[oIdx] = updated;
      return { ...c, options: opts };
    });
    return options.categories[cIdx].options[oIdx];
  },

  async deleteOption(categoryId: string, optionId: string) {
    const category = options.categories.find((c) => c.id === categoryId);
    if (!category) throw new Error('Category not found');
    if (!category.options.some((o) => o.id === optionId)) throw new Error('Option not found');
    saveOptions({
      ...options,
      categories: options.categories.map((c) => ({
        ...c,
        options: c.options
          .filter((o) => !(c.id === categoryId && o.id === optionId))
          .map((o) => (o.dependsOn?.category === categoryId && o.dependsOn.option === optionId ? stripDependency(o) : o)),
      })),
    });
  },

  // Share options between people
  exportOptions(): string {
    const { seeded: _s, ...rest } = options;
    return JSON.stringify(rest, null, 2);
  },
  async importOptions(text: string): Promise<OptionsStore> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('That file is not valid JSON');
    }
    if (!isStore(parsed)) throw new Error('That file is not an Avatar Studio options export');
    return saveOptions({ ...parsed, seeded: parsed.categories.map((c) => c.id) });
  },

  // Generation — straight to OpenAI from the browser
  async generate(selections: Selections, extra: string, settings: Settings): Promise<GeneratedAvatar> {
    const apiKey = settings.apiKey.trim();
    if (!apiKey) throw new Error('Add your OpenAI API key in Settings first.');
    const model = (MODELS as readonly string[]).includes(settings.model) ? settings.model : DEFAULT_MODEL;
    const prompt = buildPrompt(options, selections, extra);

    let res: Response;
    try {
      res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, prompt, n: 1, size: settings.size, quality: settings.quality, output_format: 'png' }),
      });
    } catch {
      // OpenAI's auth layer rejects bad keys without CORS headers, so a wrong key surfaces here as a network error.
      throw new Error('Could not reach OpenAI. Check that your API key in Settings is correct and that you are online.');
    }
    if (!res.ok) {
      let message = `OpenAI error (HTTP ${res.status})`;
      try {
        const err = await res.json();
        if (err?.error?.message) message = err.error.message;
      } catch {
        /* non-JSON body */
      }
      throw new Error(message);
    }
    const json = (await res.json()) as { data?: { b64_json?: string; url?: string; revised_prompt?: string }[] };
    const image = json.data?.[0];
    if (!image) throw new Error('No image returned from OpenAI');

    let blob: Blob;
    if (image.b64_json) {
      const bytes = Uint8Array.from(atob(image.b64_json), (ch) => ch.charCodeAt(0));
      blob = new Blob([bytes], { type: 'image/png' });
    } else if (image.url) {
      const r = await fetch(image.url);
      if (!r.ok) throw new Error(`Failed to download image (${r.status})`);
      blob = await r.blob();
    } else {
      throw new Error('Image response contained no data');
    }

    const meta: GalleryMeta = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      prompt: image.revised_prompt || prompt,
      model,
      size: settings.size,
      quality: settings.quality,
      selections,
      file: '',
    };
    await putImage(meta.id, blob);
    writeJson(GALLERY_KEY, [meta, ...readJson<GalleryMeta[]>(GALLERY_KEY, [])]);
    const item = await withUrl(meta);
    if (!item) throw new Error('Could not store the generated image');
    return { ...item, sentPrompt: prompt };
  },

  // Gallery
  async getGallery(): Promise<GeneratedAvatar[]> {
    const metas = readJson<GalleryMeta[]>(GALLERY_KEY, []);
    const items = await Promise.all(metas.map(withUrl));
    return items.filter((x): x is GeneratedAvatar => x !== null);
  },
  async deleteFromGallery(id: string) {
    writeJson(
      GALLERY_KEY,
      readJson<GalleryMeta[]>(GALLERY_KEY, []).filter((g) => g.id !== id),
    );
    await deleteImage(id);
    const url = urlCache.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      urlCache.delete(id);
    }
  },
};

function validDependency(dep: Dependency | null | undefined, ownCategoryId: string): Dependency | undefined {
  if (!dep || !dep.category || !dep.option || dep.category === ownCategoryId) return undefined;
  return { category: dep.category, option: dep.option };
}
