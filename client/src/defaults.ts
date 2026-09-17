import type { AvatarOption, OptionsStore } from './types';

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const opt = (label: string, prompt: string, extra: Partial<AvatarOption> = {}): AvatarOption => ({
  id: extra.id ?? slug(label),
  label,
  prompt,
  ...(extra.swatch ? { swatch: extra.swatch } : {}),
  ...(extra.dependsOn ? { dependsOn: extra.dependsOn } : {}),
});

const male = { category: 'gender', option: 'male' };
const female = { category: 'gender', option: 'female' };

/**
 * Seed data — mirrors Persona.xlsx exactly (Gender, Age, Region, Complexion, Hair, Vibe).
 * Hair options are split by gender via `dependsOn`; Vibe allows up to two picks.
 */
export const DEFAULT_STORE: OptionsStore = {
  basePrompt:
    'A high-quality head-and-shoulders portrait of a single Indian person, centered, looking at the camera, natural skin texture, sharp focus, soft flattering light, realistic photograph.',
  categories: [
    {
      id: 'gender',
      name: 'Gender',
      question: 'Who would you like to meet?',
      template: 'The person is a {value}.',
      options: [opt('Male', 'man'), opt('Female', 'woman')],
    },
    {
      id: 'age',
      name: 'Age',
      question: 'What age should they look?',
      template: 'They look {value} years old.',
      options: [
        opt('18–24', '18 to 24', { id: '18-24' }),
        opt('25–30', '25 to 30', { id: '25-30' }),
        opt('31–40', '31 to 40', { id: '31-40' }),
        opt('41–50', '41 to 50', { id: '41-50' }),
        opt('51+', 'over 50', { id: '51-plus' }),
      ],
    },
    {
      id: 'region',
      name: 'Region',
      question: 'Which part of India inspires their look?',
      template: 'Their look is inspired by {value} India.',
      options: [
        opt('North', 'North'),
        opt('South', 'South'),
        opt('East', 'East'),
        opt('West', 'West'),
        opt('North-East', 'North-East'),
        opt('Central', 'Central'),
      ],
    },
    {
      id: 'complexion',
      name: 'Complexion',
      question: 'What complexion feels right?',
      template: 'They have a {value} complexion.',
      options: [
        opt('Light', 'light', { swatch: '#f1d2b6' }),
        opt('Light-Medium', 'light-medium', { swatch: '#dfb08b' }),
        opt('Medium', 'medium', { swatch: '#c48f66' }),
        opt('Medium-Deep', 'medium-deep', { swatch: '#9a6641' }),
        opt('Deep', 'deep', { swatch: '#5e3a22' }),
      ],
    },
    {
      id: 'hair',
      name: 'Hair',
      question: 'What hairstyle feels right?',
      template: 'Hairstyle: {value}.',
      options: [
        // Male
        opt('Short & Classic', 'short and classic', { id: 'm-short-classic', dependsOn: male }),
        opt('Modern & Textured', 'modern and textured', { id: 'm-modern-textured', dependsOn: male }),
        opt('Medium & Natural', 'medium-length and natural', { id: 'm-medium-natural', dependsOn: male }),
        opt('Long', 'long', { id: 'm-long', dependsOn: male }),
        opt('Curly/Wavy', 'curly or wavy', { id: 'm-curly-wavy', dependsOn: male }),
        opt('Clean/Minimal', 'clean and minimal, very short', { id: 'm-clean-minimal', dependsOn: male }),
        // Female
        opt('Long & Open', 'long and open', { id: 'f-long-open', dependsOn: female }),
        opt('Soft Waves', 'soft waves', { id: 'f-soft-waves', dependsOn: female }),
        opt('Straight & Natural', 'straight and natural', { id: 'f-straight-natural', dependsOn: female }),
        opt('Shoulder Length', 'shoulder-length', { id: 'f-shoulder-length', dependsOn: female }),
        opt('Short & Modern', 'short and modern', { id: 'f-short-modern', dependsOn: female }),
        opt('Curly/Wavy', 'curly or wavy', { id: 'f-curly-wavy', dependsOn: female }),
      ],
    },
    {
      id: 'vibe',
      name: 'Vibe',
      question: 'What should your companion feel like?',
      template: 'Their vibe is {value}, shown in their expression and posture.',
      maxSelect: 2,
      options: [
        opt('Cheerful', 'cheerful'),
        opt('Warm', 'warm'),
        opt('Energetic', 'energetic'),
        opt('Calm', 'calm'),
        opt('Playful', 'playful'),
        opt('Confident', 'confident'),
      ],
    },
  ],
};
