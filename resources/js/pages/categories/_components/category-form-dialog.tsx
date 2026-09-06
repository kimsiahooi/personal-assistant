import { useState } from 'react';
import { CheckboxField } from '@/components/form/checkbox-field';
import { ResourceFormDialog } from '@/components/form/resource-form-dialog';
import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { CATEGORY_ICON_NAMES, CATEGORY_ICONS } from '@/lib/category-icons';
import {
    CATEGORY_COLOUR_LABELS,
    CATEGORY_COLOURS,
    inkClass,
    swatchClass,
} from '@/lib/category-style';
import { CATEGORY_KIND_LABELS, CATEGORY_KINDS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { categorySchema } from '@/lib/validation/schemas/category';
import { store, update } from '@/routes/categories';

type Category = App.Data.CategoryData;

/** `shopping-bag` → `Shopping bag`, so the icon picker reads as words. */
function iconLabel(name: string): string {
    const words = name.replace(/-/g, ' ');

    return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Create and edit are one component — see {@link ResourceFormDialog}.
 *
 * **Colour is a picker over five slots, not a colour input.** A category stores the *name*
 * of a chart token, and those five were validated as a set against the surfaces they sit
 * on; a free colour would let that be undone one category at a time. See
 * `lib/category-style.ts`.
 */
export function CategoryFormDialog({
    open,
    onOpenChange,
    category,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The row being edited. Absent means this is the create form. */
    category?: Category;
}) {
    const editing = category !== undefined;
    // Held only so the icon picker can preview in the colour chosen beside it.
    const [colour, setColour] = useState<string | null>(
        category?.colour ?? null,
    );

    return (
        <ResourceFormDialog
            open={open}
            onOpenChange={onOpenChange}
            action={
                editing ? update.form({ category: category.id }) : store.form()
            }
            schema={categorySchema}
            title={editing ? `Edit ${category.name}` : 'New category'}
            description={
                editing
                    ? 'Change what this category is called or how it appears.'
                    : 'A label for what money was earned from, or spent on.'
            }
            submit={editing ? 'Save changes' : 'Add category'}
            submitting={editing ? 'Saving…' : 'Adding…'}
        >
            {({ errors }) => (
                <div className="space-y-4">
                    <TextField
                        name="name"
                        label="Name"
                        placeholder="Groceries"
                        defaultValue={category?.name}
                        error={errors.name}
                        autoFocus
                    />

                    <SelectField
                        name="kind"
                        label="Kind"
                        placeholder="Income or expense"
                        hint={
                            editing
                                ? 'Changing this leaves existing transactions where they are, but the category will no longer be offered for them.'
                                : 'Which side of the ledger this labels. A transaction is only offered categories of its own kind.'
                        }
                        options={CATEGORY_KINDS.map((value) => ({
                            value,
                            label: CATEGORY_KIND_LABELS[value],
                        }))}
                        defaultValue={category?.kind}
                        error={errors.kind}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        {/*
                            Both pickers show the thing, not just its name. "Bronze" and
                            "Sparkles" are unreadable as words — the reader is choosing how
                            this category will look in the list and in the dashboard's
                            charts, and a list of nouns asks them to imagine the answer.
                        */}
                        <SelectField
                            name="colour"
                            label="Colour"
                            placeholder="Choose a colour"
                            optional
                            options={CATEGORY_COLOURS.map((value) => ({
                                value,
                                label: CATEGORY_COLOUR_LABELS[value],
                                adornment: (
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'size-3 shrink-0 rounded-full',
                                            swatchClass(value),
                                        )}
                                    />
                                ),
                            }))}
                            defaultValue={category?.colour}
                            onValueChange={(next) => setColour(next || null)}
                            error={errors.colour}
                        />

                        <SelectField
                            name="icon"
                            label="Icon"
                            placeholder="Choose an icon"
                            optional
                            options={CATEGORY_ICON_NAMES.map((value) => {
                                const Icon = CATEGORY_ICONS[value];

                                return {
                                    value,
                                    label: iconLabel(value),
                                    adornment: Icon ? (
                                        <Icon
                                            aria-hidden
                                            className={cn(
                                                'size-4 shrink-0',
                                                // Tinted by the colour chosen beside it, so
                                                // the two pickers preview the pair rather
                                                // than two unrelated decisions.
                                                inkClass(colour),
                                            )}
                                        />
                                    ) : undefined,
                                };
                            })}
                            defaultValue={category?.icon}
                            error={errors.icon}
                        />
                    </div>

                    {editing && (
                        <CheckboxField
                            name="archived"
                            label="Archived"
                            hint="Keeps its transactions but takes it out of the pickers."
                            defaultChecked={category.is_archived}
                            error={errors.archived}
                        />
                    )}
                </div>
            )}
        </ResourceFormDialog>
    );
}
