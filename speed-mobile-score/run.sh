#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export COMPOSE_PROJECT_NAME=speed-mobile-score
TOOLS_IMAGE=speed-mobile-score-tools:1
stage=${1:-all}
mkdir -p proof .runtime
if [[ ! -f .env ]]; then
  umask 077
  printf 'DB_PASSWORD=%s\nROOT_PASSWORD=%s\n' "$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')" "$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')" > .env
fi
tools() { docker run --rm --ipc=host --network speed-mobile-score_default -v "$PWD:/work" "$TOOLS_IMAGE" "$@"; }
setup() {
  docker build -t "$TOOLS_IMAGE" -f tests/Dockerfile .
  if [[ ! -f fixtures/assets/garden.jpg ]]; then
    docker run --rm -v "$PWD:/work" "$TOOLS_IMAGE" python3 scripts/artwork.py
  fi
  docker compose up -d --build --wait --wait-timeout 180
  for n in $(seq 1 60); do
    if docker compose exec -T wordpress test -f /var/www/html/wp-config.php; then break; fi
    sleep 2
  done
  docker compose exec -T wordpress php /case-scripts/setup.php
  docker compose exec -T wordpress php -r 'echo PHP_VERSION, "\n";' > proof/php-version.txt
  docker compose exec -T db mariadbd --version > proof/database-version.txt
  sha256sum fixtures/assets/* source/theme/*.php source/theme/*.css source/theme/*.js fix/*.php tests/*.cjs tests/Dockerfile source/Dockerfile compose.yaml run.sh > proof/fixture-sha256.txt
}
state() { docker compose exec -T wordpress php /case-scripts/state.php "$1"; }
measure() { tools node /work/tests/measure.cjs "$1"; }
check() { tools node /work/tests/behavior.cjs "$1"; }
case "$stage" in
  setup) setup; state before ;;
  before) state before ;;
  after) docker compose exec -T wordpress php < fix/apply.php; state after ;;
  measure) measure "${2:?Use before or after}" ;;
  check) check "${2:?Use before or after}" ;;
  down) docker compose down -v --remove-orphans ;;
  all)
    started=$SECONDS
    trap 'docker compose down -v --remove-orphans' EXIT
    setup
    state before
    check before
    measure before
    set +e
    tools node /work/tests/budget.cjs before > proof/before-budget.log 2>&1
    broken_status=$?
    set -e
    [[ "$broken_status" == 1 ]] || { cat proof/before-budget.log; echo "Unexpected baseline check exit: $broken_status"; exit 1; }
    echo "EXPECTED FAIL: unchanged budget test exits 1 on the broken page."
    docker compose exec -T wordpress php < fix/apply.php
    state after
    check after
    measure after
    tools node /work/tests/budget.cjs after > proof/after-budget.log 2>&1
    echo "PASS: unchanged budget test exits 0 on the fixed page."
    tools node /work/tests/compare.cjs
    tools node /work/tests/publish.cjs
    tools python3 scripts/visuals.py
    tools node scripts/proof-index.cjs
    echo "PASS: complete clean run in $((SECONDS-started)) seconds."
    ;;
  *) echo 'Use: ./run.sh [setup|before|after|measure before|measure after|check before|check after|down]' >&2; exit 2 ;;
esac
