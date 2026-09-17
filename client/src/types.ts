export interface Dependency {
  category: string;
  option: string;
}

export interface AvatarOption {
  id: string;
  label: string;
  prompt: string;
  swatch?: string;
  /** Only show when another category has this option selected (e.g. Hair split by Gender). */
  dependsOn?: Dependency;
}

export interface AvatarCategory {
  id: string;
  name: string;
  question?: string;
  template: string;
  /** How many options can be selected (default 1). */
  maxSelect?: number;
  options: AvatarOption[];
}

export interface OptionsStore {
  basePrompt: string;
  categories: AvatarCategory[];
  seeded?: string[];
}

/** categoryId -> selected option ids. */
export type Selections = Record<string, string[]>;

export interface GeneratedAvatar {
  id: string;
  createdAt: string;
  prompt: string;
  model: string;
  size: string;
  quality: string;
  selections: Selections | Record<string, string>;
  file: string;
  url: string;
  sentPrompt?: string;
}

export type ImageSize = '1024x1024' | '1024x1536' | '1536x1024';
export type ImageQuality = 'low' | 'medium' | 'high' | 'auto';

export interface Settings {
  apiKey: string;
  model: string;
  size: ImageSize;
  quality: ImageQuality;
}

export interface Health {
  status: string;
  model: string;
  models: string[];
  hasKey: boolean;
}

export interface OptionInput {
  label: string;
  prompt: string;
  swatch?: string;
  dependsOn?: Dependency | null;
}

export interface CategoryInput {
  name: string;
  template: string;
  question?: string;
  maxSelect?: number;
}
