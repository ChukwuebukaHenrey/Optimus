Books you add should now still be there after you reload the page. I haven't run the app or a browser, as the brief asked; it will be re-checked independently.

**Cause:** in `app.js`, the Add Book handler put the new book into the in-memory list and drew its card, but never saved it to the browser's storage. The page loads its books from storage when it opens, so after a reload it found nothing and showed "none". Toggling read status and removing a book already saved correctly. Only adding a book didn't.

**Fix:** I added one line, `saveBooks()`, right after the new book goes into the list (`app.js:62`). It applies to every book added, whatever the title. Nothing else changed.
