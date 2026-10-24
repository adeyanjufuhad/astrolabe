# Astrolabe: context for Claude Code

Astrolabe is an open-source CLI (Go) that opens real pages in a headless browser, reads the computed styles, and flags every color, spacing, radius, font size, font family and font weight that isn't one of the team's design tokens. It suggests the nearest token for each, and it runs as a GitHub Action that comments on PRs. An optional server stores scan history in Neon Postgres.

Owner: Adeyanju Fuhad (github.com/adeyanjufuhad). Working name "Astrolabe". Name check (Oct 2026): no meaningful GitHub conflict; npm `astrolabe` is taken by an unrelated old package (`astrolabe-cli` is free); astrolabe.dev/.sh/.tools/.design are registered, while getastrolabe.dev, useastrolabe.dev and astrolabe.so looked free. Buying a domain costs money, so it is the owner's call.

## Hard rules

- **Never add a `Co-authored-by: Claude` (or any Claude attribution) line to commits or PRs.** Commits are authored by the owner.
- **Zero cost.** No paid APIs, hosting or services. Free tiers only, and the product must work with no AI and no server at all.
- **Low data use.** The owner works on about 5GB of mobile data. Don't download big things (Docker images, Playwright browser bundles, local LLM weights) without asking. The CLI uses the Chrome or Edge already installed on the machine, and Edge ships with Windows.
- **Stdlib first.** The only dependency is `github.com/lib/pq` (Postgres driver, zero transitive deps). The browser client (`internal/browser`) is a hand-written DevTools/WebSocket client on purpose: a single small binary with nothing to audit. Don't swap in chromedp or Playwright.
- Go 1.24. Keep `go.mod` free of `replace` directives, or `go install ...@latest` breaks.

## First steps on this machine

