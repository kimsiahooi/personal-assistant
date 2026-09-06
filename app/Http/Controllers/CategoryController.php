<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\CategoryData;
use App\Enums\CategoryKind;
use App\Http\Controllers\Concerns\RendersResourceIndex;
use App\Http\Controllers\Concerns\RespondsWithToast;
use App\Http\Requests\CategoryRequest;
use App\Models\Category;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class CategoryController
{
    use RendersResourceIndex;
    use RespondsWithToast;

    public function index(Request $request): Response
    {
        $kind = CategoryKind::tryFrom((string) $request->query('kind', ''));
        $showArchived = $request->query('archived') === '1';

        $list = $this->resourceList(
            request: $request,
            query: Category::query()
                ->when($kind !== null, fn ($query) => $query->ofKind($kind))
                ->when(! $showArchived, fn ($query) => $query->active()),
            sortable: ['name', 'kind', 'created_at'],
            search: static function (Builder $query, string $term): void {
                $query->where('name', 'like', "%{$term}%");
            },
            extra: array_filter([
                'kind' => $kind->value ?? '',
                'archived' => $showArchived ? '1' : '',
            ]),
        );

        return Inertia::render('categories/index', [
            'categories' => $list['rows']->through(CategoryData::fromCategory(...)),
            'filters' => $list['filters'],
        ]);
    }

    public function store(CategoryRequest $request): RedirectResponse
    {
        $category = Category::create($request->categoryAttributes());

        $this->toast("{$category->name} added.");

        return back();
    }

    public function update(CategoryRequest $request, Category $category): RedirectResponse
    {
        $category->update($request->categoryAttributes($category));

        $this->toast("{$category->name} updated.");

        return back();
    }

    /**
     * Removing a category uncategorises its transactions rather than destroying them —
     * `nullOnDelete` on the foreign key. A label is not the thing it labels.
     */
    public function destroy(Category $category): RedirectResponse
    {
        $name = $category->name;

        $category->delete();

        $this->toast("{$name} deleted. Its transactions are now uncategorised.");

        return back();
    }
}
