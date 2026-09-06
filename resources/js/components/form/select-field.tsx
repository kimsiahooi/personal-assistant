import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type SelectOption = {
    value: string;
    label: string;
    /**
     * Something to show beside the words — a colour swatch, the icon itself.
     *
     * For a picker whose options ARE something visual, where the name alone asks the reader
     * to imagine the answer: "Bronze" and "Sparkles" mean nothing until you see them, and
     * the whole point of choosing one is how it will look in the list and the charts.
     *
     * A node rather than an icon prop, because the two callers want different things and
     * neither is worth a union: one renders a coloured dot, the other a lucide component.
     */
    adornment?: ReactNode;
    /**
     * A heading to file this option under. Options carrying the same one are rendered
     * together, in the order they arrive.
     *
     * Per-option rather than a separate `groups` prop, so a caller with nothing to group
     * writes exactly what it wrote before. Twenty categories in a flat list is a wall; the
     * same twenty under Income and Expense is a menu.
     */
    group?: string;
};

type Props = {
    /** The name the server reads, and the key the error bag files a failure under. */
    name: string;
    label: string;
    options: SelectOption[];
    /** A line under the control explaining the choice. See {@link TextField}. */
    hint?: string;
    error?: string;
    defaultValue?: string | null;
    /** Shown when nothing is chosen. */
    placeholder: string;
    /** Adds a "not set" entry and drops the required marker. */
    optional?: boolean;
    /**
     * Told about every change, for a form where one field decides what another may hold —
     * the transaction form's type, which chooses the categories on offer.
     */
    onValueChange?: (value: string) => void;
};

/**
 * Radix's Select refuses an item with an empty value — it reserves `''` for "nothing
 * selected" — so clearing a chosen option needs an entry with a value of its own.
 */
const NONE = '__none__';

/**
 * A labelled picker with its error underneath, matching {@link TextField}.
 *
 * **It submits through a hidden input rather than through the Select.** Radix does bubble a
 * native select when it detects a form, but what reaches the server then depends on that
 * detection and on the sentinel above leaking out of it. A hidden input makes the wire
 * value something this component states outright: the chosen code, or `''` for not-set,
 * which is exactly what `nullable` accepts.
 *
 * That is also why this one holds state while `TextField` does not. The visible control is
 * Radix's and the submitted value is ours, so the two need something to agree through.
 * Seeded from `defaultValue` and thrown away with the dialog, so it still needs no reset.
 */
export function SelectField({
    name,
    label,
    options,
    hint,
    error,
    defaultValue,
    placeholder,
    optional,
    onValueChange,
}: Props) {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const [value, setValue] = useState(defaultValue ?? '');

    // Both, when both exist — see TextField for why the hint is not dropped on error.
    const describedBy =
        [hint ? hintId : null, error ? errorId : null]
            .filter(Boolean)
            .join(' ') || undefined;

    const groups = groupOptions(options);

    const change = (next: string) => {
        const resolved = next === NONE ? '' : next;

        setValue(resolved);
        onValueChange?.(resolved);
    };

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>
                {label}
                {optional && (
                    // See TextField: an explicit `{' '}` rather than a margin, so the
                    // accessible name does not read "Categoryoptional".
                    <>
                        {' '}
                        <span className="font-normal text-muted-foreground">
                            optional
                        </span>
                    </>
                )}
            </Label>

            {/*
                `value` is passed through as-is, empty string included: Radix reserves '' on
                the ROOT for "nothing selected" and shows the placeholder, and only forbids
                it on an ITEM. Mapping '' to the sentinel here instead would make an
                untouched field read "Not set" and the placeholder would never appear.
            */}
            <Select value={value} onValueChange={change}>
                <SelectTrigger
                    id={id}
                    className="w-full"
                    aria-invalid={!!error}
                    aria-describedby={describedBy}
                >
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {optional && <SelectItem value={NONE}>Not set</SelectItem>}
                    {groups.map((group) => {
                        const items = group.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.adornment}
                                {option.label}
                            </SelectItem>
                        ));

                        // An ungrouped list renders bare — no empty heading, no wrapper.
                        return group.label === undefined ? (
                            items
                        ) : (
                            <SelectGroup key={group.label}>
                                <SelectLabel>{group.label}</SelectLabel>
                                {items}
                            </SelectGroup>
                        );
                    })}
                </SelectContent>
            </Select>

            <input type="hidden" name={name} value={value} />

            {hint && (
                <p id={hintId} className="text-muted-foreground text-xs">
                    {hint}
                </p>
            )}

            <InputError id={errorId} role="alert" message={error} />
        </div>
    );
}

/**
 * Options in the order given, collected into runs that share a `group`.
 *
 * A run, not a bucket: options are never reordered, so what the server sent is what the
 * list shows. A caller that sets no groups gets exactly one ungrouped run back.
 */
function groupOptions(
    options: SelectOption[],
): { label?: string; options: SelectOption[] }[] {
    const groups: { label?: string; options: SelectOption[] }[] = [];

    for (const option of options) {
        const last = groups.at(-1);

        if (last && last.label === option.group) {
            last.options.push(option);
        } else {
            groups.push({ label: option.group, options: [option] });
        }
    }

    return groups;
}
