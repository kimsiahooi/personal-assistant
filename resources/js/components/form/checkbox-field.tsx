import { useId, useState } from 'react';
import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/**
 * A labelled checkbox with its explanation and its error, matching {@link TextField}.
 *
 * **It submits through a hidden input, always**, rather than relying on the Radix control
 * to bubble a native one. An unchecked HTML checkbox sends *nothing*, which is the classic
 * way an "off" switch reaches Laravel as "absent" and a `boolean` rule quietly passes on a
 * field that was never there. A hidden input sends `1` or `0` every time, so the wire value
 * says what the box says.
 *
 * State is held here for the same reason {@link SelectField} holds its own: the visible
 * control is Radix's and the submitted value is ours. Seeded from `defaultChecked` and
 * thrown away with the dialog, so it needs no reset.
 */
export function CheckboxField({
    name,
    label,
    hint,
    error,
    defaultChecked,
}: {
    name: string;
    label: string;
    /** A line under the label saying what ticking it does. */
    hint?: string;
    error?: string;
    defaultChecked?: boolean;
}) {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const [checked, setChecked] = useState(defaultChecked ?? false);

    const describedBy =
        [hint ? hintId : null, error ? errorId : null]
            .filter(Boolean)
            .join(' ') || undefined;

    return (
        <div className="space-y-2">
            <div className="flex items-start gap-3">
                <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={(next) => setChecked(next === true)}
                    aria-invalid={!!error}
                    aria-describedby={describedBy}
                    className="mt-0.5"
                />
                <div className="space-y-1">
                    <Label htmlFor={id} className="cursor-pointer">
                        {label}
                    </Label>
                    {hint && (
                        <p
                            id={hintId}
                            className="text-muted-foreground text-xs"
                        >
                            {hint}
                        </p>
                    )}
                </div>
            </div>

            <input type="hidden" name={name} value={checked ? '1' : '0'} />

            <InputError id={errorId} role="alert" message={error} />
        </div>
    );
}
