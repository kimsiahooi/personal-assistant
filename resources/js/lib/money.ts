/**
 * Money, for reading only.
 *
 * **There is deliberately no `add`, `sum` or `total` here, and there never should be.**
 * Amounts cross the wire as decimal strings — `"1234.50"` — precisely so that JavaScript
 * never turns one into a float64, where `0.1 + 0.2` is famously not `0.3`. Every balance,
 * subtotal and aggregate in this app is computed by MySQL and arrives already summed; see
 * `App\Support\Money` for the server side, and the "no money arithmetic in the browser"
 * rule in CLAUDE.md, which `bun run check:structure` enforces.
 *
 * So this file parses nothing and computes nothing. It reads the sign off the front of a
 * string and groups the digits behind it, and that is the whole job.
 *
 * Pure: no React, no ambient locale. See `lib/format.ts` for why that matters under SSR.
 */

/**
 * The symbol to print for a currency code, falling back to the code itself.
 *
 * **Ours, not ICU's.** `Intl.NumberFormat` would render this too, and would render it
 * differently across ICU versions — the same hydration hazard the date helpers are built
 * to avoid. A one-entry table is not a limitation to work around: every row in this
 * database is MYR by column default, and a currency that is not in the table still
 * formats correctly, just as `SGD 12.50` rather than `S$12.50`.
 */
const SYMBOLS: Record<string, string> = {
    MYR: 'RM',
};

/** Group an integer part in threes: `1234567` → `1,234,567`. */
function group(digits: string): string {
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Whether a decimal string is negative, zero, or positive — read, not computed. */
export function signOf(value: string): -1 | 0 | 1 {
    if (value.startsWith('-')) {
        return -1;
    }

    // `0`, `0.00`, `0.0` are all zero and all have to read as zero: a transaction of
    // nothing should not be painted as income. Nothing else in the string can be a digit
    // other than zero and still mean zero.
    return /[1-9]/.test(value) ? 1 : 0;
}

/** `-12.50` → `12.50`. Text surgery; nothing is parsed. */
export function magnitudeOf(value: string): string {
    return value.startsWith('-') ? value.slice(1) : value;
}

/**
 * A stored amount as money: `formatMoney('1234.5', 'MYR')` → `RM 1,234.5`.
 *
 * **The scale comes from the string, not from a table here.** The column is
 * `decimal(15,2)` and Eloquent's `decimal:2` cast has already produced exactly two
 * places, so the decimals present are the decimals that exist — and this file holds no
 * second copy of which currencies divide by a hundred.
 *
 * **The sign goes outermost — `-RM 1,234.50`, not `RM -1,234.50`.** It has to match
 * {@link formatSignedMoney}, which prefixes the sign to whatever this returns, or the
 * same negative amount would be spelled one way in the ledger and another in the
 * balance column. Outermost is the more useful of the two anyway: in a right-aligned
 * column the sign is the first thing scanned, and putting it after the symbol hides it
 * behind two more characters.
 */
export function formatMoney(value: string, currency: string): string {
    const negative = value.startsWith('-');
    const [whole, fraction] = magnitudeOf(value).split('.');
    const body =
        fraction === undefined ? group(whole) : `${group(whole)}.${fraction}`;

    return `${negative ? '-' : ''}${SYMBOLS[currency] ?? currency} ${body}`;
}

/**
 * The same, with a positive value's sign shown too: `+RM 1,234.50` / `-RM 1,234.50`.
 *
 * For the ledger, where a column of numbers is read by direction first. The leading `+`
 * is what stops income and expense looking identical to anyone who cannot separate the
 * two colours — see the direction rule in docs/UI-UX-GUIDELINES.md.
 *
 * Formatted from the magnitude, so this owns the sign outright and cannot produce two.
 * Zero keeps none: nothing has no direction.
 */
export function formatSignedMoney(value: string, currency: string): string {
    const sign = signOf(value);
    const formatted = formatMoney(magnitudeOf(value), currency);

    if (sign === 0) {
        return formatted;
    }

    return `${sign > 0 ? '+' : '-'}${formatted}`;
}
