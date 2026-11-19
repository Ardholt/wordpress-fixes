# Video ownership and asset licences

I created the visitor-guide video at `source/assets/visit-guide.webm`. The wording and animated progress graphic are original, with no borrowed footage or audio. [The FFmpeg recipe](tools/make-video.sh) recreates the clip; [the media record](proof/video.json) identifies its format and duration.

The case code, video, recordings, screenshots, GIF and page copy are my own work, provided under the repository's MIT licence. The page uses descriptive headings rather than a business name.

The Ardholt comparison renderer at `tools/hero/make-hero` uses the actual browser screenshots. It is casebook source under the repository's MIT licence. The [editing record](proof/edit.json) documents the crops, labels and cuts used in the opening recording.

| Retained font file | Author / source | Licence |
|---|---|---|
| `tools/hero/fonts/InstrumentSerif-Regular.ttf` | Instrument Serif, Instrument | [SIL Open Font License 1.1](tools/hero/fonts/LICENSE-InstrumentSerif.txt) |
| `tools/hero/fonts/Inter-SemiBold.ttf` | Inter, Rasmus Andersson | [SIL Open Font License 1.1](tools/hero/fonts/LICENSE-Inter.txt) |
| `tools/hero/fonts/JetBrainsMono-Bold.ttf` | JetBrains Mono, JetBrains | [SIL Open Font License 1.1](tools/hero/fonts/LICENSE-JetBrainsMono.txt) |

The original video and recording labels use the retained Inter SemiBold font. Application and rendering software run in containers; those binaries are not redistributed here. Their versions are recorded in [the run conditions](proof/run.json) and [rendering versions](proof/media-tool-versions.txt). Technical setup is in [the reproduction guide](REPRODUCE.md).
