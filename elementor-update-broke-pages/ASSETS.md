# Source and asset licences

I wrote the workshop pages, reproduction scripts, behavioral checks and case text. The screenshots capture those pages running in WordPress. The measurements link to the recorded runs in `proof/`.

| Shipped file | Source | Licence / notice |
|---|---|---|
| `assets/hero/make-hero`, `assets/hero/make-button`, `assets/hero/make-outcome` | Ardholt casebook design | Ardholt’s casebook assets |
| `assets/hero/fonts/InstrumentSerif-Regular.ttf` | Instrument Serif | SIL Open Font License 1.1; `assets/hero/fonts/LICENSE-InstrumentSerif.txt` |
| `assets/hero/fonts/Inter-SemiBold.ttf` | Inter | SIL Open Font License 1.1; `assets/hero/fonts/LICENSE-Inter.txt` |
| `assets/hero/fonts/JetBrainsMono-Bold.ttf` | JetBrains Mono | SIL Open Font License 1.1; `assets/hero/fonts/LICENSE-JetBrainsMono.txt` |
| `proof/vendor-change.diff` | Difference between official Phlox Core Elements 2.16.4 and 2.17.0 `includes/elementor/widgets/modern-button.php` | GPL-2.0, Averta, copyright 2010–2024; full licence in `LICENSES/GPL-2.0.txt`; complete corresponding source in the two archives named in `packages.lock` |
| `proof/*.png`, `media/*.png` | New browser captures and typesetting in this run | Casebook’s own work; UI includes the above GPL components and licensed fonts |

The WordPress.org ZIP files are downloaded at runtime and excluded from git. WordPress, Elementor, Phlox and Phlox Core Elements are GPL components; their original notices remain inside the installed packages. Exact source archives and SHA-256 values are in `packages.lock`. Docker images and browser dependencies are pulled/built, not vendored into this folder. WordPress core comes from the official WordPress image; WP-CLI is MIT, MariaDB GPL-2.0, Playwright Apache-2.0, pngjs MIT and ImageMagick under its own permissive licence. Their installed distributions retain their notices.

“Clay workshops” and “Workshop details” are page titles, not business names. The software names above identify dependencies and copyright holders, not customers.
