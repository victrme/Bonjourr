# Bonjourr Development Guide

This document provides essential information for agentic coding agents working on the Bonjourr codebase. Bonjourr is a minimalist and customizable "new tab" browser extension built using Deno.

## 1. Development Environment & Commands

Bonjourr uses **Deno** as its primary runtime and task runner. Avoid using `npm` or `yarn` directly unless specified.

### Build Commands

- **Full Build:** `deno task build`
- **Platform-Specific (Dev Mode):**
    - Chrome: `deno task chrome`
    - Firefox: `deno task firefox`
    - Edge: `deno task edge`
    - Safari: `deno task safari`
    - Online (Web version): `deno task online`
- **Serve Locally:** `deno task serve` (runs on port 8000 by default)

### Linting & Formatting

Bonjourr strictly follows Deno's built-in formatting and linting rules.

- **Format Code:** `deno task format` (runs `deno fmt`)
- **Lint Code:** `deno lint`
- **Type Checking:** `deno task types` (runs `deno check`)

### Testing

- Run all tests everytime
- **Run All Tests:** `deno task test`

---

## 2. Code Style & Conventions

### Imports

- **Mandatory Extensions:** ALWAYS include the file extension in imports (e.g., `import { foo } from './utils.ts'`).
- **Deno Modules:** Use `jsr:` or `npm:` prefixes for external dependencies as defined in `deno.json`.
- **Absolute Paths:** Use relative paths for internal modules.

### Formatting (`deno fmt` configuration)

- **Indentation:** Use **Tabs**.
- **Indent Width:** 4.
- **Line Width:** 120 characters.
- **Semicolons:** **NO semicolons** (except where syntactically required).
- **Quotes:** Use **single quotes** for strings.

### Typing & Naming

- **Strict Typing:** Always prefer explicit types over `any`. Leverage TypeScript interfaces and types in `src/types/`.
- **Constants:** Use `UPPER_SNAKE_CASE` (e.g., `CURRENT_VERSION`, `SYNC_DEFAULT`).
- **Functions/Variables:** Use `camelCase`.
- **File Naming:** Use `kebab-case` or lowercase for filenames (e.g., `webext-storage.js`, `settings.ts`).

### Error Handling

- Use `try/catch` blocks for operations that might fail (e.g., storage access, API calls).
- Log warnings/errors using `console.warn` or `console.error` with descriptive messages.
- Avoid silent failures in critical paths like `startup()`.

### DOM Manipulation

- Bonjourr is a browser extension; direct DOM manipulation is standard.
- Use `document.getElementById` or `document.querySelector`.
- Use `dataset` for state management on the `<html>` or `<body>` elements (e.g., `document.documentElement.dataset.theme = 'dark'`).

---

## 3. Project Structure

- `/src/scripts/`: Main application logic.
    - `features/`: Modular components (clock, weather, backgrounds, etc.).
    - `shared/`: Utility functions used across features.
    - `utils/`: Low-level helpers (translations, permissions, etc.).
    - `services/`: Background services and storage management.
- `/src/types/`: TypeScript definitions.
- `/tasks/`: Build and automation scripts (written in TypeScript).
- `/tests/`: Test suite using `deno test`.
- `/_locales/`: Internationalization JSON files.

---

## 4. Internationalization (i18n)

- All user-facing strings should be localized.
- Use `traduction(null, sync.lang)` for initial translation and `setTranslationCache` for caching.
- To update translations after adding new keys to `_locales`, run:
    ```bash
    deno task translate
    ```

---

## 5. Best Practices for Agents

1. **Self-Verification:** After modifying code, always run `deno task types` and `deno lint` to ensure no regressions.
2. **Tab Consistency:** Ensure your editor settings respect the use of tabs for this project.
3. **No Semicolons:** Do not add semicolons as they will be stripped by the formatter anyway.
4. **Platform Awareness:** When modifying features, consider if the change affects all platforms (Chrome, Firefox, Safari, Online). Use constants from `src/scripts/defaults.ts` to check `PLATFORM` or `BROWSER` if necessary.
5. **Storage:** Use the `storage` abstraction in `src/scripts/storage.ts` instead of direct `chrome.storage` calls where possible to ensure cross-browser compatibility.
6. Do not try to add dependencies, find a native solution
7. Repeat yourself instead of writing difficult code

---

## 6. Feature Script & Settings Architecture

### Core Entry Point: The Dispatcher

Each feature exports a single function that acts as a state switcher. It handles two distinct phases: **Initialization** and **Live Updates**.

```typescript
export function feature(init?: FeatureSync, update?: FeatureUpdate) {
	if (update) {
		updateFeature(update); // Live update from Settings
		return;
	}
	if (init) {
		initFeature(init); // Initial load on Startup
	}
}
```

### UI Handlers (Setters)

Features use internal "handle" or "set" functions to manipulate the DOM. This keeps logic DRY as both initialization and updates use the same UI handles.

- **Styling**: Prefer CSS variables on `document.documentElement` (`--feature-property`).
- **State**: Use `dataset` attributes or class toggles on the feature's container.

```typescript
const setWidth = (val: number) =>
	document.documentElement.style.setProperty("--feature-width", `${val}em`);

const handleToggle = (state: boolean) =>
	container?.classList.toggle("hidden", !state);
```

