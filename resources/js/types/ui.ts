import type { ReactNode } from 'react';
import type { BreadcrumbItem } from '@/types/navigation';

export type AppLayoutProps = {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
};

export type AppVariant = 'header' | 'sidebar';

export type FlashToast = {
    type: 'success' | 'info' | 'warning' | 'error';
    message: string;
};

export type AuthLayoutProps = {
    children?: ReactNode;
    name?: string;
    title?: string;
    description?: string;
};

/**
 * A Laravel LengthAwarePaginator as Inertia serializes it.
 *
 * `links` is deliberately not declared: the footer builds its own page window from
 * `current_page`/`last_page` (see `lib/pagination.ts`), so nothing reads the raw link
 * payload and declaring it would invite something to start.
 */
export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
};

/**
 * The query state a server-paginated list round-trips. Every list controller sends
 * exactly this under `filters` — see `RendersResourceIndex` — and the table echoes it
 * back on every request.
 *
 * `sortable` comes from the server rather than being declared in the page, because it is
 * the same allow-list that guards `ORDER BY`. A second copy here could disagree with it,
 * and the disagreement would show up as a header that looks clickable and does nothing.
 */
export type ResourceFilters = {
    search: string;
    per_page: number;
    sort: string;
    direction: 'asc' | 'desc';
    sortable: string[];
    /**
     * This resource's own filters — `{ type: 'expense' }` — round-tripped alongside the
     * rest so that sorting or paging cannot silently widen the result set.
     *
     * A bag rather than named keys, because what a list filters by is the list's own
     * business. `DataTable` only has to re-send whatever it was given, which is the one
     * thing every list agrees on. Empty values never reach it: the server drops them.
     */
    extra: Record<string, string>;
};

/**
 * What `DataTable` hands its toolbar slot so a per-resource control can narrow the list:
 * the filters currently in force, and the one way to change them.
 *
 * `set('type', '')` clears — an empty value drops the key from the URL rather than
 * sending a blank one.
 */
export type FilterApi = {
    values: Record<string, string>;
    set: (key: string, value: string) => void;
    /**
     * Change several at once — one request and one history entry, not one of each.
     *
     * A date range is two keys describing a single decision: setting `from` and then `to`
     * would put a half-applied range in the history for the back button to land on, and
     * would ask the server for a page nobody wanted to see.
     */
    setMany: (values: Record<string, string>) => void;
    /** How many are in force — what the Filters button counts. */
    count: number;
    /** Drop all of them in one visit, rather than one request per key. */
    clear: () => void;
};
