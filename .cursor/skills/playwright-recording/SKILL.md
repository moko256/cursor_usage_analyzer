---
name: playwright-recording
description: Record browser-only walkthroughs with Playwright in Cursor Cloud Agent.
---

# Browser walkthrough recordings

Use Playwright video recording when the walkthrough consists only of interactions inside
the browser. It can replace `computerUse` for this browser-only case.

## Recording

Enable video recording for a test:

```ts
test.use({ video: 'on' });
```

Or enable it for the whole Playwright project in `playwright.config.ts`:

```ts
use: {
	video: 'on';
}
```

Run the E2E suite with `pnpm test:e2e`. When recording is enabled, successful videos are
written under `test-results/**/video.webm`. Copy the concise, successful recording to
`/opt/cursor/artifacts/` with a descriptive unique filename before referencing it in the
final response.

## Limitations and artifact review

Playwright records the browser viewport only. It does not capture the desktop, terminal,
editor, or OS-level interactions. Use `computerUse` and `RecordScreen` when those are
part of the requested manual GUI test.

Do not publish videos from failed tests. Review the selected video with the `videoReview`
subagent before referencing it as a walkthrough artifact.
