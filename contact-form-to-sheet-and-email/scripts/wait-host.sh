#!/usr/bin/env bash
set -euo pipefail
quiet=0
while [ "$quiet" -lt "${HOST_QUIET_SECONDS:-0}" ] || docker ps --format '{{.Label "com.docker.compose.project"}} {{.Image}}' | awk '$1 != "form-sheet-inbox" && /wordpress|mariadb|mysql/ {found=1} END {exit !found}'; do
  if docker ps --format '{{.Label "com.docker.compose.project"}} {{.Image}}' | awk '$1 != "form-sheet-inbox" && /wordpress|mariadb|mysql/ {found=1} END {exit !found}'; then
    quiet=0
    echo 'Waiting for the other WordPress stack to finish.'
  else
    quiet=$((quiet + 15))
  fi
  sleep 15
done
