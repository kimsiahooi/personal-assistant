import { router } from '@inertiajs/react';
import { useState } from 'react';

/**
 * The ask-then-delete cycle behind every row's Delete: whether the confirmation is open,
 * whether the request is in flight, and the request itself.
 *
 * Four small decisions that all have to agree, in one place rather than once per module:
 *
 *  - `preserveScroll`, or deleting the last row of a long list jumps back to the top.
 *  - `onStart`/`onFinish` rather than `onSuccess`, so a refused delete releases the button
 *    instead of leaving a spinner running forever.
 *  - the dialog closes in `onFinish` too. A 403 or a 500 is not something a confirm dialog
 *    can explain, and Inertia surfaces it in front of the page anyway.
 *  - the row is never removed locally; the redirect re-renders the list from the server,
 *    so what is on screen is what is in the database.
 *
 * The wording and which dialog to render stay with the module — see {@link RowActions} for
 * the same split.
 *
 * @param url the resource's destroy URL, e.g. `destroy({ category: id }).url`
 */
export function useResourceDelete(url: string) {
    const [confirming, setConfirming] = useState(false);
    const [processing, setProcessing] = useState(false);

    return {
        /** Whether the confirmation is showing. Pass to ConfirmDialog's `open`. */
        confirming,
        /** Whether the delete is in flight. Pass to ConfirmDialog's `processing`. */
        processing,
        /** Open the confirmation — this is what Delete in the row menu calls. */
        ask: () => setConfirming(true),
        /** ConfirmDialog's `onOpenChange`; it already refuses to close mid-request. */
        onOpenChange: setConfirming,
        /** Send it. */
        confirm: () => {
            router.delete(url, {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => {
                    setProcessing(false);
                    setConfirming(false);
                },
            });
        },
    };
}
