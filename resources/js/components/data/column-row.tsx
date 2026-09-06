import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import type { DragEvent } from 'react';
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

            <span className="flex shrink-0">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={index === 0}
                    aria-label={`Move ${column.label} up`}
                    onClick={() => onMove(index - 1)}
                >
                    <ArrowUp className="size-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={index === total - 1}
                    aria-label={`Move ${column.label} down`}
                    onClick={() => onMove(index + 1)}
                >
                    <ArrowDown className="size-3.5" />
                </Button>
            </span>
        </div>
    );
}
