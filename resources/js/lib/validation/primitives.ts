import { z } from 'zod';

/**
 * The building blocks a schema is written from, each shaped like the Laravel rule it
 * mirrors and each carrying the sentence the server would have sent.
 *
 * Write `text({ label: 'Name', max: 255 })` where the FormRequest says
 * `['required', 'string', 'max:255']`, and the browser refuses the value with the same
 * words. `bun run check:validation` fails the build if a server-validated field has no
 * counterpart here, so the two lists cannot silently drift.
 *
 * The reference project encodes a translation key into zod's message slot and resolves
 * it per render, because a schema is built once at module scope and shared across
 * locales. With one language that indirection collapses and the sentence goes in
 * directly.
 */

/**
 * Decimal places a money column stores, and the largest value one holds — the same two
 * numbers as `App\Support\Money::SCALE` and `::MAX`. Duplicated rather than generated
 * because they describe a column shape fixed by a migration: if these ever disagree
 * with the PHP constants, one of the two is wrong about the database.
 */
export const MONEY_SCALE = 2;
export const MONEY_MAX = '9999999999999.99';

type TextOptions = {
    /** How the field is named in a message: "Name is required." */
    label: string;
    /** `max:N` — the column's length. */
    max?: number;
    min?: number;
};

/**
 * A required string — `['required', 'string', …]`.
 *
 * Checks are declared in the order Laravel evaluates them, which matters: only the
 * first failure per field is shown, and an empty value should read "is required"
 * rather than "must be at least 8 characters".
 */
export function text({ label, max, min }: TextOptions) {
    let schema = z
        .string({ message: `${label} must be text.` })
        .trim()
        .min(1, `${label} is required.`);

    if (min !== undefined) {
        schema = schema.min(
            min,
            `${label} must be at least ${min} characters.`,
        );
    }

    if (max !== undefined) {
        schema = schema.max(
            max,
            `${label} may not be longer than ${max} characters.`,
        );
    }

    return schema;
}

/** An optional string — `['nullable', 'string', 'max:N']`. */
export function optionalText({ label, max }: TextOptions) {
    const base = z.string({ message: `${label} must be text.` }).trim();

    return (
        max === undefined
            ? base
            : base.max(
                  max,
                  `${label} may not be longer than ${max} characters.`,
              )
    )
        .or(z.literal(''))
        .nullish();
}

/** One of a fixed set — mirrors `Rule::enum()`. */
export function choice<T extends readonly [string, ...string[]]>(
    label: string,
    values: T,
) {
    return z.enum(values, { message: `${label} is not a valid choice.` });
}

/**
 * A money amount, as the string the form holds.
 *
 * Never `z.number()`: the value is a decimal string end to end precisely so that
 * JavaScript never turns it into a float, and parsing one here to check it would
 * reintroduce exactly what the string is avoiding. The bounds are compared as text.
 */
export function money(label: string, min = '0.01') {
    return z
        .string({ message: `${label} is required.` })
        .trim()
        .min(1, `${label} is required.`)
        .regex(
            new RegExp(`^-?\\d{1,13}(\\.\\d{1,${MONEY_SCALE}})?$`),
            `${label} must be an amount like 12.50.`,
        )
        .refine((value) => compareDecimal(stripSign(value), min) >= 0, {
            message: `${label} must be at least ${min}.`,
        })
        .refine((value) => compareDecimal(stripSign(value), MONEY_MAX) <= 0, {
            message: `${label} is too large.`,
        });
}

/** A `Y-m-d` date that is today or earlier — mirrors `before_or_equal:today`. */
export function pastDate(label: string) {
    return z
        .string({ message: `${label} is required.` })
        .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a date.`);
}

/** A foreign key — `['integer', Rule::exists(...)]`. Existence is the server's job. */
export function reference(label: string) {
    return z
        .union([z.number(), z.string()])
        .refine((value) => `${value}`.trim() !== '', `${label} is required.`);
}

export function optionalReference() {
    return z.union([z.number(), z.string(), z.null()]).nullish();
}

/** `-12.50` → `12.50`, as text. */
function stripSign(value: string): string {
    return value.startsWith('-') ? value.slice(1) : value;
}

/**
 * Compare two non-negative decimal strings without going through a float.
 * Returns -1, 0 or 1.
 */
function compareDecimal(a: string, b: string): number {
    const [aInt, aFrac = ''] = a.split('.');
    const [bInt, bFrac = ''] = b.split('.');

    const width = Math.max(aInt.length, bInt.length);
    const scale = Math.max(aFrac.length, bFrac.length);

    const left = aInt.padStart(width, '0') + aFrac.padEnd(scale, '0');
    const right = bInt.padStart(width, '0') + bFrac.padEnd(scale, '0');

    return left === right ? 0 : left < right ? -1 : 1;
}
