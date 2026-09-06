<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What a transaction was for. Groceries, salary, rent.
 *
 * **`kind` splits the list in two rather than one flat set.** "Salary" is never an
 * expense and "Groceries" is never income, so a single list would offer every wrong
 * answer on every form. Two kinds means the category picker on an expense shows only
 * expense categories, which is one fewer thing to get wrong and one fewer validation
 * rule to write.
 *
 * Deliberately flat — no `parent_id`. Nesting is the obvious next feature and it is not
 * in slice 1: it turns every "spending by category" answer into a question about whether
 * children roll up, and the donut, the filters and the totals all have to agree on that
 * answer. A parent column added later costs one migration; a wrong rollup rule costs
 * trust in every number on the dashboard.
 *
 * Transfers have no category at all — moving money between your own accounts is not
 * spending — which is why `transactions.category_id` is nullable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table): void {
            $table->id();
            $table->foreignIdFor(User::class)->constrained()->cascadeOnDelete();
            $table->string('name');
            // App\Enums\CategoryKind — income or expense.
            $table->string('kind', 10);
            // A design token name, never a hex value: docs/UI-UX-GUIDELINES.md bans raw
            // colour in the UI, and a palette that lives in the database cannot follow
            // the theme into dark mode.
            $table->string('colour', 20)->nullable();
            // A lucide icon name.
            $table->string('icon', 40)->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            // "Transport" can exist once as income and once as expense — unlikely, but
            // the pair is what has to be unique, not the name.
            $table->unique(['user_id', 'kind', 'name']);
            $table->index(['user_id', 'kind', 'archived_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
