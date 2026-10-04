# Toolbar icons

At 16px in the Safari toolbar these marks are hard to read, and most of them are
easy to mistake for one another. This is what each one means.

The icon always describes **the active tab**, and it is decided by the
controller inside Web Scrobbler — Kit Scrobbler only draws the artwork
(`app/shared/action-icon.ts` maps the state, `app/background/kit.ts` sets it).

| Icon | State | Artwork | Why you might be seeing it |
| :-- | :-- | :-- | :-- |
| <img src="app/icons/action_base.svg" width="32" alt="Base"> | `base` | `app/icons/action_base.svg` | The site is supported and Kit Scrobbler is waiting — this page has nothing playing yet. |
| <img src="app/icons/action_disabled.svg" width="32" alt="Disabled"> | `disabled` | `app/icons/action_disabled.svg` | You turned scrobbling off for this site. "Enable for this site" in the popup turns it back on. |
| <img src="app/icons/action_disallowed.svg" width="32" alt="Disallowed"> | `disallowed` | `app/icons/action_disallowed.svg` | Something is set to not scrobble here — usually a connector option such as "only recognised tracks", or a site-specific restriction built into the connector. |
| <img src="app/icons/action_error.svg" width="32" alt="Error"> | `error` | `app/icons/action_error.svg` | A scrobbling service refused the last scrobble. Most often the session expired, so reconnecting the account in Settings fixes it. |
| <img src="app/icons/action_ignored.svg" width="32" alt="Ignored"> | `ignored` | `app/icons/action_ignored.svg` | The track was scrobbled but the service threw it away — it is on your Last.fm ignored list, or too short for the service to keep. |
| <img src="app/icons/action_loading.svg" width="32" alt="Loading"> | `loading` | `app/icons/action_loading.svg` | Track details are still being fetched. Brief, but it can stick if a site is slow to report the track. |
| <img src="app/icons/action_loved.svg" width="32" alt="Loved"> | `loved` | `app/icons/action_loved.svg` | You loved the track. |
| <img src="app/icons/action_paused.svg" width="32" alt="Paused"> | `paused` | `app/icons/action_paused.svg` | Playback is paused. The time played so far is remembered, so the track can still be scrobbled when it resumes. |
| <img src="app/icons/kit-scrobbler-recording.svg" width="32" alt="Playing"> | `playing` | `app/icons/kit-scrobbler-recording.svg` | A track is playing and its time is being counted toward a scrobble. |
| <img src="app/icons/action_scrobbled.svg" width="32" alt="Scrobbled"> | `scrobbled` | `app/icons/action_scrobbled.svg` | The track was scrobbled. |
| <img src="app/icons/action_skipped.svg" width="32" alt="Skipped"> | `skipped` | `app/icons/action_skipped.svg` | The track was skipped before it played long enough to count, so nothing was sent. |
| <img src="app/icons/action_unknown.svg" width="32" alt="Unknown"> | `unknown` | `app/icons/action_unknown.svg` | Something is playing, but the track could not be identified — often a live stream or a page whose details have not loaded. |
| <img src="app/icons/action_unloved.svg" width="32" alt="Unloved"> | `unloved` | `app/icons/action_unloved.svg` | You removed a love from the track. |
| <img src="app/icons/action_unsupported.svg" width="32" alt="Unsupported"> | `unsupported` | `app/icons/action_unsupported.svg` | This site is not one Kit Scrobbler knows, so nothing here can be scrobbled. This is also what the toolbar shows before any tab reports a state. |

## Where the files come from

The artwork lives in `app/icons` as SVG, one file per state. Safari's
`action.setIcon` needs a bitmap, so `scripts/action-icons.ts` renders each SVG at
every size Safari asks for and writes them into the extension as:

```
icons/action_<state>_<size>_<theme>.png        e.g. icons/action_loved_32_safari.png
```

- sizes: `16`, `19`, `32`, `38`
- themes: `safari`, `light`, `dark` — Kit's artwork is the same for all three,
  so each render is written under every theme name

The artwork is converted with `Bun.WebView`: the page draws the SVG into a canvas
at the requested size and returns a PNG, which keeps the transparency the marks
need. That runs on the system WebKit on macOS and on Chrome elsewhere, so nothing
extra is needed to build.

To change a mark, edit its SVG in `app/icons` (or add one and a line to
`ACTION_ICONS` in `app/shared/action-icon.ts`) and rebuild.
