# Roadmap — personal finance tracker

Where this project is, and what is next. It is not a migration: `../../inventory/laravel-ms-ai-v2`
stays untouched as a reference for conventions, and almost everything that makes it
complicated — multi-tenancy, RBAC, localization, medialibrary — is deliberately absent
here. What is taken from it is taken file by file, with the reason written down.

**Legend:** ✅ done · 🚧 in progress · ⬜ not started

## Done — the scaffold ✅

Five commits, in order. Nothing since the fifth is committed, which is the working
agreement rather than an oversight: finish the work, get the gates green, leave it in the
tree for review.

| Step | Commit | What it settled |
|---|---|---|
| The kit, verbatim | `chore: laravel/react-starter-kit scaffold as delivered` | A recovery point. The installer had died half-way; committing the wreck first is what made Chisel's edits a reviewable diff. |
| MySQL, Chisel, the owner account | `feat(auth): finish the scaffold — mysql, chisel, and the owner account` | Off SQLite (its `DECIMAL` has NUMERIC affinity and stores as REAL — money would be float in the database itself). Registration and email verification removed; the single user is seeded from `SEED_USER_*`. |
| Toolchain | `feat(build): swap vite-plus for vite + biome, and get the gates green` | vite-plus 0.3.0 out, plain Vite + Biome 2.5.2 in, so the reference's `biome.json`, guards and docs port as-is. Bun replaces npm throughout. 36 Biome errors in the starter kit fixed. |
| The component tree | `feat(ui): vendor the shadcn registry, minus form` | 62 files in `components/ui/`, up from the kit's 26. `form` is absent by choice — client form state here is Inertia's `<Form>` plus the zod gate, and `react-hook-form` would be a dependency nothing imports. |
| Theme | `feat(theme): adopt laravel-ms-ai-v2's theme, with a validated chart ramp` | Every non-chart token byte-identical to the reference. Two divergences, both measured, both explained in `resources/css/app.css`. |
| Governance | *uncommitted — in the working tree* | `CLAUDE.md`, `docs/`, `lefthook.yml`, the four scripts in `scripts/`, `.github/workflows/ci.yml`, `spatie/laravel-data` + the transformer provider, and the removal of the remaining `tests/` and `phpunit.xml`. |

### What was removed, and what was never installed

The test suite is gone — `tests/`, `phpunit.xml`, `phpunit/phpunit`, `mockery/mockery` and
the `Tests\` autoload entry. That is a decision, not a backlog item; the static gates below
are the entire automated safety net. Three of the deletions rode along with commit
`1f96690` (registration, email verification and their tests); the other eleven —
`phpunit.xml` and ten test files — plus the composer changes are in the working tree.

Never installed, and not to be introduced by accident: `stancl/tenancy`,
`spatie/laravel-permission`, `spatie/laravel-medialibrary`, `react-hook-form`, and any i18n
layer. There is no `lang/`, no `t()`, no `check-i18n.ts`. A component ported from the
reference has its `t('some.key')` calls replaced with the English literal.

### Where the gates stand

All eight pass. Two of them pass by having nothing to check yet, and that is worth saying
out loud rather than reading as coverage:

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

`check:validation` reads `app/Http/Requests` **non-recursively**, which is what keeps the
four `Settings/` requests out — they are the starter kit's own auth screens and validate
server-side only. Nothing sits at the top level, so it reports *"no FormRequests yet"*.
`check:generated-types` reports *"no `#[TypeScript]` classes yet, and no generated.d.ts"* —
`app/Data/` holds a `.gitkeep`. Both become real gates in phase 1, and phase 1 is where
they should be deliberately broken once each to confirm they still fail.

`lefthook.yml` splits them: pre-commit runs pint, biome, `types:check`, the UI guard and
the structure gate; pre-push runs PHPStan, validation parity, generated types and the
build.

