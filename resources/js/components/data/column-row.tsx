import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import type { DragEvent, MouseEvent } from 'react';
import type { ConfigurableColumn } from '@/components/data/column-layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * One column inside {@link ColumnPanel}: a handle, a checkbox, its name, and the two
 * buttons that move it.
 *
 * **The row states why it cannot be unticked rather than just refusing.** A disabled
 * checkbox with no explanation reads as a bug, and there are two honest reasons for one
 * here — the list is ordered by this column, or it is the last one left.
 *
 * Dragging is handled on the whole row rather than the handle alone: a 4px grip is a hard
 * target, and the handle is better read as the affordance saying the row moves. The
 * buttons beside it are what a keyboard and a touchscreen actually use.
 */
export function ColumnRow({
    column,
    index,
    total,
    hidden,
    locked,
    reason,
    dragging,
    over,
    onToggle,
    onMove,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}: {
    column: ConfigurableColumn;
    index: number;
    total: number;
    hidden: boolean;
    /** Ticked and staying that way — see `reason`. */
    locked: boolean;
    /** Why it is locked, or what else is true about it. Null when there is nothing to say. */
    reason: string | null;
    dragging: boolean;
    /** The drop target right now, and not the row being dragged. */
    over: boolean;
    onToggle: () => void;
    onMove: (to: number) => void;
    onDragStart: (event: DragEvent) => void;
    onDragOver: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
    onDragEnd: () => void;
}) {
    const inputId = `column-${column.id}`;
    const first = index === 0;
    const last = index === total - 1;

    /**
     * Reorder, then put the cursor back on the button that did it.
     *
     * The re-focus is deferred to a task rather than run inline: React moves this row's
     * node during the commit that follows, and focusing before that happens is undone by
     * the move itself.
     */
    const move = (
        event: MouseEvent<HTMLButtonElement>,
        to: number,
        blocked: boolean,
    ) => {
        if (blocked) {
            return;
        }

        const button = event.currentTarget;

        onMove(to);
        setTimeout(() => button.focus(), 0);
    };

    return (
        // Dragging is a pointer-only enhancement, and there is no ARIA role meaning "drop
        // target". The accessible path is the two real buttons below — which is also the
        // only path that works on a touchscreen.
        // biome-ignore lint/a11y/noStaticElementInteractions: see above
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={cn(
                'flex items-start gap-2 rounded-md px-1 py-1.5 transition-colors',
                dragging && 'opacity-40',
                over && 'bg-accent',
            )}
        >
            <span
                aria-hidden
                className="mt-1 cursor-grab text-muted-foreground active:cursor-grabbing"
            >
                <GripVertical className="size-4" />
            </span>

            <Checkbox
                id={inputId}
                checked={!hidden}
                disabled={locked}
                onCheckedChange={onToggle}
                className="mt-1"
            />

            <label
                htmlFor={inputId}
                className="min-w-0 flex-1 cursor-pointer text-sm leading-5"
            >
                <span className="block truncate">{column.label}</span>
                {reason !== null && (
                    <span className="block text-muted-foreground text-xs">
                        {reason}
                    </span>
                )}
            </label>

            {/*
                Two things conspire to lose focus here, and both are handled.

                `aria-disabled` rather than `disabled`, for the reason PaginationBar gives:
                these buttons disable themselves at the ends of the list — the condition is
                the index their own click changes — and a control blurred by gaining
                `disabled` leaves the panel with nothing focused. The panel is a non-modal
                popover, so there is no focus trap to catch it either.

                And a move relocates this row's DOM node, which also drops focus. Re-focusing
                the same button after the commit is what lets somebody press Move up
                repeatedly instead of once.
            */}
            <span className="flex shrink-0">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn('size-7', first && 'opacity-50')}
                    aria-disabled={first}
                    aria-label={`Move ${column.label} up`}
                    onClick={(event) => move(event, index - 1, first)}
                >
                    <ArrowUp className="size-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn('size-7', last && 'opacity-50')}
                    aria-disabled={last}
                    aria-label={`Move ${column.label} down`}
                    onClick={(event) => move(event, index + 1, last)}
                >
                    <ArrowDown className="size-3.5" />
                </Button>
            </span>
        </div>
    );
}
