<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\CategoryKind;
use App\Models\Category;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** One category, as a listing sends it. */
#[TypeScript]
final class CategoryData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
        public CategoryKind $kind,
        public ?string $colour,
        public ?string $icon,
        public bool $is_archived,
        public string $created_at,
    ) {}

    public static function fromCategory(Category $category): self
    {
        return new self(
            id: $category->id,
            name: $category->name,
            kind: $category->kind,
            colour: $category->colour,
            icon: $category->icon,
            is_archived: $category->archived_at !== null,
            created_at: $category->created_at->toIso8601String(),
        );
    }
}
