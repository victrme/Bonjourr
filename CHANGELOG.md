## 1.17.0

-   Local background:
    -   No more slowdown when adding or loading new images
    -   Loading is much faster and is not blocking
    -   Online: Images can be as big as you want
    -   Minor option styling improvements
-   Notes:
    -   Added line modification keybindings (headings, lists, todos)
    -   Caret keeps horizontal position when moving between lines
    -   Working Ctrl + Z when adding / removing lines
    -   Strikes text when checking todo list
    -   Improved overall stability
-   Page layout:
    -   Added page gap option
    -   Moved options below custom fonts
-   Other:
    -   Faster loading times with Quotes or custom Fonts enabled
    -   Upgraded to google fonts v2 with variable fonts
    -   "Good night" greetings narrowed to 2h - 5h
    -   Moved translations to `/_locales/[lang]/translations.json`
    -   Minor settings accessibility improvements
    -   Reduced script overhead

$~~~~~~~~~~~$

## 1.16.4

-   Improvements:
    -   No more layout shift when toggling widgets (on slow computers)
    -   Shows grid overlay when changing page width
    -   Grid toolbox "Done" button is always clickable
-   Fixes:
    -   Leading zero on export file name
    -   Long link titles not truncated
    -   Removing custom font not working
    -   Links dragging broken with settings open

## 1.16.3

-   Added:
    -   Transparent clock style
    -   #192 Detailed weather feature
-   Fixes:
    -   #194 Fixed error in Firefox browser console
    -   #191 Improved export settings order
    -   #190 Improved export file naming
    -   Reduced compression (improved quality) on high DPR devices
    -   Links dragging breaking with small page width
    -   Tab title showing path when removing input
-   Translations:
    -   Added modern Greek by @tseli0s, thanks !

## 1.16.2

-   Added square analog clock style
-   Added page layout support on mobile
-   Fixes:
    -   Improved layout move behavior with empty rows
    -   Improved Notes overall stability
    -   Weather API not working
-   Translations:
    -   Improved Traditional Chinese translation, thanks @TszHong0411 !

## 1.16.1

-   Added support for nested data imports ( ex: searchbar.request )
-   Smaller image file sizes for high resolution devices & mobile
-   Translations:
    -   Brazilian update by @adilsonfsantos
    -   Dutch update by @kar1
    -   Fixed Polish "Good Afternoon"
-   Fixes:
    -   Clock zero on 12am/pm, thanks @aprivette
    -   Kiwi browser settings position

## 1.16.0

-   Added features:
    -   Custom quote list
    -   Custom searchbar placeholder
    -   Move page widgets !
        -   Select between 3 different layouts
        -   Use toolbox with "Edit grid" to move widgets around
        -   Widgets on/off state are independent between layouts
-   Reworked Notes:
    -   Directly edit content on the fly
    -   Added width option
    -   No more keyboard shortcuts (working on it)
    -   Only markdown title, lists and checkboxes available
-   Translations:
    -   Added cyrillic & latin Serbian, thanks @StormIgy
-   Changes:
    -   Moved "Hide elements" option to respective option blocks
    -   Moved "Greetings" to "Weather & greetings" option
    -   "Time" & "Weather" now toggleable widgets ( like searchbar, quotes, etc )
    -   Granular opacity slider for searchbar & notes
    -   Numerical Clock has double zero (00) on 24h
-   Fixes:
    -   Low-res links favicons
    -   Landscape interface height on tablet
    -   "open in new tab" not working on safari

$~~~~~~~~~~~$

## 1.15.6

-   Footer no longer takes height space (except on mobile)
-   Notes: more visible edit button & focus after edit
-   Fixes:
    -   Accidental "!" in russian greetings
    -   Innaccessible links when overflowing or too low
    -   Half solid black page on some touch screen devices
    -   Slightly blurry settings panel on Chrome

## 1.15.5

-   Hotfix: Fixed searchbar stuck in "open in new tab" state

## 1.15.4

-   Fixes:
    -   File export not working with non-latin language
    -   Searchbar events capturing `Enter` key instead of submit
