# 🧑‍✈️ Bonjourr checklist

A manual checklist to use before an update, alongside the automated checks run with `deno task test`.

## General

- Show all settings
- Langues
- Dark mode
  - Toggle
  - Système
  - Auto
- Tab favicon
- Tab title
  - Tooltip
- Hide settings icon

## Background

- Unsplash
  - Background frequency
    - Onglet
    - Heure
    - Lumière du jour
    - Jour
    - Pause
  - Refresh
  - Collection
    - Simple
    - Multiple
    - Full URL
    - Tooltip
- Local
  - Add files
    - Single file
    - Multiple files
    - jpg, png, gif
    - Drop-in
  - Thumbnails
    - Select
    - Remove
    - Remove selected
    - Remove last
    - Show all
  - Background frequency
    - Onglet
    - Heure
    - Daylight
    - Jour
    - Pause
  - Refresh
- Background blur
- Background brightness

## Links

- Toggle quick links widget
- Add new link
  - From settings
  - With title
  - No protocol in URL
- Open in a new tab
- Link styles
  - Large
  - Medium
  - Small
  - Inline
  - Text
- Links per row
  - Large, medium, small
  - Inline, text
- Toggle link titles
- Toggle link backgrounds

### Thumbnail

See [Thumbnail documentation](../docs/THUMBNAILS.md) for expected behavior and platform limitations.

- Enable Thumbnail: grant access, deny access, and retry after denying
- Revoke website access and check that capture fails without losing the previous image
- Select Icon → Thumbnail → Apply changes and verify that the image updates
- Open a new Bonjourr tab and change link styles: cached images appear without opening websites
- Disable and re-enable Thumbnail: cached images are retained
- Clear thumbnail cache, including during a capture: images are removed and pending captures are cancelled
- Check fallback icons, corner radius, titles, and link backgrounds with and without a cached image
- Check that Website favicon, URL, and Local file icons still work as before
- Expand and collapse the help text; check animation, inline cache feedback, and timed message dismissal
- Check capture window visibility and focus restoration on each supported desktop platform

## Clock and date

- Toggle
- Show seconds
- Digital
  - 12 hour format
  - AM/PM label
- Analog
  - Shape
  - Face style
  - Hand style
  - Face background
    - Shade
    - Opacity
  - Face border
    - Shade
    - Opacity
- Clock size
- World clocks
  - Adding text toggles next
  - Digital / Analog
  - Correct date
- Timezone
- Show
  - Clock and date
  - Clock only
  - Date only

## Weather & Greetings

- Toggle
- Location
  - Precise
    - Allowed
    - Blocked
    - Error
  - Approximate
  - Manual
    - Valid city name
    - Wrong name
- Unit
  - Celsius
  - Fahrenheit
- Forecast
  - Automatic
  - Always show
  - Never show
- Temperature
  - Actual
  - Feels like
  - Both
- Detailed weather
  - Default
  - Custom
- Greetings
  - Toggle
  - Name

## Notes

- Toggle
- Align
  - Left
  - Center
  - Right
- Width
- Background
  - Shade
  - Opacity

## Search bar

- Toggle
- Open in new tab
- Suggestions
  - Toggle
  - All engines
- Engines
  - Default
  - Others
  - Custom
- Placeholder text
- Width
- Background
  - Shade
  - Opacity
