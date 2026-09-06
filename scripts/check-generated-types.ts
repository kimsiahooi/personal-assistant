/**
 * Generated-types gate — the staleness half of the two-gate DTO contract.
 *
 * `resources/js/types/generated.d.ts` is produced from `app/Data/**` and committed, so
 * it can be wrong in two ways that nothing else notices:
 *
 *   1. **Stale.** A Data class gained, lost or renamed a property and nobody re-ran
 *      `bun run types:generate`. TypeScript then type-checks the pages against a wire
 *      shape the server stopped sending — green build, wrong app. This is precisely the
 *      drift the DTO layer exists to prevent, so leaving it unguarded would defeat the
 *      point of having one.
 *   2. **Hand-edited.** Someone patched a field into the file directly. The next
 *      regeneration silently reverts it, which is a confusing way to lose an afternoon.
 *
 * A single comparison catches both: transform into a temp directory and diff. The temp
 * directory is not incidental — a staleness check that writes where it is checking
 * leaves a modified tree behind when it fails, and the *next* run then reports
 * staleness for a reason that has nothing to do with the change under test. That
 * That failure mode is the reason `config/typescript-transformer.php` exposes an
 * output-directory override at all.
 *
 * Run: `bun run check:generated-types`
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const COMMITTED = 'resources/js/types/generated.d.ts';
const FILENAME = 'generated.d.ts';

function fail(message: string): never {
    console.error(`✗ ${message}`);
    process.exit(1);
}

const scratch = mkdtempSync(join(tmpdir(), 'generated-types-'));

// `node:child_process` rather than `Bun.spawnSync`: identical here, and it keeps this
// script runnable by whatever is on the machine.
const transformed = spawnSync('php', ['artisan', 'typescript:transform'], {
    encoding: 'utf8',
    // Read by config/typescript-transformer.php, so the real file is never touched.
    env: { ...process.env, TS_TRANSFORMER_OUTPUT_DIR: scratch },
});

if (transformed.status !== 0) {
    rmSync(scratch, { force: true, recursive: true });
    fail(
        `php artisan typescript:transform failed:\n${transformed.stderr || transformed.stdout}`,
    );
}

const producedPath = join(scratch, FILENAME);

// The transformer writes nothing when no class carries #[TypeScript] — true until the
// first Data class lands. That is a valid state, not a failure, but it has to agree
// with the committed tree: a leftover generated.d.ts with no Data classes behind it is
// exactly the staleness this gate exists to catch.
if (!existsSync(producedPath)) {
    rmSync(scratch, { force: true, recursive: true });

    if (existsSync(COMMITTED)) {
        fail(
            `${COMMITTED} exists but app/Data produces nothing — delete it, or restore the Data classes it came from.`,
        );
    }

    console.log(
        '✓ generated types: no #[TypeScript] classes yet, and no generated.d.ts. Consistent.',
    );
    process.exit(0);
}

const fresh = readFileSync(producedPath, 'utf8');
rmSync(scratch, { force: true, recursive: true });

if (!existsSync(COMMITTED)) {
    fail(`${COMMITTED} is missing — run \`bun run types:generate\`.`);
}

if (readFileSync(COMMITTED, 'utf8') !== fresh) {
    fail(
        `${COMMITTED} does not match app/Data.\n` +
            '  Fix: rm resources/js/types/typescript-transformer-manifest.json && bun run types:generate\n' +
            '  The manifest is not optional in that command. The transformer keeps its state there\n' +
            '  and skips writing when it believes nothing changed — so `types:generate` alone is a\n' +
            '  no-op against a file that was edited by hand or truncated, and leaves this gate failing\n' +
            '  with no visible reason. Verified: appending one line to generated.d.ts survives a plain\n' +
            '  regeneration and disappears once the manifest is removed.\n' +
            '  (If you edited it by hand: that file is generated, so the change belongs in the Data class.)',
    );
}

console.log('✓ generated types: generated.d.ts matches app/Data.');
