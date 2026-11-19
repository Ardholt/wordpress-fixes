# Reproducing the booking repair

I run everything inside containers. The host needs Bash, git, Docker and Docker Compose v2; no host PHP, Node or database is used. The first run downloads the pinned images and browser dependencies. Subsequent runs reuse those downloads. The measured duration is in [proof/run.json](proof/run.json), and the final elapsed time is printed in [proof/run-output.txt](proof/run-output.txt).

## Complete proof

```bash
cd booking-system-setup
./run.sh
```

The command creates temporary access settings in a permission-restricted, ignored `.env`, provisions WordPress, captures the broken page and an unprotected race, applies the fix and tests the repaired flow. It deletes those settings, volumes and containers on exit, including a failed run. Confirmation messages travel over SMTP to the local Mailpit inbox. External inbox delivery is not measured.

The test clock is 22 March 2027 at 22:00 UTC. Tests around the March and October clock changes use that clock and the next 365 days of availability. The broken state holds its unprotected check/write gap open for 500 ms to make concurrent failure repeatable. This is a controlled reproduction of that defect, not a claim about a particular third-party plugin version.

I use a database lock around the availability check and booking write. If that lock is unavailable, the request fails without reserving an appointment.

## Open the working booking page and inbox

```bash
./try.sh
```

This uses the current date and leaves WordPress and the local inbox running. Open the two addresses printed by the command. `WEB_PORT` and `MAIL_PORT` override the default ports; `PUBLIC_URL` can override the page address when accessing it through a different hostname. All messages are captured locally, regardless of the confirmation address entered. Stop the session with `./scripts/stage.sh down`.

## Open the broken or repaired state

```bash
./scripts/stage.sh up
# Broken state is now installed.
./scripts/stage.sh fixed
# Return to the broken page and behavior:
./scripts/stage.sh broken
# Restore the repair:
./scripts/stage.sh fixed
```

For an interactive local session, set WordPress's public address to match your chosen port after startup:

```bash
docker compose exec wordpress wp --allow-root option update home http://localhost:8080
docker compose exec wordpress wp --allow-root option update siteurl http://localhost:8080
```

Open `http://localhost:8080` for the appointment page and `http://localhost:8025` for the local mail catcher. WordPress administration is at `/wp-admin/`; the local username is `studio-owner`. Read `ADMIN_PASSWORD` from your local `.env` only when signing in. Do not publish that file. The automated tests use the container service address so they can run without browser access to the host.

To run individual browser stages against the untouched service address:

```bash
docker compose build tests
docker compose run --rm -T tests node tests/flow.cjs broken
./scripts/stage.sh inspect > proof/before-database.json
./scripts/stage.sh reset-data
./scripts/stage.sh fixed
docker compose run --rm -T tests node tests/flow.cjs fixed
./scripts/stage.sh inspect > proof/after-database.json
docker compose run --rm -T tests node tests/verify.cjs
```

Use `./run.sh` to regenerate the full set, including the red/green acceptance checks, media, environment report and Playground probe. The [GitHub Actions workflow](https://github.com/Ardholt/wordpress-fixes/blob/main/.github/workflows/booking-system-setup.yml) runs the same command.

## Ports and cleanup

Compose defaults to ports 8080 and 8025. Set `WEB_PORT` and `MAIL_PORT` to override them:

```bash
WEB_PORT=8080 MAIL_PORT=8025 ./run.sh
```

Only one WordPress stack is needed. Stop it and discard all local appointments with:

```bash
./scripts/stage.sh down
```

## Pinned components and limits

| Component | Pin |
|---|---|
| WordPress / PHP image | `wordpress:6.8.3-php8.3-apache` |
| WP-CLI | `wordpress:cli-2.12.0-php8.3` |
| MariaDB | `mariadb:11.4.5` |
| Mailpit | `axllent/mailpit:v1.27.8` |
| Browser image / Playwright package | `mcr.microsoft.com/playwright:v1.56.1-noble` / `1.56.1` |

Exact observed PHP, database and browser versions are recorded in `proof/run.json`. Image tags pin releases; image digests appear in the build log. ImageMagick comes from the browser image's Ubuntu repository and is used only to assemble screenshots into the shared hero and GIF. All page and mail captures are created during the run.

The Playground browser check loads the form and lists available times, then receives HTTP 503 on confirmation because the database lock is unavailable. Its full flow is not certified. The MariaDB lock and a separate SMTP catcher are requirements of the verified Docker path. See `proof/demo.json` for the actual browser attempt. No production inbox delivery, reminder scheduling, payment or multi-staff capability is claimed.
