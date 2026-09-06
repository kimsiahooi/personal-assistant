/** A slot in the page list: a page to jump to, or a break in the run. */
export type PageSlot = number | 'gap';

/**
 * The page numbers to offer for a list of `last` pages, currently on `current`.
 *
 * Always keeps the first and last page reachable plus a run around the current one,
 * collapsing whatever is skipped. A pager that renders every page is unusable by page
 * 40; one that only offers next and previous makes "jump to the end" impossible.
 *
 * The slot count is **constant** once gaps are needed, so the footer does not change
 * width as someone pages through — the buttons stay under the cursor.
 *
 * Pure and deterministic: same arguments, same array, so the server and the browser
 * render the same pager.
 */
export function pageWindow(
    current: number,
    last: number,
    span = 1,
): PageSlot[] {
    const slots = span * 2 + 5;

    // Short enough to show whole — collapsing here would cost a slot and save nothing.
    if (last <= slots) {
        return range(1, last);
    }

    // Near the start: one run from the first page, then a gap, then the last.
    if (current <= span + 3) {
        return [...range(1, span * 2 + 3), 'gap', last];
    }

    // Near the end: the first page, a gap, then one run to the last.
    if (current >= last - (span + 2)) {
        return [1, 'gap', ...range(last - (span * 2 + 2), last)];
    }

    // Somewhere in the middle: gaps on both sides of the current run.
    return [1, 'gap', ...range(current - span, current + span), 'gap', last];
}

function range(from: number, to: number): number[] {
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
