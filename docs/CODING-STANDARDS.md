# Coding Standards

| Language | Tool | Config | Command |
|---|---|---|---|
| JS / TS / JSX / TSX / JSON | **Biome** 2.5.2 | `biome.json` | `bun run check` |
| PHP | **Laravel Pint** (`laravel` preset) | `pint.json` | `vendor/bin/pint --dirty` |
| TS types | `tsc` | `tsconfig.json` | `bun run types:check` |
| PHP types | **PHPStan** (larastan) level 7 | `phpstan.neon` | `composer types:check` |

**Package manager / JS runtime: [Bun](https://bun.sh).** `bun install`, `bun run …`,
lockfile `bun.lock`. Not npm / pnpm / yarn. CI installs Bun explicitly
(`oven-sh/setup-bun`) because `composer setup` calls `bun install` and `bun run build`,
and ubuntu-latest ships neither Bun nor a Bun-aware `npx`.

## The gates

There is no test suite in this project — deliberately, and there is no `tests/` directory
or `phpunit.xml` to bring one back. These eight commands are the entire automated safety
net:

```
bun run check:ci               # biome, 0 errors
bun run types:check            # tsc --noEmit
bun run check:structure        # scripts/check-structure.sh
bun run check:validation       # scripts/check-validation-parity.ts
bun run check:generated-types  # scripts/check-generated-types.ts
vendor/bin/pint --test
vendor/bin/phpstan analyse     # level 7, NO baseline
bun run build
```

`lefthook.yml` splits them by cost. **pre-commit** is near-instant — pint and biome on
staged files (both `stage_fixed`), `types:check`, `ui-guard`, `structure`. **pre-push** is
seconds — `phpstan`, `check:validation`, `check:generated-types`, `build`. CI runs
`composer ci:check`, which is the same set minus the build — `composer setup` has already
run `bun run build` by the time the gates start, so a build break surfaces before them
rather than in them. Hooks are installed by `bun run prepare`; if
they aren't firing after a clone, run `bunx lefthook install`.

## Biome

Replaces ESLint + Prettier. One tool for formatting, linting, and import organization.

- `bun run check` → format + organize imports + safe lint fixes. Run before finalizing.
- `bun run check:ci` → verify only. Today it reports `Checked 69 files … No fixes applied`
  with no diagnostics at all.
- `bunx biome check --write --unsafe <files>` → applies unsafe fixes (e.g. Tailwind class
  sorting). Unsafe means the fix can change behaviour or types, not just layout. **Review
  what it changes**, scope it to the files you're touching, and re-run `types:check` after.

The version is pinned exactly — `"@biomejs/biome": "2.5.2"`, no caret — so formatting
cannot drift between machines or between you and CI.

Style: 4-space indent · single quotes (JS) / double (JSX attrs) · semicolons · width 80 ·
Tailwind classes sorted in `clsx` / `cn` / `cva` calls.

Two deliberate deviations from the recommended preset: `suspicious/noExplicitAny` is
**off**, and `nursery/useSortedClasses` is a **warn**, so class ordering nudges instead of
blocking. `check:ci` exits non-zero on errors only — warnings pass. That is exactly why the
tree currently carries zero of either, and why it should stay that way: a gate that prints
warnings every run teaches you to stop reading it.

**Excluded** (`biome.json` → `files.includes`): `public`, `.claude`, `resources/css`
(Biome's CSS parser doesn't handle Tailwind v4 at-rules), `resources/js/components/ui`
(vendored), `resources/js/types/generated.d.ts`, `composer.json`.

## No baseline, anywhere

PHPStan runs at level 7 over `app/`, `bootstrap/app.php`, `config/`, `database/` and
`routes/` with **no baseline file** — `phpstan.neon` is two extension includes, the path
list and `level: 7`. Do not add one to make a gate pass.

The reasoning is sharper here than in a project with tests: static analysis is not one
signal among several, it is most of what stands between a change and production. A baseline
is a list of places the analysis has agreed to stop looking.

## Vendored and generated trees — do NOT modify

Read-only:

- `resources/js/components/ui/**` — 62 vendored shadcn/ui + Radix components.
- `resources/js/{routes,actions,wayfinder}` — Wayfinder output, gitignored.
- `bootstrap/ssr` — the SSR bundle, gitignored.

Editing a primitive to fix one screen reliably breaks another, and it makes every future
shadcn update conflict. When you need different behaviour, escalate in this order:

1. **Props / className first** — most primitives already expose the knob.
2. **Wrap it** — compose in a component under `resources/js/components/`. This is the default.
3. **Compose Radix directly** — import from `radix-ui` in your own component.
4. **Re-generate** — `bunx shadcn@latest add <name>` rather than hand-editing.

`scripts/ui-guard.sh` enforces this at pre-commit, and it is worth knowing precisely what it
blocks: files under those prefixes staged as **modified or deleted**. Additions pass, because
additions are how vendored code legitimately arrives — `shadcn add` of a new component, a
Wayfinder regeneration, the initial import.

The one legitimate way an *existing* primitive changes is `shadcn add <name> --overwrite`,
when a newly added component needs a newer generation of one already vendored. That cannot
be told from a hand-edit by reading the file, so it is told apart by intent:

```bash
SHADCN_UPDATE=1 git commit …
```

It excuses that one rule for `components/ui/**` only, and deliberately is not `--no-verify`,
which would also skip pint, biome, `types:check` and the design-token and SSR checks.

ui-guard also enforces two things that are not about vendored code: no raw colour literals
(`#hex`, `rgb()`, `hsl()`) in authored TSX — use the design tokens — and no `Date.now()` or
`Math.random()` in render. Both take a `ui-allow` comment on the line as an escape hatch.

`resources/css/app.css` is **not** read-only — it holds the authored design tokens,
including the two that deliberately diverge from the shadcn defaults, with the reasons
written in place. It is excluded from Biome only because of the Tailwind v4 parser
limitation.

### Generated but committed: `resources/js/types/generated.d.ts`

This file is produced from `app/Data/**` by `bun run types:generate`, and it is **committed**
— which is why it is deliberately *not* in the read-only list. A file that is supposed to
change in commits cannot be guarded by "never modify"; every regeneration would trip the
hook and the only way past would be to skip it, which teaches the habit of skipping hooks.

So it is guarded by **staleness** instead. `bun run check:generated-types` transforms into a
temp directory and diffs, which catches both failure modes at once: the file that nobody
regenerated after a Data class changed shape (TypeScript then happily checks your pages
against a wire format the server stopped sending), and the field somebody patched in by hand
(silently reverted at the next regeneration). The temp directory matters — a staleness check
that writes where it is checking leaves a dirty tree behind when it fails, and the next run
then reports staleness for a reason unrelated to your change.

`app/Data` currently holds only `.gitkeep` and there is no `generated.d.ts`; the gate treats
that as consistent and says so. The first `#[TypeScript]` Data class makes the file real.

## `cn` — two implementations, one rule

56 of the 62 vendored components import `cn` from the npm package **`cn`** (0.2.5,
shadcn's compiled clsx + tailwind-merge). Authored code imports `cn` from
`@/lib/utils`, which is clsx + tailwind-merge composed by hand.

**The rule: authored code imports `cn` from `@/lib/utils`.**

The duplication is deliberate, not an oversight mid-migration. The `"cn"` import is part of
what the shadcn registry writes, so rewriting it in 56 files would be an edit to a read-only
tree *and* a conflict in every future `shadcn add`. And `@/lib/utils` is where `toUrl` lives
too, so authored components are already importing from it. Both produce the same class
string, Biome's class sorter is configured for `clsx` / `cn` / `cva` and sorts either, and
the cost of them coexisting is one line in this document.

## Money — a hard rule

Amounts are `decimal(15,2)` in MySQL, cast `decimal:2` on the model, and exposed through the
DTO as `public string $amount`, so they cross the wire as `"12.50"` and JavaScript never
turns one into a float.

**Every sum, balance and aggregate is computed in SQL.** React displays totals the server
already calculated. `resources/js/lib/money.ts` formats and parses, and deliberately offers
no `add()` — there is no supported way to total money in the browser.

`scripts/check-structure.sh` rule 5 enforces it in two stages, because the operator is rarely
next to the field: stage one finds `amount`, stage two finds arithmetic or a `reduce(`. So
`rows.reduce((s, r) => s + Number(r.amount), 0)` is caught, which is the shape this actually
takes. A deliberate exception is marked `money-allow` on the line, and should be rare enough
that each one is worth a comment.

The failure this prevents is quiet rather than loud: `0.1 + 0.2` is `0.30000000000000004`,
`toFixed(2)` renders it as `0.30`, and the balance on screen looks right while the equality
check against the server's total fails. A dashboard that is wrong by a cent is worse than one
that is obviously broken.

## SSR determinism

SSR is on (`config/inertia.php` → `'ssr' => ['enabled' => true]`). Render output must be a
pure function of the props: the same markup on the server and on the first client render, or
React logs a #418 hydration mismatch and silently discards the server's tree.

- No `Date.now()` and no `Math.random()` in render. Compute in `useEffect`, or accept the
  value as a prop. ui-guard greps for both in authored TSX.
- No **unpinned `Intl`**. `new Intl.NumberFormat(undefined, …)` or a `toLocaleDateString()`
  with no locale resolves against the *server's* locale and timezone during SSR and the
  *browser's* on hydrate. This one is not greppable, so it is on you: pass an explicit locale
  and `timeZone`, or format after mount.
- **Timestamps cross the wire as UTC** and are displayed on the viewer's clock. That is a
  client-side formatting step by definition, so do it after mount rather than in render — the
  server has no way to know which clock to use.

## Routing — Wayfinder, not Ziggy

Typed route helpers are generated by `laravel/wayfinder` into
`resources/js/{routes,actions,wayfinder}`, and the Vite plugin regenerates them on `bun run
dev` and `bun run build` with `formVariants: true`.

All three trees are **gitignored**, and 23 files already import from them — every auth page,
the sidebar, the header, the settings layout. So a fresh clone does not type-check until they
exist, and the error you get is 23 unresolved modules, not one obvious message. After
cloning, before anything else:

```bash
php artisan wayfinder:generate --with-form
```

Import the generated helpers rather than writing URL strings; `toUrl()` in `@/lib/utils`
converts a helper's object form to a string on the rare occasion something needs one.

## Validation parity — and the twelve-space rule

The zod schemas exist to refuse, in the browser, exactly what the server refuses.
`bun run check:validation` keeps the two field lists honest, by convention rather than
configuration:

```
app/Http/Requests/CategoryRequest.php
  → resources/js/lib/validation/schemas/category.ts   (export `categorySchema`)
```

The read is **non-recursive**, which is what keeps `app/Http/Requests/Settings/` out — those
are the starter kit's auth screens, validated server-side only. Nothing is registered top-level
yet, so today the gate reports `no FormRequests yet — nothing to check`. The first finance
request to land is the first one that needs a schema.

**One constraint before you write a FormRequest: `rules()` must be an inline array literal.**
The gate finds rule keys by matching **exactly twelve spaces of indentation**, which is the
natural depth of an array literal returned from `rules()` and nothing else. A `rules()` that
spreads a base array — `return [...$this->baseRules(), 'amount' => …]` — or that is formatted
any other way yields **zero fields**, and the gate then passes while checking nothing at all.
It fails open, which is the worst way for a safety net to fail, so the constraint is written
down rather than trusted to memory. If two requests share rules, repeat them; the duplication
is cheaper than a gate that lies.

A schema that must be built with runtime options is exported as a factory and listed in
`FACTORY_ARGS` with arguments to construct one for inspection.

## Structure

`bun run check:structure` is the mechanical half of `docs/ARCHITECTURE.md`: `lib/` must not
import React · `components/` must not import from `pages/` · a module's `_components/` are
private to it · controllers must not run raw queries · money is never added up in the browser.
Size caps (a page over 250 lines) are **warnings**, not errors — they are a signal that
something wants extracting, not a rule.

## Verification — there is no test suite

The gates above catch mechanical errors. Everything behavioural is verified by using the app.

**Playwright is deferred.** Do not drive the browser during a phase. The agreement is one
full end-to-end Playwright pass over every feature at the end of slice 1, when there is a
whole app to walk rather than a half-built screen to re-walk after each change.

In the meantime, when you exercise a screen by hand:

- Create → edit → delete; the toast fires and the list updates.
- Submit the form empty and with a bad value. Errors render **under the fields** — from the
  zod gate before the request leaves, and identically from Laravel when it is bypassed.
- Empty state, "no results" after a filter, loading state, error path.
- Light **and** dark, at 375 / 768 / 1024, with no horizontal body scroll.
- For anything touching money: after an edit and after a delete, the balance on screen matches
  a fresh SQL recount, and a transfer moves both sides.
- Watch the browser console. A React #418 warning is a hydration mismatch.

**`bun run dev` server-renders too** — the Inertia Vite plugin exposes `/__inertia_ssr` on the
dev server and Laravel POSTs the page there. `php artisan inertia:start-ssr` is only for built
assets. So a pass under `bun run dev` is a real SSR pass and does surface hydration mismatches.

**But confirm SSR actually ran before trusting the result.** View source and look for
`<div data-server-rendered="true" id="app">`. An empty `<div id="app"></div>` means you are
looking at a client-rendered page, and four things cause that — all silent, all HTTP 200:

| Cause | Tell |
|---|---|
| The first ~2 s after `bun run dev` | the dev server logs `SSR skipped, module graph is still warming up...`. Wait for `Inertia SSR module graph warmed up`. |
| A stale `public/hot` from a dev server that died uncleanly | `public/hot` exists with no vite running. Laravel POSTs to a dead port and falls back with **nothing in `laravel.log`**. Delete the file. |
| **`bun run build` was run while `bun run dev` was up** | `public/hot` is **gone** but vite is still running. The build deletes the hot file, so Laravel switches to production mode and looks for an SSR bundle that `build` (unlike `build:ssr`) never produced. Restart `bun run dev`. |
| You are looking at a redirect | `/login` while signed in is a 302 — view-source shows Laravel's redirect page, not the app. Also: `curl` has no session, so any authenticated URL redirects — check with the browser, not curl. |

Against built assets, which is what production runs:

```bash
rm -f public/hot          # stop Laravel dispatching to the dev server
bun run build:ssr
php artisan inertia:start-ssr &
```

## Never commit unprompted

Finish the work, get the gates green, and leave the changes in the working tree. Staging is
fine; committing is not. The user reads the diff and then asks.
