#!/usr/bin/env bash
set -euo pipefail
# Keep both individual fetches and the entire mirror attempt bounded.
cat >/etc/apt/apt.conf.d/80-fetch-limits <<'APT'
Acquire::Retries "2";
Acquire::http::Timeout "20";
Acquire::https::Timeout "20";
Acquire::Languages "none";
APT
arch=$(dpkg --print-architecture)
if [ "$arch" = amd64 ]; then
  mirrors=(https://archive.ubuntu.com/ubuntu https://mirrors.edge.kernel.org/ubuntu)
else
  mirrors=(https://ports.ubuntu.com/ubuntu-ports https://ports.ubuntu.com/ubuntu-ports)
fi
for mirror in "${mirrors[@]}"; do
  echo "PACKAGES: trying $mirror (maximum 360 seconds)"
  # Node is already in the base image; only Ubuntu sources are needed here.
  rm -f /etc/apt/sources.list /etc/apt/sources.list.d/*.sources /etc/apt/sources.list.d/*.list
  cat >/etc/apt/sources.list.d/ubuntu.sources <<APT
Types: deb
URIs: $mirror
Suites: noble noble-updates noble-security
Components: main universe restricted multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
APT
  if timeout --kill-after=15 360 bash -euc '
    export DEBIAN_FRONTEND=noninteractive
    dpkg --configure -a
    apt-get update --error-on=any
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends imagemagick python3 libreoffice-calc xvfb xauth xdotool
  '; then
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*.deb
    echo "PACKAGES: installation complete using $mirror"
    exit 0
  else
    result=$?
    echo "PACKAGES: $mirror failed (exit $result); trying the next source." >&2
  fi
done
echo 'FAIL: package installation exhausted both bounded mirror attempts.' >&2
exit 1
