import { useId } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * A labelled calendar-day input — `Y-m-d`, which is exactly what the wire carries and what
 * `App\Support\LocalDate::toUtc()` expects.
 *
 * **Native `<input type="date">`, not a rendered calendar**, for the reason spelled out on
 * {@link DateRangeFilter}: SSR is on, and a calendar component has to decide which month to
 * open on, which is the ambient clock. The native control brings a real picker, a real
 * keyboard mode and a real locale-appropriate display on every platform, while the value it
 * submits is ISO regardless of how it is shown.
 *
 * `max` is passed in rather than derived: "today" belongs to the viewer's zone, and the
 * server is the only side that knows which one that is on the first render.
 */
export function DateField({
    name,
    label,
    hint,
    error,
    defaultValue,
    max,
    autoFocus,
}: {
    name: string;
    label: string;
    hint?: string;
    error?: string;
    /** `Y-m-d`. */
    defaultValue?: string | null;
    /** The latest day this field accepts, usually the viewer's today. */
    max?: string;
    autoFocus?: boolean;
}) {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const describedBy =
        [hint ? hintId : null, error ? errorId : null]
            .filter(Boolean)
            .join(' ') || undefined;

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>

            <Input
                id={id}
                name={name}
                type="date"
                required
                max={max}
                defaultValue={defaultValue ?? ''}
                autoFocus={autoFocus}
                aria-invalid={!!error}
                aria-describedby={describedBy}
            />

            {hint && (
                <p id={hintId} className="text-muted-foreground text-xs">
                    {hint}
                </p>
            )}

            <InputError id={errorId} role="alert" message={error} />
        </div>
    );
}
