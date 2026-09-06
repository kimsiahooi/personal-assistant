import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { pageWindow } from '@/lib/pagination';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

/**
 * Kept in step with `RendersResourceIndex::perPage()`. A value outside the server's
 * allow-list does not clamp — it falls back to 25 — so the two lists disagreeing would
 * silently drop someone from 100 rows to 25.
 */
const PER_PAGE_OPTIONS = [10, 25, 50, 100];

type Props = {
    // Only the counts matter here; the row type is irrelevant.
    page: Pick<
        Paginated<unknown>,
        'current_page' | 'last_page' | 'per_page' | 'from' | 'to' | 'total'
    >;
    onPage: (page: number) => void;
    onPerPage: (perPage: number) => void;
};

/**
 * The footer band: how many rows there are, how many to show at once, and how to move
 * between them — the three things a list is asked about, in one place.
 *
 * How many results a search returned is the useful part, so the count is shown even when
 * there is a single page and the page buttons are not.
 *
 * Issues no requests of its own; it reports what was asked for and {@link DataTable}
 * decides what that means for the query.
 */
export function PaginationBar({ page, onPage, onPerPage }: Props) {
    const slots = pageWindow(page.current_page, page.last_page);
    const atStart = page.current_page <= 1;
    const atEnd = page.current_page >= page.last_page;

    return (
        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            {/* On a phone the count reads as a caption under the controls; on a wider
                screen it takes the left edge and the controls take the right. */}
            <p className="order-2 text-muted-foreground text-sm sm:order-1">
                {page.total === 0
                    ? 'No results'
                    : `Showing ${page.from ?? 0}–${page.to ?? 0} of ${page.total}`}
            </p>

            <div className="order-1 flex items-center justify-between gap-4 sm:order-2 sm:justify-end">
                <div className="flex items-center gap-2">
                    <span className="hidden text-muted-foreground text-sm sm:inline">
                        Rows per page
                    </span>
                    <Select
                        value={String(page.per_page)}
                        onValueChange={(next) => onPerPage(Number(next))}
                    >
                        <SelectTrigger
                            size="sm"
                            className="w-[4.5rem]"
                            aria-label="Rows per page"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PER_PAGE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {page.last_page > 1 && (
                    <nav
                        aria-label="Pagination"
                        className="flex items-center gap-1"
                    >
                        {/*
                            `aria-disabled`, not `disabled`. These two buttons disable
                            themselves — the condition is the page number their own click
                            changes — and a control that gains `disabled` while focused is
                            blurred by the browser, dropping the focus ring and the screen
                            reader's point of regard onto `<body>` mid-interaction. Paging
                            with `preserveState` updates them in place, so it happens on
                            every arrival at the first or last page. `aria-disabled` keeps
                            them focusable and announced as unavailable; the guard in the
                            handler is what actually stops the visit.
                        */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn('size-8', atStart && 'opacity-50')}
                            aria-label="Previous page"
                            aria-disabled={atStart}
                            onClick={() => {
                                if (!atStart) {
                                    onPage(page.current_page - 1);
                                }
                            }}
                        >
                            <ChevronLeft className="size-4" />
                        </Button>

                        {/* Numbers need room. Below `sm` they collapse to a position
                            readout, which says the same thing in one line. */}
                        <span className="px-2 text-muted-foreground text-sm tabular-nums sm:hidden">
                            Page {page.current_page} of {page.last_page}
                        </span>

                        <div className="hidden items-center gap-1 sm:flex">
                            {slots.map((slot, index) =>
                                slot === 'gap' ? (
                                    <span
                                        // Two gaps can appear, and neither has an identity
                                        // of its own — position is the key.
                                        // biome-ignore lint/suspicious/noArrayIndexKey: a gap has no id
                                        key={`gap-${index}`}
                                        aria-hidden="true"
                                        className="px-1 text-muted-foreground text-sm"
                                    >
                                        …
                                    </span>
                                ) : (
                                    <Button
                                        key={slot}
                                        type="button"
                                        variant={
                                            slot === page.current_page
                                                ? 'outline'
                                                : 'ghost'
                                        }
                                        size="icon"
                                        aria-label={`Page ${slot}`}
                                        aria-current={
                                            slot === page.current_page
                                                ? 'page'
                                                : undefined
                                        }
                                        className={cn(
                                            'size-8 tabular-nums',
                                            slot === page.current_page &&
                                                'font-semibold',
                                        )}
                                        onClick={() => onPage(slot)}
                                    >
                                        {slot}
                                    </Button>
                                ),
                            )}
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn('size-8', atEnd && 'opacity-50')}
                            aria-label="Next page"
                            aria-disabled={atEnd}
                            onClick={() => {
                                if (!atEnd) {
                                    onPage(page.current_page + 1);
                                }
                            }}
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                    </nav>
                )}
            </div>
        </div>
    );
}
