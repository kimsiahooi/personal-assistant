<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Rules\MoneyRange;
use App\Support\Money;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The base every domain FormRequest extends. It declares no rules of its own — it
 * carries the pieces the three real ones would otherwise each spell out — which is why
 * it is listed EXEMPT in `scripts/check-validation-parity.ts`.
 *
 * **A subclass's `rules()` must return an inline array literal.** The parity gate finds
 * a request's fields by matching exactly twelve spaces of indentation, which is the
 * depth of an array literal returned from a method on a class. Spread a base array into
 * it, or format it differently, and the gate reads ZERO fields and then passes while
 * checking nothing at all. That is the one thing about this file worth remembering; the
 * helpers below are called from inside the literal, never around it.
 */
abstract class AppFormRequest extends FormRequest
{
    /**
     * Every request here belongs to the signed-in user, and every model carries a
     * global scope that already limits what an id can resolve to. There is no second
     * authorisation question to ask.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Rules for a money field: a decimal string within what `decimal(15,2)` holds.
     *
     * Validated as a string rather than `numeric`, because `numeric` would accept
     * `1e3` and PHP would then hand a float to a column that is deliberately not one.
     *
     * @return array<int, mixed>
     */
    protected function moneyRules(string $min = '0.01'): array
    {
        return [
            'required',
            'string',
            'regex:/^-?\d{1,13}(\.\d{1,2})?$/',
            'decimal:0,'.Money::SCALE,
            'min_digits:1',
            new MoneyRange($min, Money::MAX),
        ];
    }

    /**
     * A foreign key that must resolve to one of the signed-in user's own rows.
     *
     * @return array<int, mixed>
     */
    protected function ownedKey(string $table): array
    {
        return [
            'integer',
            Rule::exists($table, 'id')->where('user_id', $this->user()?->id),
        ];
    }
}
