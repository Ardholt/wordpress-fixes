# Run and install

I use the WordPress HTTP API and a shortcode, so the visitor's browser never has to contact the rate service. The provider URL is fixed in source, with no public endpoint-setting form or API key.

## Reproduce the evidence

Requirements: Bash, Docker Engine and Docker Compose v2. All PHP, database, fixture and browser work runs inside containers. The test container disables PHP opcode caching so replacing the broken plugin takes effect immediately. Run `./run.sh` from this directory. The script resets this case's existing Docker volumes, generates database passwords, provisions the broken state, runs the acceptance check (expected exit 1), copies the repair, tests it and captures the real page. It preserves failures and removes its own containers and volumes on exit.

The default published address is `127.0.0.1:8080`. Override with `PORT=8081 ./run.sh`. `BIND_ADDRESS` may also be set. The browser runs in a separate container and reaches WordPress on the Compose network. Do not run this alongside another WordPress stack on a small host.

`LIVE_FETCH=1 ./run.sh` adds the public-network observation. A live outage fails that optional observation; it does not change the deterministic results. The ordinary CI run never depends on the public API. The dated live-source capture is retained separately.

Exact observed runtime and versions: [run.json](proof/run.json). Allow extra time for the first image downloads and browser build. Pinned images: WordPress `6.8.3-php8.3-apache`, MariaDB `11.4.5`, Python `3.12.10-alpine`, Playwright `v1.51.1-noble`, and Alpine `3.21.3`. Playwright package is `1.51.1`; image tags are pinned versions, not immutable digests. ImageMagick is installed from the image's Ubuntu repositories for stripped proof images.

## Inspect stages independently

For an interactive inspection, use these commands instead of the self-cleaning run. First create private local database credentials:

```bash
docker run --rm alpine:3.21.3 sh -c 'printf "DB_PASSWORD="; head -c 24 /dev/urandom | od -An -tx1 | tr -d " \n"; printf "\nROOT_PASSWORD="; head -c 24 /dev/urandom | od -An -tx1 | tr -d " \n"; printf "\n"' > .env
chmod 600 .env
docker compose up -d --wait db fixture web
docker compose exec -T web php /case/tests/setup.php
docker compose exec -T web php /case/tests/check.php broken
docker compose exec -T web php /case/tests/accept.php
```

The last command exits with failure in the broken state. Open `http://localhost:8080` to see it. Apply and inspect the repair:

```bash
docker compose exec -T web cp /case/source/rates.php /var/www/html/wp-content/mu-plugins/rates.php
docker compose exec -T web php /case/tests/check.php fixed
docker compose exec -T web php /case/tests/accept.php
```

Use `php /case/tests/check.php outage` or `php /case/tests/check.php empty` via the same `docker compose exec -T web` command to leave the page in a visible failure state. Re-run `fixed` to restore good fixture data. These controls are CLI-only files mounted outside the web root; the local fixture is not published to a host port.

Cleanup and reset:

```bash
docker compose down -v --remove-orphans
rm -f .env
./run.sh
```

## Add the feature to an existing WordPress site

Copy [source/rates.php](source/rates.php) into `wp-content/plugins/reference-rates/rates.php`, activate **Reference Rates**, and add `[reference_rates]` to a page. Copy the `.rates` styles from [source/style.css](source/style.css) into your theme's custom CSS. The included theme is for the captured page; the plugin does not replace your theme. Without the test-only `RR_FIXTURE` constant the plugin uses the public Frankfurter endpoint.

The first uncached visit fetches rates synchronously. Further visits reuse them for one hour. A refresh times out after two seconds; retries are suppressed for one minute. A last-good copy remains visible with its original fetch time during an outage, for at most seven days. If there is no usable copy, visitors see a source link and retry guidance. Rate dates remain visible separately because daily reference rates can predate the fetch.

A complete valid pair replaces the cache atomically as one WordPress option. Unknown currencies, duplicate/missing rows, invalid dates and non-positive or non-numeric rates are rejected. An atomic option lock limits concurrent refreshes. This small integration is intentionally fixed to the two displayed pairs. The fixture dates are fixed for repeatability and do not represent a live quotation.

To clear the plugin's stored state on removal, delete the `rr_cache` and `rr_lock` options and the `rr_backoff` transient. Production support for other WordPress/PHP versions, third-party page caches and high-volume concurrency has not been measured here.
