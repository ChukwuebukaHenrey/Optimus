# Repair brief

A behavioural check of this web app failed. Fix the app so the behaviour below works for any data, not only the example values. (Brief brief-142a6e6f-2d6f-4608-9f0a-29eea662cc73.)

## What a user does

1. Open the page.
2. Add a new book with title "GP Beta 1b7e12-run-0", author "Ada Okafor", 123 pages, not read yet, and save it.
3. Add a new book with title "GP Alpha 1b7e12-run-0", author "Ada Okafor", 123 pages, not read yet, and save it.
4. Remove the book titled "GP Alpha 1b7e12-run-0".

## What went wrong

- Requirement: After "Remove the book titled "GP Alpha 1b7e12-run-0".", the title of every book currently shown (titles only, not authors or other fields), separated by |, or 'none' should include "GP Beta 1b7e12-run-0".
- Checked after step: Remove the book titled "GP Alpha 1b7e12-run-0".
- Expected: GP Beta 1b7e12-run-0
- Observed: none
- Screenshot of the page after that step: <tmp>\optimus-repair-20261122205046-1b7e12\brief\attempt-1-L3.jpg

## Rules

- App folder: <tmp>\optimus-repair-20261122205046-1b7e12\app
- Allowed scope: Only the files of this app folder. Do not create or edit anything outside it.
- Fix the general behaviour. Do not special-case the example titles or detect that a test is running.
- Keep every other behaviour of the app working. The full set of behavioural checks runs again after your change.
- When the fix is done, stop. Do not run browsers or test tools; the app will be re-checked independently.
