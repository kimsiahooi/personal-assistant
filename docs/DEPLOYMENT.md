# Deployment

One app, one VPS, one script. `bun run deploy` is the whole release process; everything
below is either the one-time setup it assumes, or an explanation of why a step is there.

The box is CloudPanel-managed, so nginx, php-fpm and MySQL are the panel's business. This
covers what the panel does not: the PHP extension this app needs, the Node runtime that
serves SSR, the process manager, and the one number that has to be different because this
is the *second* app on the box.

**The site is `ps.kimsiah.site`, a subdomain of a box that already runs the multi-tenant
ERP at `kimsiah.site`.** Almost everything here is unremarkable; the parts that exist
purely because of that neighbour are marked **[shared box]** and are the ones worth
reading twice.

---

## The shape of it

| | |
|---|---|
| Web | nginx + php-fpm (CloudPanel), docroot `public/` |
| PHP | 8.3+, **`bcmath` required** |
| Database | MySQL 8 — one database, no extra privileges |
| Node | serves `bootstrap/ssr/app.js` on **`127.0.0.1:13715`** **[shared box]** |
| Bun | installs and builds on the box |
| pm2 | supervises exactly one process: the SSR server, named `pa-ssr` |
| Uploads | **none** — no media library, no public disk, no image processing |
| Queue worker | **none** — see *Deferred* |
| Cron | **none** — see *Deferred* |

Sessions, cache and queues are all MySQL. There is no Redis.

---

## The SSR port — read this first **[shared box]**

Inertia's default SSR port is **13714**, and the ERP already holds it. This app is pinned
to **13715**, in two files that must agree:

| Where | What it does |
|---|---|
| `vite.config.ts` — `inertia({ ssr: { host: '127.0.0.1', port: 13715 } })` | what the built bundle **binds**, baked in at build time |
| `config/inertia.php` — `env('INERTIA_SSR_URL', 'http://127.0.0.1:13715')` | where Laravel **posts** a page to be rendered |

Both are already set in this repository, and `.env.production.example` carries the
matching `INERTIA_SSR_URL`. The reason to know about it anyway is that **every way this
can go wrong is silent.**

Two SSR processes cannot share a port. The second to start dies with `EADDRINUSE` and pm2
restart-loops it, while its Laravel keeps posting to that port and reaches **the other
app's** render server. Both apps are the same Laravel starter kit, so `dashboard`,
`auth/login` and `settings/profile` exist in both bundles and can genuinely resolve there.
Whichever process starts first wins, which means **a reboot decides which of the two apps
loses server rendering.** Nothing is written to `laravel.log` either way; the site returns
200 and quietly client-renders.

`host: '127.0.0.1'` is the other half. The plugin's default is `0.0.0.0`, which would put
an unauthenticated render endpoint on a public interface. Laravel only ever posts to it
over loopback.

`bun run deploy` polls `/health` on that port as its last step rather than trusting any of
this, and fails the release if SSR is not answering.

---

## One-time server setup

Most of this is already true — the ERP needed it. The two that are genuinely new are the
per-site pm2 registration and the database.

### 1. PHP

8.3 or newer, with:

```
bcmath  pdo_mysql  mbstring  openssl  tokenizer  xml  ctype  curl  fileinfo  dom  zip  pcntl
```

**`bcmath` is not optional.** `App\Support\Money` does every piece of arithmetic in this
app with `bcadd`, `bcsub` and `bccomp` — that is the whole reason money survives the trip
from a `decimal(15,2)` column to the screen without becoming a float. Without the
extension, every balance and every total is a fatal error rather than a wrong number. It
is already installed for the ERP, which needs it for the same reason.

`pcntl` is optional but wanted: `inertia:start-ssr` uses it to shut its node child down
cleanly, and without it a pm2 restart can leave an orphaned node process holding 13715 —
which is the one failure mode this app is least able to tolerate.

`ext-gd` and `ext-intl` are **not** needed. Nothing here processes an image, and all
number and date formatting is pinned by hand (`resources/js/lib/format.ts`,
`resources/js/lib/money.ts`) precisely so that ICU differences between the SSR runtime and
the browser cannot produce a hydration mismatch.

No PHP upload limits to raise: nothing in this app accepts a file.

### 2. MySQL

Create the database and its user in CloudPanel, and use them. That is all.

This is worth stating only because the ERP on this box needed a hand-written `GRANT` — it
provisions a database per workspace, which CloudPanel's per-site user cannot do. **This
app never creates a database.** One schema, one user, no privileges beyond the ones the
panel already grants.

### 3. Node, Bun and pm2 — **as the new site user** **[shared box]**

Node and Bun are already on the box. pm2 is not, *for this user*.

CloudPanel gives every site its own system user, and pm2 keeps a separate process list per
user. That is what makes it safe — this app's `pm2 restart` cannot touch the ERP's process
— but it also means the setup does not carry over. As **the `ps.kimsiah.site` site user,
not root and not the other site's user**:

