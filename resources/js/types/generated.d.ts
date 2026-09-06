declare namespace App {
namespace Data {
export type AccountData = {
id: number,
name: string,
type: App.Enums.AccountType,
opening_balance: string,
balance: string,
currency: string,
note: string | null,
is_archived: boolean,
created_at: string,
};
export type CategoryData = {
id: number,
name: string,
kind: App.Enums.CategoryKind,
colour: string | null,
icon: string | null,
is_archived: boolean,
created_at: string,
};
export type TransactionData = {
id: number,
type: App.Enums.TransactionType,
amount: string,
magnitude: string,
currency: string,
occurred_on: string,
note: string | null,
account_id: number,
account_name: string,
category_id: number | null,
category_name: string | null,
category_colour: string | null,
category_icon: string | null,
transfer_group_id: string | null,
transfer_counterpart_name: string | null,
transfer_counterpart_account_id: number | null,
};
}
namespace Enums {
export type AccountType = 'bank' | 'cash' | 'ewallet' | 'credit_card';
export type CategoryKind = 'income' | 'expense';
export type TransactionType = 'income' | 'expense' | 'transfer';
}
}