### The `updateFeature` Logic

This internal function processes partial changes from the settings menu.

1.  **Read**: Fetches the current feature state from `storage.sync`.
2.  **Apply**: Updates the object and immediately triggers the relevant **UI Handlers**.
3.  **Persist**: Saves the updated object using `eventDebounce({ feature })` to optimize storage writes.

### Settings Wiring (`src/scripts/settings.ts`)

The settings module acts as a declarative controller that connects HTML inputs to feature functions.

Settings are wired using standard DOM events or the `onclickdown` utility. The convention is to pass `undefined` as the first argument to signify a live update.

```typescript
// Example Wiring in initOptionsEvents()
paramId("i_feature-property").addEventListener("input", function () {
	feature(undefined, { property: this.value });
});
```

### Input Mapping Convention

| UI Input Type            | Event         | Feature Payload                |
| :----------------------- | :------------ | :----------------------------- |
| **Sliders / Ranges**     | `input`       | `{ property: this.value }`     |
| **Dropdowns / Selects**  | `change`      | `{ property: this.value }`     |
| **Checkboxes / Toggles** | `onclickdown` | `{ property: target.checked }` |
| **Action Buttons**       | `onclickdown` | `{ trigger: true }`            |

### Feature Best Practices

- **Parallel States**: Ensure the `init` logic and `update` logic are idempotent so settings can be changed repeatedly without side effects.
- **Decoupling**: The settings menu should never manipulate the feature's DOM directly; it must always go through the `feature()` entry point.
- **Persistence**: Only use `eventDebounce` for values that change frequently (like sliders) to avoid hitting browser storage limits.
- **Naming**: File names use `kebab-case`, while entry point functions use `camelCase` matching the feature name.

---

## 7. CSS Architecture & Styling

### Main Entry Point

The primary CSS entry point is `src/styles/style.css`. This file acts as a manifest that imports all other CSS modules in a specific order.

### Import Order

1. `_global.css` - Must be imported first (CSS custom properties and global variables)
2. Interface styles (global layout, backgrounds, settings display)
3. Settings menu styles (global settings, inputs, dropdowns)
4. Components (reusable dialog boxes, forms)
5. Features (time, searchbar, notes, links, etc.)
6. `_responsive.css` - Must be imported last (responsive breakpoints)

### File Structure Convention

CSS files are organized by functional area:

- `interface/` - Main page styling
- `settings/` - Settings panel styling
- `features/` - Individual feature styling
- `components/` - Reusable UI components
- `_global.css` - CSS custom properties
- `_responsive.css` - Responsive breakpoints

### Selector Specificity Strategy

The project follows a **low selector specificity** approach:

1. **Class-based styling** preferred over ID selectors where possible
2. **Repeat selectors** rather than complex nested rules
3. **Group related rules** by functional area with clear comments

### Variable System

Global variables are defined in `_global.css` as CSS custom properties:

```css
:root {
	--page-width: 1600px;
	--page-gap: 1em;
	--font-family: -apple-system, system-ui, Ubuntu, Roboto, "Open Sans";
	--border-radius: 25px;
}
```

### Theme Support

Light and dark themes are handled via data attributes:

```css
[data-theme="light"] {
	--color-text: #222222;
	--color-param: 255, 255, 255;
	--color-settings: #f2f2f7;
}

[data-theme="dark"] {
	--color-text: #ffffff;
	--color-param: 0, 0, 0;
	--color-settings: #000000;
}
```

### Styling Principles

#### 1. Progressive Enhancement

- Use `@supports` for feature detection
- Provide fallbacks for modern CSS features
- Only target modern Chromium, Firefox, and Safari. No IE or Opera Mini.

#### 2. Responsive Design

- Breakpoints defined in `_responsive.css`
- Use `dvh` units with `vh` fallbacks

#### 3. Performance

- Minimal CSS nesting
- No `!important` declarations
- Efficient selector patterns
- CSS custom properties for runtime theming

#### 4. Maintainability

- Clear file organization
- Descriptive comments when creating complex selectors
- Consistent naming conventions
- Logical grouping of related styles

### Naming Conventions

#### ID Selectors

- `kebab-case` for element IDs
- Descriptive names indicating purpose
- Feature-specific prefixes where appropriate

#### CSS Classes

- Semantic names over presentational
- Reusable utility classes in `other.css`
- State classes like `.shown`, `.hidden`, `.active`

#### CSS Custom Properties

- `--prefix-description` format
- Group related properties
- Document default values

### Animation Guidelines

#### Transition Patterns

- Use CSS custom properties for timing functions
- Consistent easing curves (`--out-cubic`)
- Hardware-accelerated properties (`transform`, `opacity`)

#### Performance Considerations

- `will-change` for animated elements
- Minimize paint operations
- Debounce rapid animations

### Browser Support

#### Core Support

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Progressive enhancement for older browsers
- Cross-browser testing for all platforms

#### Vendor Prefixes

- Limited use of vendor prefixes
- Autoprefixer in build process
- Feature detection where needed

### Testing

#### Visual Testing

- Test across all supported browsers
- Verify responsive breakpoints
- Check theme switching functionality

#### Performance Testing

- CSS bundle size monitoring
- Render performance metrics
- Animation smoothness

---

_Created for automated development assistance in the Bonjourr repository._
