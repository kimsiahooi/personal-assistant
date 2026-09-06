#!/usr/bin/env bash
#
# Structure gate — the mechanical half of docs/ARCHITECTURE.md.
#
# Folder conventions decay unless something checks them, and there is no test suite
# here. This is the counterpart to check-validation-parity.ts: what a
# script can decide should not be a review comment.
#
# Errors (exit 1):
#   1. lib/ imports React — it is meant to be pure, readable-as-testable functions.
#   2. components/ imports from pages/ — dependencies point pages -> components -> ui.
#   3. one module reaches into another module's _components/ — those are private until
#      promoted, which is the whole point of the rule of three.
#   4. a controller runs a raw query — DB::, ->join( or a SQL string belong in a Service.
#   5. money arithmetic in the browser. Amounts cross the wire as decimal strings and
#      every total is computed in SQL; a sum in React is where float drift gets back in.
#   6. a dialog imported straight from ui/ — its 16px close button is under the WCAG
#      target-size minimum, and components/feedback/dialog.tsx is the 36px replacement.
#
# Warnings (exit 0): size caps. A page over 250 lines or a controller method over 30 is
# a signal that a piece wants extracting, not a rule — so it prompts rather than blocks.
#
# Run: bun run check:structure

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

JS="resources/js"
PROBLEMS=0

fail() {
    printf '  \033[31m•\033[0m %s\n' "$1"
    PROBLEMS=$((PROBLEMS + 1))
}

warn() {
    printf '  \033[33m•\033[0m %s\n' "$1"
}

echo "▸ structure"

# --- 1. lib/ must not import React -------------------------------------------
# lib/ holds pure functions. The moment one reaches for a hook it stops being
# checkable by reading and starts needing a render to understand.
while IFS= read -r hit; do
    fail "${hit%%:*}: lib/ must not import React — move the hook to hooks/, keep the maths here."
done < <(grep -rn "from 'react'" "$JS/lib" 2>/dev/null)

# --- 2. components/ must not import from pages/ ------------------------------
# A shared component that knows about a page is not shared, it is misplaced.
while IFS= read -r hit; do
    fail "${hit%%:*}: components/ must not import from pages/ — dependencies run pages -> components -> ui."
done < <(grep -rn "from '@/pages/" "$JS/components" 2>/dev/null)

# --- 3. _components/ are private to their module -----------------------------
# `pages/a/_components/x` may be imported by pages/a only. A second module wanting it
# is the signal to promote it to components/, not to reach across.
while IFS= read -r file; do
    importer_module=$(printf '%s' "$file" | sed -E "s|$JS/pages/([^/]+)/.*|\1|")

    while IFS= read -r target; do
        owner_module=$(printf '%s' "$target" | sed -E 's|.*@/pages/([^/]+)/_components/.*|\1|')

        if [ "$owner_module" != "$importer_module" ]; then
            fail "$file: imports $owner_module's private _components/ — promote it to components/ instead."
        fi
    done < <(grep -o "@/pages/[^/]*/_components/[^']*" "$file" 2>/dev/null)
done < <(find "$JS/pages" -name '*.tsx' -o -name '*.ts' 2>/dev/null)

# --- 4. controllers must not run raw queries ---------------------------------
# A controller resolves, delegates and responds. A join in one is a Service trying to
# get out.
while IFS= read -r hit; do
    fail "${hit%%:*}: raw query in a controller — that belongs in a Service or an Action."
done < <(grep -rn -E '(DB::|->join\(|->leftJoin\(|selectRaw\(|whereRaw\()' app/Http/Controllers 2>/dev/null)

