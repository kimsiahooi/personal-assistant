import { usePage } from '@inertiajs/react';

/**
 * The IANA zone this visit is being rendered in — `Asia/Kuala_Lumpur`, `UTC`, …
 *
 * Read from the page props, never from `Intl.DateTimeFormat().resolvedOptions()`. The
 * server already formatted this page's dates against one zone, and the browser has to
 * agree with it or hydration diverges. The browser's own answer reaches the server the
 * round-about way — a cookie written before first paint, see `app.blade.php` — which is
 * what lets both sides read the same value here.
 *
 * Falls back to UTC on the one visit before that cookie exists, matching
 * `App\Support\TimeZones::FALLBACK`.
 */
export function useTimeZone(): string {
    return usePage().props.timezone ?? 'UTC';
}
