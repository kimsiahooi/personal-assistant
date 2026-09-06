import { z } from 'zod';
import { choice, optionalText, text } from '@/lib/validation/primitives';

/** Mirrors `App\Http\Requests\CategoryRequest`. */
export const categorySchema = z.object({
    name: text({ label: 'Name', max: 255 }),
    kind: choice('Kind', ['income', 'expense']),
    colour: optionalText({ label: 'Colour', max: 20 }),
    icon: optionalText({ label: 'Icon', max: 40 }),
    archived_at: z.union([z.string(), z.null()]).nullish(),
});