```bash
pm2 startup            # prints a command to run once as root
pm2 save
```

Skip this and SSR does not come back after a reboot. The site still serves; every page
silently drops to client rendering. `bun run deploy` runs `pm2 save` for you, but only
`pm2 startup` makes the saved list survive a boot.

### 4. HTTPS

Not optional. Passkeys refuse to register on an insecure origin, and `.env` sets
`SESSION_SECURE_COOKIE=true`, which means no session cookie is issued over plain HTTP at
all.

`APP_URL` must be exactly `https://ps.kimsiah.site` — no trailing slash, no `www`.
`config/fortify.php` derives the passkey relying-party id from it with
`parse_url(config('app.url'), PHP_URL_HOST)`, so a mismatch is a passkey that registers
against the wrong origin, or does not register at all.

The upside of the subdomain: passkeys are scoped to `ps.kimsiah.site` and cannot collide
with any registered against `kimsiah.site`. That is correct by construction, provided
`APP_URL` is right.

### 5. Cookies **[shared box]**

`SESSION_DOMAIN=null` on **both** apps is what actually keeps their sessions apart — a
host-only cookie set on `kimsiah.site` is not sent to `ps.kimsiah.site`. Setting
`.kimsiah.site` on either app starts handing that app's session cookie to the other.
Neither app does; leave it that way.

`SESSION_COOKIE=pa_session` is pinned rather than derived. `config/session.php` falls back
to a slug of `APP_NAME`, so without the explicit value, renaming the app silently
invalidates every live session. That has already happened once, in development.

The `timezone` cookie the browser writes before first paint (`resources/views/app.blade.php`)
carries no `domain` attribute, so it is host-only too.

### 6. Permissions

Docroot points at `public/`. `storage/` and `bootstrap/cache/` must be writable by the
php-fpm user. Nothing else is written to at runtime.

---

## First deploy

```bash
# as the site user, in the site directory
git clone https://github.com/kimsiahooi/personal-assistant.git .
cp .env.production.example .env
# fill in every CHANGEME — including SEED_USER_NAME / SEED_USER_EMAIL, and
# SEED_USER_PASSWORD, which is temporary (see below)

composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev
php artisan key:generate
bun run deploy
```

**The `composer install` is not redundant**, even though `bun run deploy` runs one itself.
`php artisan key:generate` needs `vendor/` to exist, and a fresh clone has none — and
without `APP_KEY` set, the deploy's own first artisan command aborts with
`MissingAppKeyException`. The second install is a no-op that takes a second.

**Never re-run `php artisan key:generate` on a live box.**
`PASSKEYS_USER_HANDLE_SECRET` falls back to `APP_KEY` (`config/fortify.php`), so rotating
it invalidates every passkey you have registered, and every encrypted cookie already in
your browser.

### The owner account

There is no registration — it is disabled — and no public sign-up. `php artisan db:seed`
is the only way an account comes into existence. Because `SEED_USER_*` were in `.env`
before the deploy ran, the `php artisan optimize` at the end of it has already cached them:

```bash
php artisan db:seed --force
```

Then **blank `SEED_USER_PASSWORD` in `.env`** and re-cache, because it is plaintext on
disk and, once the account exists, it is never read again:

```bash
php artisan config:cache
```

The seeder is safe to re-run: it leaves an existing account untouched and only tops up the
starter accounts and categories.

**In production it refuses a blank or weak password rather than falling back.** In
development an unset `SEED_USER_PASSWORD` becomes `password`, which is what makes a fresh
clone usable in one command; on a public URL, with registration disabled so nobody would
think to look, that same fallback would be a publicly-known password behind a "Created the
owner account" success message. So the production path validates against
`Password::defaults()` — the same rule every password the app accepts through a form is
held to (12 characters, mixed case, a number, a symbol, and not found in a known breach) —
and throws without creating anything if it fails.

If it reports the password is missing when you know you set it, the config cache is stale:
`php artisan config:cache` and try again. `config/owner.php` reads `env()`, and a cached
config makes `env()` return null.

Sign in at `https://ps.kimsiah.site/login`.

### Then check you did not break the neighbour **[shared box]**

```bash
ss -ltnp | grep 1371        # expect 13714 → the ERP's node, 13715 → this app's
pm2 list                    # as each site user; both processes "online", not restarting
curl -s https://kimsiah.site | grep -c 'data-server-rendered'
```

The last one is the real test: the ERP should still be server-rendering. If it is not, the
two apps are fighting over a port — see *The SSR port* above.

---

## Routine deploy

```bash
bun run deploy
```

Run it as the site user from the project root. **The site stays up throughout.** The steps
and why each is there are commented in `scripts/deploy.sh`; the four worth knowing:

- **`bun run build:ssr`, never a bare `bun run build`.** `build` produces no SSR bundle,
  and the result is not an error — it is a site that quietly stops server-rendering.
