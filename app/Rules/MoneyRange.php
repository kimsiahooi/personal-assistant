<?php

declare(strict_types=1);

namespace App\Rules;

use App\Support\Money;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A money amount inside the range `decimal(15,2)` can hold.
 *
 * A rule object rather than `between:`, because `between` casts to float to compare —
 * which is the one thing this app spends its effort avoiding. `bccomp` compares the
 * decimal strings directly.
 */
final class MoneyRange implements ValidationRule
{
    public function __construct(
        private readonly string $min,
        private readonly string $max,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! is_numeric($value)) {
            return; // the `string`/`regex` rules already reported this
        }

        $amount = Money::absolute($value);

        if (Money::compare($amount, $this->min) < 0) {
            $fail("The :attribute must be at least {$this->min}.");

            return;
        }

        if (Money::compare($amount, $this->max) > 0) {
            $fail("The :attribute may not be greater than {$this->max}.");
        }
    }
}
