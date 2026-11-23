# Repair brief

A behavioural check of this web app failed. Fix the app so the behaviour below works for any data, not only the example values. (Brief brief-a6a0d9cc-3ecc-481b-8bda-00d4f085c9f5.)

## What a user does

1. Open the page.
2. Add a new book with title "GP Keep c61591-run-0", author "Ada Okafor", 123 pages, not read yet, and save it.
3. Reload the page in the current browser session using the browser's refresh action, not a keyboard shortcut.

## What went wrong

- Requirement: After "Reload the page in the current browser session using the browser's refresh action, not a keyboard shortcut.", the title of every book currently shown (titles only, not authors or other fields), separated by |, or 'none' should include "GP Keep c61591-run-0".
- Checked after step: Reload the page in the current browser session using the browser's refresh action, not a keyboard shortcut.
- Expected: GP Keep c61591-run-0
- Observed: none
- Screenshot of the page after that step: <tmp>\optimus-repair-20261123014521-c61591\brief\attempt-1-L4.jpg

## Rules

- App folder: <tmp>\optimus-repair-20261123014521-c61591\app
- Allowed scope: Only the files of this app folder. Do not create or edit anything outside it.
- Fix the general behaviour. Do not special-case the example titles or detect that a test is running.
- Keep every other behaviour of the app working. The full set of behavioural checks runs again after your change.
- When the fix is done, stop. Do not run browsers or test tools; the app will be re-checked independently.
