<?php

declare(strict_types=1);

namespace App\Support;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * The one place a picked date becomes a stored instant, and back again.
 *
 * `transactions.occurred_at` is a UTC timestamp standing for a calendar day in the
 * viewer's zone: picking 2 September in Malaysia stores `2026-09-01T16:00:00Z`. That
 * only stays coherent if every boundary converts, so every conversion lives here rather
 * than being open-coded at each call site — a single query that forgets moves a
 * transaction to the previous day, silently.
 *
 * The failure this guards against is not hypothetical: a transaction on the 1st of a
 * month is the previous month in UTC, so a month filter written against raw UTC bounds
 * loses it from that month's totals and adds it to the one before.
 *
 * The zone is a server value — `TimeZones::resolve()`, from a cookie the browser wrote
 * before first paint — never `resolvedOptions()` during a render.
 */
final class LocalDate
{
    /**
     * A picked `Y-m-d` → the UTC instant at the start of that day in `$timezone`.
     *
     * Start of day rather than noon: the value is only ever read back through
     * {@see self::toLocalDate()}, so any instant inside the day round-trips, and
     * midnight is the one a person would recognise in the raw table.
     */
    public static function toUtc(string $date, string $timezone): Carbon
    {
        return Carbon::createFromFormat('Y-m-d', $date, $timezone)
            ->startOfDay()
            ->utc();
    }

    /**
     * A stored UTC instant → the `Y-m-d` a person in `$timezone` would call it.
     *
     * `CarbonInterface`, not `Carbon`: Laravel casts datetime columns to
     * `CarbonImmutable` here, and typing the concrete mutable class made this throw on
     * the very first row it was handed.
     */
    public static function toLocalDate(CarbonInterface $instant, string $timezone): string
    {
        return $instant->copy()->setTimezone($timezone)->toDateString();
    }

    /**
     * The half-open UTC window covering a local calendar range, both ends inclusive.
     *
     * Half-open on the upper bound — `< start of the day after` rather than
     * `<= end of the last day` — because the alternative needs a "last representable
     * instant", and `23:59:59` silently drops anything in the final second.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    public static function range(string $from, string $to, string $timezone): array
    {
        return [
            self::toUtc($from, $timezone),
            // The day is added in the LOCAL calendar and only then converted, not added to
            // an instant already in UTC. `toUtc()` returns a Carbon switched to UTC, so
            // `->addDay()` on it is a flat +24h — which is not the start of the next local
            // day on either side of a daylight-saving change. Spring forward and the window
            // runs an hour into the following day; fall back and it stops an hour short,
            // losing every transaction recorded in that hour. Malaysia has no DST, so this
            // is correct-by-luck here and wrong the moment anyone travels.
            self::endOfDay($to, $timezone),
        ];
    }

    /**
     * The exclusive upper bound for a local range ending on `$date`: the UTC instant at
     * which the following local day begins.
     *
     * Public because a controller may bound one end of a range without the other — an
     * open-ended "everything up to here" — and doing it by hand is how the `->addDay()`
     * described above gets copied out of this file.
     */
    public static function endOfDay(string $date, string $timezone): Carbon
    {
        return self::toUtc(self::nextDay($date), $timezone);
    }

    /** The calendar day after `$date`, as `Y-m-d`. No zone: this is date arithmetic. */
    private static function nextDay(string $date): string
    {
        return Carbon::createFromFormat('Y-m-d', $date, 'UTC')->addDay()->toDateString();
    }

    /**
     * The UTC window covering one local month, from any date inside it.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    public static function monthRange(string $anyDateInMonth, string $timezone): array
    {
        $local = Carbon::createFromFormat('Y-m-d', $anyDateInMonth, $timezone);

        return self::range(
            $local->copy()->startOfMonth()->toDateString(),
            $local->copy()->endOfMonth()->toDateString(),
            $timezone,
        );
    }

    /** Today, as the viewer's calendar has it. */
    public static function today(string $timezone): string
    {
        return Carbon::now($timezone)->toDateString();
    }
}
