# Brave New Tab Redirect

Mini-Extension: Leitet jeden neuen Tab (`brave://newtab`) auf die
Bonjourr-Startseite um. Funktioniert über die `tabs`-API — kein
`chrome_url_overrides` nötig.

## Warum vorher „ERR_BLOCKED_BY_CLIENT"?

Chromium blockt programmatische Navigationen von **einer** Extension zur
**anderen** Extension — das macht `ExtensionNavigationThrottle` im Chromium-
Quellcode. Direkt aus der Adressleiste öffnen geht, weil das eine
nutzer-initiierte Navigation ist. Eine Extension kann das nicht simulieren.
Die Ausnahme: Die Zielseite steht in `web_accessible_resources` der
Ziel-Extension.

## Die Lösung hat zwei Teile

1. **Bonjourr deklariert `index.html` als web-accessible** (seit diesem Change
   im Repo: `src/manifests/chrome.json` und `edge.json`). Deshalb muss die
   **selbst gebaute** Bonjourr-Version geladen werden — die Web-Store-Version
   hat das noch nicht.
2. **Die Redirect-Extension findet die Bonjourr-ID automatisch** über
   `chrome.management` (Permission `management`) — damit ist es egal, ob die
   ID aus dem Web Store oder von einem Dev-Build stammt.

## Setup (Brave)

1. Bonjourr aus diesem Repo bauen:
   ```bash
   deno task build chrome
   ```
   → Ausgabe liegt in `release/chrome/`.
2. In `brave://extensions` die **alte Bonjourr-Installation deaktivieren oder
   entfernen** (sonst gibt es zwei Bonjourr-Instanzen).
3. `brave://extensions` → Developer Mode → **Load unpacked** →
   `release/chrome/` wählen.
4. Redirect-Extension laden: **Load unpacked** → diesen Ordner
   (`brave-newtab-redirect`).
5. Testen: „+" öffnet jetzt Bonjourr (mit Favicon).

## Alternativen

- **Ohne Umbau:** In `background.js` `TARGET`-Logik umgehen und stattdessen
  auf `https://online.bonjourr.fr` umleiten — das ist eine normale Website,
  keine Extension-Seite, und wird nie geblockt. Du nutzt dann aber die
  Online-Version (eigene Einstellungen, ggf. importieren/syncen).
- Die Store-Version von Bonjourr kann die Navigation erst erlauben, wenn der
  `web_accessible_resources`-Change veröffentlicht wurde.

## Hinweise

- Beim Öffnen blitzt kurz Bravers Dashboard auf, dann springt der Tab auf
  Bonjourr.
- Auch eine manuell eingegebene `brave://newtab` wird umgeleitet.
- Private/Inkognito-Fenster: Dort laufen Extensions standardmäßig nicht.
- Die Permission `management` ist nötig, damit die Redirect-Extension die
  Bonjourr-ID selbst herausfinden kann.
