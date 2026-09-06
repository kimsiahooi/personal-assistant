import { z } from 'zod';
import { choice, money, optionalText, text } from '@/lib/validation/primitives';

/**
 * Mirrors `App\Http\Requests\AccountRequest`. Every key the server validates has one
 * here, which `bun run check:validation` enforces.
 *
 * Uniqueness of the name is not checked here: it is a database question, and a browser
 * that guessed at it would either be wrong or need a round trip to be right.
 */
export const accountSchema = z.object({
    name: text({ label: 'Name', max: 255 }),
    type: choice('Type', ['bank', 'cash', 'ewallet', 'credit_card']),
    opening_balance: money('Opening balance', '0'),
    note: optionalText({ label: 'Note', max: 1000 }),
    archived_at: z.union([z.string(), z.null()]).nullish(),
});
