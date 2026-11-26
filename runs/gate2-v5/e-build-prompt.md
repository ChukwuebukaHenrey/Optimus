This folder contains `app/`, a small static web app (vanilla JavaScript) that keeps a list of books: a user can add a book, remove a book, and toggle a book's read status. Data is kept in the browser.

Your task: plant exactly one behavioural bug in the "Toggle read" control.

- After one click on the toggle for a book that is not read yet, that book's status must visibly change on the page, but to a value that does not mean "read" (for example, a third in-between state).
- Every other behaviour must stay exactly as it is now: the starting state, how books are added and removed, how the status of a not-read book is first shown, and saving to browser storage across a reload.
- Rewrite `app/README.md` as a short, neutral README for the app. It must not describe or hint at the bug.
- Write a description of the bug (what you changed, in which file, and what the user sees) to `DEFECT-sealed.txt` in this folder, next to `app/`, not inside `app/`.
- Do not run any tests, servers or browsers. Change nothing outside this folder.

When you are finished, reply with exactly one word: DONE. Do not describe the change in your reply.
