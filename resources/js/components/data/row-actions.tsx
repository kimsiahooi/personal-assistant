import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Props = {
    /** The row's own name, so the trigger says which row it belongs to. */
    name: string;
    onEdit: () => void;
    onDelete: () => void;
    /**
     * Entries only this module has — an account's archive toggle, say. Rendered under
     * Edit, above the destructive item, as `<DropdownMenuItem>`s the caller writes.
     *
     * A slot rather than a props-described list: what these do and what they are called
     * differs every time, and the only thing they have in common is where they sit.
     */
    children?: ReactNode;
};

/**
 * The edit/delete menu at the end of a row.
 *
 * Only the menu. It reports what was chosen and the module decides what that means — which
 * dialog to open, which route to call, what the confirmation should say. That split is
 * deliberate: the markup here is identical everywhere, while the wording and the
 * consequences never are.
 *
 * `name` is for the trigger's accessible name alone. Twenty-five identical "Actions"
 * buttons are unusable with a screen reader; "Actions for Groceries" is not.
 */
export function RowActions({ name, onEdit, onDelete, children }: Props) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${name}`}
                >
                    <MoreHorizontal className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={onEdit}>
                    <Pencil className="mr-2 size-4" />
                    Edit
                </DropdownMenuItem>
                {children}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                    <Trash2 className="mr-2 size-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
