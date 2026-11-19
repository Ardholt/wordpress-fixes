# Measurement configurations

Each series below records a distinct page or measurement configuration. These observations are kept separate from the [current comparison](../README.md). Raw Lighthouse reports are retained unchanged.

| Configuration | Configuration note | Raw JSON | HTML |
|---|---|---|---|
| Large original uploads, simulated throttling | Full-size artwork with simulated network throttling. | [1](simulated-originals/run-1.report.json), [2](simulated-originals/run-2.report.json), [3](simulated-originals/run-3.report.json) | [1](simulated-originals/run-1.report.html), [2](simulated-originals/run-2.report.html), [3](simulated-originals/run-3.report.html) |
| Applied throttling with the original measurement timeout | Load timeout: no usable LCP. These are invalid measurements, not zero-score results. | [1](applied-timeout/run-1.report.json), [2](applied-timeout/run-2.report.json), [3](applied-timeout/run-3.report.json) | [1](applied-timeout/run-1.report.html), [2](applied-timeout/run-2.report.html), [3](applied-timeout/run-3.report.html) |
| Load-event hero reveal below the introductory copy | The main image sits below the introduction and appears on the window load event. | [1](below-heading-reveal/run-1.report.json), [2](below-heading-reveal/run-2.report.json), [3](below-heading-reveal/run-3.report.json) | [1](below-heading-reveal/run-1.report.html), [2](below-heading-reveal/run-2.report.html), [3](below-heading-reveal/run-3.report.html) |
| Top hero, separate caption: before | The image caption is separate from the top figure. | [1](top-hero/before/run-1.report.json), [2](top-hero/before/run-2.report.json), [3](top-hero/before/run-3.report.json) | [1](top-hero/before/run-1.report.html), [2](top-hero/before/run-2.report.html), [3](top-hero/before/run-3.report.html) |
| Top hero, separate caption: after | Matching optimized configuration. | [1](top-hero/after/run-1.report.json), [2](top-hero/after/run-2.report.json), [3](top-hero/after/run-3.report.json) | [1](top-hero/after/run-1.report.html), [2](top-hero/after/run-2.report.html), [3](top-hero/after/run-3.report.html) |


Each `conditions.json` records the method. “No other stack or browser” in these records refers to this case’s serialization; other activity on the shared host was not controlled.
