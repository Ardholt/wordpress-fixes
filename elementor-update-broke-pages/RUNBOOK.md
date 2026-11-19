# Reproduce the update and repair

I use archived packages to reproduce a specific compatibility failure. This is a local historical version test, not a recommendation to deploy these versions publicly.

You need Docker with Compose v2, a POSIX machine with Bash, and internet access for public image/package downloads. PHP, the database, WP-CLI, Chromium, the checks and image processing all run in containers. The Linux browser container uses host networking; the CI job runs on Ubuntu. Docker Desktop users need host networking enabled for the browser checks.

## Complete run

```bash
./run.sh
```

The command starts one WordPress stack, captures the original site, updates only Elementor, requires the healthy-page contract to fail, updates the incompatible add-on, and repeats the same browser contract. It writes `proof/` and `media/hero.png`. The original capture is made before any update in that run. An exit trap removes the stack and its database/site volumes on success or failure. Downloads and generated proof remain.

The recorded duration is `durationSeconds` in [proof/run.json](proof/run.json). First use also downloads container images and builds the browser image; that depends on the connection and Docker cache. Commands are bounded by the CI job’s timeout. Published traffic binds only to `127.0.0.1`, on port 8080 by default. To choose another local port, set `PORT` for every command in a session.

The script generates private, random local credentials in `.runtime.env` (ignored by git). No credentials are needed from you. Never publish that file. The local installer generates a unique address under the reserved `example.invalid` domain solely to satisfy WordPress’s required installation field. It is not a contact address, is not published in the proof, and receives no mail.

## See each state independently

From a clean case directory:

```bash
./scripts/stage.sh init
# Original Elementor 3.25.11 + Phlox Core Elements 2.16.4
# Open http://localhost:8080/?pagename=workshops

docker compose --env-file .runtime.env run --rm browser tests/page.cjs baseline
./scripts/stage.sh break
# Elementor 3.26.0 + Phlox Core Elements 2.16.4
# Refresh the workshop page: it must be blank.
docker compose --env-file .runtime.env run --rm browser tests/page.cjs broken
# The preceding check MUST exit 1. Exit 2 means a harness/runtime failure.

./fix/apply.sh
# Elementor 3.26.0 + Phlox Core Elements 2.17.0
# Refresh: the workshop content and Phlox button return.
docker compose --env-file .runtime.env run --rm browser tests/page.cjs fixed
./scripts/stage.sh down
```

`./scripts/stage.sh baseline` returns an existing stack to both original plugin versions. `./scripts/stage.sh break` then reproduces the update failure again. Each transition regenerates Elementor CSS and clears the object cache, so previously generated styles cannot conceal the broken control registration. Debug logs are cleared only at stage boundaries, before browser requests; `run.sh` saves the actual log after all requests for each state. Empty logs are retained as empty files.

To keep the final repaired site available, run `KEEP_UP=1 ./run.sh`; remove it afterward with `./scripts/stage.sh down`. To reset without the private environment file, `docker compose` requires throwaway values for interpolation:

```bash
DB_PASSWORD=unused ROOT_PASSWORD=unused ADMIN_PASSWORD=unused docker compose down -v
```

## Dependencies and repair

| Component | Original | Breaking update | Repaired |
|---|---|---|---|
| WordPress | 6.7.1 | 6.7.1 | 6.7.1 |
| Elementor | 3.25.11 | 3.26.0 | 3.26.0 |
| Phlox Core Elements | 2.16.4 | 2.16.4 | 2.17.0 |
| Phlox theme | 2.16.7 | 2.16.7 | 2.16.7 |

The official WordPress plugin/theme ZIP URLs and SHA-256 values are in [packages.lock](packages.lock). A changed archive fails verification. Container tags are fixed in [compose.yaml](compose.yaml) and [tests/Dockerfile](tests/Dockerfile): PHP 8.2, MariaDB 11.4.5, WP-CLI 2.12.0 and Playwright 1.51.1. Exact browser version is recorded by each browser run. Image tags and OS package repositories can receive upstream rebuilds; this is not a fully offline, bit-for-bit toolchain snapshot.

I use the vendor’s full compatible package, rather than patching installed vendor files. The [generated diff](proof/vendor-change.diff) shows the affected widget’s old and new code. [fix/apply.sh](fix/apply.sh) applies that package update and regenerates CSS through [scripts/stage.sh](scripts/stage.sh). Both pages remain Elementor documents, and the repaired workshop button remains a Phlox widget.

## What the checks prove

[tests/page.cjs](tests/page.cjs) visits both actual pages at 1280 × 800 and 390 × 800. It asserts HTTP 200, the expected heading, an Elementor document wrapper, no critical-error message, no horizontal overflow, no browser exceptions, the workshop copy, the responsive column layout and a real click through the Phlox button to the details page. The identical healthy contract must exit 1 on the broken version pair and 0 on both working pairs.

[tests/compare.cjs](tests/compare.cjs) separately requires a blank workshop page despite its HTTP 200 response, a healthy details control page, the exact missing-class error in the broken PHP log, and its absence in the original/fixed logs. It checks both plugins are active, compares SHA-256 hashes of both saved `_elementor_data` documents, and compares all RGBA channels of every original/fixed screenshot pixel. More than 1% changed pixels fails the test; the measured values remain visible in the comparison file. These checks do not claim that every Elementor widget or every plugin combination was tested.

## Playground

[blueprint.json](blueprint.json) installs the repaired version pair and the same workshop pages. The hosted attempt is separate from the Docker test because hosted availability and download access can change. [proof/demo.json](proof/demo.json) records what actually loaded and any limitation. A blueprint alone is not a claim that Elementor works in Playground.
