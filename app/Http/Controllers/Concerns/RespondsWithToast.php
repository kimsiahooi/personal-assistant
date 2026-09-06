<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use Inertia\Inertia;

/**
 * Flash a toast for the next Inertia response.
 *
 * `Inertia::flash()` rather than `back()->with('success', …)`, and the difference matters:
 * a session flash puts the message in the page props, where every screen would have to
 * remember to read it and render it. Inertia's own flash channel fires a `flash` event that
 * the global `useFlashToast` hook — mounted once, inside `ui/sonner.tsx` — turns into a
 * toast. So a controller says `$this->toast('Saved.')` and no page needs any wiring at all.
 *
 * The key is `toast` because that is what the hook reads; the two are one contract.
 */
trait RespondsWithToast
{
    /**
     * @param  'success'|'info'|'warning'|'error'  $type
     */
    protected function toast(string $message, string $type = 'success'): void
    {
        Inertia::flash('toast', ['type' => $type, 'message' => $message]);
    }
}
