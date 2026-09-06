<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\AccountType;
use App\Models\Account;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

/** Creating or renaming an account. */
final class AccountRequest extends AppFormRequest
{
    /**
     * Twelve spaces, inline — see AppFormRequest. The parity gate reads these keys.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', $this->uniqueName()],
            'type' => ['required', Rule::enum(AccountType::class)],
            'opening_balance' => $this->moneyRules('0'),
            'note' => ['nullable', 'string', 'max:1000'],
            'archived' => ['boolean'],
        ];
    }

    /**
     * The row to write: what was validated, with `archived` turned into a timestamp.
     *
     * **The browser says *whether*, the server says *when*.** Accepting `archived_at`
     * straight off the wire would mean a client inventing an instant from its own clock —
     * the ambient-time problem this codebase spends `App\Support\LocalDate` avoiding, and
     * a value nobody could later trust as "when it was archived". A boolean has no such
     * ambiguity, and it pairs with `AccountData::$is_archived` coming back.
     *
     * Already-archived rows keep their original timestamp: re-saving an archived account
     * should not restamp it as archived today.
     *
     * @return array<string, mixed>
     */
    public function accountAttributes(?Account $account = null): array
    {
        $data = $this->validated();
        $archived = (bool) ($data['archived'] ?? false);

        unset($data['archived']);

        // Hoisted rather than written `$account?->archived_at ?? now()`: `??` suppresses the
        // null-property access outright, so PHP treats `?->` and `->` there as identical
        // and PHPStan calls the nullsafe redundant. Naming the value says what it is
        // instead of leaning on that.
        $stamped = $account?->archived_at;

        $data['archived_at'] = $archived ? ($stamped ?? now()) : null;

        return $data;
    }

    /**
     * One person cannot have two accounts by the same name — the pair the table's
     * unique index guards. Scoped to the user, and ignoring this row on an update.
     */
    private function uniqueName(): Unique
    {
        return Rule::unique('accounts', 'name')
            ->where('user_id', $this->user()?->id)
            ->ignore($this->route('account'));
    }
}