-   Clicking on the extension icon now creates a new tab
-   Improved resize performance
-   Minor style changes

## 1.15.3

-   Fixes:
    -   Links impossible to remove on Safari extension
    -   Removing last link prevents adding new ones

## 1.15.2

-   Translations:
    -   Brazilian update by @adilsonfsantos
    -   Traditional Chinese by Pu · @unknownnumbers
    -   Hungarian by @cook3r
    -   Finnish by @jaajko
-   Fixes:
    -   Visual issues on Safari
    -   Overall experience on Safari iOS
    -   Refresh backgrounds with daylight frequency

## 1.15.1

-   Replaced fade to black background transition
-   Small Dutch translation fixes by @esteinmann
-   Fixes:
    -   Accidental dragging on links
    -   CSS editor alignment styling
    -   Custom collection impossible to remove
    -   Keyboard resizing / breaking page on mobile
    -   Credit display when switching background type

## 1.15.0

-   Added feature: Notes !
    -   Compatible with basic markdown
    -   Check tick boxes on the fly
    -   With keyboard shortcuts, see [more in docs](https://bonjourr.fr)
-   Reworked features:
    -   Settings import, export and reset
    -   Quick links rearrange
-   Improved Accessibility;
    -   “Skip to settings” button when tabbing on page
    -   Quick links now behaves like native browser links
    -   Press “e” when focused to edit Link, “Esc” to close
    -   Settings are now usable keyboard only
    -   Improved input ARIA and focus outline when tabbing
-   Added draggable settings panel on mobile
-   Updated polish & turkish translations, thanks Jakub Mikuło and @lazjedi !
-   Improved bookmark import styling & unified dark mode colors
-   Slightly better startup performances on slow computers & mobile
-   Lots of background work to convert Bonjourr to typescript
-   Improved extension security

$~~~~~~~~~~~$

## 1.14.2

-   Better custom font performances
-   Increased tab title length from 12 to 80 characters
-   Fixed Russian quotes ( thanks again @DaniilChizhevskii )
-   Fixed error message styling issues
-   Improved font & dynamic error handling

## 1.14.1

-   Added toolip on new tab title & favicon option
-   Updated some Russian translations ( thanks @DaniilChizhevskii )
-   Fixed custom background remove button
-   Fixed custom background not working on Safari / Firefox
-   Fixed fonts with numbers in family name
-   Minor performance improvement on desktop

## 1.14.0

-   Added features:
    -   Link style option ( Icon sizes & text only )
    -   Custom new tab titles
    -   Text shadow slider
    -   “Daylight” background frequency control
    -   Integrated changelog to inform you of new features
    -   Danish translation ( thanks @kar1 )
    -   Added Search bar submit button
-   Increased links row range from [2, 12] to [1, 16]
-   Increased background resolution on mobile
-   Can upload multiple backgrounds at once
-   Reworked custom background thumbnails design
-   Automatically sets language on first launch
-   Refined Settings look & feel
-   New loading icon animation
-   Fixed favicon on Edge
-   Fixed review links on Safari and Edge

$~~~~~~~~~~~$

## 1.13.2

-   Added Quotes cache to reduce requests
-   Fixed custom fonts always fetching Fonts API

## 1.13.1

-   Added indonesian translation
-   Updated links icon design
-   Better resolution on new links icon
-   Removed 30 links limit
-   Changing language doesn't reload the page
-   Fixed link edit event on macOS
-   Fixed classic quotes defaulting to english

## 1.13.0

-   Added feature: Quotes !
-   Added Ukrainian & Turkish translations
-   Doubled links URL & title size
-   Updated links edit design
-   Credits inherits custom font
-   Fixed laptop responsive font size
-   Fixed some iOS / mobile stying
-   Fixed links aliases issues

$~~~~~~~~~~~$

## 1.12.1

-   Improved error message style & logic
-   Increased links url size to 217 characters
-   Greetings update on cached mobile pages
-   Fixed tiny default font size on mobile
-   Fixed import / export related bugs

## 1.12.0

-   Added exif details in photo credits
-   Links icons can now be synced !
-   Fixed font size for synced desktop / laptop
-   Fixed Google Font list API
-   Improved storage stability
-   Minor bug fixes & settings performance boost

$~~~~~~~~~~~$

## 1.11.2

-   Added temperature control option (need help with translations !)
-   Updated Dutch & Spanish translations (thanks @alisinisterra, @Kippenhof & @esteinmann)
-   Added ctrl + click to open link in new tab
-   Fixed firefox popup again

## 1.11.1

-   Fixed unremovable popup

## 1.11.0

-   Added features:
    -   Import browser bookmarks !
    -   Manually change dynamic background
    -   Change the tab favicon with an emoji
-   Added button outline when pressing tab
-   No more weather request when hidden
-   Improved weather city input UX
-   Improved font size input UX on mobile
-   Fixed mobile pages not changing backgrounds
-   Fixed error message appearing on firefox

$~~~~~~~~~~~$

## 1.10.2

-   Switch to another favicon provider (RIP Favicon Kit)
-   Fixed imports errors with 1.10 configs
-   Improved stability for long icon URLs
-   Removed Unsplash host permission
-   Tiny style fixes

## 1.10.1

-   Added search bar opacity control & delete text icon
-   Fixed links not opening on mobile & icon not showing URL
-   Fixed google font API exceeding quota
-   Improved links performance
-   Minor online fixes

## 1.10.0

-   New design !
-   Added PWA support for Android & iOS
-   Added animations & transitions
-   Added features:
    -   Custom search engine
    -   Clock face
    -   Partial imports
    -   Custom background frequency
-   Increased links limit from 15 to 30
-   Improved custom font experience
-   Improved settings and startup performance
-   Improved security

$~~~~~~~~~~~$

## 1.9.3

-   Dedicated backgrounds for noons & evenings
-   Added custom Unsplash collections option
-   Added search opens in new tab option
-   Added Spanish
-   Fixed dead links
-   Fixed styling issues
-   Fixed links icons API

## 1.9.2

-   Bonjourr now supports any image types
-   Fixed review redirection
-   Added animations
-   Added translations

## 1.9.1

-   Added all previously hidden features !
-   Bonjourr greetings
-   Hide interface elements
-   Analog clock
-   display seconds
-   Custom font, size and weight
-   Custom CSS
-   Select number of quick links rows

## 1.9.0

-   Added review popup
-   Dynamic backgrounds by default
-   Different unsplash collections for day & night
-   Infinite number of custom backrounds !
-   Searchbar internationalisation
-   Increased privacy for stored local data
-   Various fixes, style changes & performance boosts

$~~~~~~~~~~~$

## 1.8.3

-   Better dynamic backgrounds preload
-   Smaller settings icon
-   Fixed an issue that prevented Quick Links to be edited

## 1.8.2

-   Performance boost on low end hardware
-   Improved overall animations
-   Faster "each tab" dynamic backgrounds

## 1.8.1

-   Timezone Control
-   US Date Format
-   No distraction Mode

## 1.8.0

-   Rearrangeable Quick Links
-   Quick Links editing menu
-   Italian translation

$~~~~~~~~~~~$

## 1.7.2

-   German translation
-   Chrome: Browser icon + new tab on install
-   Import / Export Settings
-   Searchbar autofocus fix

## 1.7.1

-   Removed unsplash permissions from victor-azevedo.me
-   Windows lang select fix
-   4k background error fix

## 1.7.0

-   Massive performance on startup
-   Dynamic Backgrounds are now preloaded, a lot quicker and credited
-   Ability to change Dynamic Backgrounds every tabs, hourly, daily or pause
-   Visuals settings overall
-   General tab in the Settings
-   Footer settings overall
-   High resolution backgrounds are now activated by default
-   Slovak translation thanks to Roman Bartík
-   Brazilian portugese translation thanks to Adilson Santos

$~~~~~~~~~~~$

## 1.6.0

-   Massive performance boost
-   Quick Links improved
-   Less permissions on Firefox

$~~~~~~~~~~~$

## 1.5.5

-   New Favicon API
-   4k / Retina option
