# Sources and licences

I release the case's original scripts, page content, child theme, documentation and captured page images under GPL-2.0-or-later. Copyright Genco Doganay. The full GPL text is in [LICENSE](LICENSE).

| Reused files | Source | Licence and retained notices |
|---|---|---|
| `vendor/twentytwentyone.*.readme.txt`; releases 2.3, 2.4 and 2.5 downloaded at runtime | [WordPress.org Twenty Twenty-One](https://wordpress.org/themes/twentytwentyone/); exact download URLs and every downloaded archive member are listed in [asset-manifest.json](vendor/asset-manifest.json) | GPL-2.0-or-later, WordPress.org and contributors. Downloaded archives are unmodified and are not redistributed here. The extracted copyright and resource notices are retained. SHA-256 in [SHA256SUMS](vendor/SHA256SUMS). |
| `twentytwentyone/assets/images/*.jpg` inside each archive | Berthe Morisot paintings, original source links in the upstream readme | Public domain. Present in downloaded upstream packages; not redistributed here or used in the repair page. |
| Form-control styling within parent CSS/SCSS | Aaron Iker and Chris Coyier, source links in upstream readme | MIT portions within the GPL theme; upstream notices retained. |
| `proof/edited-parent.tar.gz` | Only the edited Twenty Twenty-One 2.3 `functions.php`, `style.css` and upstream `readme.txt` | GPL-2.0-or-later, with the same upstream component notices. |
| `artwork/fonts/Inter-Regular.ttf`, `artwork/fonts/Inter-SemiBold.ttf` |  Inter by Rasmus Andersson | SIL Open Font License 1.1, [notice](artwork/fonts/LICENSE-Inter.txt). |
| `artwork/fonts/InstrumentSerif-Regular.ttf` |  Instrument Serif | SIL Open Font License 1.1, [notice](artwork/fonts/LICENSE-InstrumentSerif.txt). |
| `artwork/fonts/JetBrainsMono-Bold.ttf` |  JetBrains Mono | SIL Open Font License 1.1, [notice](artwork/fonts/LICENSE-JetBrainsMono.txt). |
| `artwork/make-hero`, `artwork/make-button`, `artwork/make-update-proof` | Ardholt's casebook artwork | Original scripts, GPL-2.0-or-later for this case. |

Twenty Twenty-One is GPL-2.0-or-later. Its product names, author names and CSS/art credits identify upstream software and resources, not a client or business represented by this case. “Furniture repair”, “Repair services” and “Furniture Repair Child” are descriptive page and theme labels, not a distinct business identity.

Upstream references to generated CSS describe ordinary stylesheet generation. Unused social and contact block patterns stay in the runtime downloads; they are absent from the recovered-files archive. The licence text and upstream copyright notices are preserved.

Docker downloads WordPress (GPL-2.0-or-later), WP-CLI (MIT), MariaDB (GPL-2.0), Playwright (Apache-2.0), Chromium (BSD and bundled component licences), ImageMagick (ImageMagick licence) and their runtime dependencies. These container contents are not redistributed in this folder; their own image notices apply.