# --- 5. money is never added up in the browser -------------------------------
# Amounts are decimal(15,2) in MySQL and reach React as strings, precisely so that
# JavaScript never turns one into a float. A total computed here would undo that:
# 0.1 + 0.2 is 0.30000000000000004, and toFixed(2) hides it while the equality check
# still fails. Every sum, balance and aggregate is a SQL expression; lib/money.ts
# formats and parses and deliberately offers no add().
#
# Two stages rather than one regex, because the operator is rarely next to the field —
# `rows.reduce((s, r) => s + Number(r.amount), 0)` is the shape this actually takes.
# Stage one names every identifier money travels under; naming only `amount` left the
# accounts list's `balance` and `movement` unguarded for a whole phase.
# Stage one finds the money, stage two finds the arithmetic. Operators are matched
# spaced or compound so that JSX `/>` and `</` are not arithmetic, and comment lines are
# dropped first — a JSDoc continuation begins with ` * `, which is otherwise
# indistinguishable from a spaced multiplication. Mark a deliberate exception
# `money-allow`.
# Every identifier money travels under, not just `amount`. The rule was written when the
# ledger was the only screen and `amount` was the only name; `balance`, `movement` and
# `opening_balance` arrived with the accounts list, and a `reduce` over any of them is the
# same float drift under a different word.
#
# Bare `total` is deliberately NOT here, and `_total` is. In this codebase `total` already
# means a ROW COUNT — `page.total`, and ListEmpty's — so matching it fires on
# `index === total - 1` in the Columns panel, which is not money and never will be. A gate
# that cries wolf is a gate people silence with `money-allow`, and the next real finding
# goes with it. The dashboard's money fields are therefore named `<thing>_total`, which
# this catches and a row count never collides with.
money_re='\bamounts?\b|\bbalances?\b|\bmagnitude\b|\bmovement\b|\bopening_balance\b|\bsubtotals?\b|_totals?\b|\bnet\b'
while IFS= read -r hit; do
    fail "${hit%%:*}: money arithmetic in the browser — total it in SQL, or mark the line 'money-allow'."
done < <(grep -rn -E "$money_re" "$JS" 2>/dev/null \
    | grep -vE '^[^:]+:[0-9]+:[[:space:]]*(\*|//|/\*)' \
    | grep -E '[[:space:]][-+*/][[:space:]]|[-+*/]=|\breduce\(' \
    | grep -v 'money-allow')

# --- 6. dialogs come from feedback/, not straight from ui/ --------------------
# The vendored DialogContent renders its dismiss button as a bare `size-4` icon: a 16px
# target, under the 24px WCAG 2.2 (2.5.8) minimum, on the one control in a dialog that
# somebody in a hurry reaches for. `components/feedback/dialog.tsx` turns that button off
# and renders a 36px Button in its place, and re-exports everything else untouched — so
# the fix is a one-line import change and the failure mode is invisible on screen, which
# is exactly the kind of thing that needs a gate rather than a review comment.
#
# feedback/dialog.tsx itself is the one file that must import the primitive; it is the
# wrapper. AlertDialog is a different component with its own markup and is not covered.
while IFS= read -r hit; do
    fail "${hit%%:*}: import Dialog from '@/components/feedback/dialog' — ui/dialog's 16px close button is under the WCAG target-size minimum."
done < <(grep -rn "from '@/components/ui/dialog'" "$JS" 2>/dev/null \
    | grep -v '^resources/js/components/feedback/dialog.tsx:' \
    | grep -v "$JS/components/feedback/dialog.tsx:")

# --- size caps, as warnings --------------------------------------------------
while IFS= read -r file; do
    lines=$(wc -l < "$file" | tr -d ' ')

    if [ "$lines" -gt 250 ]; then
        warn "$file is $lines lines — over the ~250 signal; something wants extracting to _components/."
    fi
done < <(find "$JS/pages" -name '*.tsx' 2>/dev/null)

if [ "$PROBLEMS" -gt 0 ]; then
    printf '\n\033[31m✗\033[0m structure: %d problem(s). See docs/ARCHITECTURE.md.\n' "$PROBLEMS"
    exit 1
fi

printf '\033[32m✓\033[0m structure: dependencies point one way, modules keep their components to themselves.\n'
