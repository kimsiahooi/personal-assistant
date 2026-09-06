<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\CategoryKind;
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
            'archived_at' => ['nullable', 'date'],
        ];
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
