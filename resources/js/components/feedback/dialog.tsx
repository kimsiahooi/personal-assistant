import { XIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    DialogClose,
    DialogContent as DialogContentPrimitive,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * The app's dialog. **Import dialogs from here, never from `@/components/ui/dialog`** —
 * `bun run check:structure` (rule 6) fails the build if anything does.
 *
 * It fixes two things the vendored primitive gets wrong for the way this app uses it, and
 * both are invisible on screen, which is exactly why they need a wrapper rather than a
 * review comment.
 *
 * **1. The dismiss button is a 16px target.** `ui/dialog.tsx` renders it as a bare
 * `size-4` icon, under the 24px WCAG 2.2 (2.5.8) minimum, on the one control in a dialog
 * somebody in a hurry reaches for. The primitive already takes `showCloseButton`, so this
 * turns its button off and renders a real 36px `Button` — which also picks up the same
 * focus ring, hover and disabled behaviour as every other control in the app.
 *
 * **2. Closing a dialog dropped keyboard focus onto `<body>`.** See {@link useReturnFocus}.
 *
 * Everything else is re-exported untouched, which makes the swap a one-line change at each
 * call site and leaves nothing to remember.
 *
 * It lives in `feedback/` because that is where the app keeps the surfaces it interrupts
 * somebody with — {@link ConfirmDialog} is already here.
 */
export {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

/**
 * The last thing focused that was not inside an overlay — the control a dialog should hand
 * focus back to when it closes.
 *
 * Module scope rather than React state, because the value has to survive the dialog
 * mounting and unmounting, and because every dialog in the app wants the same answer.
 */
let lastExternalFocus: HTMLElement | null = null;
let listening = false;

/**
 * Give keyboard focus back to whatever opened the dialog.
 *
 * **Radix cannot do this here, and the reason is structural.** Its `DialogContent` ends
 * with `event.preventDefault(); context.triggerRef.current?.focus()` — it hands focus to
 * the `<DialogTrigger>`. Every dialog in this app is *state-driven*: a separate button
 * calls `setOpen(true)`, and there is no `DialogTrigger` at all. So `triggerRef.current` is
 * `null`, the optional chain swallows it, and the `preventDefault()` has already stopped
 * the browser's own restoration — focus lands on `<body>`. A keyboard user who opens
 * "Record a transaction" and presses Escape is returned to the top of the page and has to
 * tab through the whole sidebar to get back.
 *
 * Wrapping each button in a `DialogTrigger` would fix the simple cases and not the ones
 * that matter: a row's Edit and Delete dialogs are opened from a dropdown menu item that
 * *unmounts* as the menu closes, so there is no trigger left to focus. Tracking the last
 * externally-focused element covers both — for a row action it resolves to the row's own
 * "Actions" button, which is where the reader was.
 *
 * The listener is registered once, on the capture phase, and skips anything inside an
 * overlay so the dialog's own fields never overwrite the answer.
 */
function useReturnFocus(): (event: Event) => void {
    useEffect(() => {
        if (listening || typeof document === 'undefined') {
            return;
        }

        listening = true;

        document.addEventListener(
            'focusin',
            (event) => {
                const target = event.target as HTMLElement | null;

                // Anything inside a dialog, a menu or a select popup is a *consequence* of
                // opening one of these, never the thing to go back to.
                if (
                    !target?.closest ||
                    target.closest(
                        '[role="dialog"],[role="menu"],[role="listbox"],[data-slot="popover-content"],[data-slot="sheet-content"]',
                    )
                ) {
                    return;
                }

                lastExternalFocus = target;
            },
            true,
        );
    }, []);

    return (event: Event) => {
        const target = lastExternalFocus;

        // `isConnected` is the guard that matters: the opener may have been removed by the
        // very write this dialog performed, and focusing a detached node silently does
        // nothing while leaving focus on <body> anyway.
        if (!target?.isConnected) {
            return;
        }

        // Radix's own handler already calls preventDefault(); calling it here too keeps
        // this correct if that ever changes.
        event.preventDefault();
        target.focus();
    };
}

export function DialogContent({
    className,
    children,
    showCloseButton = true,
    onCloseAutoFocus,
    ...props
}: ComponentProps<typeof DialogContentPrimitive>) {
    const returnFocus = useReturnFocus();

    return (
        // Always false: the primitive's own button is the 16px one. Ours is rendered below,
        // under the same `showCloseButton` prop, so this is a drop-in replacement rather
        // than a similarly-named thing.
        <DialogContentPrimitive
            {...props}
            showCloseButton={false}
            onCloseAutoFocus={(event) => {
                onCloseAutoFocus?.(event);

                // A caller that handled it itself wins — it knows something we do not.
                if (!event.defaultPrevented) {
                    returnFocus(event);
                }
            }}
            className={cn(
                // Keep the title out from under the button. It is absolutely positioned, so
                // a long one runs straight beneath it — "Delete the transfer from Maybank
                // to Cash on 6 Sep 2026?" does exactly that at 375px. Reserving the room on
                // the title rather than the header leaves the description, which sits below
                // the button and never collides with it, at full width.
                showCloseButton && '**:data-[slot=dialog-title]:pr-8',
                className,
            )}
        >
            {children}

            {showCloseButton && (
                <DialogClose asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        // Positioning cannot live in a token, and the primitive is the
                        // positioning context (it is `fixed`).
                        className="absolute top-3 right-3"
                    >
                        <XIcon />
                        <span className="sr-only">Close</span>
                    </Button>
                </DialogClose>
            )}
        </DialogContentPrimitive>
    );
}
