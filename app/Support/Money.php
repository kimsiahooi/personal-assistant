<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Money, as a string.
 *
 * Amounts are `decimal(15,2)` in MySQL and cast `decimal:2`, so PHP holds them as
 * strings and they cross the wire to React as `"12.50"`. Nothing here turns one into a
 * float, because a float cannot hold 0.1: `0.1 + 0.2` is `0.30000000000000004` in PHP
 * exactly as it is in JavaScript, and `number_format` would hide that while the
 * comparison still failed.
 *
 * Where arithmetic is unavoidable it goes through `bcmath`, which operates on the
 * decimal string directly. Most of the time it IS avoidable — every sum, balance and
 * aggregate in this app is a SQL expression, and the reason there is so little here is
 * that the database is doing the adding.
 *
 * The scale is fixed at 2 because a sen is the smallest unit of MYR: the column can only
 * hold amounts that can actually exist, so rows and totals always agree. The reference
 * project's 4 is for stock quantities, where a quarter of a kilogram is real.
 */
final class Money
{
    /** Decimal places every amount carries. Matches `decimal(15,2)`. */
    public const SCALE = 2;

    /** 13 integer digits, since 2 of the 15 are spent after the point. */
    public const MAX = '9999999999999.99';

    /**
     * Normalise typed input to the string the column stores.
     *
     * Accepts what a person actually types — `1,250.5`, ` 12.50 `, `RM 8` — and returns
     * `1250.50`, `12.50`, `8.00`. Returns null when the input is not a number at all,
     * which is the FormRequest's problem to report, not this class's to guess at.
     */
    public static function parse(string $input): ?string
    {
        $cleaned = preg_replace('/[^0-9.\-]/', '', $input) ?? '';

        if ($cleaned === '' || ! is_numeric($cleaned)) {
            return null;
        }

        return self::scale($cleaned);
    }

    /**
     * Force a numeric string to exactly SCALE decimal places, without rounding drift.
     *
     * This is also the single place a plain `string` becomes a `numeric-string`. bcmath
     * requires the narrower type and the values arrive from Eloquent as `string`, so
     * narrowing once here — and routing every other operation through these methods —
     * is what keeps the rest of the app from each having to prove it separately.
     *
     * @return numeric-string
     */
    public static function scale(string $amount): string
    {
        return bcadd(self::numeric($amount), '0', self::SCALE);
    }

    /**
     * Flip the sign. Used to write the opposite leg of a transfer.
     *
     * @return numeric-string
     */
    public static function negate(string $amount): string
    {
        return bcsub('0', self::numeric($amount), self::SCALE);
    }

    /**
     * The magnitude, sign discarded — what a form shows and a person types.
     *
     * @return numeric-string
     */
    public static function absolute(string $amount): string
    {
        $value = self::numeric($amount);

        return bccomp($value, '0', self::SCALE) < 0
            ? self::negate($value)
            : self::scale($value);
    }

    /**
     * Add two amounts.
     *
     * Server-side money arithmetic is legitimate and lives here; the browser's
     * `lib/money.ts` deliberately has no counterpart, because a total computed there
     * would be a float. Everything goes through bcmath on the decimal strings.
     *
     * @return numeric-string
     */
    public static function add(string $a, string $b): string
    {
        return bcadd(self::numeric($a), self::numeric($b), self::SCALE);
    }

    /** @return numeric-string */
    public static function subtract(string $a, string $b): string
    {
        return bcsub(self::numeric($a), self::numeric($b), self::SCALE);
    }

    /** -1, 0 or 1 — `$a` against `$b`. */
    public static function compare(string $a, string $b): int
    {
        return bccomp(self::numeric($a), self::numeric($b), self::SCALE);
    }

    /**
     * Apply a direction to a magnitude: `signed('12.50', -1)` is `-12.50`.
     *
     * @return numeric-string
     */
    public static function signed(string $magnitude, int $sign): string
    {
        $absolute = self::absolute($magnitude);

        return $sign < 0 ? self::negate($absolute) : $absolute;
    }

    public static function isZero(string $amount): bool
    {
        return self::compare($amount, '0') === 0;
    }

    /**
     * Narrow a string to the numeric-string bcmath needs.
     *
     * A non-numeric value here is a programming error, not user input — every path in
     * carries either a validated field or a decimal column — so it throws rather than
     * guessing. Guessing would mean returning zero, which is a wrong balance that looks
     * like a right one.
     *
     * @return numeric-string
     */
    private static function numeric(string $amount): string
    {
        if (! is_numeric($amount)) {
            throw new \InvalidArgumentException("Not a money amount: [{$amount}].");
        }

        return $amount;
    }
}
