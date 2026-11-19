# Reproduce and recover

I kept the repair calculator available by replacing the incompatible code. PHP 8.2 cannot call `create_function()`; the replacement closure accepts the same quantity and calculates the same total. The broken call runs only when the estimate shortcode renders, so the separate About page remains available.

## Scope

I wrote the plugin versions in this repository to reproduce and repair a PHP compatibility failure in a repeatable WordPress installation. The page and plugin titles describe their functions; they do not identify a business or customer. This evidence covers the recorded failure and recovery, with no customer testimonial or commissioned-site claim.

WordPress requires an administrator email during installation. The reserved `.invalid` address in `run.sh` only initialises the local account; it cannot receive mail. Installation skips the notification email.

## Stages

Start from an empty stack. Each command stops on a failed check. Stage commands leave the stack available for inspection; the complete run cleans up automatically.

```bash
./run.sh clean
./run.sh setup
./run.sh broken
./run.sh rollback
./run.sh broken
./run.sh fixed
./run.sh clean
```

After setup, open http://localhost:8080/?items=3. After `broken`, it shows the critical error; after `rollback` or `fixed`, submit another quantity to calculate a new estimate. Set the same `PORT` environment variable for each command if changing the port.

## Backup and rollback

Setup creates these backups before applying the update. The database contains local credentials, so backups stay in the ignored `.private/` directory and are never published.

```bash
docker compose exec -T wordpress tar -czf /case/.private/repair-estimate-1.0.0.tar.gz -C /var/www/html/wp-content/plugins repair-estimate
docker compose exec -T -u www-data wordpress wp db export /tmp/pre-update.sql
docker compose exec -T wordpress cp /tmp/pre-update.sql /case/.private/pre-update.sql
```

The tested rollback restores the plugin's files from that archive:

```bash
docker compose exec -T wordpress tar -xzf /case/.private/repair-estimate-1.0.0.tar.gz -C /var/www/html/wp-content/plugins
```

`./run.sh rollback` executes that command, clears the old diagnostic log, runs the browser checks and verifies the new log is empty. See `proof/rollback.json` and `proof/run-output.txt`. This update makes no database changes, so database import is unnecessary and was not exercised. On a real site, retain a full files/database backup and check for schema migrations before choosing a file rollback; importing an old database would discard intervening writes.

## Permanent repair

`./run.sh fixed` installs `fix/estimate-1.1.1.php` over the active plugin file. The patch replaces the removed function call with a native closure. No PHP downgrade, disabled feature or log suppression is needed. The diagnostic configuration logs PHP errors but does not expose stack traces publicly, in both broken and repaired states.

## Dependencies and scope

The build selects WordPress 6.8.3 / PHP 8.2, MariaDB 11.4.5, WP-CLI 2.12.0 and Playwright 1.56.1 with its Chromium build. The Dockerfiles and Compose file record these version pins; image tags are not immutable digest pins. `proof/versions.txt` records the executed PHP/core/CLI versions; browser versions are in each state JSON. ImageMagick from the WordPress image's Debian packages renders the shared hero with bundled OFL fonts; `proof/renderer-version.txt` records the tested renderer version.

The local-only configuration derives the site URL from the request host so the browser container and the loopback URL can reach the same installation. It is a reproduction harness, not a production deployment configuration. Credentials are generated locally. No delivery of email or external service is part of this case.

The tests use a real WordPress shortcode and server-rendered form. The £35 unit rate is the calculator setting in the source code, not a business’s advertised price. No business brand is used. Full-page and mobile screenshots use matching viewport sizes recorded in the JSON results. The scripts strip metadata from the screenshots and comparison images.

## Cold builds and time limits

The browser image already contains Chromium and its system libraries; its build installs only the pinned Playwright JavaScript package. Image rendering runs in the WordPress container. Debian package downloads use HTTPS, bounded retries and request timeouts; incomplete package-index downloads fail the build. WP-CLI and npm downloads also have bounded retries.

`run.sh` prints each stage name, limit and elapsed time. Image builds, startup, browser checks and image rendering have separate deadlines. The complete run has a 30-minute limit, with a 40-minute workflow budget allowing runner setup, cleanup and artifact upload. On failure, the log names the failed or timed-out stage. Fresh downloads depend on network speed; the recorded run time is in `proof/run.json`.

The [cold-run record](proof/cold-run.json) links the empty-cache preflight, stage timings and full output. [Timeout checks](proof/timeout-checks.txt) show a named stalled stage returning exit 124 and an ordinary failure preserving exit 7.
