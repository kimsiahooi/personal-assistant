# Package policy — buy vs build

**Suggest a package whenever a stable, popular one would remove real code or real risk.**
Don't hand-roll something the ecosystem has already standardised on, and don't add a
dependency for something the platform already does well.

This is a live catalog. Update it as decisions land.

## The bar

A package has to clear all five:

1. **Stable** — a 1.0+ release line, no churn in its public API between minors.
2. **Popular** — the thing the Laravel/React ecosystem actually reaches for. If picking it
   needs a justification paragraph, it is probably not the default.
3. **Maintained** — commits and releases in the last ~6 months; issues get answered.
4. **Compatible** — confirm it supports **Laravel 13 / React 19 / Tailwind v4** *before*
   proposing it. Several popular packages still lag on these.
5. **Easy to manage** — installs and configures without patching, doesn't fight Inertia or
   SSR, and can be removed again without unpicking the whole app.

There is no test suite here by design, so "we'd notice if it broke" is not available. The
gates listed in `CLAUDE.md` are the entire safety net, and none of them look inside a
dependency.

Frontend packages carry one extra test: **bundle cost**. This app is SSR + Inertia, so a
heavy client library shows up in every page load. Prefer one that tree-shakes or
lazy-loads, and keep the heavy ones behind a single importer — `recharts` today is reached
only from `resources/js/components/ui/chart.tsx`, so only the dashboard should ever pay for
it. Under SSR there is a second failure mode: a library that renders `Date.now()`,
`Math.random()` or an unpinned `Intl` formatter into output produces a hydration mismatch.
`scripts/ui-guard.sh` rule 3 greps `Date.now(` and `Math.random(`, so it catches the first
two in our code and neither the unpinned `Intl` nor anything inside a package. Those are
checked by reading.

## How to propose one

When a feature would benefit, say so **before** writing the hand-rolled version:

> "Bank-statement import needs streaming CSV. `openspout/openspout` is the ecosystem
> default, actively maintained, Laravel-13 compatible, and streams instead of buffering the
> file into memory — it replaces a hand-rolled `fgetcsv` loop plus its own delimiter and
> encoding handling. Add it, or hand-roll?"

Name the package, why it beats hand-rolling, roughly what it removes, and any risk. Then
let the user decide. Never silently add a dependency.

## Already decided

**In the stack:** `spatie/laravel-data` + `spatie/laravel-typescript-transformer` (DTOs →
generated TS) · `laravel/fortify` (+ 2FA, passkeys) · `laravel/wayfinder` (typed routes, no
Ziggy) · `@tanstack/react-table` v9 · `zod` v4 · `cmdk` · `sonner` · `radix-ui` · and,
arriving with the shadcn registry, `recharts`, `react-day-picker`, `embla-carousel-react`,
`vaul`, `react-resizable-panels`, `@base-ui/react`, `@shadcn/react`, `cn`.

That second group was not chosen one package at a time. Each is the runtime of one vendored
primitive — `chart.tsx`, `calendar.tsx`, `carousel.tsx`, `drawer.tsx`, `resizable.tsx`,
`combobox.tsx`, `message-scroller.tsx` — so the removal question for any of them is really
"do we drop the primitive", not "do we drop the package". That includes `@shadcn/react`,
which `message-scroller.tsx` imports, and `@base-ui/react`, which `combobox.tsx` does:
neither is removable while the primitive stays, and the primitive cannot be edited to drop
it. `recharts` is pinned exact (`3.8.0`, no caret) because its 3.x minors have moved.

`@tanstack/react-table` and `zod` are declared and currently imported by nothing — they are
here for slice 1's transaction list and its validation schemas. If slice 1 lands and either
is still unimported, remove it.

**`@tanstack/react-table` — v9 (`^9.1.2`, lock resolves 9.2.4), not the v8.21.3 every
shadcn data-table snippet targets.** Two things to know before translating one of those snippets: v9 renamed
`useReactTable` to `useTable`, and nothing exists until its feature is registered in
`tableFeatures({…})`, so a missing API usually means a missing feature rather than a
removed one. And because filtering, sorting and pagination happen in SQL here,
`manualPagination` / `manualSorting` only *bypass* the client stages — they never fetch and
never slice, so `data` must already be the page the database returned.

**`cn` v0.2.5 — accepted, and it fails the bar.** Worth recording plainly rather than
quietly. It arrived as a transitive requirement of the shadcn registry: 56 of the 62 files
in `resources/js/components/ui/` import `cn` from the npm package
(github.com/shadcn-ui/cn, MIT, official). It is pre-1.0, so it fails bar 1, and there is no
reading under which it doesn't. It was accepted because the alternative is worse — removing
it means rewriting an import line in 56 vendored files, and `scripts/ui-guard.sh` rule 1
blocks hand-edits to `resources/js/components/ui/` precisely so that `shadcn add` stays safe
to run again. One pre-1.0 dependency costs less than a forked primitive tree.

Authored code does not use it. `resources/js/lib/utils.ts` exports its own `cn` (clsx +
tailwind-merge), `components.json` still points the `utils` alias at `@/lib/utils`, and
everything outside `components/ui/` imports from there. Two functions with the same name
and the same job coexist deliberately: one belongs to the vendored tree, one to us. If a
future registry sync drops the dependency, `bun remove cn` and nothing authored changes.

