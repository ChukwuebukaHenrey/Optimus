I fixed it: books you add now stay on the page after a reload. I haven't run the app or any tests, as the brief asked; it will be re-checked independently.

**Cause:** When you added a book, the app put it in its in-memory list and drew its card, but never saved it to the browser's local storage. Toggling and removing books already saved, but adding didn't. So after a reload the app read the stored list, found nothing there, and showed "No books yet."

**Fix:** In `app.js`, the add-book form handler now calls `saveBooks()` right after adding the book to the list (`app.js:62`). This works for any book, not just the example values, and nothing else in the app changed.