`scripts/check-structure.sh` carries five errors — `lib/` must not import React ·
`components/` must not import from `pages/` · a module's `_components/` are private to it ·
controllers must not run raw queries · no money arithmetic in the browser — plus size caps
as warnings. The reference's fourth rule, which forces dialogs to be imported from
`components/feedback/` rather than `components/ui/`, was **dropped** and money arithmetic
took the freed slot: it existed only
because the vendored `DialogContent` renders a hard-coded English `sr-only` "Close", and
there is no i18n here for that to break.

### Debts the earlier commits deferred to this one

Both are paid by the governance scaffolding: `cn@0.2.5` gets its `docs/PACKAGE-POLICY.md`
entry, and the chart ramp's secondary-encoding constraint — every chart carries a legend
and direct labels, identity is never colour alone — moves from a comment beside the tokens
into `docs/UI-UX-GUIDELINES.md`.

## Slice 1 — the finance tracker ⬜

Accounts, categories, transactions, and a dashboard over them. Three phases, each of which
leaves the app working and stops for review.

| Phase | Scope | Status |
|---|---|---|
| 1 · Backend domain | migrations, enums, models, `App\Support\Money`, FormRequests, DTOs, controllers, routes, the metrics service | ⬜ |
| 2 · Shared kit + modules | the `components/{data,form,feedback}` port, the zod gate, `lib/money.ts`, the three module trees, the shell | ⬜ |
| 3 · Dashboard | this month in/out/net, balance per account, spending by category, 6-month trend | ⬜ |

### Phase 1 — the backend domain

Three migrations — `accounts`, `categories`, `transactions` — each carrying `user_id` with
a foreign key and a global scope from day one, through an `App\Models\Concerns\BelongsToUser`
that both scopes reads and stamps the column on write. There is one user; the point is that
adding a second is a config change rather than a migration and a backfill.

`amount` is `decimal(15,2)`, cast `decimal:2`. Enums land in `app/Enums/` (currently a
`.gitkeep`): the transaction type — income, expense, transfer — and the account type.
`App\Support\Money` becomes the one place PHP touches an amount outside a SQL expression:
normalising what a request sends, and formatting what a DTO exposes. It is the server-side
twin of `lib/money.ts`, and like it, it does no arithmetic that a query could do.

An `AppFormRequest` base plus one request per resource. It is already in the parity gate's
`EXEMPT` set with the reason — it declares no rules of its own. **Every `rules()` must be
an inline array literal:** the gate finds field names by matching exactly twelve spaces of
indentation, so a `rules()` that spreads a base array yields zero fields and the gate then
passes while checking nothing.

DTOs in `app/Data` with `#[TypeScript]`, exposing `public string $amount` so `"12.50"`
crosses the wire and JavaScript never floats it. These produce the first
`resources/js/types/generated.d.ts`, which is committed and gated.

Controllers stay thin. The concerns worth porting from the reference are `ResolvesPerPage`,
`SortsResourceQuery`, `RendersResourceIndex`, `RespondsWithToast` and `ReadsQueryValues`,
plus the `Searchable` model concern — take them when a controller needs them, not before.
`BuildsStockPickers` and `StreamsMedia` have no analogue here and are not coming.

The dashboard's numbers come from a service, not a controller, and **every one of them is a
SQL aggregate**: this month's in / out / net, the balance per account, spend grouped by
category, and six months of monthly totals. Nothing sums rows in PHP either — the rule is
about where arithmetic happens, not which language it happens in.

### One decision still open: how a transfer is stored

Two shapes, and it is not settled.

**One row.** `transactions` gains a nullable `to_account_id`; a transfer is a single row
with `type = transfer`. Editing and deleting are atomic and cheap — one row, no invariant to
hold. The cost lands on every read: "transactions for this account" becomes
`WHERE account_id = ? OR to_account_id = ?`, an OR across two indexed columns, and the
running balance becomes a `CASE` over both.

