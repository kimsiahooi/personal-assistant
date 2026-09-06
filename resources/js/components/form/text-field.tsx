import { useId } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Props = {
    /** The name the server reads, and the key the error bag files a failure under. */
    name: string;
    label: string;
    /**
     * A line under the control explaining what belongs in it. For fields whose label is not
     * self-explanatory — "Opening balance" — where a placeholder shows the shape but not
     * the meaning, and disappears the moment anyone types.
     *
     * Plain text rather than a tooltip: a tooltip has nowhere to go on a phone, and hiding
     * the explanation behind a hover hides it from the people most likely to need it.
     */
    hint?: string;
    /** Whichever of the zod gate's or Laravel's messages arrived for this field. */
    error?: string;
    defaultValue?: string | null;
    placeholder?: string;
    /**
     * Marks the field as one the form will accept empty, and drops the `required`
     * attribute. One prop rather than a separate `required`, so the two can never
     * contradict each other — in these forms, not optional means required.
     */
    optional?: boolean;
    autoFocus?: boolean;
    autoComplete?: string;
    /** `email` and `tel` get the right keyboard on a phone. */
    type?: 'text' | 'email' | 'tel';
    /**
     * The on-screen keyboard for a field that holds digits.
     *
     * `inputMode`, not `type="number"`. A number input scrolls its value when the wheel
     * passes over it, refuses to show what was typed when the browser considers it
     * incomplete, and reads the decimal separator from the OS locale — none of which is
     * wanted for an amount that two validation layers already check.
     */
    inputMode?: 'decimal';
    /**
     * Keep the label for screen readers but take it off the screen. For a repeating row
     * under a column header, where the visible label is the header.
     */
    labelHidden?: boolean | 'sm';
    /** Render as a textarea this many rows tall instead of a single line. */
    rows?: number;
};

/**
 * A labelled text input with its error underneath, and the accessibility wiring that
 * connects the two.
 *
 * That wiring is the reason this exists. `aria-invalid` on the control, `aria-describedby`
 * pointing at the message, and the message carrying the matching id — three details that
 * have to agree, are invisible when they do not, and are exactly what gets forgotten on
 * the twentieth form. Here they agree by construction, from one `useId`.
 *
 * Uncontrolled by design: the dialog that hosts it is unmounted on close, so `defaultValue`
 * is the whole of state management. See {@link ResourceFormDialog}.
 *
 * Text only. A select or a date picker gets its own component rather than this one growing
 * a `kind` prop and a branch per control.
 */
export function TextField({
    name,
    label,
    hint,
    error,
    defaultValue,
    placeholder,
    optional,
    autoFocus,
    autoComplete = 'off',
    type = 'text',
    inputMode,
    labelHidden,
    rows,
}: Props) {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    // Both, when both exist. aria-describedby takes a list, and dropping the hint the
    // moment a field errors would take the explanation away exactly when it is needed.
    const describedBy =
        [hint ? hintId : null, error ? errorId : null]
            .filter(Boolean)
            .join(' ') || undefined;

    const shared = {
        id,
        name,
        inputMode,
        defaultValue: defaultValue ?? '',
        required: !optional,
        autoFocus,
        autoComplete,
        placeholder,
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
    };

    return (
        <div className="space-y-2">
            <Label
                htmlFor={id}
                className={cn(
                    labelHidden === true && 'sr-only',
                    labelHidden === 'sm' && 'sm:sr-only',
                )}
            >
                {label}
                {optional && (
                    // An explicit `{' '}`, not a margin. A margin is the obvious fix and
                    // only half of one: it puts a gap on screen, but the accessible name is
                    // built by concatenating text nodes, and nothing is inserted between
                    // two inline elements — so a screen reader announces "Noteoptional".
                    // `{' '}` survives (JSX drops whitespace between lines, not an
                    // expression) and fixes both at once.
                    <>
                        {' '}
                        <span className="font-normal text-muted-foreground">
                            optional
                        </span>
                    </>
                )}
            </Label>

            {rows === undefined ? (
                <Input type={type} {...shared} />
            ) : (
                <Textarea rows={rows} {...shared} />
            )}

            {hint && (
                <p id={hintId} className="text-muted-foreground text-xs">
                    {hint}
                </p>
            )}

            <InputError id={errorId} role="alert" message={error} />
        </div>
    );
}
