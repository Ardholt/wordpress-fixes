# Reproduce the mobile speed measurements

I built this WordPress page to reproduce oversized image uploads and globally loaded theme assets. The artwork, copy and theme are original. The title refers to the measured local Lighthouse performance score; it is not a PageSpeed Insights or real-user measurement.

## Run and reset

From a checkout with Docker Engine and Docker Compose v2:

```sh
cd speed-mobile-score
./run.sh
```

Allow about **seven minutes**, plus initial image pulls. A complete verification took **398 seconds** before cleanup ([archived log](proof/verification/first-clean/run-output.txt)); the latest duration is in the [current log](proof/run-output.txt). Host load changes the elapsed time.

The script builds its separate browser container, creates local database credentials, starts WordPress, checks and measures the broken state, applies the fix, repeats the same checks and measurements, and removes the stack and database volumes on exit. It exits nonzero on a failed check. Reports overwrite `proof/`; retain a copy first if you want to compare separate executions. Generated credentials stay in the ignored `.env` file. Initial image pulls require internet; the page and measurements use no external network resources.

To inspect each state independently:

```sh
./run.sh setup
./run.sh check before
./run.sh measure before
# Open http://localhost:8080
./run.sh after
./run.sh check after
./run.sh measure after
./run.sh before  # Reversible return to the broken settings
./run.sh down    # Remove containers and database volumes
```

Set `PORT` to change the host port. Set `BIND_ADDRESS=127.0.0.1` to bind only to loopback. The browser container always visits `http://speed.test/` through the private Docker network. This reserved test name is a network alias, not a public website. Do not run two copies of this case simultaneously: the harness has a fixed Compose project name.

## What changes

The broken theme sends full-resolution JPEG garden artwork to every screen, eagerly loads every image, reserves no image dimensions, hides the hero until the window load event, loads Bootstrap CSS and JavaScript globally, blocks on navigation JavaScript, and uses a blocking local TrueType font. Its static files use `Cache-Control: no-store`.

The fix selects responsive WebP versions of the same artwork, gives the hero high fetch priority, lazy-loads the lower images, and reserves their aspect ratios. The page's own stylesheet replaces the unused framework dependency; navigation is deferred and the local font uses `font-display: swap`. Versioned page assets receive a long-lived cache header. No copy, service, image subject, menu link or expandable answer is removed. In a deployed theme, changed assets must get new filenames or versioned URLs before using immutable caching.

The optimized stylesheet changes font display and removes the load-event reveal rule. `fix/apply.php` enables the optimized branch, and `scripts/state.php` changes the matching static cache headers. The source in `source/theme/index.php` makes both branches inspectable. The baseline contains no sleeps, busy loops, bandwidth caps or invented network failures.

## Measurement conditions

Every state gets three sequential Lighthouse CLI runs. Each starts a fresh Chromium process; Lighthouse's normal storage reset is enabled. Both states use the same default mobile profile and applied DevTools network/CPU throttling. A normal page visit warms the server before each series. There is no WordPress page cache. The fixed cache header benefits repeat visits, but the reported comparison uses cold browser caches and does not claim a warm-cache gain.

`proof/before/conditions.json` and `proof/after/conditions.json` record browser version, target, command and cache policy. Every raw report contains exact `configSettings`, `environment`, `lighthouseVersion` and `fetchTime` fields. `proof/summary.json` includes each run and its settings, then medians and min/max ranges. Score is the Lighthouse category score multiplied by 100. LCP and CLS come from `largest-contentful-paint.numericValue` and `cumulative-layout-shift.numericValue`; transfer size is `total-byte-weight.numericValue`, measured in bytes. Reports are never discarded to choose a better score.

The filmstrip uses the median-score run from each series (the first matching run if scores tie). Its labels are the screenshot audit's actual trace capture times. The final series applies throttling during the trace, so its frames show the measured loading sequence. The simulated-throttling series uses a different method and is indexed separately. The complete filmstrips remain in all six raw reports.

## Behavior and tolerances

The same resource contract is evaluated in both states. The independent `tests/budget.cjs` check must exit 1 before and 0 after; its structured outcomes and logs are saved in `proof/`. The baseline must fail it, and the fixed state must pass: responsive WebP, reserved image dimensions, lazy lower images and cacheable static files. A real Chromium visit opens the mobile menu, follows the service link, opens an answer and scrolls through all images. Fixed visible copy and image descriptions must equal the baseline exactly, with no JavaScript errors.

The measured baseline median must be 30–49. The fixed median must improve by at least 15 score points, reduce LCP by at least 35%, and reduce transferred bytes by at least 65%. Median CLS may increase by at most 0.001, to accommodate floating-point noise. The same performance budget (score at least 75, LCP at most 4,000 ms, CLS at most 0.1) must fail before and pass after. These are regression tolerances for this page, not promises about every host. A busy shared runner can fail the thresholds; retain that execution's reports and investigate rather than silently retrying until green.

## Dependencies and evidence

WordPress, MariaDB, the browser image and npm package versions are specified in `compose.yaml`, `source/Dockerfile` and `tests/Dockerfile`. Browser tools run separately from WordPress setup. This case serializes its own runs; unrelated activity on the shared measurement host is not controlled. `scripts/artwork.py` contains the original image recipe and emits full-size JPEG and responsive WebP versions; delete `fixtures/assets/` before setup to regenerate them. The committed files are the measured assets.

`proof/run.json` records public-safe execution details, `proof/claims.json` maps page claims to evidence, and `proof/run-output.txt` contains the final clean run. The automated workflow is [Mobile speed evidence](https://github.com/Ardholt/wordpress-fixes/actions/workflows/speed-mobile-score.yml); its source is [`.github/workflows/speed-mobile-score.yml`](https://github.com/Ardholt/wordpress-fixes/blob/main/.github/workflows/speed-mobile-score.yml).