**Two legs.** An outgoing and an incoming row sharing a `transfer_group_id`. Every
per-account query stays `WHERE account_id = ?` and the running balance stays a plain
signed sum, which is the shape the dashboard already wants. The cost lands on writes:
edit and delete touch two rows inside a database transaction, and a half-written pair is
an unbalanced ledger — so it needs the transaction and probably a consistency check. The
list also shows a transfer twice unless it collapses by group.

**What decides it: write the four queries both ways first** — the account transaction list,
the per-account running balance, spend-by-category, and this month's in/out/net — then
count what edit and delete cost under each. All four must exclude transfers from income and
expense totals regardless of the model, and that requirement is the one most likely to make
one of the two obviously simpler.

### Phase 2 — the shared kit, and the three modules

The reference's `components/data/` (18 files), `components/form/` (6) and
`components/feedback/` (3) come to about 3,900 lines. Roughly 21 of those 27 files port
across, stripped of `t()`:

- **Not coming:** `stock-picker-field.tsx` and `on-hand-line.tsx`, which have no analogue,
  and the four-file column-preferences group (`column-panel`, `column-row`,
  `column-layout`, `use-column-layout`) — see the gaps below.
- **`feedback/dialog.tsx` needs a fresh decision.** Its stated reason was the untranslated
  close button, and that reason is gone. Its incidental improvement is not: the vendored
  primitive's dismiss button is a bare `size-4` icon — a 16px target, under WCAG 2.2's 24px
  minimum. That alone may still justify the wrapper, but it is a target-size argument now,
  not an i18n one, and the structure rule that forced the import no longer exists.
- **`lib/validation/message.ts` does not come across.** It exists to carry a translation key
  and its params through zod's message slot. With one language, primitives return the
  English sentence Laravel's own validator would produce, and parity is checked by reading
  both.

Alongside them: `lib/money.ts` (format and parse, deliberately no `add()`), `lib/format.ts`
for the deterministic date helpers, `lib/pagination.ts`, `lib/prefetch-cache.ts` — that last
one is not optional, since a prefetched nav target served after a write shows the list as it
was before the change.

Then `pages/{accounts,categories,transactions}`, each with its own `_components/`. The
rule of three applies: the first module keeps its form dialog and row actions private, and
the second is what reveals the shared shape.

The shell is replaced here too. `components/app-sidebar.tsx` still ships the starter kit's
single Dashboard entry and footer links to `github.com/laravel/react-starter-kit`.

### Phase 3 — the dashboard

`pages/dashboard.tsx` is currently 36 lines of `PlaceholderPattern` boxes. It becomes four
things: this month's in / out / net; the balance per account; spending by category as a
donut; and a six-month trend. `recharts` is already a dependency, pinned at exactly 3.8.0.

Every number is read from the metrics service. React formats and lays out; it does not add.

The five chart hues in `app.css` clear the lightness band, the chroma floor, 3:1 contrast
and the adjacent-pair colour-vision floor against both surfaces — but **no five-hue set
clears that floor across all pairs**, so charts carry a legend and direct labels, colours
are assigned in order and never cycled, and a sixth series folds into "Other".

### What closes slice 1

One end-to-end Playwright pass over every feature, when the user asks for it. Playwright is
not driven during a phase; this replaces the reference's per-phase browser check. Until
then, SSR determinism is enforced by reading rather than running — no `Date.now()`,
`Math.random()` or unpinned `Intl` in render output — which is why `scripts/ui-guard.sh`
blocks the two easy cases.

## Deferred finance work ⬜

Each of these is a real feature and none of them is needed for the first four screens to be
useful.

