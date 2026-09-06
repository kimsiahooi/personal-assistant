import { CATEGORY_ICONS } from '@/lib/category-icons';
import { inkClass, swatchClass } from '@/lib/category-style';
import { cn } from '@/lib/utils';

/**
 * A category, shown as the icon and colour it chose plus its name.
 *
 * Used by the categories list, the ledger's category column and the dashboard's spending
 * breakdown — three consumers, which is what earned it a place in `components/` rather
 * than one module's `_components/`.
 *
 * **The colour never carries the meaning.** The name is always rendered beside it, so the
 * dot is a scanning aid and nothing more — see docs/UI-UX-GUIDELINES.md section 5 on why
 * no five-hue set is safe to rely on alone.
 *
 * An uncategorised row renders a dash rather than an empty cell, so a column of them reads
 * as "deliberately nothing" instead of "something failed to load".
 */
export function CategoryBadge({
    name,
    colour,
    icon,
    className,
}: {
    name: string | null;
    colour: string | null;
    /** A lucide name — see `lib/category-icons.ts`. Unknown names fall back to the dot. */
    icon?: string | null;
    className?: string;
}) {
    if (name === null || name === '') {
        return <span className="text-muted-foreground">—</span>;
    }

    const Icon = icon ? CATEGORY_ICONS[icon] : undefined;

    return (
        <span
            className={cn('inline-flex min-w-0 items-center gap-2', className)}
        >
            {Icon ? (
                <Icon
                    aria-hidden
                    className={cn('size-4 shrink-0', inkClass(colour))}
                />
            ) : (
                <span
                    aria-hidden
                    className={cn(
                        'size-2.5 shrink-0 rounded-full',
                        swatchClass(colour),
                    )}
                />
            )}
            <span className="truncate">{name}</span>
        </span>
    );
}
