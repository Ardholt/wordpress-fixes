# Reproduce the video repair

I reproduced a restrictive Apache header blocking a self-hosted WordPress video. The repair is the single directive change in [the configuration pair](fix/security.conf). This case concerns a same-origin video; an outside video provider would need its own narrowly scoped policy.

From a clean checkout, Docker Engine and Docker Compose v2 are sufficient on Linux. Run commands in this folder. Internet access is needed for public container images and build packages; the page and video run locally after setup. No account or private service is needed.

```bash
./run.sh
```

The default run creates fresh database credentials, provisions WordPress, creates the original visitor-guide video, records the blocked player, checks that the playback acceptance test fails, repairs the header, then records passing playback checks. It writes `proof/` and `media/` and removes its containers and database volumes even if a test fails. See [the recorded duration](proof/run.json) at `durationSeconds`; uncached image downloads add time. The script waits if another Compose project is running on the computer.

To inspect the broken and repaired pages independently:

```bash
./run.sh broken
./run.sh test before
# Open http://localhost:8080 and click Play introduction.
./run.sh fix
./run.sh test after
# Reload the same page and click Play introduction again.
./run.sh down
```

The `broken` command resets only this case's volumes. It intentionally leaves the stack up for inspection. The `fix` command copies the repaired header file into the active bind mount, validates Apache's configuration and reloads Apache. It leaves the content, video and theme untouched. `test after` compares against the security headers captured by `test before`.

The default port is `8080`. Override it if that port is already in use:

```bash
PORT=8082 ./run.sh
```

Ports bind to loopback by default. WordPress derives its local URL from the incoming request, so either port reaches the same page. This host-derived URL is used for local reproduction; use the site's fixed canonical URL in a deployed site. The browser tests run in a separate container on the same Docker network. Public browser evidence normalizes the container origin to `http://localhost:8080`; request paths, errors and timing observations are retained. No external media service is contacted.

To restore the broken policy while inspecting the stack:

```bash
cat fixtures/security.conf > .runtime/security.conf
docker compose exec -T web apache2ctl -t
docker compose exec -T web apache2ctl -k graceful
./run.sh test before
```

Use `./run.sh down` to stop the stack and delete its database. Runtime-only credentials and temporary recordings live under ignored `.runtime/`; remove that directory after stopping if desired. Never publish it.

The dependency pins are in [compose.yaml](compose.yaml), [the browser image](tests/Dockerfile) and [the rendering image](tools/Dockerfile). The WordPress, database, CLI and base images use immutable digests; Playwright uses an exact package version. The installed rendering package versions and application versions are retained under [proof](proof/). Build-system package dependencies come from Debian's repositories.

The checks use real Chromium playback in fresh browser contexts. They inspect the browser's CSP violation event and matching console error, compare playback time and decoded frame counts, seek and wait for completion. A separate HTTP range request works in both states, which distinguishes a browser-policy block from an absent or invalid media file. The visit page and expandable information are checked in each state. Phone checks exercise playback again without horizontal overflow.

[blueprint.json](blueprint.json) contains the same page and owned video for a Playground capability check. It also writes the repaired Apache header directives and a read-only `header-capability.php` probe. See [the observed result](proof/demo.json): a playable page alone would not reproduce this Apache policy experiment. Docker remains the supported reproduction path.

The [automated checks](https://github.com/Ardholt/wordpress-fixes/actions/workflows/video-embed-wont-play.yml) run this reproduction. The workflow source is retained in [.ci/workflow.yml](.ci/workflow.yml).
