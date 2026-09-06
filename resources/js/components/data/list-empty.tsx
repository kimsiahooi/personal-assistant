import { SearchX } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import type { FilterApi } from '@/types';

/**
 * What a list shows when it has no rows — which is three different situations wearing the
 * same shape, and they need different answers.
 *
 * 1. **Nothing matched.** A search, a filter, or both. The way out is to undo whichever one
 *    is in force, so the buttons are offered one per thing rather than as a single
 *    compound label that would have to describe every combination.
 * 2. **Nothing on this page.** A real state, not a theoretical one: delete the last row of
 *    the last page and the redirect carries `?page=N` to a page that no longer exists.
 * 3. **Nothing at all**, which is the resource's own copy — only the page knows whether an
 *    empty list means "record your first transaction" or "add an account first".
 *
 * `narrowed` and `searching` are derived here rather than passed, because both are just
 * readings of `search` and `filter.count`, and a second copy could disagree with the one
 * the table uses to decide whether to render a toolbar at all.
 */
export function ListEmpty({
    search,
    noMatch,
    filter,
    total,
    emptyState,
    onClearSearch,
    onFirstPage,
}: {
    /** What the server searched for — not what is currently typed. */
    search: string;
    /** The resource's own wording for "nothing matched", if it has any. */
    noMatch?: { title: string; description: string };
    filter: FilterApi;
    /** How many rows the resource has in total, ignoring this page. */
    total: number;
    /** Shown when the resource is genuinely empty. */
    emptyState: ReactNode;
    onClearSearch: () => void;
    onFirstPage: () => void;
}) {
    const searching = search !== '';
    const narrowed = searching || filter.count > 0;

    return (
        <div className="px-4 py-12">
            {narrowed ? (
                <EmptyState
                    icon={SearchX}
                    title={noMatch?.title ?? 'No matches'}
                    description={
                        // The search wording names the term, which is only meaningful when
                        // there is one. A list narrowed by a filter alone gets its own
                        // sentence rather than "nothing matches ''".
                        searching
                            ? (noMatch?.description ??
                              `Nothing matches “${search}”.`)
                            : 'No rows match the filters in force.'
                    }
                    action={
                        <div className="flex flex-wrap justify-center gap-2">
                            {searching && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClearSearch}
                                >
                                    Clear search
                                </Button>
                            )}
                            {filter.count > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={filter.clear}
                                >
                                    Clear filters
                                </Button>
                            )}
                        </div>
                    }
                />
            ) : total > 0 ? (
                <EmptyState
                    icon={SearchX}
                    title="This page is empty"
                    description="There is nothing here — the rows may have moved to an earlier page."
                    action={
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onFirstPage}
                        >
                            Back to the first page
                        </Button>
                    }
                />
            ) : (
                emptyState
            )}
        </div>
    );
}
