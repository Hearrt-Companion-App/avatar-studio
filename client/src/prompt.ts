import type { AvatarCategory, AvatarOption, OptionsStore, Selections } from './types';

function joinNatural(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export const maxSelect = (c: AvatarCategory) => Math.max(1, c.maxSelect ?? 1);

/** Is this option's dependency satisfied by the current selections? (No dependency = always true.) */
export function dependencyMet(o: AvatarOption, selections: Selections): boolean {
  return !o.dependsOn || (selections[o.dependsOn.category] ?? []).includes(o.dependsOn.option);
}

/** Options that are currently selectable: no dependency, or dependency satisfied. */
export function availableOptions(c: AvatarCategory, selections: Selections): AvatarOption[] {
  return c.options.filter((o) => dependencyMet(o, selections));
}

/** Mirror of the server-side prompt builder so the preview updates instantly. */
export function buildPrompt(store: OptionsStore, selections: Selections, extra = ''): string {
  const parts: string[] = [store.basePrompt.trim()];
  for (const category of store.categories) {
    const ids = selections[category.id] ?? [];
    if (ids.length === 0) continue;
    const chosen = ids
      .map((id) => category.options.find((o) => o.id === id))
      .filter((o): o is AvatarOption => Boolean(o))
      .filter((o) => dependencyMet(o, selections))
      .slice(0, maxSelect(category));
    if (chosen.length === 0) continue;
    const template = category.template.includes('{value}') ? category.template : `${category.template} {value}.`;
    parts.push(template.replace(/\{value\}/g, joinNatural(chosen.map((o) => o.prompt))).trim());
  }
  if (extra.trim()) parts.push(extra.trim());
  return parts.filter(Boolean).join(' ');
}

/** Pick random options for every category, respecting dependencies and maxSelect. Categories are processed in order so gated ones see earlier picks. */
export function randomSelections(store: OptionsStore): Selections {
  const out: Selections = {};
  for (const c of store.categories) {
    const pool = availableOptions(c, out);
    if (pool.length === 0) continue;
    const count = Math.min(pool.length, 1 + Math.floor(Math.random() * maxSelect(c)));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    out[c.id] = shuffled.slice(0, count).map((o) => o.id);
  }
  return out;
}

/** Accept the old `{ cat: "id" }` shape (from localStorage or older gallery entries) as well as the new array shape. */
export function normaliseSelections(raw: unknown): Selections {
  if (!raw || typeof raw !== 'object') return {};
  const out: Selections = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && v) out[k] = [v];
    else if (Array.isArray(v)) {
      const ids = v.filter((x): x is string => typeof x === 'string' && x.length > 0);
      if (ids.length) out[k] = ids;
    }
  }
  return out;
}

/** Drop selections that are no longer valid (deleted options, unmet dependencies, over the limit). */
export function pruneSelections(store: OptionsStore, selections: Selections): Selections {
  const out: Selections = {};
  for (const c of store.categories) {
    const ids = (selections[c.id] ?? []).filter((id) => {
      const o = c.options.find((x) => x.id === id);
      return o && dependencyMet(o, selections);
    });
    if (ids.length) out[c.id] = ids.slice(0, maxSelect(c));
  }
  return out;
}

/** Human-readable summary of what's selected in a category. */
export function selectedLabels(c: AvatarCategory, selections: Selections): AvatarOption[] {
  return (selections[c.id] ?? [])
    .map((id) => c.options.find((o) => o.id === id))
    .filter((o): o is AvatarOption => Boolean(o));
}
