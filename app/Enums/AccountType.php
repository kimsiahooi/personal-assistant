<?php

declare(strict_types=1);

namespace App\Enums;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What kind of place money sits in.
 *
 * Presentational today — it picks an icon and groups the accounts list. It is a column
 * rather than a label because {@see CreditCard} will eventually behave differently:
 * a card's balance is money owed, so a positive balance is a debt and the dashboard's
 * net-worth line has to subtract it rather than add it. That is not in slice 1, and
 * recording the type now is what makes it a query change later rather than a migration
 * against rows that never said which was which.
 */
#[TypeScript]
enum AccountType: string
{
    case Bank = 'bank';
    case Cash = 'cash';
    case EWallet = 'ewallet';
    case CreditCard = 'credit_card';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $case): string => $case->value, self::cases());
    }
}
