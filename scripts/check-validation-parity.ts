/**
 * Validation parity gate — the replacement for the deleted parity test.
 *
 * The zod schemas exist to refuse, in the browser, exactly what the server refuses.
 * That only holds while the two lists of fields agree, so this reads the real PHP
 * FormRequests and checks that every field the server validates is one the browser
 * knows about too.
 *
 * Deliberately field-level, not rule-level: pinning every rule string would break on
 * harmless rewording, while a *missing field* is the failure that actually matters —
 * it means a value reaches the server unchecked.
 *
 * Schemas are discovered by convention, so adding a resource needs no edit here:
 *
 *     app/Http/Requests/CategoryRequest.php
 *       → resources/js/lib/validation/schemas/category.ts   (export `categorySchema`)
 *
 * One thing to know before writing a FormRequest: `laravelFields` below finds the rule
 * keys by matching TWELVE SPACES of indentation. That is the natural depth of an inline
 * array literal returned from `rules()`, and nothing else. A `rules()` that spreads a
 * base array, or is formatted differently, yields ZERO fields — and this gate then
 * passes while checking nothing at all. Keep `rules()` an inline literal.
 *
 * A schema exported as a factory (it needs runtime options, e.g. the allowed
 * currencies) is listed in FACTORY_ARGS below with the arguments to build it with.
 *
 * Run: `bun run check:validation`
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every directory of FormRequests that must have browser-side counterparts. The read is
 * NOT recursive, which is what keeps `app/Http/Requests/Settings/` out: those are the
 * starter kit's own auth screens, which validate server-side only.
 */
const REQUEST_DIRS = [join(process.cwd(), 'app/Http/Requests')];
const SCHEMAS = join(process.cwd(), 'resources/js/lib/validation/schemas');

/** Requests with no hand-written schema, and why that is correct. */
const EXEMPT = new Set([
    // Declares no rules of its own — it is the shared base class.
    'AppFormRequest',
]);

/**
 * Schemas exported as factories, with the arguments to build one for inspection.
 * A schema needs one when it takes runtime options — the allowed account ids, say.
 * Empty until the first such schema exists; a stale entry here is inert (the map is
 * keyed by request class name) but misleading, so keep it to what the app has.
 */
const FACTORY_ARGS: Record<string, unknown[]> = {};

/** `StoreAccountRequest` → `store-account`. */
function schemaModule(request: string): string {
    return request
        .replace(/Request$/, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase();
}

/** The top-level field names a FormRequest's `rules()` returns. */
function laravelFields(path: string): string[] {
    const php = readFileSync(path, 'utf8');
    const body = php.slice(php.indexOf('public function rules'));
    const keys = [...body.matchAll(/^\s{12}'([^']+)'\s*=>/gm)].map((m) => m[1]);

    // `items.*.quantity` is part of `items`, which is already its own key.
    return [...new Set(keys.filter((key) => !key.includes('.')))];
}

/** The keys a zod object schema knows, unwrapping any effects wrapped around it. */
function zodFields(schema: any): string[] {
    let current = schema;

    // `.refine()` / `.superRefine()` wrap the object; the shape is underneath.
    while (current && !current.shape && 'def' in current) {
        const inner = current.def?.innerType;
        if (!inner) break;
        current = inner;
    }

    return current?.shape ? Object.keys(current.shape) : [];
}

const problems: string[] = [];

/** Every request to check, as `{ name, path }`, across all watched directories. */
const requests = REQUEST_DIRS.filter((dir) => existsSync(dir))
    .flatMap((dir) =>
        readdirSync(dir)
            .filter((file) => file.endsWith('Request.php'))
            .map((file) => ({
                name: file.replace('.php', ''),
                path: join(dir, file),
            })),
    )
    .filter(({ name }) => !EXEMPT.has(name))
    .sort((a, b) => a.name.localeCompare(b.name));

if (requests.length === 0) {
    console.log('✓ validation parity: no FormRequests yet — nothing to check.');
    process.exit(0);
}

let checked = 0;

for (const { name: request, path: source } of requests) {
    const module = schemaModule(request);
    const path = join(SCHEMAS, `${module}.ts`);

    if (!existsSync(path)) {
        problems.push(
            `${request}: no schema at resources/js/lib/validation/schemas/${module}.ts ` +
                `— every server-validated form needs a browser-side one (or an EXEMPT entry saying why not).`,
        );
        continue;
    }

    const exports = await import(path);
    const key = Object.keys(exports).find((name) => name.endsWith('Schema'));

    if (!key) {
        problems.push(
            `${request}: ${module}.ts exports nothing ending in "Schema".`,
        );
        continue;
    }

    let schema = exports[key];
    if (typeof schema === 'function') {
        schema = schema(...(FACTORY_ARGS[request] ?? []));
    }

    const declared = laravelFields(source);

    // A request that yields no fields is the gate's own failure mode, not a clean pass.
    // `laravelFields` matches twelve spaces of indentation; a `rules()` formatted any
    // other way returns nothing, and every check below then trivially succeeds. This was
    // reproduced deliberately — re-indenting one rules() made the gate report three
    // agreeing pairs while reading zero fields — so it fails loudly instead.
    if (declared.length === 0) {
        problems.push(
            `${request}: no rules were read from ${request}.php. \`rules()\` must return an ` +
                'inline array literal at twelve spaces of indentation — a spread or a different ' +
                'format parses as zero fields, and this gate would then pass while checking nothing.',
        );
        continue;
    }

    const known = zodFields(schema);
    const missing = declared.filter((f) => !known.includes(f));

    if (missing.length > 0) {
        problems.push(
            `${request}: validated by the server but unchecked in the browser — ${missing.join(', ')}`,
        );
    }

    checked += 1;
}

if (problems.length > 0) {
    console.error('✗ validation parity failed:\n');
    for (const problem of problems) console.error(`  • ${problem}`);
    console.error(
        `\n${problems.length} problem(s) across ${requests.length} request(s).`,
    );
    process.exit(1);
}

console.log(`✓ validation parity: ${checked} request/schema pair(s) agree.`);
