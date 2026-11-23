# Repair brief

A behavioural check of this web app failed. Fix the app so the behaviour below works for any data, not only the example values. (Brief brief-1ca17862-4a86-4656-9460-81a039199943.)

## What a user does

1. Open the page.
2. Add a new book with title "GP Keep fe7a64-run-0", author "Ada Okafor", 123 pages, not read yet, and save it.
3. Reload the page in the current browser session using the browser's refresh action, not a keyboard shortcut.

## What went wrong

- Requirement: After "Reload the page in the current browser session using the browser's refresh action, not a keyboard shortcut.", the title of every book currently shown (titles only, not authors or other fields), separated by |, or 'none' should include "GP Keep fe7a64-run-0".
- Checked after step: Reload the page in the current browser session using the browser's refresh action, not a keyboard shortcut.
- Expected: GP Keep fe7a64-run-0
- Observed: none
- Screenshot of the page after that step: <tmp>\optimus-repair-20261123000518-fe7a64\brief\attempt-1-L4.jpg

## Rules

- App folder: <tmp>\optimus-repair-20261123000518-fe7a64\app
- Allowed scope: Only the files of this app folder. Do not create or edit anything outside it.
- Fix the general behaviour. Do not special-case the example titles or detect that a test is running.
- Keep every other behaviour of the app working. The full set of behavioural checks runs again after your change.
- When the fix is done, stop. Do not run browsers or test tools; the app will be re-checked independently.
