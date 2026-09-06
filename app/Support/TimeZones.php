<?php

declare(strict_types=1);

namespace App\Support;

use DateTimeZone;
use Illuminate\Http\Request;

/**
 * Which clock a request is rendered against.
 *
 * The database is UTC and stays UTC — every column, every Carbon, every ISO-8601
 * string on the wire. This class only decides how those instants are *displayed*, and
 * it exists for one reason: the server has to know the viewer's zone before it
 * renders, because under SSR the same markup is produced twice — once in PHP's Node
 * process and once in the browser — and a zone the browser decides for itself would
 * make those two disagree. That is a React #418 hydration mismatch — the same class of
 * bug `scripts/ui-guard.sh` blocks by banning `Date.now()` in render output.
 *
 * So the browser reports its zone into a cookie (the inline script in `app.blade.php`,
 * beside the one that applies dark mode before first paint), and this reads it back.
 * The client is then told what the server used, and both format against that one
 * string. Nothing anywhere calls `resolvedOptions()` during a render.
 *
 * An IANA identifier rather than a numeric offset, because an offset is only correct
 * until the next daylight-saving change. `Asia/Kuala_Lumpur` has none; `America/New_York`
 * is -05:00 in December and -04:00 in June, and only the name knows that.
 *
 * In this app the zone does more than format. `transactions.occurred_at` is a UTC
 * instant standing for a local calendar day, so this zone is what turns a picked date
 * into that instant and back again — and what a monthly total has to group by. Get it
 * wrong and a transaction on the 1st falls into the previous month. See
 * {@see LocalDate}.
 */
final class TimeZones
{
    /**
     * What a request renders in when the browser has not reported anything yet — the
     * first page of a fresh browser, a client with cookies blocked, a console command.
     * UTC because that is what the stored value already is: the fallback shows the
     * truth, just not the viewer's version of it.
     */
    public const FALLBACK = 'UTC';

    /** The cookie the browser writes its detected zone to. Set by JS, so unencrypted. */
    public const COOKIE = 'timezone';

    /**
     * Longest identifier in the tzdb is `America/Argentina/ComodRivadavia` at 32, so 64
     * is generous. The point is to stop a hand-edited cookie turning into a large
     * `in_array` argument, not to be precise.
     */
    private const MAX_LENGTH = 64;

    /** @var array<string, true>|null the tzdb, flipped for O(1) lookup */
    private static ?array $identifiers = null;

    public static function supports(?string $timezone): bool
    {
        if (! is_string($timezone) || $timezone === '' || strlen($timezone) > self::MAX_LENGTH) {
            return false;
        }

        self::$identifiers ??= array_fill_keys(DateTimeZone::listIdentifiers(), true);

        return isset(self::$identifiers[$timezone]);
    }

    /**
     * The zone to render this request in.
     *
     * Validated rather than trusted: the value arrives from a cookie the browser wrote,
     * which means anyone can write it, and it is about to be handed to
     * `Intl.DateTimeFormat` — which throws a RangeError on an identifier it does not
     * know, taking the whole SSR render down with it.
     */
    public static function resolve(Request $request): string
    {
        $reported = $request->cookie(self::COOKIE);

        // `cookie()` widens to array|string|null; only the string case can be a zone.
        if (is_string($reported) && self::supports($reported)) {
            return $reported;
        }

        return self::FALLBACK;
    }
}
