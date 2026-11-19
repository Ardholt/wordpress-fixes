# Cleanup and recovery notes

I use a disposable WordPress installation to make the cleanup reviewable. There is no exploit or live malicious payload. The starting point is a known inventory with explicitly labelled, passive indicators added to it. No original intrusion or production recovery is claimed.

## Findings and narrow repairs

| Finding | How I distinguish it | What I remove or restore |
|---|---|---|
| Unwanted page promotion | Exact marked block; approved text has its own stored digest | Remove only that block; stop if the remaining page differs from approved content |
| Unrecognized redirect note | Exact unused option name and labelled text | Delete the option; no redirect handler exists |
| Unknown administrator | Account is outside the approved owner inventory | Remove that disabled account, reassigning any posts to the approved owner |
| Dropped upload | Exact file path and byte comparison with the labelled text file | Remove the text file; stop if its contents differ |
| Changed core documentation | The content comparison with WordPress’s official copy fails for `readme.html` | Restore the baseline file, then verify all official core checksums |
| Rogue scheduled task | Exact hook name, outside the approved schedule | Clear the hook and its explanatory note; keep the approved task |

The [before inventory](proof/before.json) and [after inventory](proof/after.json) show each finding separately. These are targeted checks against the recorded changes, not a general malware detector. ClamAV, the antivirus scanner, supplies an independent whole-folder check. WordPress core checksum verification covers core files, not arbitrary database content or every file under `wp-content`.

## Hardening I verified

| Change | Evidence |
|---|---|
| Replace the owner password with a fresh random value | `hardening.owner_password_rotated` and `old_owner_password_rejected` in [after.json](proof/after.json); `preserved.approved_owner_can_authenticate` confirms the new password works |
| End existing owner sessions | `hardening.old_owner_session_invalid`; the saved pre-cleanup token fails verification |
| Replace the secrets that protect sign-ins (authentication keys and salts) | `hardening.authentication_salts_rotated`; comparison occurs privately, without publishing secrets |
| Disable dashboard file editing | `DISALLOW_FILE_EDIT` is true and the administrator no longer has the `edit_plugins` capability |
| Restrict configuration permissions | `wp-config.php` mode is `0640`, with the web-server owner able to read it |
| Deny script-shaped upload paths; keep directory listings blocked | Script-path requests change from WordPress fallback responses to HTTP 403. Listings are denied in both states; the ordinary care-notes download stays HTTP 200 |
| Close unused remote-publishing access (XML-RPC) | Real HTTP request changes from 405 to 403 |
| Keep public account registration off | `hardening.public_registration_disabled`; already off before cleanup |

Apache is the web server. Its restrictions are configured at the server level in [apache-hardening.conf](tools/apache-hardening.conf). The cleanup activates them and reloads Apache. Script-shaped test URLs contain no uploaded executable file. Blocking those requests proves the rule is enforced even when the file is absent; it does not claim to have run a malicious script.

The specimen account cannot authenticate even in the starting state: it has an invalid password field, no application passwords, and a mandatory authentication-denial filter. Automatic cron is disabled throughout. The unfamiliar cron hook has no registered callback. Neither of those containment measures is presented as a newly added fix.

The WordPress release is pinned for repeatability; this is not an upgrade recommendation. [Why each specimen is inert](SAFETY.md) explains the safety boundary.

## Reproduce and inspect

Only Docker and Docker Compose are required on the host. Dependencies and tests run in containers. Internet is needed for image pulls, npm/browser installation, official WordPress checksums and ClamAV signature updates. The [last run log](proof/run-output.txt) gives the measured duration; cold image downloads add time.

```bash
./run.sh
```

The script exits nonzero on unexpected failures. A failed clean-state gate and failed core checksum are required before cleanup; both must return success afterward. The browser additionally checks that every expected indicator is present before cleanup and every approved item survives. The repeat phase performs fresh checks against the fixed site. ClamAV runs after teardown to keep memory use down.

During initial provisioning, I remove the official image's unused `wp-config-docker.php` bootstrap copy after `wp-config.php` has been created. This keeps that known container helper out of the core checksum reports. The baseline and both repaired-state checksum checks must finish without warnings; the altered state must report only the planted `readme.html` change.

To leave each stage available for inspection:

```bash
export PORT=8080
./scripts/stage.sh start
./scripts/stage.sh before
# Open http://localhost:8080 to inspect the altered page.
./scripts/stage.sh fix
./scripts/stage.sh after
./scripts/stage.sh repeat
# Open the same local address to inspect the restored page.
./scripts/stage.sh stop
./scripts/scan.sh
```

The port is overridable with `PORT` and binds only to `127.0.0.1` by default. Run only one WordPress stack at a time. Stop this case before starting another. `start` requires a fresh site; it refuses to overwrite an existing one.

To reset this case, including the private backup:

```bash
./scripts/stage.sh stop
docker compose --profile tools down -v --remove-orphans
./run.sh
```

The default run always tears down its WordPress services and private volumes, including on failure. ClamAV signature files remain in the Docker volume `hacked-site-cleanup-signatures` for a later run. Remove that cache with `docker volume rm hacked-site-cleanup-signatures` when no scanner is using it.

## Evidence and backup handling

Before cleanup, I export the actual database to `/private/before-cleanup.sql` in a private Docker volume, require it to be nonempty and set its mode to `0600`. It contains generated local credentials and is never copied into public proof. The initial core document, access-comparison values and replacement owner password (`/private/owner-password-after`, mode `0600`) also stay in that volume. The public proof is a deliberately limited inventory, not a database dump. Full-run teardown destroys these private files.

For an inspection run only, the database backup can be restored while the stack still exists:

```bash
docker compose run --rm -T cli db import /private/before-cleanup.sql
```

That command restores database records only. It does not restore files, salts or server configuration, and is not a tested full rollback. Use a fresh reset to reproduce the complete starting state. Never restore compromised data into an exposed production site as a recovery shortcut.

## Dependencies and limits

- WordPress `6.8.3` with PHP `8.3`, MariaDB `11.4.8`, WP-CLI `2.12.0`.
- Playwright `1.56.1` with its bundled Chromium; the measured browser version is in [run.json](proof/run.json).
- Node `22` browser-tool base, ImageMagick from Debian Bookworm, and ClamAV `1.4.3` with signatures refreshed at runtime. Image identities are recorded in [images.json](proof/images.json).
- The first-screen cleanup record is generated from the actual before, after and repeat reports. The page screenshots come from the same WordPress run.

The complete reproduction runs in Docker, including the server rules, file checks and antivirus scans. [Automated checks](https://github.com/Ardholt/wordpress-fixes/actions/workflows/hacked-site-cleanup.yml) run this process and retain its reports. The workflow source is in [.ci/workflow.yml](.ci/workflow.yml).

## What a live-site recovery also needs

For a business site, I would first contain access and preserve a recoverable copy and logs. I would agree which accounts, content and integrations belong on the site, then trace how the unwanted access occurred. Removing visible changes alone would leave that cause unresolved.

I would replace compromised software from trusted publishers, update vulnerable components, reset the affected hosting and site credentials, and test the business's important pages and transactions. I would agree a follow-up monitoring period and report any recurrence against the recovery baseline.

The repeat check in this case runs immediately after cleanup. It confirms that the listed changes are still absent at that point; it does not establish long-term freedom from reinfection. No customer incident or follow-up monitoring period is represented here.
