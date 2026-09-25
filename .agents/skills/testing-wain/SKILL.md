---
name: wain-ui-testing
description: Run lean browser end-to-end checks for WAIN photo discovery and menu-grounded multilingual chat.
---

# WAIN browser testing

## Local setup
- Run `source ~/.nvm/nvm.sh` before Node/npm commands.
- Reuse a reachable dev server on port 3000, or run `npm run dev` from the repo root.
- Check installed Next/package versions rather than relying on handoff version labels.
- No app login is needed. Verify credential presence without printing values.

## Devin Secrets Needed
- `OPENAI_API_KEY`: vision and chat call the real provider; keep paid requests lean.

## Photo discovery
- Storefront starts with a camera label wrapping a hidden `input[type=file]` with image accept and environment capture.
- Desktop native chooser automation may not retain focus. Prefer native interaction first, then Playwright `setInputFiles` or CDP `DOM.setFileInputFiles` on that input if necessary.
- Select a synthetic readable restaurant sign from current seed data. Label synthetic fixtures honestly; bilingual card names do not prove Arabic OCR.
- When desktop GPS is denied/unavailable, use **set location** to expose latitude/longitude. Choose coordinates near the current seed place.
- Upload displays a preview; **Identify this place** is a separate action that calls `/api/photo`.
- Passively capture the browser request/response to verify coordinates, shortlist, match ID, and distance; also take screenshots of the actual visible card.

## Responsive and register checks
- Check a 390×844 viewport and desktop, scrolling to the map below the card on mobile.
- Device emulation is not proof of actual rear-camera or GPS hardware behavior.
- Chat uses the active place and mirrors the user's latest register automatically. Use English then Gulf Arabic in the same conversation and compare returned dishes/prices to that place's seed menu.
- Verify typed Arabic before sending: desktop typing automation can lose the initial character.
- The tiny header register link exposes and re-hides Reply-in controls.
