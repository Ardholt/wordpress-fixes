#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .runtime proof
# Run only after the WordPress stack has stopped.
if [[ -n $(docker ps -q --filter label=com.docker.compose.project) ]]; then
  echo 'Stop other Compose stacks before checking Playground.'
  exit 1
fi
docker build -q -t video-playground-check -f tools/playground.Dockerfile . >/dev/null
docker network create video-playground-probe >/dev/null
cleanup() {
  docker rm -f video-playground-probe >/dev/null 2>&1 || true
  docker network rm video-playground-probe >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker run -d --name video-playground-probe --network video-playground-probe --network-alias playground \
  -p "127.0.0.1:${PLAYGROUND_PORT:-8081}:9400" -v "$PWD:/work" video-playground-check \
  server --port=9400 --workers=1 --wp=6.8.3 --php=8.3 --site-url=http://playground:9400 --blueprint=/work/blueprint.json > .runtime/playground-container.txt
docker run --rm --init --shm-size=256m --network video-playground-probe -v "$PWD:/work" video-embed-wont-play-browser tests/playground.cjs
