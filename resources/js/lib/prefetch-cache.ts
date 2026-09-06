import { router } from '@inertiajs/react';

/**
 * Throw away prefetched pages whenever something is written.
 *
 * Nav links are marked `prefetch` (see `nav-main.tsx`), so Inertia fetches a page on hover
 * and serves that copy when the link is clicked. Nothing invalidates it on its own, which
 * makes a write in between invisible: hover "Accounts", record a transaction, click
 * "Accounts" — and the cached page renders with the old balance. It looks like the
 * transaction did not save, and a manual refresh "fixes" it, which is the tell.
 *
 * A non-GET visit is the signal that something on the server changed. *What* changed is not
 * knowable from here, so every prefetched page is dropped rather than guessed at. Inertia
 * can flush by cache tag instead, but that means tagging each link correctly and forever —
 * and a missed tag brings this bug back silently, which is exactly the failure mode worth
 * designing out.
 *
 * Registered once from the client entry, beside the other one-time setup.
 */
export function invalidatePrefetchOnWrite(): void {
    // Never on the server: there is no cache there, and no navigation to invalidate.
    if (typeof window === 'undefined') {
        return;
    }

    router.on('finish', (event) => {
        const visit = (event as CustomEvent).detail?.visit;

        // Reads do not invalidate anything — and prefetches themselves are reads.
        if (!visit || visit.method === 'get') {
            return;
        }

        router.flushAll();
    });
}
