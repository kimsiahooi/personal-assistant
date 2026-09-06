import { Columns3 } from 'lucide-react';
import { useState } from 'react';
import type {
    ColumnLayout,
    ConfigurableColumn,
} from '@/components/data/column-layout';
import { moveColumn } from '@/components/data/column-layout';
import { ColumnRow } from '@/components/data/column-row';
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

/**
 * Which columns this list shows, and in what order.
 *
 * The reason it exists: a column can be worth having and not worth the width. The ledger
 * carries a note on every row that the search box already matches against — so a row could
 * match on text that was nowhere on screen. Making it a column by default would crush the
 * columns carrying numbers; leaving it out made the list lie. This is the third answer,
 * and it generalises: every list now has somewhere to put a column that is useful but not
 * usually.
 *
 * A popover on a desk and a sheet on a phone, matching {@link FilterPanel} exactly — the
 * house pattern for a panel of controls behind a toolbar button, because a list of rows
 * anchored to a small button has nowhere to go at 375px.
 *
 * **Reordering works two ways, and neither is the fallback.** Dragging is what a pointer
 * expects; the up/down buttons are what a keyboard needs and the *only* thing that works
 * on a phone, since native drag events never fire on touch. The panel is a sheet there,
 * where buttons are the natural gesture anyway. That is also why no drag library was added
 * — see docs/PACKAGE-POLICY.md.
 *
 * Nothing here is persisted. The layout lives in {@link DataTable}'s state, so it survives
 * searching, sorting and paging — which preserve the component — and resets on navigation.
 */
export function ColumnPanel({
    columns,
    layout,
    onChange,
    onReset,
    canReset,
    sortedBy,
}: {
    /** The configurable columns. Anchors have no label, so they are not listed. */
    columns: ConfigurableColumn[];
    layout: ColumnLayout;
    onChange: (layout: ColumnLayout) => void;
    onReset: () => void;
    /** Whether the layout differs from what the columns declare. */
    canReset: boolean;
    /** The column the server is ordering by — it cannot be hidden. */
    sortedBy: string;
}) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);

    // Which row is being dragged, and which it is over. Both are written only from event
    // handlers, so the render stays deterministic and SSR has nothing to disagree with.
    const [dragging, setDragging] = useState<number | null>(null);
    const [over, setOver] = useState<number | null>(null);

    const byId = new Map(columns.map((column) => [column.id, column]));
    // The reader's order is the source of truth; `columns` only supplies the names.
    const rows = layout.order
        .map((id) => byId.get(id))
        .filter((column): column is ConfigurableColumn => column !== undefined);

    const hidden = new Set(layout.hidden);
    const showing = rows.length - hidden.size;

    const toggle = (id: string) =>
        onChange({
            ...layout,
            hidden: hidden.has(id)
                ? layout.hidden.filter((each) => each !== id)
                : [...layout.hidden, id],
        });

    const reorder = (from: number, to: number) => {
        if (to < 0 || to >= rows.length) {
            return;
        }

        onChange({ ...layout, order: moveColumn(layout.order, from, to) });
    };

    const endDrag = () => {
        setDragging(null);
        setOver(null);
    };

    const trigger = (
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Columns3 className="size-4" />
            Columns
            {hidden.size > 0 && (
                <>
                    <Badge
                        variant="secondary"
                        aria-hidden
                        className="ml-1 h-5 min-w-5 justify-center px-1 tabular-nums"
                    >
                        {hidden.size}
                    </Badge>
                    {/* The bare number is ambiguous read aloud — two shown, or two
                        hidden? The badge stays compact and this says which. */}
                    <span className="sr-only">
                        {hidden.size === 1
                            ? '1 column hidden'
                            : `${hidden.size} columns hidden`}
                    </span>
                </>
            )}
        </Button>
    );

    const body = (
        <>
            <div className="space-y-0.5">
                {rows.map((column, index) => {
                    const off = hidden.has(column.id);
                    const sorted = column.id === sortedBy;
                    // The column the rows are ordered by, and the last one standing, both
                    // stay — each for a reason the row states rather than leaving a
                    // checkbox that silently refuses.
                    //
                    // The second half cannot fire while every list sorts by a column it
                    // also renders, which is true of all three today. It is kept because
                    // that is not structurally guaranteed: the day one sorts by a column
                    // it does not show, this is what stops the list being emptied.
                    const locked = sorted || (!off && showing === 1);

                    return (
                        <ColumnRow
                            key={column.id}
                            column={column}
                            index={index}
                            total={rows.length}
                            hidden={off}
                            locked={locked}
                            reason={
                                sorted
                                    ? 'The list is sorted by this column.'
                                    : locked
                                      ? 'The last visible column.'
                                      : column.hideBelow !== undefined
                                        ? 'Hidden on narrow screens.'
                                        : null
                            }
                            dragging={dragging === index}
                            over={
                                over === index &&
                                dragging !== null &&
                                dragging !== index
                            }
                            onToggle={() => toggle(column.id)}
                            onMove={(to) => reorder(index, to)}
                            onDragStart={(event) => {
                                setDragging(index);
                                event.dataTransfer.effectAllowed = 'move';
                                // Firefox will not begin a drag without a payload.
                                event.dataTransfer.setData(
                                    'text/plain',
                                    column.id,
                                );
                            }}
                            onDragOver={(event) => {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = 'move';
                                setOver(index);
                            }}
                            onDrop={(event) => {
                                event.preventDefault();

                                if (dragging !== null) {
                                    reorder(dragging, index);
                                }

                                endDrag();
                            }}
                            onDragEnd={endDrag}
                        />
                    );
                })}
            </div>

            <Separator className="my-3" />

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={!canReset}
                onClick={onReset}
            >
                Reset to default
            </Button>
        </>
    );

    const description =
        'Choose which columns to show, and drag to reorder them.';

    return isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80dvh]">
                <SheetHeader>
                    <SheetTitle>Columns</SheetTitle>
                    <SheetDescription>{description}</SheetDescription>
                </SheetHeader>
                <div className="overflow-y-auto px-4 pb-6">{body}</div>
            </SheetContent>
        </Sheet>
    ) : (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent
                align="end"
                className="max-h-[26rem] w-72 overflow-y-auto"
            >
                <p className="mb-3 text-muted-foreground text-xs">
                    {description}
                </p>
                {body}
            </PopoverContent>
        </Popover>
    );
}
