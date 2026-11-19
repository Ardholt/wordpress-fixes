#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
mkdir -p proof
scanner=clamav/clamav:1.4.3@sha256:75fb5fd95fcbe1d7e6d240c369c1572b686ee2c95949d1042b5148de8eddebb4
docker volume create hacked-site-cleanup-signatures >/dev/null
timeout 300 docker run --rm --entrypoint freshclam -v hacked-site-cleanup-signatures:/var/lib/clamav "$scanner" --stdout >proof/scanner-update.txt 2>&1
for report in scanner scanner-repeat; do
  set +e
  timeout 600 docker run --rm --entrypoint clamscan -v hacked-site-cleanup-signatures:/var/lib/clamav:ro -v "$PWD:/candidate:ro" "$scanner" --recursive --infected --max-filesize=50M --max-scansize=200M /candidate >"proof/$report.txt" 2>&1
  status=$?
  set -e
  cat "proof/$report.txt"
  test "$status" = 0
  printf 'PASS whole-folder ClamAV %s (exit %s).\n' "$report" "$status"
done
