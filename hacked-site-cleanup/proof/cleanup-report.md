# What I removed and what still works

I recorded these results from the WordPress cleanup. Each change was found before cleanup and dealt with afterward. The immediate repeat check confirmed every repair.

| Change found | After cleanup | Repeat check |
|---|---|---|
| Advert | Removed | Absent |
| Unknown admin | Removed | Absent |
| Extra upload | Removed | Absent |
| Unwanted setting | Removed | Absent |
| Changed site file | Restored | Verified |
| Unwanted task | Removed | Absent |

The original page, care-notes download, approved owner account and legitimate scheduled task still work. The new owner password works; the old password and old session do not.

- **Advert:** The marked unwanted promotion was removed; the approved page text stayed intact. Evidence: `indicators.page_content` in [before](before.json), [after](after.json) and [repeat](repeat.json).
- **Unknown admin:** The unfamiliar, disabled administrator account was deleted; the approved owner can still sign in. Evidence: `indicators.disabled_unknown_administrator` in [before](before.json), [after](after.json) and [repeat](repeat.json).
- **Extra upload:** The unrecognized text file in uploads was removed; the care-notes download still works. Evidence: `indicators.dropped_text_file` in [before](before.json), [after](after.json) and [repeat](repeat.json).
- **Unwanted setting:** The unused redirect-note setting was deleted. It never performed a redirect. Evidence: `indicators.unused_redirect_option` in [before](before.json), [after](after.json) and [repeat](repeat.json).
- **Changed site file:** WordPress readme.html was restored, then all official core file checks passed. This was a documentation change. Evidence: `indicators.altered_core_document` in [before](before.json), [after](after.json) and [repeat](repeat.json).
- **Unwanted task:** The unfamiliar scheduled task was removed; the approved scheduled task still runs. The unfamiliar task had no callback. Evidence: `indicators.cron_without_callback` in [before](before.json), [after](after.json) and [repeat](repeat.json).

The retained content and access checks are recorded under `preserved` and `hardening` in [after.json](after.json) and [repeat.json](repeat.json). Actual page and download requests passed in the [after browser run](browser-after.json) and [repeat browser run](browser-repeat.json). The [official file comparison](core-after.txt) and [repeat comparison](core-repeat.txt) both passed.

I carried out this cleanup on an isolated installation with harmless, labelled changes, not a customer site. The repeat check confirms the state at the end of this run, not long-term monitoring or the discovery of an original entry point. [How the specimens stay inert](../SAFETY.md).
