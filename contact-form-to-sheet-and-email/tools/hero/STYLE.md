# Delivery evidence images

The README opens with a compact record card rendered by `scripts/evidence-card.cjs`. It reads the verified submission, spreadsheet and mail records from `proof/`, prints the matching name, reference and message, and labels the inbox as local. It is a readable transcription of those records, not an application screenshot.

The card is 780 pixels wide and its height follows the content. Message text is 32 pixels; name text is 34 pixels. `proof/hero.json` records the rendered dimensions and source records. The linked files and captures let the reader inspect the underlying results.

## Before/after frame

`make-hero` frames the full browser captures as `media/before-after.png`. The two panels are stacked. Each has a label, a short explanation and its screenshot. The caption and case mark sit below the panels.

```bash
./tools/hero/make-hero proof/before.png proof/after.png media/before-after.png \
  --title 'From a false success to a matching row and mail' \
  --before-note 'Said sent. No row, no mail.' \
  --after-note '1 row + 1 mail. Same enquiry.' \
  --where 'Local SQLite sheet + Mailpit' --tag 'WORDPRESS FIXES · CASE 07'
```

The frame is 1200 pixels wide, with 48-pixel outer margins and 350-pixel screenshot panels. Notes use Inter SemiBold, the caption uses Instrument Serif, and labels use JetBrains Mono. Font notices are beside the files in `fonts/`.

| Colour | Use |
|---|---|
| `#0b0a0a` | Background |
| `#211d1c` | Screenshot bar |
| `#352f2e` | Frame lines |
| `#f1ece6` | Primary text |
| `#cfc8c0` | Secondary text |
| `#8e8782` | Muted labels |
| `#ff3b1f` | Caption rule |

## Delivery sequence

`scripts/render.sh` assembles the GIF from the actual form, sheet, LibreOffice and received-message captures. The LibreOffice detail is a crop of its full application capture. Frames are held for readability; the observed duration and file size are recorded in `proof/run.json`. All PNG and GIF metadata is stripped before publication.
