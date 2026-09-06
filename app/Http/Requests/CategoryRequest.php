<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\CategoryKind;
use App\Models\Category;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

/** Creating or renaming a category. */
final class CategoryRequest extends AppFormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', $this->uniqueName()],
            'kind' => ['required', Rule::enum(CategoryKind::class)],
            'colour' => ['nullable', 'string', 'max:20'],
            'icon' => ['nullable', 'string', 'max:40'],
            'archived' => ['boolean'],
        ];
    }

    /**
     * The row to write, with `archived` turned into a timestamp — see
     * {@see AccountRequest::accountAttributes()} for why the wire carries a boolean.
     *
     * @return array<string, mixed>
     */
    public function categoryAttributes(?Category $category = null): array
    {
        $data = $this->validated();
        $archived = (bool) ($data['archived'] ?? false);

        unset($data['archived']);

        // Hoisted rather than written `$category?->archived_at ?? now()`: `??` suppresses the
        // null-property access outright, so PHP treats `?->` and `->` there as identical
        // and PHPStan calls the nullsafe redundant. Naming the value says what it is
        // instead of leaning on that.
        $stamped = $category?->archived_at;

        $data['archived_at'] = $archived ? ($stamped ?? now()) : null;

        return $data;
    }

    /** Unique on (user, kind, name) — the same triple the table indexes. */
    private function uniqueName(): Unique
    {
        return Rule::unique('categories', 'name')
            ->where('user_id', $this->user()?->id)
            ->where('kind', $this->input('kind'))
            ->ignore($this->route('category'));
    }
}
