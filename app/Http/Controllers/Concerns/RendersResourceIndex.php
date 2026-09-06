<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * The shape every list page round-trips: a page of rows, and the query state that
 * produced it.
 *
 * It takes a Builder rather than a model class and returns props rather than rendering,
 * so a controller stays free to eager-load, scope and order however its resource needs
 * — and free to send other props alongside.
 *
 * `sortable` is sent by the server rather than declared in the page, because it is the
 * same list that guards `ORDER BY` against injection. A second copy in the client could
 * disagree, and the disagreement would show up as a header that looks clickable and
 * silently does nothing.
 */
trait RendersResourceIndex
{
    /**
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @param  list<string>  $sortable  Columns a header may sort by. The first is the default.
     * @param  (callable(Builder<TModel>, string): void)|null  $search
     * @param  array<string, string>  $extra  This resource's own filters, already cleaned.
     * @param  'asc'|'desc'  $defaultDirection
     * @return array{rows: LengthAwarePaginator<int, TModel>, filters: array<string, mixed>}
     */
    protected function resourceList(
        Request $request,
        Builder $query,
        array $sortable,
        ?callable $search = null,
        array $extra = [],
        string $defaultDirection = 'asc',
    ): array {
        $term = trim((string) $request->query('search', ''));
        $perPage = $this->perPage($request);
        $sort = $this->sortColumn($request, $sortable);
        /** @var 'asc'|'desc' $direction */
        $direction = $request->query('direction') === 'desc' ? 'desc' : $defaultDirection;

        if ($term !== '' && $search !== null) {
            $search($query, $term);
        }

        $rows = $query
            ->orderBy($sort, $direction)
            // A stable tiebreak. Without it two rows with the same sort value can swap
            // between pages, which reads as a row appearing twice and another vanishing.
            ->orderBy($query->getModel()->getQualifiedKeyName())
            ->paginate($perPage)
            ->withQueryString();

        return [
            'rows' => $rows,
            'filters' => [
                'search' => $term,
                'per_page' => $perPage,
                'sort' => $sort,
                'direction' => $direction,
                'sortable' => $sortable,
                'extra' => $extra,
            ],
        ];
    }

    /** Bounded, so a crafted `per_page` cannot ask for the whole table. */
    private function perPage(Request $request): int
    {
        $requested = (int) $request->query('per_page', 25);

        return in_array($requested, [10, 25, 50, 100], true) ? $requested : 25;
    }

    /**
     * The requested sort, if it is one this resource actually offers.
     *
     * Anything else falls back to the first allowed column rather than erroring: a stale
     * bookmark should show the list, not a 500.
     *
     * @param  list<string>  $sortable
     */
    private function sortColumn(Request $request, array $sortable): string
    {
        $requested = (string) $request->query('sort', '');

        return in_array($requested, $sortable, true) ? $requested : $sortable[0];
    }
}
