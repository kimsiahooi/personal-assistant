# CLAUDE.md — Project instructions

Durable project rules for AI agents. Put lasting guidance here or in `docs/`.

This app is a **single-user personal finance tracker** — accounts, categories, and
transactions (income, expense, transfer), with a dashboard over them. It is built on the
conventions of `../../inventory/laravel-ms-ai-v2`, which stays untouched as the working
reference: read it freely, port from it deliberately, but it is a multi-tenant ERP and
most of what makes it complicated does not apply here. Progress and what is deferred:
[`docs/ROADMAP.md`](docs/ROADMAP.md).

## Never commit unprompted

Finish the work, get the gates green, and **leave the changes in the working tree**.
The user reviews the diff, then asks for a commit. Staging is fine; committing is not.

## Stop at the end of every phase

Work proceeds in phases. At the end of one: run its gates, report what changed and what
the gates said, and stop. Do not roll into the next phase unasked.

## There is no test suite — this is deliberate

No PHPUnit, no Pest, no Vitest. The starter kit's `tests/` and `phpunit.xml` were
deleted, along with `phpunit/phpunit` and `mockery/mockery`. Do **not** add one, and do
not suggest "let me write a test for that". The safety net is:

1. **Static gates** (below) — green before any handover.
2. **`bun run check:validation`** — reads the PHP FormRequests and checks every
   server-validated field has a matching zod key. This is the *only* thing standing
   between the two validation layers and silent drift. Never delete or weaken it.
3. **`bun run check:generated-types`** — `resources/js/types/generated.d.ts` is generated
   from `app/Data` and committed, so it can be stale or hand-edited without anything
   noticing. This catches both.

**Browser verification is deferred, by the user's instruction.** Do not drive Playwright
during a phase. There will be **one** end-to-end Playwright pass over every feature at the
end of slice 1, when the user asks for it. This replaces the reference's
"drive it after every phase" rule — do not reinstate that.

Because nothing runs the UI in CI, **SSR determinism is a hard rule, not a style
preference**: no `Date.now()`, `Math.random()`, or unpinned `Intl`/`toLocaleString` in
render output. Compute in `useEffect` or pin the locale. A nondeterministic render is a
React #418 hydration mismatch that nothing but your own eyes will catch.
`scripts/ui-guard.sh` blocks the two easy cases.

## Dates — a UTC instant standing for a local day

`transactions.occurred_at` is a **UTC timestamp**, like every other datetime here. It
holds the instant a local calendar day began: picking 2 September in Malaysia stores
`2026-09-01T16:00:00Z`.

That only stays coherent because the conversion is not optional at any boundary, and
**`App\Support\LocalDate` owns all of it** — a picked date becomes an instant on write, a
filter's local range becomes a UTC window, a monthly total is bounded by the LOCAL month,
and a row is read back as the day the viewer would call it. Never call `->toDateString()`
on the raw column: that reports the UTC day, which is the previous one for anything
recorded before 08:00 in Malaysia.

The failure this exists to avoid, verified rather than assumed: a transaction on the 1st
of a month is the previous month in UTC, so a naive `GROUP BY` moves it — and the totals
it moves between are the two numbers on the dashboard people actually read.

The zone is a **server value**. `App\Support\TimeZones` reads it from a cookie the
browser writes before first paint; `HandleInertiaRequests` shares it. Never
`Intl.DateTimeFormat().resolvedOptions()` during a render: the SSR pass and the browser
would disagree, and at 09:00 in Kuala Lumpur the server's own UTC clock still says
yesterday.

Monthly aggregates run one bounded query per month rather than a `GROUP BY`. `CONVERT_TZ`
needs MySQL's timezone tables loaded (they usually are not) and a fixed offset is wrong
across a daylight-saving boundary; six bounded queries over an indexed column are cheap
and cannot be wrong.

## Money — the rule the app is built around

Amounts are `decimal(15,2)` in MySQL, cast `decimal:2`, and exposed through the DTO as
**`public string $amount`**. They cross the wire as `"12.50"`, so JavaScript never turns
one into a float. 2dp because a sen is MYR's smallest unit: the column can then only hold
amounts that can actually exist.

**Every sum, balance and aggregate is computed in SQL.** React displays totals the server
already calculated and never adds money itself — `0.1 + 0.2` is `0.30000000000000004`, and
`toFixed(2)` hides it while the equality check still fails. `lib/money.ts` formats and
parses, and deliberately offers no `add()`. `scripts/check-structure.sh` rule 5 enforces
this; `money-allow` on the line is the escape hatch, and wanting one is usually a sign the
total belongs in the query.

## Code standards (enforced)

The full table, the vendored-component escalation ladder and the routing traps are in
[`docs/CODING-STANDARDS.md`](docs/CODING-STANDARDS.md). The short version:

- **Frontend (JS/TS/TSX/JSON): Biome 2.5.2.** `bun run check` before finalizing any
  frontend change; verify with `bun run check:ci` (**0 errors**). Biome replaces ESLint +
  Prettier — do not reintroduce them, and do not reintroduce `vite-plus`, which the
  installer shipped and which was swapped out for exactly this reason.
- **PHP: Laravel Pint.** `vendor/bin/pint --dirty`.
- **Types:** `bun run types:check` (TS) and `composer types:check` (PHPStan **level 7,
  no baseline**) must pass. Fix findings; never add a baseline.
- **Vendored shadcn/ui is READ-ONLY.** Never hand-edit `resources/js/components/ui/**`
  or the generated trees (`resources/js/{routes,actions,wayfinder}`, `bootstrap/ssr`).
  Pass props, **wrap** the primitive in your own `components/` file, or compose
  `radix-ui` directly. `scripts/ui-guard.sh` enforces this — it blocks *modifications*,
  not additions, so `shadcn add` of a new component is fine.
- **Dialogs come from `@/components/feedback/dialog`, never `@/components/ui/dialog`.**
  The vendored primitive's dismiss button is a 16px target, under the WCAG 2.2 minimum; the
  wrapper replaces it with a 36px one and re-exports the rest untouched.
  `scripts/check-structure.sh` rule 6 fails the commit otherwise.
- **`cn` comes from `@/lib/utils` in authored code.** The vendored tree imports the npm
  `cn` package instead; that is the registry's choice and it is left alone. Do not follow
  it outside `ui/`.
- **UI/UX: shadcn + design tokens, never a bare form.** See
  [`docs/UI-UX-GUIDELINES.md`](docs/UI-UX-GUIDELINES.md).
- **Package manager / JS runtime: Bun** (`bun install`, `bun run …`; lockfile `bun.lock`).
  Not npm — this machine's `~/.npm/_cacache` is root-owned and broken, which is what
  stalled the original install.

## `rules()` must be an inline array literal

`scripts/check-validation-parity.ts` finds a FormRequest's fields by matching **exactly
twelve spaces of indentation** — the natural depth of an array literal returned from
`rules()`. A `rules()` that spreads a base array, or is formatted differently, yields
**zero** fields, and the gate then passes while checking nothing at all. If you change the
shape of a `rules()` method, re-run the gate against a deliberately removed zod key and
confirm it still fails.

## Code organisation

**Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before adding a file.** It defines
where each kind of code lives and the four rules that keep it maintainable: size as a
signal (~250-line pages, ~30-line controller methods), one-way dependencies
(`pages → components → ui`, `lib/` imports neither), rule-of-three before promoting a
component out of its module, and business logic never in a page or a controller.
`scripts/check-structure.sh` enforces the mechanical parts.

## No i18n

English only. There is no `lang/`, no `t()`, no `useTranslation`. When porting a component
from the reference, replace its `t('some.key')` calls with the literal English string.
Do not add an i18n library; if the app ever needs one, that is a project of its own.

## Packages — buy vs build

**Before hand-rolling anything non-trivial, check whether a stable, popular package does
it.** If one does, propose it (name, what it removes, any risk) and let the user decide —
never add a dependency silently, and never add one for something the platform already does
well. The bar and the live catalog of decisions:
[`docs/PACKAGE-POLICY.md`](docs/PACKAGE-POLICY.md).

## Architecture

- Laravel 13 + Inertia v3 + React 19 + TypeScript + Tailwind v4, **SSR on**.
- **Single user**, but every domain table carries `user_id` with a global scope from day
  one, so opening this up later is a config change rather than a migration and a backfill.
- Auth is Fortify with 2FA, passkeys and password confirmation. **Registration and email
  verification are disabled** — the account is seeded from `SEED_USER_*` in `.env`.
- MySQL. Not SQLite: a `DECIMAL` column there has NUMERIC affinity and stores as REAL, so
  money would be floating point in the database itself.
- Typed routes via **Wayfinder**, not Ziggy. Its three output trees are gitignored and
  must be regenerated after a clone (`php artisan wayfinder:generate --with-form`) —
  nothing type-checks until they exist.
- `app/Data` DTOs are the single source of the wire shape, generated into the committed
  `resources/js/types/generated.d.ts`.
- Validation is **two-layer**: a Laravel FormRequest (the source of truth) and a matching
  zod schema that refuses the same thing in the browser before the request is sent.

## Pre-finalize checklist

A `lefthook` gate runs the fast checks on commit and the rest on push (`bun run prepare`
installs it). Run them by hand too:

1. `bun run check` (frontend) · `vendor/bin/pint --dirty` (PHP)
2. `bun run types:check` · `composer types:check`
3. `bun run check:structure` · `bun run check:validation` (any form/FormRequest touched)
   · `bun run check:generated-types` (any `app/Data` class touched — then
   `bun run types:generate` and commit the result)
4. `bun run build` before a release
5. Eyeball the change in light **and** dark at 375 / 768 / 1024. The full browser pass is
   the user's end-of-slice Playwright run, not something to trigger per phase.
