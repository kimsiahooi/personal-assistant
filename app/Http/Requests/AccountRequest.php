<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\AccountType;
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
            'archived_at' => ['nullable', 'date'],
        ];
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
