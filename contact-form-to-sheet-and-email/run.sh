#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p proof .runtime
chmod 700 .runtime
# The left-hand failure survives tee, including provisioning and test failures.
timeout --signal=TERM --kill-after=120 3000 ./scripts/run-inner.sh 2>&1 | tee proof/run-output.txt
