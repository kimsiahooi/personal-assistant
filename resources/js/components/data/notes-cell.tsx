/**
 * Whatever somebody wrote down.
 *
 * **Off by default, and that is the whole reason the Columns panel exists.** A note runs
 * long, and a column of prose beside columns of numbers takes the width from the fields
 * that carry the record. But every list that stores a note also *searches* it — so leaving
 * the column out entirely means a row can match text that is nowhere on screen.
 * Hidden-until-asked-for is the honest answer to both.
 *
 * Truncated to the column, with the full text on `title` for the one row somebody is
 * actually reading. A tooltip would be better and would also mean 25 of them mounted per
 * page; the native affordance costs nothing and says the same thing.
 */
export function NotesCell({ note }: { note: string | null }) {
    if (note === null || note === '') {
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <span className="block truncate text-muted-foreground" title={note}>
            {note}
        </span>
    );
}
