# od-sifra — Claude Code instructions

## Design constraints

- **App background must be black (`#000000`).** This applies to both light and dark modes in `web/src/app/globals.css` (`--background` in `:root` and in `.dark`). Do not change to off-black values like `#0A0A0A`, `#111`, etc. If a future task touches the background, keep it black or ask before changing.