Bar 1 is waived elsewhere too — `laravel/wayfinder` is `^0.1.14` and `@laravel/passkeys`
is `^0.2.0` (first-party, where the maintainer is the framework); `class-variance-authority`
`^0.7.1` and `lucide-react` `^0.475.0` are pre-1.0 by convention with universal adoption.
What separates those from `cn` is that each was chosen. `cn` was inherited. The waiver is a
decision each time, not a habit.

**Deliberately not added — the platform already does it:**

| Need | Use instead |
|---|---|
| Money math | `decimal(15,2)` in MySQL, `decimal:2` cast, `string` on the DTO, every sum in SQL — **not** `brick/money` |
| Date formatting | native `Intl.DateTimeFormat` with a **pinned** locale — an unpinned one renders differently in the SSR Node process than in the browser |
| Class merging | `clsx` + `tailwind-merge`, exported as `cn` from `resources/js/lib/utils.ts` |
| Client form state | Inertia `<Form>` + zod schemas under `lib/validation/schemas`, held to the server by `bun run check:validation` — **not** react-hook-form |
| Status / type enums with labels | native PHP `enum`, surfaced through `spatie/laravel-data` |
| UI translation | nothing. The app is English only — no `lang/`, no `t()` |
| Multi-tenancy, roles, permissions | nothing. One user, a `user_id` column on every domain table, one global scope |
| File attachments | nothing yet — no domain need until receipts land |

`react-hook-form` and `@hookform/resolvers` are absent by construction, not by omission: the
shadcn `form` component was excluded from the registry install for exactly that reason, and
`resources/js/components/ui/` has 62 files and no `form.tsx`. The reference excluded it the
same way — neither package is in its `package.json`, and its `components/ui/` has no
`form.tsx` either — so the pattern is inherited, not invented here.

The i18n answer here is scope, not the technical argument the reference had to make: one
user, one language. If that ever changes, the SSR problem comes with it — `react-i18next`'s
request isolation depends on middleware cloning a per-request instance, and the Inertia SSR
process has no request context — so it would be a real decision, not an install.

`brick/money` is the interesting "no". It is the right package for currency-safe integer
math, and it is declined because the money never becomes a number in PHP or in JavaScript:
amounts are `decimal(15,2)` end to end, arithmetic happens in SQL, and `lib/money.ts`
formats and parses without offering `add()`. `scripts/check-structure.sh` rule 5 enforces
that. A money library would be a second, weaker answer sitting beside the one the schema
already gives. It re-opens with multi-currency — see below.

**`date-fns` removed — the worked example of the section below.** It was a direct
dependency that nothing in `resources/js` imported: zero hits. Dropping it from
`package.json` did not remove it from `node_modules`, and that is the point —
`react-day-picker@10.0.1` declares `date-fns: ^4.1.0` as its own dependency (and
`@base-ui/react` lists it as an optional peer), so `date-fns@4.4.0` is still resolved in
`bun.lock` and the calendar still works. What changed is the claim. A direct dependency is a
statement about how the app works, and a false one costs a reader's attention every time
they open the manifest.

**Flagged for measurement, not action — the Wayfinder chunk.** In the Phase 2 build it was
316 kB (99.7 kB gzipped), the single largest asset, for an app whose entire route surface is
five auth screens. SSR is on, so it lands in every page load rather than on demand. Accounts,
categories, transactions and the dashboard will add many more routes. Measure it again once
slice 1 exists — the answer may be a split, or it may be that tree-shaking does the work
once real pages import only the routes they use. Nothing to do now, and no dependency to
add or drop; recorded so the number is not discovered twice.

## Likely upcoming decisions

Flagged now so they get considered at the right moment, not retrofitted. All of these are
deferred work — none is committed:

| Need | Candidate | Note |
|---|---|---|
| CSV import / export | `openspout/openspout` | Streams rather than buffering. Bank-statement import is where a hand-rolled `fgetcsv` loop starts growing delimiter, encoding and header-mapping edge cases. |
| PDF statements | `spatie/laravel-pdf` (Browsershot) or `barryvdh/laravel-dompdf` | Print-styling an Inertia page comes first; PDF is the step after. Browsershot needs a headless Chrome — weigh the ops cost on a single-user box. |
| Recurring transactions | **none — build it** | Laravel's scheduler plus a `recurring_transactions` table and a materialising command. The domain rules (next-occurrence, skip, end date) are the work, and no package owns them. |
| Receipt attachments | `spatie/laravel-medialibrary` | Declined today for want of a domain need; it becomes the obvious pick the moment receipts are real. Conversions, disk config and cleanup are genuine work to own. |
| Multi-currency | schema decision first, then reconsider `brick/money` | Amounts stay `decimal(15,2)`. The precision goes on the **rate**, not the amount — an FX rate needs `decimal(18,8)`. Getting that column right is more of the answer than the library is. |
| Typed app settings | `spatie/laravel-settings` | Evaluate before hand-rolling a `Setting` model plus a cast registry. |
| Budgets, savings goals | **none — build them** | Domain logic over the same tables. Both are SQL aggregates with a target column. |

Tasks, notes and contacts are possible future modules and are not committed. No package
thinking is owed to them yet.

## Removing packages counts too

A dependency nothing imports is worse than no dependency: it carries install time, security
surface, and a false signal about how the app works. When a module lands, check whether it
made anything unused — and say so. `date-fns` above is the shape of that check, and
`@tanstack/react-table` and `zod` are the two currently owed one. Check by import, not by
intuition: every other package added with the registry is imported by exactly one vendored
primitive, which is easy to mistake for unused.
