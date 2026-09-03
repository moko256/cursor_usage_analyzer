## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: ai-tools, paraglide, sveltekit-adapter, vitest, eslint, prettier

## Project

- SvelteKit + Svelte 5 + Vite app using `@sveltejs/adapter-static`.
- Project files use Svelte runes mode.
- Pages: `src/routes/`; shared code: `src/lib/`; static files: `static/`.
- Translations: `messages/{locale}.json`; locales are `en` and `ja`, with `en` as the base locale.
- `src/lib/paraglide/` is generated; edit translation sources, not generated files.
- Locale routing is implemented in `src/hooks.ts` and `src/hooks.server.ts`.
- Pico CSS is loaded globally from `src/routes/+layout.svelte`.

## Commands

- Dev: `pnpm dev`
- Check: `pnpm check`
- Test: `pnpm test`
- E2E: `pnpm test:e2e` (Playwright; Chromium is installed during Cloud Agent setup)
- Lint: `pnpm lint`
- Build: `pnpm build`

---

## Svelte MCP

- For Svelte/SvelteKit work, if available, list documentation sections first and fetch all relevant sections before implementing.
- After editing Svelte code, run the autofixer until it reports no issues.
- Generate a Playground link only after user confirmation, and never for code written to this repository.

## Cursor Cloud specific instructions

- Read `.cursor/skills/playwright-recording/SKILL.md` for browser walkthrough recording guidance.
