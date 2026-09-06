/**
 * Pure formatting helpers. No React, no `Date.now()`, no ambient locale, no ambient time
 * zone — every function is a deterministic transform of its arguments.
 *
 * That is deliberate. SSR is on, so the server and the browser render the same markup;
 * anything reading the ambient clock, locale or zone produces two different strings and a
 * React #418 hydration mismatch, which nothing in this repo would catch automatically. So
 * "now" and "which zone" are always passed in, by a caller that already knows the answer
 * the server used.
 *
 * **Two kinds of date arrive here and they are not interchangeable.** A `created_at` is a
 * UTC instant and has to be turned into somebody's wall clock; an `occurred_on` is
 * already the local calendar day the server derived — see `App\Support\LocalDate` — and
 * turning it into an instant to format it would move it. `formatDate` takes the first,
 * `formatDay` takes the second, and neither accepts the other's input by accident.
 */

const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

/** A UTC instant broken into the wall-clock fields of some zone. */
type Zoned = {
    /** 1-12, not the 0-11 the Date API uses. */
    month: number;
    day: number;
    year: number;
    hour: number;
    minute: number;
};

/**
 * One `Intl.DateTimeFormat` per zone, built once.
 *
 * Module-level state, which `lib/` otherwise avoids — but this is memoisation, not
 * configuration: the key is the whole input, so a cached formatter is the same object a
 * fresh call would build. Nothing about a request can leak through it, which is the
 * property that matters for concurrent SSR renders. Constructing one is among the more
 * expensive things in the standard library and a table renders one per row.
 *
 * The UTC substitute for an unknown zone is cached under the bad key as well, so a
 * misconfiguration costs one RangeError rather than one per cell.
 */
const FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function build(timeZone: string): Intl.DateTimeFormat {
    return new Intl.DateTimeFormat('en-US', {
        timeZone,
        // h23, not `hour12: false` — the latter renders midnight as "24" in some ICU
        // versions and "00" in others, which is exactly the kind of thing that differs
        // between the SSR runtime and a browser.
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    });
}

function formatterFor(timeZone: string): Intl.DateTimeFormat {
    const cached = FORMATTERS.get(timeZone);

    if (cached !== undefined) {
        return cached;
    }

    let formatter: Intl.DateTimeFormat;

    try {
        formatter = build(timeZone);
    } catch {
        // An identifier this runtime does not know. TimeZones::supports() rejects those
        // server-side and useTimeZone() falls back, so reaching here means a value that
        // went round neither — a wrong zone rather than a wrong instant. Fall back to the
        // zone the data is already in: the whole column showing the right time in the
        // wrong place beats the whole column showing nothing.
        formatter = build('UTC');
    }

    FORMATTERS.set(timeZone, formatter);

    return formatter;
}

/**
 * The wall-clock fields of `iso` in `timeZone`, or null if the instant is unreadable.
 *
 * Only NUMERIC parts are read, and that is the whole trick. Asking Intl for a month
 * *name* would hand rendering to ICU, whose data differs between the SSR runtime and the
 * browser — CLDR 42 changed en-GB's short September from "Sep" to "Sept", so the two
 * sides can disagree on the same input and the mismatch is invisible until it hydrates.
 * Digits are digits in every ICU version; the month name comes from the table above,
 * which is ours.
 *
 * The conversion itself still has to be Intl's: it is the only thing that knows a zone was
 * +07:30 before 1982 and +08:00 after. A stored offset would be wrong across any such
 * boundary.
 */
function zoned(iso: string, timeZone: string): Zoned | null {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const fields: Record<string, number> = {};

    for (const part of formatterFor(timeZone).formatToParts(date)) {
        if (part.type !== 'literal') {
            fields[part.type] = Number(part.value);
        }
    }

    return {
        month: fields.month,
        day: fields.day,
        year: fields.year,
        hour: fields.hour,
        minute: fields.minute,
    };
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

/** A UTC instant → `6 Sep 2026`, on the wall clock of `timeZone`. */
export function formatDate(iso: string, timeZone: string): string {
    const parts = zoned(iso, timeZone);

    if (parts === null) {
        return '';
    }

    return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

/**
 * A UTC instant → `6 Sep 2026, 02:35 (+08:00)`.
 *
 * The offset is spelled out because this is what someone reads to resolve a doubt, and
 * "02:35" alone cannot answer "whose 02:35". It is derived from the same conversion
 * rather than stored, so it is right on both sides of any offset change.
 */
export function formatDateTime(iso: string, timeZone: string): string {
    const parts = zoned(iso, timeZone);

    if (parts === null) {
        return '';
    }

    return `${formatDate(iso, timeZone)}, ${pad(parts.hour)}:${pad(parts.minute)} (${offset(iso, parts)})`;
}

/** `+08:00` — how far `parts` sits from the UTC instant it was derived from. */
function offset(iso: string, parts: Zoned): string {
    const wall = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
    );
    // Floored to the minute, because `parts` has no seconds to compare against.
    const instant = Math.floor(new Date(iso).getTime() / 60_000) * 60_000;
    const minutes = Math.round((wall - instant) / 60_000);
    const sign = minutes < 0 ? '-' : '+';
    const size = Math.abs(minutes);

    return `${sign}${pad(Math.floor(size / 60))}:${pad(size % 60)}`;
}

/**
 * A local calendar day — `2026-09-06` → `6 Sep 2026`.
 *
 * **No zone, and none wanted.** The server has already answered "which day was that, for
 * this viewer" and sent the answer; parsing the string back into an instant to re-answer
 * it would be the bug this whole date design exists to avoid — `new Date('2026-09-06')`
 * is midnight UTC, which is the 5th for anyone west of Greenwich.
 *
 * String surgery rather than the Date API, for the same reason.
 */
export function formatDay(day: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);

    if (match === null) {
        return '';
    }

    const [, year, month, date] = match;
    const name = MONTHS[Number(month) - 1];

    return name === undefined ? '' : `${Number(date)} ${name} ${year}`;
}

/**
 * A local calendar day → `Sep 2026`, for a month heading.
 */
export function formatMonth(day: string): string {
    const match = /^(\d{4})-(\d{2})/.exec(day);

    if (match === null) {
        return '';
    }

    const [, year, month] = match;
    const name = MONTHS[Number(month) - 1];

    return name === undefined ? '' : `${name} ${year}`;
}

/**
 * Calendar arithmetic on `Y-m-d` strings, for the date-range presets.
 *
 * `Date.UTC` is used purely as a calendar — it knows that September has 30 days and that
 * 2028 is a leap year, and nothing here is ever displayed as an instant. Every value
 * enters and leaves as a local calendar day, so no zone is involved at any point.
 */
export function addDays(day: string, days: number): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);

    if (match === null) {
        return day;
    }

    const [, year, month, date] = match;
    const shifted = new Date(
        Date.UTC(Number(year), Number(month) - 1, Number(date) + days),
    );

    return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** `2026-09-17` → `2026-09-01`. */
export function startOfMonth(day: string): string {
    return `${day.slice(0, 7)}-01`;
}

/** `2026-09-17` → `2026-01-01`. */
export function startOfYear(day: string): string {
    return `${day.slice(0, 4)}-01-01`;
}
