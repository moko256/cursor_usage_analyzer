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
- Changing the Paraglide compiler options in `vite.config.ts` does not invalidate that generated output; delete `src/lib/paraglide/` to force a recompile.
- Locale routing uses the Paraglide `url` strategy: the base locale is served from `/`, other locales from `/{locale}`. The URL patterns in `vite.config.ts` include `BASE_PATH`, so `localizeHref()` returns hrefs that already carry the base path and must not be passed to `resolve()`.
- Every non-base locale needs a `prerender.entries` item in `vite.config.ts`, because prerender crawling is disabled.
- Pico CSS is loaded globally from `src/routes/+layout.svelte`.

## Commands

- Dev: `pnpm dev`
- Check: `pnpm check`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Build: `pnpm build`

---

## Svelte MCP

- For Svelte/SvelteKit work, if available, list documentation sections first and fetch all relevant sections before implementing.
- After editing Svelte code, run the autofixer until it reports no issues.
- Generate a Playground link only after user confirmation, and never for code written to this repository.
