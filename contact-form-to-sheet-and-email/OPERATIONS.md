# Reproduce the delivery repair

I run this case entirely in Docker. The form is a WordPress must-use plugin; it does not need a paid form builder. n8n receives the webhook and calls the sheet adapter to persist the row, then requests SMTP delivery. The adapter stores the row in SQLite and sends to Mailpit. No external account is needed.

## Run and inspect

```bash
./run.sh
# Or leave the repaired services open after the checks:
KEEP_RUNNING=1 ./run.sh
```

Each complete run removes the previous case volumes first. It creates local passwords and a webhook secret in `.env` on first use. That file is ignored by Git and must stay private. The runner needs Bash, standard Unix utilities, Docker and Compose; PHP, Python, Node, Chromium and ImageMagick run inside containers. The first run downloads images and builds the browser tools. Later runs reuse those images but always start with fresh application data. The observed duration is in `proof/run.json`.

Only loopback ports are published. The defaults are WordPress 8080, local sheet 8081, Mailpit 8025 and n8n 5678. Override `WP_PORT`, `SHEET_PORT`, `MAIL_PORT` and `N8N_PORT` before the first run, or edit their entries in the private `.env`. The run waits for n8n's database and webhook routing before the browser checks; a healthy process alone can still return an HTML startup response. The observed readiness responses are saved in `proof/n8n-readiness.json`. n8n's editor is optional: the command imports and activates the workflow without an owner account or manual setup.

The receipt page at `/receipt/ENQ-7A31` on the sheet port displays the received message from the Mailpit API. Mailpit's own interface is also available on its port. The sheet is a read-only HTML view of `enquiries.sqlite`; `/export.csv` produces a CSV download. It is not a hosted spreadsheet account.

## Reproduce each stage

First use `KEEP_RUNNING=1 ./run.sh` to provision the services. These commands replace this case's delivery handler, restart WordPress to discard cached PHP bytecode, and wait for the form to respond:

```bash
./scripts/stage.sh broken
# Submit a new reference: the form reports success, but no row or mail arrives.
./scripts/stage.sh fixed
# Submit another enquiry: the form confirms only after the row and mail succeed.
./scripts/stage.sh outbox
./scripts/stage.sh retry
```

The complete run's before-state check uses empty databases and the same `fixtures/enquiry.json` as the repaired browser check. Both states run the same correlation assertion in `tests/flow.cjs`; the before-state assertion must fail. An unexpectedly successful broken flow fails the overall run too.

The fixture stores a name and enquiry, with no visitor contact address. SMTP routing uses local-only mailbox identifiers. The evidence records the recipient role after the test verifies that routing.

## Outages and replay

I persist the original payload in a WordPress option before sending it. A pending response uses HTTP 202 and explicitly says delivery is pending. Only a matching `delivered` acknowledgement from n8n permits success. Entries remain available after a WordPress restart, and `stage.sh retry` replays their original references.

A kept-open run starts a timer inside the WordPress container that invokes WordPress cron every minute. It does not depend on site traffic. After manually replacing/restarting that container, restart the timer with:

```bash
docker compose exec -d wordpress sh -c 'while sleep 60; do php /var/www/html/wp-cron.php; done'
```

The sheet's unique reference and WordPress reference lock suppress duplicate rows and concurrent replays. Reusing a reference with changed fields is rejected. Mail status is stored separately so a mail retry does not reinsert a row. CSV export prefixes formula-like values with an apostrophe, while preserving the original text in SQLite.

The integration tests turn off row writes and SMTP delivery through a secret-protected adapter control route. They verify pending responses, retain both entries, restart WordPress and replay them. The run saves the pending and recovered outboxes under `proof/`.

SMTP cannot guarantee universal exactly-once delivery after an ambiguous timeout. This adapter records an uncertain attempt and consults Mailpit before sending again. If receipt cannot be established, the entry stays pending for review instead of blindly resending. That reconciliation is specific to this local catcher; it is not a claim about a production mail provider.

The local sheet and mailbox viewers have no account gate and are intended for loopback use. This is a runnable repair case, not a public hosting configuration. n8n does not retain successful or failed execution payloads. WordPress and SQLite keep delivered references to recognise retries; there is no automatic retention purge. Remove the volumes to delete this run's records.

## Reset and cleanup

```bash
docker compose down -v --remove-orphans
# Optional: rotate the generated local credentials before another fresh run.
rm -f .env
```

`run.sh` also cleans up on failure and preserves a nonzero test exit status. Every stage prints its name, time limit and outcome to the terminal and `proof/run-output.txt`; `proof/stages.tsv` records timings and exit codes. Build and package download output is streamed into the log. Additional diagnostics remain under `.runtime/`. A stage timeout names the operation that stalled. The whole run has a 50-minute limit, followed by cleanup; the CI job allows 60 minutes for checkout, the run and artifact upload. This folder's Compose project name scopes cleanup to this case.

## Dependencies

`compose.yaml` pins WordPress/PHP, MariaDB, n8n, Mailpit and Python images by digest. The actual WordPress, PHP, n8n and browser versions are recorded in `proof/run.json`. Browser tools use Playwright 1.56.1 with its matching browser image; the tool image installs LibreOffice, the display tools and ImageMagick from Ubuntu's signed package repositories over HTTPS. Package fetches have 20-second inactivity limits and two retries; each complete mirror attempt is capped at six minutes. On amd64, a failed attempt switches from the Ubuntu archive to the kernel.org mirror. Other architectures retry Ubuntu's ports archive. npm fetches are also bounded and retried. The full tool-image build allows 25 minutes, including the cold browser-image download. No performance comparison depends on its package version.

The spreadsheet check reads the exported CSV, saves its values as an OpenDocument spreadsheet, opens that file in LibreOffice Calc and compares its stored cells with the submission. The application capture is in `proof/06-spreadsheet.png`; `proof/spreadsheet.json` records the observed version and matching values. This is an exported file, not a live connection to a hosted spreadsheet account.

Font notices are included in `tools/hero/fonts/`. The compact hero prints values from the verified delivery records; the separate before/after image and GIF use browser and application captures.
