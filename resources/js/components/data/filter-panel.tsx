import { SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import type { FilterApi } from '@/types';

/**
 * One button holding every filter a list has.
 *
 * The ledger filters by account, category, type and a date range — four controls, which do
 * not fit a toolbar row on a phone: they stack, and push the table they are meant to
 * narrow off the screen.
 *
 * **The count on the button is not decoration.** A filter behind a button is a filter you
 * cannot see, and someone arriving from a link or the back button would find rows missing
 * with nothing on screen to say why. The badge is what keeps a narrowed list honest while
 * the panel is shut.
 *
 * A popover on a desk and a sheet on a phone, because a four-field form anchored to a small
 * button has nowhere to go at 375px. Both render the same children; only the container
 * differs. `useIsMobile` reports the server's answer during hydration and re-renders after,
 * so the two sides never disagree — and the panel is shut on first render anyway, where the
 * difference is invisible.
 */
export function FilterPanel({
    filter,
    children,
}: {
    filter: FilterApi;
    children: ReactNode;
}) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);

    // The one-click Clear beside the trigger renders only while a filter is in force, so
    // pressing it removes the button under the cursor. The trigger is right next to it and
    // always present, which makes it the natural place for focus to land.
    const trigger = useRef<HTMLButtonElement>(null);

    const triggerButton = (
        <Button
            ref={trigger}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
        >
            <SlidersHorizontal className="size-4" />
            Filters
            {filter.count > 0 && (
                <>
                    <Badge
                        variant="secondary"
                        aria-hidden
                        className="ml-1 h-5 min-w-5 justify-center px-1 tabular-nums"
                    >
                        {filter.count}
                    </Badge>
                    {/*
                        The badge alone made the button announce as "Filters 2", which reads
                        as an ordinal — the second filter button — rather than a count of
                        what is in force. Same treatment as the Columns panel.
                    */}
                    <span className="sr-only">
                        {filter.count === 1
                            ? '1 filter applied'
                            : `${filter.count} filters applied`}
                    </span>
                </>
            )}
        </Button>
    );

    const body = (
        <>
            <div className="space-y-4">{children}</div>

            {filter.count > 0 && (
                <>
                    <Separator className="my-4" />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                            filter.clear();
                            setOpen(false);
                        }}
                    >
                        Clear all filters
                    </Button>
                </>
            )}
        </>
    );

    return (
        <div className="flex w-full items-center gap-2 sm:w-auto">
            {isMobile ? (
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>{triggerButton}</SheetTrigger>
                    <SheetContent side="bottom" className="max-h-[80dvh]">
                        <SheetHeader>
                            <SheetTitle>Filters</SheetTitle>
                            <SheetDescription>
                                Narrow the list to the rows you want to see.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="overflow-y-auto px-4 pb-6">{body}</div>
                    </SheetContent>
                </Sheet>
            ) : (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
                    <PopoverContent
                        align="end"
                        // Tall enough for four controls, and scrolls past that rather than
                        // growing off the bottom of a short window.
                        className="max-h-[24rem] w-72 overflow-y-auto"
                    >
                        {body}
                    </PopoverContent>
                </Popover>
            )}

            {/*
                A one-click reset, for the common case of "show me everything again" without
                opening the panel to do it. Only when there is something to reset —
                otherwise it is a button that does nothing.
            */}
            {filter.count > 0 && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        trigger.current?.focus();
                        filter.clear();
                    }}
                >
                    Clear
                </Button>
            )}
        </div>
    );
}
