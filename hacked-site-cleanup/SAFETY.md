# Why these specimens cannot run

Every specimen file is in `fixtures/specimens/`, begins with “INERT, DEFANGED SPECIMEN made for this demonstration.”, and has mode `0644`. There is no executable specimen, active malicious URL, encoding/evaluation chain or exploit. The reserved name `example.invalid` is plain text and never linked or requested.

| Specimen | Why it cannot perform the suggested malicious action |
|---|---|
| `content.txt` | Ordinary text; the preparation script escapes the selected lines into a marked `aside`. There is no anchor, script, event handler or redirect. Browser checks require no external requests and no active elements in the block. |
| `option.txt` | A labelled string stored under a deliberately unused option name. No code reads it to redirect a visitor. The reserved destination is descriptive text only. |
| `account.txt` | A text description associated with the account record. The account's password field is deliberately invalid; no application passwords exist; a mandatory authentication filter rejects the account throughout the run. The administrator role is visible for inventory purposes but cannot be used to sign in. |
| `unrecognized-upload.php.txt` | Plain labelled text with final extension `.txt`, no PHP opening tag or executable content and no executable permission bits. It represents a dropped file without containing a web shell. |
| `core-document.txt` | Plain text appended only to WordPress `readme.html`. This changes an official checksum without modifying any executable core code. The baseline document is verified against official checksums before staging. |
| `cron.txt` | Text describing a scheduled hook with no arguments and no callback anywhere in the case. WordPress automatic cron is disabled. Dispatching the hook cannot execute a payload. |

Executable shell scripts and PHP files outside this specimen directory are the reproduction harness, cleanup, theme and tests. They contain no malicious implementation. Upload-denial tests request nonexistent script-shaped paths and never create an executable upload.

ClamAV scans the **entire case folder**, including source, fixtures, documents and captured media, then repeats the scan. `proof/scanner.txt` and `proof/scanner-repeat.txt` are the raw results; `proof/scanner-update.txt` records the signature refresh. These results supplement the per-specimen reasoning above; a clean scanner alone is not proof of inertness. The report being written and the final run-log tail necessarily postdate their own scan.
