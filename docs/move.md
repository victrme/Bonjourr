# Move Feature

The Move feature provides a UI for rearranging, resizing, and aligning widgets on the new‑tab page.

## Core Concepts
- **Widget** – a UI component (time, main, quicklinks, notes, quotes, searchbar, pomodoro).
- **Grid** – a 2‑D array of widget IDs (`string[][]`). Empty cells are `'.'`.
- **Direction** – one of `up`, `down`, `left`, `right`. Used for moving and growing widgets.

## Main Modules
| File | Purpose |
|------|---------|
| `dom.ts` | Helpers for applying CSS grid (`setGridAreas`), aligning widgets (`setAlign`, `setAllAligns`), and handling overlay UI. |
| `grid.ts` | Implements `gridMove` – mutates the grid to move a widget, handling edge expansion, collisions, and trimming. |
| `grow.ts` | Implements `gridGrow` – expands a widget in a given direction, also handling edge expansion and collisions. |
| `helpers.ts` | Shared utilities: grid parsing/stringifying, widget lookup (`gridFind`, `gridFindObject`), widget list, health check (`isDomHealthy`), and span handling. |
| `index.ts` | Central controller (`moveElements`, `updateMoveElement`). Defines `UpdateMove` payload, queues health checks, and routes actions to `gridMove`, `gridGrow`, alignment, etc. |
| `widgets.ts` | Handles toggling widget visibility, overlay updates, and UI transitions. |

## Workflow
1. **Overlay Actions** – Buttons in the overlay call `moveElements(undefined, { id, move: '<direction>' })` for moving or `grow` for resizing.
2. **Update Move** – `updateMoveElement` receives an `UpdateMove` object, loads the current `Sync` state, and dispatches to:
   - `gridMove` (directional move) 
   - `gridGrow` (directional grow) 
   - Alignment helpers (`alignChange`) 
   - Reset, toggle, and overlay flags.
3. **Grid Manipulation** – Both `gridMove` and `gridGrow` follow a 5‑step process:
   1. **Add edges** if the widget touches a grid border.
   2. **Swap/expand** the widget’s cells.
   3. **Fix collisions** (push overlapping widgets, ensure rectangles).
   4. **Trim empty rows/columns**.
   5. **Persist** changes (`storage.sync.set`) and update CSS (`setGridAreas`).

## Health Check
`helpers.ts` introduces `isDomHealthy()` which verifies that the `#interface` element exists and its `gridTemplateAreas` style is not `'none'`. `index.ts` queues a micro‑task to reset the layout if the DOM is unhealthy.

## Known Issues / TODOs
- `pageWidthOverlay` is currently commented out and unused.
- Some legacy code (`direction` → `move` renaming) remains in older commits but is fully migrated.

## Usage Example
```ts
// Move widget #main down one row
moveElements(undefined, { id: 'main', move: 'down' });

// Grow widget #quotes to the right
moveElements(undefined, { id: 'quotes', grow: 'right' });
```

---
*Generated from the current source tree (src/scripts/features/move/*).*
