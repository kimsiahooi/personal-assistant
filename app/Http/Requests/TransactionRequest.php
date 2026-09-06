<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\CategoryKind;
use App\Enums\TransactionType;
use App\Models\Category;
use App\Support\LocalDate;
use App\Support\TimeZones;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Recording or editing a transaction, including a transfer.
 *
 * The shape changes with `type`, and the three conditional rules below are the whole
 * reason this request is longer than the other two:
 *
 *  - a transfer needs a destination account, and the other two must not have one;
 *  - a transfer has no category, and the other two may have one — but only a category
 *    of the matching kind, so an expense cannot be filed under "Salary";
 *  - a transfer's two accounts must differ, or it would write two legs against the same
 *    account that net to nothing and read as a bug.
 *
 * `amount` is always the magnitude a person typed. The sign belongs to the model —
 * see Transaction::applySign() — so nothing here has to agree with it.
 *
 * **The wire field is `occurred_on`, a `Y-m-d` the person picked; the column is
 * `occurred_at`, a UTC instant.** {@see self::occurredAt()} is the conversion, and it is
 * the only one — a controller that read `occurred_on` straight into the model would
 * store the string as if it were UTC midnight, putting every Malaysian transaction on
 * the right date by luck and every American one a day late.
 *
 * `before_or_equal` compares against the viewer's today, not the server's. At 09:00 in
 * Kuala Lumpur it is still yesterday in UTC, and a rule using the server's clock would
 * reject a transaction dated today for the eight hours that matter most.
 */
final class TransactionRequest extends AppFormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(TransactionType::class)],
            'amount' => $this->moneyRules(),
            'occurred_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.$this->localToday()],
            'account_id' => ['required', ...$this->ownedKey('accounts')],
            'to_account_id' => [Rule::requiredIf($this->isTransfer()), 'nullable', ...$this->ownedKey('accounts')],
            'category_id' => [Rule::excludeIf($this->isTransfer()), 'nullable', ...$this->ownedKey('categories')],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * Names for the messages, because Laravel derives them from the field and the field is
     * named for the wire.
     *
     * "The occurred on field must be a date before or equal to…" and "The to account id
     * field is required" are what it produces otherwise — the column names read aloud, in
     * front of somebody who never saw them.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'occurred_on' => 'date',
            'account_id' => 'account',
            'to_account_id' => 'destination account',
            'category_id' => 'category',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->rejectSameAccountTransfer($validator);
            $this->rejectMismatchedCategory($validator);
        });
    }

    /** The picked local date as the UTC instant the column stores. */
    public function occurredAt(): Carbon
    {
        return LocalDate::toUtc(
            (string) $this->validated('occurred_on'),
            $this->timezone(),
        );
    }

    /**
     * Validated input, with the wire's local date swapped for the stored instant.
     *
     * @return array<string, mixed>
     */
    public function transactionAttributes(): array
    {
        $data = $this->validated();
        unset($data['occurred_on'], $data['to_account_id']);
        $data['occurred_at'] = $this->occurredAt();

        return $data;
    }

    public function timezone(): string
    {
        return TimeZones::resolve($this);
    }

    private function localToday(): string
    {
        return LocalDate::today($this->timezone());
    }

    public function isTransfer(): bool
    {
        return $this->input('type') === TransactionType::Transfer->value;
    }

    /** Moving money from an account to itself is not a transfer, it is a typo. */
    private function rejectSameAccountTransfer(Validator $validator): void
    {
        if (! $this->isTransfer()) {
            return;
        }

        if ($this->input('account_id') === $this->input('to_account_id')) {
            $validator->errors()->add(
                'to_account_id',
                'A transfer must move money between two different accounts.',
            );
        }
    }

    /**
     * An expense cannot be filed under an income category.
     *
     * The picker already filters by kind, so this only fires on a crafted request or a
     * stale form — but the database has no way to express "category.kind must match
     * transaction.type", so this is where that invariant lives.
     */
    private function rejectMismatchedCategory(Validator $validator): void
    {
        $categoryId = $this->input('category_id');

        if ($categoryId === null || $this->isTransfer()) {
            return;
        }

        $type = TransactionType::tryFrom((string) $this->input('type'));
        $expected = $type === null ? null : CategoryKind::forTransaction($type);

        if ($expected === null) {
            return;
        }

        $matches = Category::query()
            ->whereKey($categoryId)
            ->where('kind', $expected)
            ->exists();

        if (! $matches) {
            $validator->errors()->add(
                'category_id',
                "The selected category is not an {$expected->value} category.",
            );
        }
    }
}
