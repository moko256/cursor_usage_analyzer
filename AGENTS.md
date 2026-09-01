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

### Browser walkthrough recordings

- Playwright may be used instead of `computerUse` when the walkthrough consists only of interactions inside the browser. Enable video recording with `test.use({ video: 'on' })` for a test or `use.video: 'on'` in `playwright.config.ts`.
- After `pnpm test:e2e`, successful recordings are written under `test-results/**/video.webm`. Copy the concise, successful recording to `/opt/cursor/artifacts/` with a descriptive unique filename before referencing it in the final response.
- Playwright records the browser viewport only. It does not capture the desktop, terminal, editor, or OS-level interactions, so it is not a replacement for `computerUse` or `RecordScreen` when those are part of the requested manual GUI test.
- Do not publish videos from failed tests. Review the selected video with the `videoReview` subagent before referencing it as a walkthrough artifact.
