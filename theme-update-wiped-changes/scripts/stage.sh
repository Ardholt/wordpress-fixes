#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
wp() { docker compose run --rm -T cli "$@"; }
case "${1:-}" in
  original)
    admin_password=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
    wp core install --url=http://localhost --title='Furniture repair' --admin_user=case-owner --admin_email=owner@localhost.invalid --skip-email --admin_password="$admin_password"
    wp theme install /case/vendor/twentytwentyone.2.3.zip --force --activate
    wp eval-file /case/fixtures/site.php
    wp eval 'file_put_contents(get_template_directory() . "/functions.php", "\n" . substr(file_get_contents("/case/source/notice.php"), 5), FILE_APPEND); file_put_contents(get_template_directory() . "/style.css", "\n" . file_get_contents("/case/fix/repair-child/style.css"), FILE_APPEND);'
    ;;
  broken)
    wp theme install /case/vendor/twentytwentyone.2.4.zip --force
    ;;
  fixed)
    wp eval-file /case/scripts/package.php > proof/repair-child.zip
    wp theme install /case/proof/repair-child.zip --force --activate
    # WordPress migrates the menu assignment when switching to a child theme.
    ;;
  updated)
    wp theme install /case/vendor/twentytwentyone.2.5.zip --force
    ;;
  *) echo 'Usage: scripts/stage.sh original|broken|fixed|updated' >&2; exit 2 ;;
esac
