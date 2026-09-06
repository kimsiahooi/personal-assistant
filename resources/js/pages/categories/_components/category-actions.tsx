import { useState } from 'react';
import { RowActions } from '@/components/data/row-actions';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { useResourceDelete } from '@/hooks/use-resource-delete';
import { CategoryFormDialog } from '@/pages/categories/_components/category-form-dialog';
import { destroy } from '@/routes/categories';

type Category = App.Data.CategoryData;

/**
 * What one row can do. The row owns both of its dialogs — see {@link AccountActions} for
 * why that keeps the column definitions at module scope.
 */
export function CategoryActions({ category }: { category: Category }) {
    const [editing, setEditing] = useState(false);
    const remove = useResourceDelete(destroy({ category: category.id }).url);

    return (
        <>
            <RowActions
                name={category.name}
                onEdit={() => setEditing(true)}
                onDelete={remove.ask}
            />

            <CategoryFormDialog
                open={editing}
                onOpenChange={setEditing}
                category={category}
            />

            <ConfirmDialog
                open={remove.confirming}
                onOpenChange={remove.onOpenChange}
                title={`Delete ${category.name}?`}
                // Says what actually happens: the foreign key is nullOnDelete, so the
                // transactions survive and lose their label. Archiving is offered because
                // it is almost always what was meant.
                description="Its transactions are kept and become uncategorised. To keep the label on them, archive it instead."
                confirmLabel="Delete category"
                busyLabel="Deleting…"
                variant="destructive"
                processing={remove.processing}
                onConfirm={remove.confirm}
            />
        </>
    );
}
