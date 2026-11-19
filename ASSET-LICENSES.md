# Third-party files and their licences

Each case folder carries its own licence and third-party notices (its LICENSE, ASSETS.md, THIRD-PARTY.md, NOTICE.md or ASSET-LICENSES.md files, where present); those notices govern the files in that folder, and a file that states a licence in its own header is under that licence. Files that no such notice or header covers are under the repository licence. The table below lists third-party files used across the cases; it does not replace the case-level notices.

| Files | What they are | Licence |
|---|---|---|
| `*/hero/fonts/Inter-*.ttf` | Inter, by Rasmus Andersson | SIL Open Font License 1.1 (`LICENSE-Inter.txt` beside it) |
| `*/hero/fonts/InstrumentSerif-Regular.ttf` | Instrument Serif | SIL Open Font License 1.1 (`LICENSE-InstrumentSerif.txt` beside it) |
| `*/hero/fonts/JetBrainsMono-Bold.ttf` | JetBrains Mono | SIL Open Font License 1.1 (`LICENSE-JetBrainsMono.txt` beside it) |
| `*/proof/*.png`, `*/media/*.png` | Captures, crops, previews and rendered images I made while running each case (browser, office-app and offline README previews, and images rendered from saved run records); the software shown keeps its own licence | the case folder's own notice where it names one, otherwise the repository licence |
| `theme-update-wiped-changes/vendor/twentytwentyone.2.3.zip`, `2.4.zip`, `2.5.zip` and `proof/edited-parent.tar.gz` | Twenty Twenty-One releases fetched from WordPress.org by URL and SHA-256 (see `vendor/asset-manifest.json`); the ZIPs are not included in this repository. The recovered modified files are included in `proof/edited-parent.tar.gz` | GPL-2.0-or-later; its bundled images are public domain (Berthe Morisot) and parts of its form CSS are MIT, as its readme says |
| `theme-update-wiped-changes/artwork/fonts/*` | Inter, Instrument Serif, JetBrains Mono | SIL Open Font License 1.1 (licence files beside them) |
