# Changelog

Raindrop follows semantic versioning (MAJOR.MINOR.PATCH). The version lives in
`manifest.json` and is shown at the bottom of the settings sidebar.

## 1.3.1
- Todos: delete and add buttons share one size and right edge so they always line up; custom checkbox; long tasks wrap
- Notes: resizable in both directions (size is remembered), long lines wrap
- Background transitions: photo is decoded before animating, a gradient shows instantly while a photo loads,
  changing the transition or speed previews it, "Next photo now" button, reduce-motion systems get a fade instead of nothing

## 1.3.0
- Background transitions: fade, slide in, slide out, zoom fade or none, with a speed slider
- Option to hide the Unsplash photo credit
- Sidebar title shows your name live (falls back to "Raindrop")
- Todos scale with the widget; the add button sits inside the field; round glass delete buttons
- New Search Settings: more engines plus a custom URL, and bar styles (pill, rounded, empty line,
  glowing line, outline, frosted glass, minimal), optional icon and placeholder text
- API keys: optional passphrase vault (AES-256-GCM, PBKDF2-SHA256 600k iterations), unlocked once per browser session;
  keys are never exported, and only the encrypted vault can be synced (opt-in)
- Strict Content Security Policy; no plaintext "download config.js"
- Sync: Google account (Drive app folder, easiest) or GitHub Gist (advanced)

## 1.2.2
- Todo + button restyled as a soft glass button
- Sidebar sections open and close with a smooth animation
- Quote Settings now sits below Groups and widget styles
- Unsplash credit follows API guidelines (photographer line with referral link)
- Removed an unneeded host permission (images.unsplash.com)
- Chrome Web Store package and listing assets added

## 1.2.1
- Todos: cleaner add-task field with a + button and no white focus outline
- Sidebar is an accordion: opening a section closes the others; Background is open by default
- "Clocks" renamed to "Clock Settings"; tidier clock rows with a small remove button
- Quote Settings is its own dropdown, shown only while the Quote widget is on;
  Clock Settings is shown only while the Clock widget is on

## 1.2.0
- Widgets and groups: no hover borders; the pointer shows they are clickable, and clicking
  selects one and reveals its move and lock icons (click elsewhere or press Esc to deselect)
- API keys can be entered in a pop-up (Sync and API keys > API keys...); config.js still works as a fallback
- Optional sync of the Unsplash and API Ninjas keys to the private Gist (the GitHub token is never synced)
- "Download config.js" button in the keys pop-up
- Sidebar sections are collapsible dropdowns; open/closed state is remembered

## 1.1.0
- Fixed: v1.0.0 shipped with part of app.js missing, which broke widgets and settings
- Groups: widgets can be grouped, ungrouped, and styled as a group
- Every widget and group: hover move and lock icons (white, hidden until hover),
  size, font, weight, colour, background opacity (0 = fully transparent), corner radius
- Unsplash: Official Collection / Topic / Search / Collection, featured-only,
  pause, refresh interval, blur and luminosity
- API keys moved to config.js (see config.example.js); GitHub token no longer entered in the UI
- Settings schema versioning with automatic migration from 1.0.0

## 1.0.0
- First release: rain-on-glass background, clocks, search, links, todos, notes, quotes, GitHub sync
