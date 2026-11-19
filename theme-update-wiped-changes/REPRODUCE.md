# Reproduce the update and repair

I kept the original edits in the source and captured the edited parent before replacing it. I restored only the custom CSS and notice into the child. Copying the entire old parent into a child would also freeze old parent code.

Run from this directory on Linux or WSL with Docker Engine and Compose v2, Bash and standard Unix utilities. PHP, WP-CLI, Chromium and ImageMagick run in containers. The first run downloads container images; the exact theme releases are downloaded and checked against `vendor/SHA256SUMS`. Allow roughly two minutes with cached images; the measured full duration is in [timing.json](proof/timing.json). A first run also downloads the containers. No WordPress login or external account is required. Passwords are generated at runtime in the ignored `.env` and removed at cleanup.

```bash
./run.sh
```

The run creates the original customized parent, replaces it with the next version, records the expected failing browser checks, activates the child and replaces the parent once more. It saves screenshots and JSON reports to `proof/`, builds the post-update image and before/after comparison, then deletes the stack and its database. Failure propagates as a nonzero exit; a crash or timeout is not accepted as the expected broken state.

`HTTP_PORT=8081 ./run.sh` changes the published port. `HTTP_PORT=127.0.0.1:8080 ./run.sh` limits access to localhost. The default mapping is `8080:80`. Keep only one copy of this stack running; its Compose project name is fixed. Do not expose this reproduction as a public production site.

To leave the repaired page open at <http://localhost:8080>:

```bash
KEEP_STACK=1 ./run.sh
```

To inspect each stage separately, start from an empty database and execute these in order:

```bash
./scripts/start.sh
docker compose build browser
docker compose run --rm -T browser node scripts/fetch-themes.cjs
./scripts/stage.sh original
docker compose run --rm -T browser node tests/browser.cjs original
./scripts/stage.sh broken
docker compose run --rm -T browser node tests/browser.cjs broken
# The preceding command deliberately exits 1: missing styling and notice.
./scripts/stage.sh fixed
docker compose run --rm -T browser node tests/browser.cjs fixed
./scripts/stage.sh updated
docker compose run --rm -T browser node tests/browser.cjs updated
```

Reset after inspection (this deletes this case's local database):

```bash
docker compose down -v --remove-orphans
rm -f .env
```

The parent packages are Twenty Twenty-One `2.3 → 2.4 → 2.5`. The first version has direct edits appended to `style.css` and `functions.php`; `wp theme install --force` performs an actual package replacement for each update. The final parent is unmodified. This tests the same file-replacement risk as an update through the dashboard, using archived releases to keep the sequence reproducible.

The child supplies `style.css`, `functions.php` and `notice.php`. WordPress keeps using the parent's templates, stylesheet, navigation markup and menu JavaScript. I test the inherited navigation on both widths and open the parent's mobile menu before following its link. I compare the parent PHP/CSS hashes against each upstream archive after repair and the subsequent update. These checks prove this sequence; later releases may still introduce compatibility changes requiring review.

Pinned runtime: WordPress `6.8.3` with PHP `8.3`, MariaDB `11.4.5`, WP-CLI `2.12.0`, Playwright `1.56.1`. Image tags are pinned to release versions; distribution security packages inside them can change. `proof/run.json` records the PHP and Chromium versions actually used. Phone screenshots use a device scale of 2 for readable crops while retaining a 390 CSS-pixel viewport. ImageMagick 6 strips PNG metadata and renders the proof images with bundled OFL fonts. Exact parent bytes are pinned by SHA-256.

The separate `tests/playground.cjs` checks the hosted Playground candidate in `blueprint.json`. Its observed result is in `proof/demo.json`; it is not part of the deterministic Docker regression test.

The automated workflow is [`.github/workflows/theme-update-wiped-changes.yml`](https://github.com/Ardholt/wordpress-fixes/blob/main/.github/workflows/theme-update-wiped-changes.yml). [View workflow runs](https://github.com/Ardholt/wordpress-fixes/actions/workflows/theme-update-wiped-changes.yml).

The edited-parent download contains only the changed `functions.php`, `style.css` and upstream copyright notice, not an installable parent theme. Full unmodified packages are downloaded at runtime and ignored by Git. Their unused block patterns are not redistributed here.
