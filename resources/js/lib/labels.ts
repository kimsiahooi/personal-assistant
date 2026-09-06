/**
 * The words for the enum values the wire carries.
 *
 * **Here rather than in PHP, deliberately.** Each map is keyed by a generated union from
 * `resources/js/types/generated.d.ts`, so adding a case to the PHP enum without adding a
 * word for it is a `tsc` error — an exhaustiveness check a `label()` method on the enum
 * could not give, since PHP would happily return the raw value and the screen would read
 * "ewallet". The enums themselves stay free of presentation.
 *
 * Pure data. No React, no ambient locale — see `lib/format.ts` for why that matters.
 */

export const ACCOUNT_TYPE_LABELS: Record<App.Enums.AccountType, string> = {
    bank: 'Bank account',
    cash: 'Cash',
    ewallet: 'E-wallet',
    credit_card: 'Credit card',
};

export const CATEGORY_KIND_LABELS: Record<App.Enums.CategoryKind, string> = {
    income: 'Income',
    expense: 'Expense',
};

export const TRANSACTION_TYPE_LABELS: Record<
    App.Enums.TransactionType,
    string
> = {
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer',
};

/** The order the pickers and filters offer them in, which is the enums' own order. */
export const ACCOUNT_TYPES = Object.keys(
    ACCOUNT_TYPE_LABELS,
) as App.Enums.AccountType[];

export const CATEGORY_KINDS = Object.keys(
    CATEGORY_KIND_LABELS,
) as App.Enums.CategoryKind[];

export const TRANSACTION_TYPES = Object.keys(
    TRANSACTION_TYPE_LABELS,
) as App.Enums.TransactionType[];
