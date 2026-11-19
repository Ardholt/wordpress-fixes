# Reproduce the checkout repair

I built Velquorra Kiln with WordPress 6.8.3, WooCommerce 10.3.5 from wordpress.org, PHP 8.3 and MariaDB 11.4.5. The browser is Playwright 1.56.1’s bundled Chromium in its own container. The exact observed PHP and Chromium versions are in [run.json](../proof/run.json). Docker image tags and browser package versions are pinned in the Compose file and Dockerfiles; operating-system security packages are resolved when the utility image builds.

Only Docker with Compose v2, Bash and standard shell utilities are required on the host. Dependency downloads require internet access. Credentials are generated into ignored `.env` at runtime. No real payment or mail service is connected. WordPress mail is intercepted locally.

```bash
./run.sh                  # full broken -> fixed test, then automatic cleanup
./run.sh --prepare        # fresh broken shop; leaves it running
# open http://localhost:8080; add the cup, update quantity, proceed to checkout
./run.sh --after          # replace only the delivery snippet and clear its cache
./run.sh --before         # restore the original snippet and clear its cache
./run.sh --down           # remove this shop and its database
```

`--prepare` resets this case’s database. `--before` and `--after` preserve the current basket and orders. `PORT=8081 ./run.sh --prepare` overrides the default port. The listener defaults to loopback; `BIND_ADDRESS` can override it. Use the same port environment when starting and stopping a stack. Keep only one WordPress stack running on a shared machine.

The full path takes several minutes with cached images; the measured duration is at the end of [run-output.txt](../proof/run-output.txt). The first run also pulls images and builds browser and media containers. CI has a twenty-minute limit. Full runs acquire a local `.run-lock` directory before opening the log, so a second invocation cannot overwrite active evidence. After a forced process kill, run `./run.sh --down` and remove an abandoned lock with `rmdir .run-lock` before retrying. A failing assertion returns a nonzero exit code, and the full path removes its stack on exit. The broken state’s acceptance failure is deliberately required before the fixed checks run.

## The cause and the repair

The custom snippet calls the delivery endpoint inside `woocommerce_before_calculate_totals`, which WooCommerce can invoke repeatedly while refreshing totals. It also calls the same function when rendering the cart notice and validating checkout. Every original call makes a blocking HTTP request. The controlled service implements a normal response contract with `schema: 2` and `destinations: ["GB"]`; the outdated snippet still reads `countries`. The cart waits repeatedly and checkout interprets the empty list as no supported destinations.

The repair changes only that snippet: read and validate the current schema, then cache the region list with a five-minute transient. Cart calculation, delivery notices and checkout share that cache. The shipping charge still comes from WooCommerce’s flat-rate shipping zone. The warm cache removes repeated HTTP requests; it does not skip WooCommerce calculations or validation. A cold cache still makes a real request.

This cache is suitable for a country eligibility list shared across customers. Customer-specific prices or stock would need different keys and freshness rules. A timeout or malformed response on a cold/expired cache fails closed and is not cached. A valid cached list remains usable until expiry. There is no stale-cache fallback, no retry loop and no real external delivery account.

## Measurement and behavioral checks

Each state runs five fresh browser contexts at 1280 × 900 with the same locale, product, quantity, address, shipping and payment method. No network or CPU throttling is applied. These local runs use a shared machine; other workloads are not controlled. The complete range is reported alongside each median. A threaded local HTTP service adds 900 ms to every region response in both states. This controls service latency while testing actual WooCommerce execution. It is not a live courier benchmark.

The cart timer starts just before clicking **Update cart**, and stops when the updated £52.50 total appears and the blocking overlay clears. The checkout timer starts before **Place order** and stops after the checkout AJAX response is read. A read-only XMLHttpRequest listener retains the native browser response before WooCommerce redirects. This instrumentation is identical in both states. Each session uses normal browser caching. Broken responses are errors; fixed responses are successes, so these are response-time comparisons, not equivalent completed-order durations. Browser timings include driver and UI overhead. All observations, medians and ranges are retained; none are discarded as warm-up runs.

The first fixed cart has an empty delivery transient, populated during navigation to the cart before the timed quantity update. Subsequent fixed cart visits reuse that cache. Request counts include cart navigation and the quantity update; they are not restricted to the timed segment. No browser cache is shared between repetitions. The database and application configuration remain unchanged when the snippet is switched.

After each state I read persisted orders through WooCommerce’s own order API. The original must leave no order. The repair must persist exactly five orders, each for two breakfast cups, £48 merchandise, £4.50 shipping, £52.50 total, GBP currency, `cheque` method and `on-hold` status. A further invalid email/postcode submission must fail without adding an order. A separate PHP check exercises cache expiry, refresh and failure handling.

The MP4 recordings show the final seven seconds of the first checkout in each state; the GIFs show the final six seconds. Brief pauses before submission and after the result keep both states readable and are outside the timing interval. The screenshots use the same viewport, with additional crops around the actual notices for the hero. Billing input text is suppressed in the capture browser before typing; public order evidence omits billing details, keys and IDs. [Content and checkout-data origins](content-origin.md) explain the generated inputs. The full runner does not preserve a database dump or credentials.
