<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The places money sits: a bank account, cash in a wallet, an e-wallet, a credit card.
 *
 * `opening_balance` is what the account held before this app knew about it, and it is a
 * plain column rather than a synthetic first transaction. A transaction has a date, a
 * type and a category, and an opening balance meaningfully has none of the three — a
 * fabricated one would show up in every list and every monthly total as income that
 * never happened.
 *
 * **A balance is never stored.** It is `opening_balance + SUM(transactions.amount)`,
 * derived on read. A cached column would be a second source of truth that has to be
 * kept correct through every write, edit, delete and transfer, and the moment it drifts
 * there is no way to tell which of the two is lying. At personal-finance volumes — a few
 * thousand rows a year — the SUM is indexed and free. If that ever stops being true, the
 * fix is a materialised view or a cache, not a column something has to remember to update.
 *
 * `archived_at`, not a soft delete. A closed bank account is not a deleted one: its
 * transactions are still real and still have to display the name of the account they
 * happened in. Archiving hides it from pickers and totals-by-default while leaving it
 * resolvable. An account with no transactions can still be deleted outright — the
 * `restrictOnDelete` on `transactions.account_id` is what decides which.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table): void {
            $table->id();
            // Cascade, unlike everything else here: this is the owner, and deleting the
            // account in Settings is a request to be forgotten, not to orphan rows.
            $table->foreignIdFor(User::class)->constrained()->cascadeOnDelete();
            $table->string('name');
            // App\Enums\AccountType — a short code, not a class name.
            $table->string('type', 20);
            $table->decimal('opening_balance', 15, 2)->default(0);
            // Fixed to MYR for now. The column exists so that adding a second currency
            // is a migration of behaviour rather than of shape; see docs/ROADMAP.md for
            // why multi-currency is more than this column.
            $table->char('currency', 3)->default('MYR');
            $table->text('note')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            // One person cannot have two accounts called "Maybank". Scoped to the user
            // rather than global, because the name is theirs, not the app's.
            $table->unique(['user_id', 'name']);
            $table->index(['user_id', 'archived_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
