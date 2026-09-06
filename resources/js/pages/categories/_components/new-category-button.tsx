import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CategoryFormDialog } from '@/pages/categories/_components/category-form-dialog';

/**
 * The one way to start a new category, used in the page heading and in the empty state.
 */
export function NewCategoryButton({
    variant,
}: {
    variant?: 'default' | 'outline';
}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button variant={variant} onClick={() => setOpen(true)}>
                <Plus className="size-4" />
                New category
            </Button>

            <CategoryFormDialog open={open} onOpenChange={setOpen} />
        </>
    );
}