| Deferred | Why |
|---|---|
| Budgets per category | A budget is a comparison against a period's spending, and the period rules — calendar versus rolling, a limit changed mid-month, carry-over — are a design job on their own. |
| Recurring / scheduled transactions | Needs a scheduler, a materialisation strategy (generate ahead or synthesise on read), and a rule for editing one occurrence versus the series. That is a second data model, not a column. |
| Savings goals | A goal is a view over an account plus a target date and amount. Which balance counts is undecidable before there are real balances to look at. |
| Receipt attachments | Needs a storage decision and a media layer. `spatie/laravel-medialibrary` is deliberately not installed, and one attachment type does not justify installing it. |
| CSV bank-statement import + export | Import is parsing, matching and de-duplication, and every bank's CSV is different. Export is easy and pointless before there is anything worth exporting. |
| Multi-currency | Every amount would need a currency and every aggregate a rate at a date. That changes the money rule the whole app is built around. Single currency, 2dp, until there is a reason. |

## Possible future modules — recorded, not planned

Tasks and todos. Notes and documents. Contacts, calendar, reminders.

These are written down so the architecture does not quietly foreclose them, not because
anyone has agreed to build them. What keeps the door open costs nothing when it arrives:
`user_id` plus a global scope on every domain table from the first migration, and module
trees under `pages/<module>/` with private `_components/`. None of that exists yet — there
are no domain tables and no module trees — and the sidebar is a flat `NavItem[]` literal in
`components/app-sidebar.tsx`, which grows a group shape when there is a second group. **Do not build toward them.** The repository is named
`personal-assistant`; the application is a finance tracker, and adding a second domain is a
conversation, not a phase.

## Known gaps and things to revisit

- **`welcome.tsx` is still Laravel's marketing page** — 387 lines, served at `/` by
  `Route::inertia('/', 'welcome')`, and over the structure gate's 250-line signal, so every
  `check:structure` run warns on it. For a single-user app with registration disabled, `/`
  arguably has no marketing job at all and should redirect to the dashboard or to login,
  with the page deleted. The reference replaced its own copy with an 86-line token-based
  placeholder and still routes `/` to it; turning that route into a redirect is outstanding
  work there too. Left alone here because it is a routing decision that belongs with slice
  1's routes.
- **Column-visibility persistence was deliberately left out of the DataTable port.** The
  reference's version is four frontend files plus a controller, an `App\Support\TableColumns`
  validator, an enum and a column on `users` — a migration and an endpoint for a preference.
  Three lists with under a dozen columns each do not need the reader to hide any. Revisit if
  the transactions table grows past what fits at 1024px.
- **The Wayfinder trees are large for a route table this small** — 50 generated modules,
  324 KB of TypeScript across `resources/js/{actions,routes,wayfinder}`, all three
  gitignored. Nothing has measured what survives tree-shaking into the client bundle, and
  measuring it is only meaningful once real modules import from it. If it turns out to be
  material, the answer is importing narrowly, not giving up typed routes for Ziggy.
- **`cn` exists twice.** 56 files in `components/ui/` import the npm package `cn@0.2.5`;
  8 authored files import `@/lib/utils`. Both are clsx + tailwind-merge and both ship. This
  is deliberate — the vendored tree is read-only and self-consistent — but it is two copies
  of one function in the bundle and a pre-1.0 dependency. The entry is in
  `docs/PACKAGE-POLICY.md`; revisit when the registry moves.
- **`--destructive-foreground` has no consumer.** It is defined in both modes, and the note
  beside it in `app.css` keeps it "for the ones ported from laravel-ms-ai-v2 in Phase 6" —
  that is the reference's phase numbering, not this project's. Checked: none of the
  reference's `components/{data,form,feedback}` uses the class, and this repo's
  `passkey-item.tsx` already says `text-destructive`. Either phase 2's port picks it up or
  the token goes.
- **`check-validation-parity.ts` still carries the reference's `FACTORY_ARGS`** — 13 entries
  naming `BomRequest`, `ProductRequest`, `StockTransferRequest`, `StockTakeCountRequest` and
  friends. They are inert, since the map is keyed by request class name and none of those
  classes exists, but it is manufacturing vocabulary sitting in a finance app's gate and it
  will mislead whoever reads the script next. Clear it when the first real FormRequest lands.