0. If `ci.yml` is sitting in the project root, move it to `.github/workflows/ci.yml` (it couldn't be written there directly), then delete the root copy.
1. `go test ./...` should pass. The extract test is skipped if no Chrome or Edge is found.
2. Create the GitHub repo if it doesn't exist yet: public, named `astrolabe`, under `adeyanjufuhad`. Then `git init` (if needed), commit, and push `main`. Follow the no-co-author rule.
3. Try it: `go run ./cmd/astrolabe check examples/checkout/index.html --tokens examples/checkout/tokens.json --html report.html`

## Layout

```
cmd/astrolabe/            CLI: check, tokens, version
cmd/astrolabe-server/     HTTP API storing scan history (Neon). Optional.
internal/browser/         minimal Chrome DevTools client (ws.go = RFC 6455 client, find.go = locate Chrome/Edge/Brave)
internal/extract/         collect.js runs in the page; returns computed styles of visible elements
internal/tokens/          token loader: W3C DTCG, Tokens Studio, plain nested JSON; aliases; categorization
internal/colorx/          CSS color parsing (hex, rgb, hsl, oklch, oklab, color(srgb)) + OKLab ΔE
internal/drift/           matching + findings (near-miss vs off-system) + fidelity score
internal/report/          text, JSON, Markdown (PR comment), self-contained HTML report
internal/store/           Postgres store + schema.sql
examples/checkout/        demo page with planted drift + its tokens.json
action.yml                composite GitHub Action (builds the CLI, comments on PR, uploads HTML artifact)
```

## How matching works

- Colors match only if identical at 8 bits per channel. Off-token colors within ΔE 2 (OKLab ×100) are **near-misses** (e.g. `#3b82f7` vs token `#3b82f6`). Anything further is **off-system**.
- Lengths match within 0.5px. Off-token values within 2px are near-misses.
- Negative margins use the same scale. `margin: auto` is skipped (detected via `computedStyleMap()`). Radii ≥ 500px are treated as pills.
- Typography (color, font-*) is audited only on elements with their own text.
- A category is audited only if the token file defines tokens for it.
- Occurrences count elements, not properties.

## Design skills (site/)

`DESIGN.md` describes how Astrolabe's UI should look. Three project skills live in `.claude/skills/`: `web-interface-guidelines` (Vercel), `design-taste-frontend` and `redesign-existing-projects` (Taste Skill). Use them when building or reviewing anything in `site/`. Where they clash with this project, these rules win:

- No Tailwind, Framer Motion, GSAP or icon packages. Use plain CSS in `site/app/globals.css`, the SVG sprite in `site/components/Icons.jsx`, and small React components. Ask before adding any npm package.
- Fonts are Inter Tight and JetBrains Mono, pinned in `site/tokens.json`. Ignore the skills' Inter ban and font suggestions unless the owner changes the tokens.
- The emoji in the PR-comment mock are Astrolabe's real output, so they stay.
- No picsum or stock photos, fake numbers, testimonials or client logos, whatever the skills suggest about "organic data".
- The centered hero with a fanned card row is the owner's chosen reference layout. Don't "fix" it into a split screen.
- Every value must be a token. CI runs Astrolabe on the built page with `--fail-under 100`.

## Neon

- Project **astrolabe**, id `summer-unit-21841530`, region aws-eu-central-1, Postgres 18. Tables (projects, scans, findings) are already created from `internal/store/schema.sql`. The server also runs migrations on start.
- Connection string: Neon console → astrolabe → Connect. Put it in `.env` (git-ignored) as `DATABASE_URL`. Use `sslmode=require` and drop `channel_binding=require`, which lib/pq doesn't support.
- Run locally: `DATABASE_URL=... ASTROLABE_API_KEY=... go run ./cmd/astrolabe-server`, then `astrolabe check <url> --upload http://localhost:8080 --api-key ...`
- API: `POST /api/scans?project=NAME` (Bearer key), `GET /api/projects`, `GET /api/projects/{name}/scans` (encode `/` as `%2F`), `GET /api/scans/{id}`, `GET /healthz`.

## Status (Oct 2026)

- **Live:** repo github.com/adeyanjufuhad/astrolabe (public); landing page https://astrolabe-pi.vercel.app (Vercel Hobby, project `astrolabe`, root `site/`, auto-deploys `main` and previews PRs); releases v0.1.0 and v0.1.1 (GoReleaser binaries for linux/darwin/windows × amd64/arm64 plus `checksums.txt`).
- **CI** (`.github/workflows/ci.yml`): gofmt/vet/race tests, a GoReleaser snapshot build, the demo Action run (comments on PRs) and the landing-page job, which builds `site/` and requires 100% fidelity against `site/tokens.json`. Tagging `v*` runs `.github/workflows/release.yml`.
- **Site:** Next.js static export in `site/`. It was never `npm install`ed on this machine; CI and Vercel build it. Check JSX locally with VS Code's bundled TypeScript (no install needed).
- **Verified:** the CLI → server → Postgres round trip (local Postgres 16, queries on Neon).
- **Vercel API access from Claude sessions** returned 403 for this account's team even after approval; the project was imported through the dashboard instead.

## Next up (owner's call on order)

Done: CI green and v0.1.0; landing page (daytime sky, live on Vercel); release binaries (v0.1.1).

1. ~~PR-only mode~~: done in v0.2.0 (`--baseline`, `--fail-on-new`, Action `baseline: auto`), verified end to end on a test PR.
2. Point each finding at the CSS rule that set it (DevTools CSS domain: stylesheet + line), so PR comments name `checkout.css:42`.
3. Fidelity badge for READMEs (Action writes a shields.io endpoint JSON).
4. Optional AI "suggest the fix" step: provider-agnostic, OpenAI-compatible adapter (Groq free tier, OpenRouter `:free`, or local Ollama), bring-your-own key, off by default. The core stays deterministic. Best after item 2, so it can edit the exact rule.
5. Figma: the Variables REST API is Enterprise-only, so read tokens from file nodes/styles instead, or tell users to export DTCG JSON.
6. Deploy the history server free (e.g. Render or Koyeb free tier) and build a small history dashboard.
