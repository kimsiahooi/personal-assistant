import { useId } from 'react';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

/** Reserved for the "everything" entry — Radix's Select refuses an empty item value. */
const ALL = '__all__';

export type FilterOption = {
    /** What travels in the URL — an account id, a type. */
    value: string;
    label: string;
};

/**
 * A one-choice filter for a list: all accounts, or just the current account.
 *
 * It submits no input: a filter is not a form field, it has no name on the wire and
 * nothing reads it on submit. It does carry a real `<Label>`, because these stack inside
 * {@link FilterPanel} where the trigger's own text ("All accounts") says what is selected
 * but not what it selects.
 *
 * Clearing sends `''`, which {@link FilterApi} turns into a key absent from the URL — so
 * "all" is the absence of a filter rather than a value meaning everything.
 */
export function SelectFilter({
    value,
    onChange,
    options,
    label,
    allLabel,
}: {
    /** The value in force, or `''` for no filter. */
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    /** What this narrows by — "Account", "Category", "Type". */
    label: string;
    /** The "no filter" entry, e.g. "All accounts". */
    allLabel: string;
}) {
    const id = useId();

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>

            <Select
                value={value === '' ? ALL : value}
                onValueChange={(next) => onChange(next === ALL ? '' : next)}
            >
                <SelectTrigger id={id} size="sm" className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>{allLabel}</SelectItem>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
