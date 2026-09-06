<?php

declare(strict_types=1);

namespace App\Enums;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Which half of the ledger a category belongs to.
 *
 * "Salary" is never an expense and "Groceries" is never income, so the category picker
 * is filtered by the transaction type being recorded. That filtering is the whole reason
 * this exists — one flat list would offer every wrong answer on every form.
 *
 * A transfer has no category and therefore no kind.
 */
#[TypeScript]
enum CategoryKind: string
{
    case Income = 'income';
    case Expense = 'expense';

    /** The kind a category must have to be selectable for a given transaction type. */
    public static function forTransaction(TransactionType $type): ?self
    {
        return match ($type) {
            TransactionType::Income => self::Income,
            TransactionType::Expense => self::Expense,
            TransactionType::Transfer => null,
        };
    }
}
