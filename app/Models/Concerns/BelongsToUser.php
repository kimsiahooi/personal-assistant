<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Ownership: a global scope that hides other people's rows, and a stamp that sets the
 * owner on create.
 *
 * There is one user today. This exists anyway because the alternative — adding
 * `user_id` later — is a migration plus a backfill plus an audit of every query that
 * was written when scoping was free. One column and this trait now makes opening the
 * app to a second person a change to registration, not to the data model.
 *
 * With one user it is also the whole of authorisation, which is why there are no
 * policies: a policy per model would be `where user_id = ?` restated three times, in
 * the place least likely to be read.
 *
 * Three things to know about the scope, because global scopes are quietly sharp:
 *
 *  - It applies to `find()` and to relations, so `$account->transactions` is already
 *    scoped and adding a second `where` is redundant, not safer.
 *  - It does NOT apply to raw queries. `DB::table('transactions')` returns everybody's
 *    rows. `scripts/check-structure.sh` rule 4 keeps raw queries out of controllers for
 *    a different reason, and the same rule protects this one by accident.
 *  - It is silent when nobody is signed in — a seeder, a queue worker, an artisan
 *    command. The scope is skipped rather than matching nothing, because a console
 *    command that silently saw zero rows would be far worse than one that saw all of
 *    them. Anything running unauthenticated must scope by hand.
 *
 * The consuming model needs a `user_id` column, and must NOT list it in `#[Fillable]`:
 * the value is set through `setAttribute`, so a request cannot claim to own a row it
 * does not.
 */
trait BelongsToUser
{
    public static function bootBelongsToUser(): void
    {
        static::addGlobalScope('owned', function (Builder $query): void {
            $id = Auth::id();

            if ($id !== null) {
                $query->where($query->getModel()->qualifyColumn('user_id'), $id);
            }
        });

        static::creating(function (Model $model): void {
            $id = Auth::id();

            // Only fill an unset value: a seeder that already knows the owner has said
            // so deliberately.
            if ($id !== null && $model->getAttribute('user_id') === null) {
                $model->setAttribute('user_id', $id);
            }
        });
    }

    /**
     * The person this row belongs to.
     *
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