- **The checks run after the build, before the pm2 restart.** They have to come after
  because `resources/js/{routes,actions,wayfinder}` are generated *during* `vite build`;
  they come before the restart so a failure leaves the old SSR process serving.
- **Only Biome and `tsc` run there.** They are the only gates that survive `--no-dev`:
  Pint and PHPStan are require-dev, and `check:generated-types` re-runs the spatie
  transformer, which is too. Those run on push via lefthook and in CI, on a machine that
  has them. There is no test suite by design — see `CLAUDE.md`.
- **The last step polls the SSR server's `/health`** and fails the deploy if it does not
  answer within ten seconds. Without it, a release that silently turned server rendering
  off would end in a green tick.

### `bun run deploy:fresh`

Same thing, but it also deletes `vendor/` — behind `php artisan down`, because php-fpm
reads `vendor/` on every request and removing it under a live site is a 500 for as long as
the install takes.

You should not normally need it. `composer install` already uninstalls anything dropped
from the lockfile, printing `Removing x/y` as it goes. `deploy:fresh` exists for the day
you would rather see that with your own eyes than take composer's word for it.

`node_modules` is deleted on *every* deploy and costs nothing, because it is only read at
build time — the SSR bundle is self-contained.

---

## After a schema change

`bun run deploy` runs `php artisan migrate --force`. Nothing extra to do — there is one
database.

---

## Troubleshooting

**The deploy failed at step 12 with "SSR is not answering".**
The one failure this app is most exposed to. In order:

```bash
pm2 logs pa-ssr --lines 50   # EADDRINUSE means something already holds the port
ss -ltnp | grep 1371         # who holds 13714 / 13715
grep INERTIA_SSR_URL .env    # must match vite.config.ts, which needs a rebuild to change
```

If `vite.config.ts` and `.env` disagree, changing `.env` alone is not enough: the port the
bundle binds is compiled in, so the fix is an edit plus `bun run deploy`.

**The site works but is not server-rendered.**
Look for `data-server-rendered="true"` in view-source. If it is missing: `pm2 list` (is
the process up, or restart-looping?), `ss -ltnp | grep 13715` (is anything listening?),
and check `public/hot` does not exist — its presence makes Laravel post SSR to a dead Vite
address and fall back to client rendering **with nothing written to `laravel.log`**. The
deploy removes it, but it is the first thing to check.

**The *other* app stopped server-rendering after deploying this one.** **[shared box]**
Port collision, and this app won the race. See *The SSR port*.

**`Failed to parse dotenv file. Encountered unexpected whitespace at [...]`, during
`composer install`.** Not a composer problem. A value in `.env` contains a space and is
not quoted, which makes the entire file unparseable; you see it here because composer's
`post-autoload-dump` hook runs `artisan package:discover`, and that is the first thing to
boot Laravel. Quote the value — `KEY="two words"` — or remove the spaces. `deploy` checks
for this before it installs anything, so it should not reach composer again.

**`db:seed` says SEED_USER_PASSWORD is not usable in production.** Working as intended —
it is blank, or does not meet `Password::defaults()`. Nothing was created. Set it, run
`php artisan config:cache`, seed again.

**`db:seed` warns that SEED_USER_EMAIL is not set, and creates nothing.** Either it really
is unset, or the config cache predates you setting it. `php artisan config:cache`.

**A passkey will not register.** `APP_URL` does not exactly match the address in the
browser's bar, or the connection is not HTTPS. Both are hard requirements, not warnings.

**Password reset emails never arrive.** `MAIL_MAILER` is still `log`. With registration
disabled and one account, the only other way back in is `php artisan tinker` on the
server.

**Everything works but dates are one day out.** The `timezone` cookie is not reaching the
server, so it is falling back to UTC — which in Kuala Lumpur means anything recorded before
08:00 shows as the previous day. Check the cookie exists in devtools; see
`app/Support/TimeZones.php`.

---

## Deferred, deliberately

**No queue worker.** Nothing implements `ShouldQueue` and nothing calls `dispatch()`.
Adding one means running `php artisan queue:work` under pm2 alongside the SSR process.

**No cron.** There are no scheduled tasks. Adding `* * * * * php artisan schedule:run`
costs nothing if you want it ready.

**No backups — and this is the gap that matters most here.** The ERP could defer this;
this app is a ledger of your own money, in a single MySQL database, with no uploads and no
second copy anywhere. Everything that matters is one `mysqldump` away from being safe, and
one `DROP` away from being gone. A nightly dump to somewhere off this box is a single cron
line and should probably not wait.

**No rollback.** The deploy is in-place, so recovering from a bad release means fixing
forward or `git reset --hard` to the previous commit and deploying again. Atomic releases
with a symlink swap would fix this properly and would also make `deploy:fresh`
unnecessary.

**No CI deploy.** `.github/workflows/ci.yml` runs the static checks on push; it does not
deploy. Releases are hand-run.
