# Reused files and licences

The booking module and its database guard are distributed under GPL-2.0-or-later. Font notices are retained below.

| File | Provenance | Licence |
|---|---|---|
| `src/booking-guard.php` | GPL database guard, modified to require a MariaDB named lock for each booking request. | GPL-2.0-or-later; [full text](LICENSE) |
| `design/make-hero` | Ardholt casebook image layout. | Ardholt's own work, distributed with this case under GPL-2.0-or-later |
| `design/fonts/InstrumentSerif-Regular.ttf` | Instrument Serif Project Authors | SIL OFL 1.1; `design/fonts/LICENSE-InstrumentSerif.txt` |
| `design/fonts/Inter-SemiBold.ttf` | Inter Project Authors | SIL OFL 1.1; `design/fonts/LICENSE-Inter.txt` |
| `design/fonts/JetBrainsMono-Bold.ttf` | JetBrains Mono Project Authors | SIL OFL 1.1; `design/fonts/LICENSE-JetBrainsMono.txt` |
| `design/fonts/LICENSE-InstrumentSerif.txt`, `design/fonts/LICENSE-Inter.txt`, `design/fonts/LICENSE-JetBrainsMono.txt` | Original font notices distributed with the fonts | Retained verbatim |

WordPress (GPL-2.0-or-later), WP-CLI (MIT), MariaDB (GPL-2.0), Mailpit (MIT) and Playwright (Apache-2.0) are fetched in containers, not vendored here. The fresh owner-screen capture includes WordPress interface elements; the fresh mail-catcher capture includes Mailpit interface elements. Their visible interfaces are used only to show the actual local test. Browser and image-processing dependencies remain in their runtime containers with their own notices.

The remaining case source, text and newly captured media are Ardholt's own work, distributed under GPL-2.0-or-later. The font licences apply separately to the bundled fonts.
