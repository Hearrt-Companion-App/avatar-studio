# Avatar Studio

Build a companion avatar by answering a few questions (Gender, Age, Region of India, Complexion, Hair, Vibe). Every answer is turned into a sentence and stitched into one prompt, which is sent to the OpenAI Images API. The categories and options come from `Persona.xlsx` and are fully editable in the UI.

It is a **static web app**: no server. Everything (your options, generated images, your OpenAI key) lives in your browser, and image generation calls OpenAI directly. That means it can be hosted on GitHub Pages for free.

## Using it

1. Open the site.
2. Click **Settings** (gear), paste your OpenAI API key, and Save. The key is stored only in that browser.
3. Pick options, watch the prompt preview, hit **Generate avatar**.

Generated images are kept in the browser (IndexedDB) and listed in the History strip, with a Download button.

### Sharing options with someone else

Options live per browser. To give another person the same categories and options: Settings → **Export options** (downloads a small JSON file), send it to them, and they use Settings → **Import options**.

## Local development

```bash
cd avatar-studio/client
npm install
npm run dev
```

Open http://localhost:5175.

## Deploying to GitHub Pages

This folder is published as its own public repo, **Hearrt-Companion-App/avatar-studio**, and served at https://hearrt-companion-app.github.io/avatar-studio/. The workflow in `.github/workflows/deploy.yml` builds `client/` and deploys on every push to `main` there.

The source of truth is the `avatar-studio/` folder in the private Split-Chat monorepo. After committing changes there, push them to the public repo with:

```bash
git subtree push --prefix avatar-studio avatar-studio main
```

(`avatar-studio` is a git remote pointing at the public repo.)

## How the prompt is built

```
<base prompt> + <category template with {value} replaced by the option's prompt text> … + <extra details>
```

Example with Complexion = "Medium" (template `They have a {value} complexion.`) and Vibe = Cheerful + Calm:

> A high-quality head-and-shoulders portrait of a single Indian person… They have a medium complexion. Their vibe is cheerful and calm, shown in their expression and posture.

Categories with no selection are simply skipped.

## Customising everything

Nothing is fixed. Every category and every option is editable straight from the main screen:

- **Type your own** box at the top of each category: type any value, hit Enter, and it is saved as a new option and selected immediately. If the category is currently filtered (e.g. Gender = Female) the new option inherits that filter.
- **Add option** opens a form with label, prompt text, optional colour swatch, and **Only show when** (gate the option on another category's choice, e.g. male vs female hairstyles).
- Hover any option card or category to reveal **edit** / **delete**.
- **Add category** creates a new category with a name, a friendly question, a prompt template (e.g. `Outfit: {value}.`), and **Max selections** (set 2 for "choose up to 2").
- **Settings** (gear) holds the API key, model, size, quality, base prompt, Export / Import, and **Reset to defaults**.

### Built-in categories (from Persona.xlsx)

| Category | Question | Options | Notes |
|---|---|---|---|
| Gender | Who would you like to meet? | Male, Female | single |
| Age | What age should they look? | 18–24, 25–30, 31–40, 41–50, 51+ | single |
| Region | Which part of India inspires their look? | North, South, East, West, North-East, Central | single |
| Complexion | What complexion feels right? | Light, Light-Medium, Medium, Medium-Deep, Deep | single, swatches |
| Hair | What hairstyle feels right? | Male: Short & Classic, Modern & Textured, Medium & Natural, Long, Curly/Wavy, Clean/Minimal · Female: Long & Open, Soft Waves, Straight & Natural, Shoulder Length, Short & Modern, Curly/Wavy | split by Gender |
| Vibe | What should your companion feel like? | Cheerful, Warm, Energetic, Calm, Playful, Confident | choose up to 2 |

**Gated options:** with no Gender chosen, the Hair page shows both groups under "Male" / "Female" headings; picking one also sets Gender. Once Gender is set only the matching group is shown, and changing Gender clears a hairstyle that no longer fits. Randomise respects the same rules.

**Multi-select:** categories with a limit above 1 let you toggle several options; the prompt joins them with "and".

New built-ins added in later versions are merged in on first load without touching your edits; categories you delete stay deleted.

## Stack

- React 19 + Vite + Tailwind, lucide-react icons
- localStorage for options and gallery metadata, IndexedDB for image blobs
- OpenAI Images API (`gpt-image-2` by default; other gpt-image models selectable in Settings)
