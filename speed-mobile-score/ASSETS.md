# Asset provenance

I created the garden illustrations, page copy, theme and performance checks. The page uses descriptive service headings and represents no named gardening business.

| Files | Origin | Licence / notice |
|---|---|---|
| `fixtures/assets/{garden,planting,courtyard,care}.jpg` and their `-480.webp`, `-960.webp`, `-1600.webp` versions | Original raster artwork from `scripts/artwork.py` | Original work; repository licence |
| `fixtures/Inter-Regular.ttf`, `fixtures/assets/Inter-Regular.ttf`, `scripts/hero/fonts/Inter-Regular.ttf`, `scripts/hero/fonts/Inter-SemiBold.ttf` | Inter Project, https://github.com/rsms/inter | SIL OFL 1.1; `fixtures/LICENSE-Inter.txt` and `scripts/hero/fonts/LICENSE-Inter.txt` |
| `scripts/hero/fonts/InstrumentSerif-Regular.ttf` | Instrument, https://github.com/Instrument/instrument-serif | SIL OFL 1.1; `scripts/hero/fonts/LICENSE-InstrumentSerif.txt` |
| `scripts/hero/fonts/JetBrainsMono-Bold.ttf` | JetBrains, https://github.com/JetBrains/JetBrainsMono | SIL OFL 1.1; `scripts/hero/fonts/LICENSE-JetBrainsMono.txt` |
| `fixtures/assets/bootstrap.css`, `fixtures/assets/bootstrap.js` | Bootstrap 5.3.3 npm package: `dist/css/bootstrap.css` and `dist/js/bootstrap.bundle.js` | MIT; `fixtures/assets/LICENSE-Bootstrap.txt`; bundled Popper notice retained in JavaScript |
| `proof/**/*.report.html` | Fresh Lighthouse report output, including its report renderer | Lighthouse Apache-2.0; `fixtures/LICENSE-Lighthouse.txt`; notices retained in generated reports |
| `scripts/hero/make-hero` | Casebook visual helper | Repository work |
| `media/hero.png`, `media/page-in-use.gif`, `proof/*-report.png`, `proof/*-mobile.png`, `proof/*-desktop.png`, `proof/filmstrip.png` | Fresh captures of this case and its Lighthouse reports | Original captures; embedded font and report-renderer notices above |

WordPress, MariaDB, Chromium and npm tools are downloaded into containers, not vendored into this case. Their image/package versions and digests are pinned in the build files and lockfile. The raw reports embed thumbnails of this case's original artwork; they contain no third-party stock photography.

Product and organisation names in licences, lockfiles and browser reports identify dependencies, licensors and emulated platforms. They do not identify clients, endorsements or private devices. Lighthouse’s mobile device settings describe browser emulation. Required upstream notices are retained unchanged.

`proof/index.html` is an original readable results view. `proof/page.html` preserves the rendered page returned by WordPress, with local asset paths and the same controls. It is a saved rendering, not a hosted WordPress backend.
